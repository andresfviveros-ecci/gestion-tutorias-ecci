""" REGLAS DE LAS SOLICITUDES DE TUTOR (RF-02 y RF-03) """
from decimal import ROUND_HALF_UP, Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.accounts.permisos import en_grupos, es_coordinacion
from apps.catalogo.models import Configuracion, DocenteMateria, Inscripcion
from apps.disponibilidad.models import BloqueDisponibilidad
from apps.disponibilidad.services import cancelar_bloque
from apps.notificaciones.services import notificar
from apps.tutorias.services import bloque_iniciado

from .models import SolicitudTutor


def calcular_nota_final(corte1, corte2, corte3, config):
    """Promedio ponderado de los tres cortes con los pesos de Configuracion."""
    total = corte1 * config.peso_corte1 + corte2 * config.peso_corte2 + corte3 * config.peso_corte3
    return (total / Decimal(100)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def materia_cursada(estudiante, materia, periodo):
    """Inscrito en la materia en un periodo que terminó antes del actual."""
    return Inscripcion.objects.filter(
        estudiante=estudiante,
        materia=materia,
        periodo__fecha_fin__lt=periodo.fecha_inicio,
    ).exists()


def docentes_revisores(materia, periodo):
    return [dm.docente for dm in DocenteMateria.objects.filter(materia=materia, periodo=periodo).select_related('docente')]


def puede_revisar(usuario, solicitud):
    """RF-03: la revisa el docente con la materia asignada en el periodo de
    la solicitud. La coordinación también puede, por si ese docente falta."""
    return es_coordinacion(usuario) or DocenteMateria.objects.filter(
        docente=usuario, materia_id=solicitud.materia_id, periodo_id=solicitud.periodo_id
    ).exists()


def notificar_solicitud(solicitud):
    estudiante = solicitud.estudiante
    for docente in docentes_revisores(solicitud.materia, solicitud.periodo):
        notificar(
            docente, 'SOLICITUD_TUTOR', 'Nueva solicitud de tutor',
            f'{estudiante.get_full_name()} (semestre {estudiante.semestre}) pidió ser tutor de '
            f'{solicitud.materia.nombre} con nota final {solicitud.nota_final}.',
            correo=True,
        )


@transaction.atomic
def revisar(solicitud, usuario, estado, motivo=''):
    """Aprobar o rechazar una solicitud pendiente, o revocar una aprobada.
    Rechazar y revocar exigen motivo; el estudiante recibe un aviso."""
    solicitud = SolicitudTutor.objects.select_for_update(of=('self',)).select_related(
        'estudiante', 'materia'
    ).get(pk=solicitud.pk)
    if not puede_revisar(usuario, solicitud):
        raise PermissionDenied('Solo el docente de la materia o la coordinación revisan esta solicitud.')

    permitidos = {'APROBADA': 'PENDIENTE', 'RECHAZADA': 'PENDIENTE', 'REVOCADA': 'APROBADA'}
    if solicitud.estado != permitidos[estado]:
        raise ValidationError(
            {'estado': f'Una solicitud {solicitud.get_estado_display().lower()} no puede pasar a {estado}.'},
            code='transicion_invalida',
        )
    motivo = (motivo or '').strip()
    if estado in ('RECHAZADA', 'REVOCADA') and not motivo:
        raise ValidationError({'motivo': 'El motivo es obligatorio.'})

    solicitud.estado = estado
    solicitud.motivo = motivo or None
    solicitud.revisada_por = usuario
    solicitud.fecha_revision = timezone.now()
    solicitud.save(update_fields=['estado', 'motivo', 'revisada_por', 'fecha_revision'])
    if estado == 'REVOCADA':
        retirar_bloques(solicitud, usuario, motivo)

    textos = {
        'APROBADA': ('Solicitud de tutor aprobada', f'Ya puedes publicar horarios de tutoría de {solicitud.materia.nombre}.'),
        'RECHAZADA': ('Solicitud de tutor rechazada', f'Tu solicitud para {solicitud.materia.nombre} fue rechazada.'),
        'REVOCADA': ('Habilitación de tutor revocada', f'Se revocó tu habilitación como tutor de {solicitud.materia.nombre}.'),
    }
    titulo, mensaje = textos[estado]
    if motivo:
        mensaje = f'{mensaje}\nMotivo: {motivo}'
    notificar(solicitud.estudiante, 'HABILITACION', titulo, mensaje, correo=True)
    return solicitud


""" HABILITACIÓN DE TUTORES (RF-01 y RF-04)
Un docente es tutor de las materias que tiene asignadas en el periodo; un
estudiante, de las materias con solicitud APROBADA en ese periodo. """
def es_docente(user):
    return en_grupos(user, ('Docente',))


def materias_habilitadas(user, periodo):
    """Ids de las materias en las que el usuario puede publicar en el periodo."""
    asignadas = DocenteMateria.objects.filter(docente=user, periodo=periodo).values_list('materia_id', flat=True)
    aprobadas = SolicitudTutor.objects.filter(
        estudiante=user, periodo=periodo, estado='APROBADA'
    ).values_list('materia_id', flat=True)
    return set(asignadas) | set(aprobadas)


def puede_publicar(user):
    """RF-01: docentes y estudiantes con al menos una materia aprobada como
    tutor en el periodo activo."""
    if not (user and user.is_authenticated):
        return False
    return es_docente(user) or SolicitudTutor.objects.filter(
        estudiante=user, estado='APROBADA', periodo__activo=True
    ).exists()


def es_tutor(user):
    """Docente o estudiante que ha sido tutor alguna vez: ve las tutorías
    de sus bloques aunque hoy no esté habilitado."""
    return es_docente(user) or SolicitudTutor.objects.filter(
        estudiante=user, estado__in=('APROBADA', 'REVOCADA')
    ).exists()


def es_tutor_estudiante(user):
    """RF-06 y la diferencia de semestres aplican al tutor estudiante."""
    return not es_docente(user)


def retirar_bloques(solicitud, usuario, motivo):
    """Al revocar la habilitación, los bloques futuros del tutor en esa
    materia se cancelan y sus tutorías activas quedan ANULADAS."""
    bloques = BloqueDisponibilidad.objects.filter(
        docente=solicitud.estudiante, materia=solicitud.materia, periodo=solicitud.periodo
    ).exclude(estado__in=('CANCELADO', 'CERRADO'))
    for bloque in bloques:
        if not bloque_iniciado(bloque):
            cancelar_bloque(bloque, usuario, f'Se revocó la habilitación del tutor. {motivo}', anular=True)


def validar_tutor_para_reserva(bloque, estudiante):
    """La reserva vuelve a comprobar la habilitación del tutor (RF-04) y, si
    el tutor es estudiante, la diferencia de semestres (RF-02)."""
    tutor = bloque.docente
    if tutor.pk == estudiante.pk:
        raise ValidationError({'bloque_id': 'No puedes reservar tus propios horarios de tutoría.'})
    if bloque.materia_id not in materias_habilitadas(tutor, bloque.periodo):
        raise ValidationError({'bloque_id': 'El tutor ya no está habilitado en esta materia.'})
    if not es_tutor_estudiante(tutor):
        return

    diferencia = Configuracion.actual().diferencia_semestres
    if estudiante.semestre is None or tutor.semestre is None:
        raise ValidationError({
            'bloque_id': 'Para reservar con un tutor estudiante, tu semestre debe estar registrado.'
        })
    if tutor.semestre - estudiante.semestre < diferencia:
        raise ValidationError({
            'bloque_id': f'El tutor debe ir al menos {diferencia} semestres por delante del tuyo.'
        }, code='diferencia_semestres')

""" REGLAS DE LAS SOLICITUDES DE TUTOR (RF-02 y RF-03) """
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.accounts.permisos import es_coordinacion
from apps.catalogo.models import DocenteMateria, Inscripcion
from apps.notificaciones.services import notificar

from .models import SolicitudTutor


def calcular_nota_final(corte1, corte2, corte3, config):
    """Promedio ponderado de los tres cortes con los pesos de Configuracion."""
    total = corte1 * config.peso_corte1 + corte2 * config.peso_corte2 + corte3 * config.peso_corte3
    return (total / Decimal(100)).quantize(Decimal('0.01'))


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
    solicitud = SolicitudTutor.objects.select_for_update().select_related('estudiante', 'materia').get(pk=solicitud.pk)
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

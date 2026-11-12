""" REGLAS DE LAS SOLICITUDES DE TUTOR (RF-02 y RF-03) """
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

ESTADOS_VIGENTES = ('PENDIENTE', 'APROBADA')


def materias_cursadas(estudiante, periodo):
    """Materias cursadas en periodos que terminaron antes de este, con la
    inscripción más reciente de cada una (si la repitió, cuenta la última)."""
    inscripciones = Inscripcion.objects.filter(
        estudiante=estudiante, periodo__fecha_fin__lt=periodo.fecha_inicio
    ).select_related('materia', 'periodo').order_by('materia_id', '-periodo__fecha_fin')
    ultima = {}
    for inscripcion in inscripciones:
        ultima.setdefault(inscripcion.materia_id, inscripcion)
    return list(ultima.values())


def evaluar_postulacion(estudiante, inscripcion, periodo, config, con_docente, con_solicitud_vigente=False):
    """GT-269 y GT-270: una sola regla para lo que muestra el historial y lo
    que valida la solicitud. Devuelve la nota, los tres requisitos, si es
    elegible y, si no, el motivo y el campo al que va el error.

    - semestre: el semestre del estudiante ≥ semestre_minimo_tutor.
    - nota: la nota final de la materia ≥ nota_minima.
    - avance: semestre del estudiante − semestre de la materia en el plan ≥
      diferencia_semestres.
    Además la materia debe estar aprobada y activa, tener docente en el
    periodo (es quien revisa la solicitud) y no tener ya una solicitud
    pendiente o aprobada del estudiante."""
    materia = inscripcion.materia
    semestre = estudiante.semestre
    nota = inscripcion.nota_final(config)
    avance = semestre - materia.semestre if semestre is not None and materia.semestre is not None else None

    requisitos = {
        'semestre': {
            'cumple': semestre is not None and semestre >= config.semestre_minimo_tutor,
            'valor': semestre,
            'minimo': config.semestre_minimo_tutor,
        },
        'nota': {
            'cumple': nota is not None and nota >= config.nota_minima,
            'valor': None if nota is None else str(nota),
            'minimo': str(config.nota_minima),
        },
        'avance': {
            'cumple': avance is not None and avance >= config.diferencia_semestres,
            'valor': avance,
            'minimo': config.diferencia_semestres,
        },
    }

    # El primer motivo que aplica, en el orden en que el estudiante lo resolvería.
    if nota is None:
        motivo = ('materia', 'Tu nota en esta materia aún no está registrada; pídele a la coordinación que la cargue.')
    elif semestre is None:
        motivo = ('non_field_errors', 'Tu semestre no está registrado; pídele a la coordinación que lo actualice.')
    elif not requisitos['semestre']['cumple']:
        motivo = ('non_field_errors', f'Para ser tutor debes cursar al menos el semestre {config.semestre_minimo_tutor}.')
    elif not requisitos['nota']['cumple']:
        motivo = ('materia', f'La nota final ({nota}) es menor que la mínima ({config.nota_minima}).')
    elif materia.semestre is None:
        motivo = ('materia', 'La materia no tiene semestre en el plan de estudios; no se puede calcular el avance.')
    elif not requisitos['avance']['cumple']:
        motivo = ('materia', (
            f'Debes ir al menos {config.diferencia_semestres} semestres por delante de la materia '
            f'(es de semestre {materia.semestre} y vas en {semestre}).'
        ))
    elif not materia.activa:
        motivo = ('materia', 'La materia no está activa.')
    elif not con_docente:
        motivo = ('materia', f'La materia no tiene docente asignado en {periodo.codigo}.')
    elif con_solicitud_vigente:
        motivo = ('materia', 'Ya tienes una solicitud pendiente o aprobada en esta materia.')
    else:
        motivo = None

    return {
        'materia': materia,
        'nota': nota,
        'aprobada': nota is not None and nota >= config.nota_aprobatoria,
        'requisitos': requisitos,
        'elegible': motivo is None,
        'motivo': motivo,
    }


def historial_materias(estudiante, periodo, config):
    """GT-269: materias cursadas con su nota y si cumplen para ser tutor."""
    cursadas = materias_cursadas(estudiante, periodo)
    ids = [inscripcion.materia_id for inscripcion in cursadas]
    # Quién revisaría la postulación de cada materia (RF-03): sus docentes en el periodo.
    revisores = {}
    asignaciones = DocenteMateria.objects.filter(periodo=periodo, materia_id__in=ids).select_related('docente')
    for asignacion in asignaciones.order_by('docente__first_name', 'docente__last_name'):
        revisores.setdefault(asignacion.materia_id, []).append(asignacion.docente.get_full_name())
    con_docente = set(revisores)
    solicitudes = SolicitudTutor.objects.filter(estudiante=estudiante, periodo=periodo, materia_id__in=ids)
    # La más reciente de cada materia en el periodo, en cualquier estado.
    ultimas = {}
    for solicitud in solicitudes.order_by('-date_creation', '-id'):
        ultimas.setdefault(solicitud.materia_id, solicitud)
    con_vigente = set(solicitudes.filter(estado__in=ESTADOS_VIGENTES).values_list('materia_id', flat=True))

    materias = []
    for inscripcion in sorted(cursadas, key=lambda i: (i.materia.semestre or 0, i.materia.nombre)):
        evaluacion = evaluar_postulacion(
            estudiante, inscripcion, periodo, config,
            con_docente=inscripcion.materia_id in con_docente,
            con_solicitud_vigente=inscripcion.materia_id in con_vigente,
        )
        materia, solicitud = inscripcion.materia, ultimas.get(inscripcion.materia_id)
        materias.append({
            'materia': materia.id,
            'codigo': materia.codigo,
            'nombre': materia.nombre,
            'semestre_cursado': materia.semestre,
            'periodo_cursado': inscripcion.periodo.codigo,
            'nota': None if evaluacion['nota'] is None else str(evaluacion['nota']),
            'aprobada': evaluacion['aprobada'],
            'elegible': evaluacion['elegible'],
            'motivo': evaluacion['motivo'][1] if evaluacion['motivo'] else None,
            'requisitos': evaluacion['requisitos'],
            'revisores': revisores.get(inscripcion.materia_id, []),
            'solicitud': solicitud and {
                'id': solicitud.id, 'estado': solicitud.estado,
                'fecha': solicitud.date_creation.date(),
            },
        })

    return {
        'estudiante': estudiante.id,
        'semestre': estudiante.semestre,
        'periodo': periodo.id,
        'periodo_codigo': periodo.codigo,
        'config': {
            'semestre_minimo_tutor': config.semestre_minimo_tutor,
            'nota_minima': str(config.nota_minima),
            'diferencia_semestres': config.diferencia_semestres,
            'nota_aprobatoria': str(config.nota_aprobatoria),
        },
        'resumen': {
            'materias_aprobadas': sum(m['aprobada'] for m in materias),
            'elegibles': sum(m['elegible'] for m in materias),
        },
        'materias': materias,
    }


def docentes_revisores(materia, periodo):
    return [dm.docente for dm in DocenteMateria.objects.filter(materia=materia, periodo=periodo).select_related('docente')]


def puede_revisar(usuario, solicitud):
    """RF-03: la revisa el docente con la materia asignada en el periodo de
    la solicitud. La coordinación solo la revisa si la materia se quedó sin
    docente en ese periodo (decisión de la PO)."""
    asignaciones = DocenteMateria.objects.filter(materia_id=solicitud.materia_id, periodo_id=solicitud.periodo_id)
    if asignaciones.filter(docente=usuario).exists():
        return True
    return es_coordinacion(usuario) and not asignaciones.exists()


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
    Las tres decisiones exigen motivo (HU-044); el estudiante lo recibe en el aviso."""
    solicitud = SolicitudTutor.objects.select_for_update(of=('self',)).select_related(
        'estudiante', 'materia'
    ).get(pk=solicitud.pk)
    if not puede_revisar(usuario, solicitud):
        raise PermissionDenied('La revisa el docente de la materia; la coordinación solo si la materia no tiene docente.')

    permitidos = {'APROBADA': 'PENDIENTE', 'RECHAZADA': 'PENDIENTE', 'REVOCADA': 'APROBADA'}
    if solicitud.estado != permitidos[estado]:
        raise ValidationError(
            {'estado': f'Una solicitud {solicitud.get_estado_display().lower()} no puede pasar a {estado}.'},
            code='transicion_invalida',
        )
    motivo = (motivo or '').strip()
    if not motivo:
        raise ValidationError({'motivo': 'El motivo de la decisión es obligatorio.'})

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

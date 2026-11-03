""" REGLAS DE NEGOCIO DE TUTORÍAS
Las vistas validan la entrada, llaman a estas funciones y responden.
Así las reglas se prueban sin HTTP y no se repiten entre vistas. """
from datetime import datetime, timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.catalogo.models import Configuracion
from apps.disponibilidad.models import BloqueDisponibilidad
from apps.notificaciones.services import notificar

from .estados import ACTIVOS, validar_transicion
from .models import Cancelacion, Tutoria

# Se conserva el nombre: disponibilidad y las vistas lo importan.
ESTADOS_ACTIVOS = ACTIVOS
# Tope del campo horas_previas (DecimalField de 5 dígitos y 2 decimales).
MAX_HORAS_PREVIAS = Decimal('999.99')


def inicio_bloque(bloque):
    return datetime.combine(bloque.fecha, bloque.hora_inicio)


def bloque_iniciado(bloque):
    return timezone.now() >= inicio_bloque(bloque)


def limite_reserva(bloque, config=None):
    """RF-08: se reserva hasta horas_anticipacion_reservar antes del inicio."""
    horas = (config or Configuracion.actual()).horas_anticipacion_reservar
    return inicio_bloque(bloque) - timedelta(hours=horas)


def limite_cancelacion(tutoria, config=None):
    """RF-08: el estudiante cancela hasta horas_anticipacion_cancelar antes del inicio."""
    horas = (config or Configuracion.actual()).horas_anticipacion_cancelar
    return inicio_bloque(tutoria.bloque) - timedelta(hours=horas)


def puede_cancelar(tutoria, config=None):
    return tutoria.estado in ACTIVOS and timezone.now() <= limite_cancelacion(tutoria, config)


def puede_editar(tutoria):
    return tutoria.estado == 'RESERVADA' and not bloque_iniciado(tutoria.bloque)


def validar_plazo_reserva(bloque):
    if timezone.now() > limite_reserva(bloque):
        horas = Configuracion.actual().horas_anticipacion_reservar
        raise ValidationError(
            {'bloque_id': f'Las tutorías se reservan con al menos {horas} horas de anticipación.'},
            code='plazo_vencido',
        )


def calcular_horas_previas(bloque):
    """Horas entre ahora y el inicio del bloque (BE-21)."""
    segundos = (inicio_bloque(bloque) - timezone.now()).total_seconds()
    horas = Decimal(segundos / 3600).quantize(Decimal('0.01'))
    return min(max(horas, Decimal(0)), MAX_HORAS_PREVIAS)


def liberar_cupo(bloque_id):
    bloque = BloqueDisponibilidad.objects.select_for_update().get(pk=bloque_id)
    if bloque.cupo_ocupado > 0:
        bloque.cupo_ocupado -= 1
    if bloque.estado == 'COMPLETO' and bloque.cupo_ocupado < bloque.cupo_total:
        bloque.estado = 'DISPONIBLE'
    bloque.save(update_fields=['cupo_ocupado', 'estado'])


def _cuando(bloque):
    return f'{bloque.fecha} a las {bloque.hora_inicio:%H:%M}'


def notificar_reserva(tutoria):
    """Avisa por la aplicación y por correo al tutor y al estudiante."""
    bloque = tutoria.bloque
    notificar(
        bloque.docente, 'NUEVA_RESERVA', 'Nueva reserva de tutoría',
        f'{tutoria.estudiante.get_full_name()} reservó la tutoría {tutoria.codigo} del {_cuando(bloque)}. '
        f'Tema: {tutoria.tema}',
        tutoria=tutoria, correo=True,
    )
    notificar(
        tutoria.estudiante, 'RESERVA_CONFIRMADA', 'Tutoría reservada',
        f'Reservaste la tutoría {tutoria.codigo} con {bloque.docente.get_full_name()} el {_cuando(bloque)}.',
        tutoria=tutoria, correo=True,
    )


def notificar_cancelacion(tutoria, origen, motivo):
    """Avisa por la aplicación y por correo a la otra parte: al tutor si
    cancela el estudiante y al estudiante si cancela el tutor o el sistema."""
    bloque = tutoria.bloque
    if origen == 'ESTUDIANTE':
        destinatario = bloque.docente
        mensaje = (
            f'{tutoria.estudiante.get_full_name()} canceló la tutoría {tutoria.codigo} '
            f'del {_cuando(bloque)}.\nMotivo: {motivo}'
        )
    else:
        destinatario = tutoria.estudiante
        quien = 'El tutor canceló' if origen == 'DOCENTE' else 'Se anuló'
        mensaje = f'{quien} la tutoría {tutoria.codigo} del {_cuando(bloque)}.\nMotivo: {motivo}'
    notificar(destinatario, 'CANCELACION', 'Tutoría cancelada', mensaje, tutoria=tutoria, correo=True)


@transaction.atomic
def cancelar_tutoria(tutoria, usuario, motivo, anular=False):
    """Cancela la tutoría, libera el cupo y avisa a la otra parte.

    - El estado y el origen salen de quién cancela (BE-06, BE-07).
    - El estudiante cancela hasta el plazo de Configuracion (RF-08); el
      tutor, hasta el inicio del bloque.
    - Con anular=True la cancela el sistema (ANULADA, origen SISTEMA), por
      ejemplo al revocar la habilitación de un tutor."""
    # Primero el bloque y después la tutoría, en el mismo orden que reservar
    # y cancelar_bloque, para que dos operaciones no se bloqueen entre sí.
    BloqueDisponibilidad.objects.select_for_update().get(pk=tutoria.bloque_id)
    tutoria = Tutoria.objects.select_for_update().select_related(
        'bloque__docente', 'estudiante'
    ).get(pk=tutoria.pk)

    if anular:
        origen, estado = 'SISTEMA', 'ANULADA'
    elif usuario.pk == tutoria.estudiante_id:
        origen, estado = 'ESTUDIANTE', 'CANCELADA_ESTUDIANTE'
    else:
        origen, estado = 'DOCENTE', 'CANCELADA_DOCENTE'

    if tutoria.estado not in ACTIVOS:
        raise ValidationError('Solo se pueden cancelar tutorías reservadas o confirmadas.')
    validar_transicion(tutoria, estado)
    if bloque_iniciado(tutoria.bloque):
        raise ValidationError('La tutoría ya inició; no se puede cancelar.')
    if origen == 'ESTUDIANTE' and not puede_cancelar(tutoria):
        horas = Configuracion.actual().horas_anticipacion_cancelar
        raise ValidationError(
            f'Las tutorías se cancelan con al menos {horas} horas de anticipación.',
            code='plazo_vencido',
        )

    cancelacion = Cancelacion.objects.create(
        tutoria=tutoria,
        cancelado_por=usuario,
        origen=origen,
        motivo=motivo,
        horas_previas=calcular_horas_previas(tutoria.bloque),
    )
    tutoria.estado = estado
    tutoria.save(update_fields=['estado'])
    liberar_cupo(tutoria.bloque_id)

    notificar_cancelacion(tutoria, origen, motivo)
    return cancelacion

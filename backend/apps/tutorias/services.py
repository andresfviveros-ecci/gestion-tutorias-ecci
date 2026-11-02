""" REGLAS DE NEGOCIO DE TUTORÍAS
Las vistas validan la entrada, llaman a estas funciones y responden.
Así las reglas se prueban sin HTTP y no se repiten entre vistas. """
from datetime import datetime
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.disponibilidad.models import BloqueDisponibilidad
from apps.notificaciones.services import notificar

from .models import Cancelacion, Tutoria

# Estados en los que la tutoría todavía puede editarse o cancelarse.
ESTADOS_ACTIVOS = ('RESERVADA', 'CONFIRMADA')
# Tope del campo horas_previas (DecimalField de 5 dígitos y 2 decimales).
MAX_HORAS_PREVIAS = Decimal('999.99')


def inicio_bloque(bloque):
    return datetime.combine(bloque.fecha, bloque.hora_inicio)


def bloque_iniciado(bloque):
    return timezone.now() >= inicio_bloque(bloque)


def puede_cancelar(tutoria):
    return tutoria.estado in ESTADOS_ACTIVOS and not bloque_iniciado(tutoria.bloque)


def puede_editar(tutoria):
    return tutoria.estado == 'RESERVADA' and not bloque_iniciado(tutoria.bloque)


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


def notificar_reserva(tutoria):
    bloque = tutoria.bloque
    cuando = f'{bloque.fecha} a las {bloque.hora_inicio:%H:%M}'
    notificar(
        bloque.docente, 'NUEVA_RESERVA', 'Nueva reserva de tutoría',
        f'{tutoria.estudiante.get_full_name()} reservó la tutoría {tutoria.codigo} del {cuando}. '
        f'Tema: {tutoria.tema}',
        tutoria=tutoria,
    )
    notificar(
        tutoria.estudiante, 'RESERVA_CONFIRMADA', 'Tutoría reservada',
        f'Reservaste la tutoría {tutoria.codigo} con {bloque.docente.get_full_name()} el {cuando}.',
        tutoria=tutoria,
    )


def notificar_cancelacion(tutoria, origen, motivo):
    """Avisa por la aplicación y por correo a la otra parte: al docente si
    cancela el estudiante y al estudiante si cancela el docente."""
    bloque = tutoria.bloque
    cuando = f'{bloque.fecha} a las {bloque.hora_inicio:%H:%M}'
    if origen == 'DOCENTE':
        destinatario = tutoria.estudiante
        mensaje = f'El docente canceló la tutoría {tutoria.codigo} del {cuando}.\nMotivo: {motivo}'
    else:
        destinatario = bloque.docente
        mensaje = (
            f'{tutoria.estudiante.get_full_name()} canceló la tutoría {tutoria.codigo} '
            f'del {cuando}.\nMotivo: {motivo}'
        )
    notificar(destinatario, 'CANCELACION', 'Tutoría cancelada', mensaje, tutoria=tutoria, correo=True)


@transaction.atomic
def cancelar_tutoria(tutoria, usuario, motivo):
    """Cancela la tutoría y libera el cupo. El estado y el origen salen de
    quién cancela (BE-06, BE-07); se permite en RESERVADA y CONFIRMADA
    (BE-20) y solo antes del inicio (BE-09)."""
    # Primero el bloque y después la tutoría, en el mismo orden que reservar
    # y cancelar_bloque, para que dos operaciones no se bloqueen entre sí.
    BloqueDisponibilidad.objects.select_for_update().get(pk=tutoria.bloque_id)
    tutoria = Tutoria.objects.select_for_update().select_related(
        'bloque__docente', 'estudiante'
    ).get(pk=tutoria.pk)

    if tutoria.estado not in ESTADOS_ACTIVOS:
        raise ValidationError('Solo se pueden cancelar tutorías reservadas o confirmadas.')
    if bloque_iniciado(tutoria.bloque):
        raise ValidationError('La tutoría ya inició; no se puede cancelar.')

    origen = 'ESTUDIANTE' if usuario.pk == tutoria.estudiante_id else 'DOCENTE'
    cancelacion = Cancelacion.objects.create(
        tutoria=tutoria,
        cancelado_por=usuario,
        origen=origen,
        motivo=motivo,
        horas_previas=calcular_horas_previas(tutoria.bloque),
    )
    tutoria.estado = f'CANCELADA_{origen}'
    tutoria.save(update_fields=['estado'])
    liberar_cupo(tutoria.bloque_id)

    notificar_cancelacion(tutoria, origen, motivo)
    return cancelacion

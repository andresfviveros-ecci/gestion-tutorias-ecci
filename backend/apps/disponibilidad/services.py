""" REGLAS DE NEGOCIO DE DISPONIBILIDAD """
from datetime import timedelta

from django.db import transaction
from django.db.models import Sum

from apps.tutorias.services import ESTADOS_ACTIVOS, cancelar_tutoria

from .models import BloqueDisponibilidad


def existe_conflicto(docente, fecha, hora_inicio, hora_fin, excluir_id=None):
    # BE-12: un bloque cancelado ya no ocupa el horario.
    conflictos = BloqueDisponibilidad.objects.filter(
        docente=docente,
        fecha=fecha,
        hora_inicio__lt=hora_fin,
        hora_fin__gt=hora_inicio
    ).exclude(estado='CANCELADO')
    if excluir_id is not None:
        conflictos = conflictos.exclude(pk=excluir_id)
    return conflictos.exists()


def cupos_de_la_semana(docente, fecha, excluir_id=None):
    """RF-06: suma de cupo_total de los bloques no cancelados del tutor en la
    semana (lunes a domingo) de la fecha."""
    lunes = fecha - timedelta(days=fecha.weekday())
    bloques = BloqueDisponibilidad.objects.filter(
        docente=docente, fecha__range=(lunes, lunes + timedelta(days=6))
    ).exclude(estado='CANCELADO')
    if excluir_id is not None:
        bloques = bloques.exclude(pk=excluir_id)
    return bloques.aggregate(total=Sum('cupo_total'))['total'] or 0


@transaction.atomic
def cancelar_bloque(bloque, usuario, motivo, anular=False):
    """Marca el bloque como CANCELADO y cancela sus tutorías activas (o las
    anula, si lo hace el sistema), que avisan por correo a cada estudiante.
    Devuelve cuántas se cancelaron."""
    bloque = BloqueDisponibilidad.objects.select_for_update().get(pk=bloque.pk)
    tutorias = list(bloque.tutorias.filter(estado__in=ESTADOS_ACTIVOS))
    for tutoria in tutorias:
        cancelar_tutoria(tutoria, usuario, motivo, anular=anular)
    bloque.refresh_from_db()
    bloque.estado = 'CANCELADO'
    bloque.save(update_fields=['estado'])
    return len(tutorias)

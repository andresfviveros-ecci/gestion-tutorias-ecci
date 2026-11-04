""" ESTADOS DE LA TUTORÍA (RF-10)
Una sola tabla con los cambios permitidos. RESERVADA y CONFIRMADA son
activas; las demás son finales y ya no cambian. """
from rest_framework.exceptions import ValidationError

ACTIVOS = ('RESERVADA', 'CONFIRMADA')
FINALES = ('COMPLETADA', 'NO_ASISTIO', 'CANCELADA_ESTUDIANTE', 'CANCELADA_DOCENTE', 'ANULADA')
CANCELADOS = ('CANCELADA_ESTUDIANTE', 'CANCELADA_DOCENTE', 'ANULADA')

TRANSICIONES = {
    'RESERVADA': {'CONFIRMADA', 'COMPLETADA', 'NO_ASISTIO', *CANCELADOS},
    'CONFIRMADA': {'COMPLETADA', 'NO_ASISTIO', *CANCELADOS},
    **{estado: set() for estado in FINALES},
}


def puede_pasar(actual, nuevo):
    return nuevo in TRANSICIONES.get(actual, set())


def validar_transicion(tutoria, nuevo):
    if not puede_pasar(tutoria.estado, nuevo):
        raise ValidationError(
            {'estado': f'Una tutoría {tutoria.get_estado_display().lower()} no puede pasar a {nuevo}.'},
            code='transicion_invalida',
        )

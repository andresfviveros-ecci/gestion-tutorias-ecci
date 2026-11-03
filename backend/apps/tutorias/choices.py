# RF-10: los cambios permitidos entre estos estados están en estados.py.
ESTADO_TUTORIA_CHOICES = [
    ('RESERVADA', 'Reservada'),
    ('CONFIRMADA', 'Confirmada'),
    ('COMPLETADA', 'Completada'),
    ('NO_ASISTIO', 'No asistió'),
    ('CANCELADA_ESTUDIANTE', 'Cancelada por estudiante'),
    ('CANCELADA_DOCENTE', 'Cancelada por docente'),
    ('ANULADA', 'Anulada'),
]

ESTADO_ASISTENCIA_CHOICES = [
    ('PENDIENTE', 'Pendiente'),
    ('ASISTIO', 'Asistió'),
    ('ASISTIO_TARDE', 'Asistió tarde'),
    ('NO_ASISTIO', 'No asistió'),
]

ORIGEN_CANCELACION_CHOICES = [
    ('ESTUDIANTE', 'Estudiante'),
    ('DOCENTE', 'Docente'),
    ('SISTEMA', 'Sistema'),
]

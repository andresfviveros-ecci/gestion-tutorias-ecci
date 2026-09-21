ESTADO_TUTORIA_CHOICES = [
    ('RESERVADA', 'Reservada'),
    ('CONFIRMADA', 'Confirmada'),
    ('EN_CURSO', 'En curso'),
    ('COMPLETADA', 'Completada'),
    ('CANCELADA_ESTUDIANTE', 'Cancelada por estudiante'),
    ('CANCELADA_DOCENTE', 'Cancelada por docente'),
    ('NO_ASISTIO', 'No asistió'),
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
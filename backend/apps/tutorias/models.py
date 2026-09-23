from django.db import models
from django.conf import settings
from .choices import ESTADO_TUTORIA_CHOICES, ESTADO_ASISTENCIA_CHOICES, ORIGEN_CANCELACION_CHOICES
from apps.models import BaseModel

class Tutoria(BaseModel):
    codigo = models.CharField(max_length=20, unique=True, verbose_name='codigo')
    bloque = models.ForeignKey('disponibilidad.BloqueDisponibilidad', on_delete=models.PROTECT, related_name='tutorias')
    estudiante = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='tutorias')
    tema = models.CharField(max_length=200, verbose_name='tema')
    descripcion = models.TextField(null=True, blank=True, verbose_name='descripcion')
    estado = models.CharField(max_length=25, choices=ESTADO_TUTORIA_CHOICES, default='RESERVADA', verbose_name='estado')
    asistencia = models.CharField(max_length=20, choices=ESTADO_ASISTENCIA_CHOICES, default='PENDIENTE', verbose_name='asistencia')
    minutos_retraso = models.SmallIntegerField(default=0, verbose_name='minutos_retraso')
    hora_inicio_real = models.DateTimeField(null=True, blank=True, verbose_name='hora_inicio_real')
    hora_fin_real = models.DateTimeField(null=True, blank=True, verbose_name='hora_fin_real')
    notas_docente = models.TextField(null=True, blank=True, verbose_name='notas_docente')
    compromisos = models.TextField(null=True, blank=True, verbose_name='compromisos')

    def __str__(self):
        return self.codigo

    class Meta:
            verbose_name = 'Tutoría'
            verbose_name_plural = 'Tutorías'
            ordering = ['id']
            constraints = [
                models.UniqueConstraint(
                    fields=['bloque', 'estudiante'],
                    condition=models.Q(
                        estado__in=['RESERVADA', 'CONFIRMADA', 'EN_CURSO']
                    ),
                    name='ux_tutoria_activa'
                ),
                models.CheckConstraint( check=models.Q(minutos_retraso__gte=0),name='ck_tutoria_retraso'),
            ]
            indexes = [
                models.Index(fields=['estudiante', 'estado'],name='idx_tutoria_estudiante'),
                models.Index( fields=['bloque'],name='idx_tutoria_bloque'),
            ]


class Cancelacion(BaseModel):
    tutoria = models.ForeignKey(Tutoria, on_delete=models.CASCADE, related_name='cancelaciones')
    cancelado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='cancelaciones')
    origen = models.CharField(max_length=20, choices=ORIGEN_CANCELACION_CHOICES, verbose_name='origen')
    motivo = models.TextField(verbose_name='motivo')
    horas_previas = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name='horas_previas')
    penalizada = models.BooleanField(default=False, verbose_name='penalizada')

    def __str__(self):
        return f'Cancelación - {self.tutoria.codigo}'

    class Meta:
        verbose_name = 'Cancelación'
        verbose_name_plural = 'Cancelaciones'
        ordering = ['id']


class EvaluacionTutoria(BaseModel):
    tutoria = models.OneToOneField(Tutoria, on_delete=models.CASCADE, related_name='evaluacion')
    calificacion = models.SmallIntegerField(verbose_name='calificacion')
    comentario = models.TextField(null=True, blank=True, verbose_name='comentario')

    def __str__(self):
        return f'{self.tutoria.codigo} - {self.calificacion}'

    class Meta:
        verbose_name = 'Evaluación de tutoría'
        verbose_name_plural = 'Evaluaciones de tutorías'
        ordering = ['id']
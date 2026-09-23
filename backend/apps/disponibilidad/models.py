from django.db import models
from django.conf import settings
from .choices import MODALIDAD_CHOICES, ESTADO_BLOQUE_CHOICES
from apps.models import BaseModel
from apps.catalogo.models import Materia, PeriodoAcademico

class BloqueDisponibilidad(BaseModel):
    docente = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='disponibilidades')
    materia = models.ForeignKey(Materia, on_delete=models.SET_NULL, null=True, blank=True, related_name='disponibilidades')
    periodo = models.ForeignKey(PeriodoAcademico, on_delete=models.CASCADE, related_name='bloques_disponibilidad')
    fecha = models.DateField(verbose_name='fecha')
    hora_inicio = models.TimeField(verbose_name='hora_inicio')
    hora_fin = models.TimeField(verbose_name='hora_fin')
    modalidad = models.CharField(max_length=11, choices=MODALIDAD_CHOICES, verbose_name='modalidad')
    lugar = models.CharField(max_length=150, null=True, blank=True, verbose_name='lugar')
    enlace_virtual = models.CharField(max_length=255, null=True, blank=True, verbose_name='enlace_virtual')
    cupo_total = models.SmallIntegerField(default=1, verbose_name='cupo_total')
    cupo_ocupado = models.SmallIntegerField(default=0, verbose_name='cupo_ocupado')
    estado = models.CharField(max_length=10, choices=ESTADO_BLOQUE_CHOICES, default='DISPONIBLE', verbose_name='estado')
    observaciones = models.TextField(null=True, blank=True, verbose_name='observaciones')

    def __str__(self):
        return f'{self.fecha} - {self.hora_inicio}'

    class Meta:
        verbose_name = 'Bloque de disponibilidad'
        verbose_name_plural = 'Bloques de disponibilidad'
        ordering = ['id']


class PlantillaDisponibilidad(BaseModel):
    docente = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='plantillas_disponibilidad')
    periodo = models.ForeignKey(PeriodoAcademico, on_delete=models.CASCADE, related_name='plantillas_disponibilidad')
    dia_semana = models.SmallIntegerField(verbose_name='dia_semana')
    hora_inicio = models.TimeField(verbose_name='hora_inicio')
    hora_fin = models.TimeField(verbose_name='hora_fin')
    modalidad = models.CharField(max_length=11, choices=MODALIDAD_CHOICES, verbose_name='modalidad')
    lugar = models.CharField(max_length=150, null=True, blank=True, verbose_name='lugar')
    enlace_virtual = models.CharField(max_length=255, null=True, blank=True, verbose_name='enlace_virtual')
    cupo_total = models.SmallIntegerField(default=1, verbose_name='cupo_total')
    activa = models.BooleanField(default=True, verbose_name='activa')

    def __str__(self):
        return f'{self.docente} - {self.dia_semana} - {self.hora_inicio}'

    class Meta:
        verbose_name = 'Plantilla de disponibilidad'
        verbose_name_plural = 'Plantillas de disponibilidad'
        ordering = ['id']
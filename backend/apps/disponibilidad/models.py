from django.db import models
from django.conf import settings
from .choices import MODALIDAD_CHOICES
from apps.models import BaseModel

class BloqueDisponibilidad(BaseModel):
    docente = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,related_name='disponibilidades')
    fecha = models.DateField(verbose_name='fecha')
    hora_inicio = models.TimeField(verbose_name = 'hora_inicio')
    hora_fin = models.TimeField(verbose_name='hora_find')
    modalidad = models.CharField(max_length=11,choices=MODALIDAD_CHOICES,verbose_name='modalidad')

    def __str__(self):
        return f'{self.fecha} - {self.hora_inicio}'


    class Meta:
        verbose_name = 'Bloque de disponibilidad'
        verbose_name_plural = 'Bloques de disponibilidad'
        ordering = ['id']

    
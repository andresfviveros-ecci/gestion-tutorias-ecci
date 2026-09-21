from django.db import models
from django.conf import settings
from apps.models import BaseModel

class Auditoria(BaseModel):
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='auditorias')
    entidad = models.CharField(max_length=50, verbose_name='entidad')
    entidad_id = models.BigIntegerField(null=True, blank=True, verbose_name='entidad_id')
    accion = models.CharField(max_length=30, verbose_name='accion')
    datos_antes = models.JSONField(null=True, blank=True, verbose_name='datos_antes')
    datos_despues = models.JSONField(null=True, blank=True, verbose_name='datos_despues')
    ip = models.GenericIPAddressField(null=True, blank=True, verbose_name='ip')

    def __str__(self):
        return f'{self.entidad} - {self.accion}'

    class Meta:
        verbose_name = 'Auditoría'
        verbose_name_plural = 'Auditorías'
        ordering = ['-id']
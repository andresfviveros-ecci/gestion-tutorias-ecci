from django.db import models
from django.conf import settings
from .choices import TIPO_NOTIFICACION_CHOICES
from apps.models import BaseModel

class Notificacion(BaseModel):
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notificaciones')
    tutoria = models.ForeignKey('tutorias.Tutoria', on_delete=models.CASCADE, null=True, blank=True, related_name='notificaciones')
    tipo = models.CharField(max_length=20, choices=TIPO_NOTIFICACION_CHOICES, verbose_name='tipo')
    titulo = models.CharField(max_length=150, verbose_name='titulo')
    mensaje = models.TextField(verbose_name='mensaje')
    leida = models.BooleanField(default=False, verbose_name='leida')
    enviada_email = models.BooleanField(default=False, verbose_name='enviada_email')

    def __str__(self):
        return self.titulo

    class Meta:
        verbose_name = 'Notificación'
        verbose_name_plural = 'Notificaciones'
        ordering = ['-id']
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    nombres = models.CharField(max_length=100)
    apellidos = models.CharField(max_length=100)
    documento = models.CharField(max_length=20, unique=True)
    telefono = models.CharField(max_length=20, null=True, blank=True)
    rol = models.CharField(max_length=20)
    codigo_institucional = models.CharField(max_length=20, unique=True, null=True, blank=True)
    foto_url = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return self.username

    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
        ordering = ['id']
        
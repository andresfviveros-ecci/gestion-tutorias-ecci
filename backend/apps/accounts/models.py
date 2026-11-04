from django.contrib.auth.models import AbstractUser
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models.functions import Lower


class User(AbstractUser):
    documento = models.CharField(max_length=20, unique=True)
    telefono = models.CharField(max_length=20, null=True, blank=True)
    codigo_institucional = models.CharField(max_length=20, unique=True, null=True, blank=True)
    rol = models.CharField(max_length=50)
    foto_url = models.CharField(max_length=255, null=True, blank=True)
    # RF-02: semestre que cursa el estudiante (decide quién puede ser tutor).
    semestre = models.PositiveSmallIntegerField(
        null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(12)], verbose_name='semestre'
    )

    def __str__(self):
        return self.username

    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
        ordering = ['id']
        constraints = [
            # BE-16: correo único sin distinguir mayúsculas (el vacío no cuenta).
            models.UniqueConstraint(
                Lower('email'),
                condition=~models.Q(email=''),
                name='ux_user_email_ci',
            ),
        ]

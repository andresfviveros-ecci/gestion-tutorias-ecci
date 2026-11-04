from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.catalogo.models import Materia, PeriodoAcademico
from apps.models import BaseModel

from .choices import ESTADO_SOLICITUD_CHOICES

NOTA = [MinValueValidator(0), MaxValueValidator(5)]


class SolicitudTutor(BaseModel):
    """RF-02 y RF-03: un estudiante pide ser tutor de una materia que ya cursó.
    La revisa el docente que tiene la materia asignada en el periodo; si la
    aprueba, el estudiante queda habilitado en esa materia durante ese periodo."""
    estudiante = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='solicitudes_tutor')
    materia = models.ForeignKey(Materia, on_delete=models.PROTECT, related_name='solicitudes_tutor')
    periodo = models.ForeignKey(PeriodoAcademico, on_delete=models.PROTECT, related_name='solicitudes_tutor')
    nota_corte1 = models.DecimalField(max_digits=3, decimal_places=2, validators=NOTA, verbose_name='nota_corte1')
    nota_corte2 = models.DecimalField(max_digits=3, decimal_places=2, validators=NOTA, verbose_name='nota_corte2')
    nota_corte3 = models.DecimalField(max_digits=3, decimal_places=2, validators=NOTA, verbose_name='nota_corte3')
    nota_final = models.DecimalField(max_digits=3, decimal_places=2, verbose_name='nota_final')
    estado = models.CharField(max_length=10, choices=ESTADO_SOLICITUD_CHOICES, default='PENDIENTE', verbose_name='estado')
    revisada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='solicitudes_revisadas'
    )
    fecha_revision = models.DateTimeField(null=True, blank=True, verbose_name='fecha_revision')
    motivo = models.TextField(null=True, blank=True, verbose_name='motivo')

    def __str__(self):
        return f'{self.estudiante} - {self.materia} ({self.estado})'

    class Meta:
        verbose_name = 'Solicitud de tutor'
        verbose_name_plural = 'Solicitudes de tutor'
        ordering = ['-id']
        constraints = [
            # Una sola solicitud pendiente o aprobada por materia y periodo.
            models.UniqueConstraint(
                fields=['estudiante', 'materia', 'periodo'],
                condition=models.Q(estado__in=('PENDIENTE', 'APROBADA')),
                name='ux_solicitud_vigente',
            ),
        ]

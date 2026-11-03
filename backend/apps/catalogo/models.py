from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.models import BaseModel


class ProgramaAcademico(BaseModel):
    codigo = models.CharField(max_length=20, unique=True, verbose_name='codigo')
    nombre = models.CharField(max_length=150, verbose_name='nombre')
    facultad = models.CharField(max_length=100, null=True, blank=True, verbose_name='facultad')
    activo = models.BooleanField(default=True, verbose_name='activo')

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = 'Programa académico'
        verbose_name_plural = 'Programas académicos'
        ordering = ['id']


class PeriodoAcademico(BaseModel):
    codigo = models.CharField(max_length=10, unique=True, verbose_name='codigo')
    fecha_inicio = models.DateField(verbose_name='fecha_inicio')
    fecha_fin = models.DateField(verbose_name='fecha_fin')
    activo = models.BooleanField(default=False, verbose_name='activo')

    def __str__(self):
        return self.codigo

    class Meta:
        verbose_name = 'Periodo académico'
        verbose_name_plural = 'Periodos académicos'
        ordering = ['id']
        constraints = [
            # BE-25: solo un periodo activo a la vez.
            models.UniqueConstraint(
                fields=['activo'],
                condition=models.Q(activo=True),
                name='ux_periodo_un_activo',
            ),
        ]


class Materia(BaseModel):
    codigo = models.CharField(max_length=20, unique=True, verbose_name='codigo')
    nombre = models.CharField(max_length=150, verbose_name='nombre')
    creditos = models.SmallIntegerField(default=3, verbose_name='creditos')
    semestre = models.SmallIntegerField(null=True, blank=True, verbose_name='semestre')
    programa = models.ForeignKey(ProgramaAcademico, on_delete=models.PROTECT, related_name='materias')
    activa = models.BooleanField(default=True, verbose_name='activa')

    def __str__(self):
        return f'{self.codigo} - {self.nombre}'

    class Meta:
        verbose_name = 'Materia'
        verbose_name_plural = 'Materias'
        ordering = ['id']


class DocenteMateria(BaseModel):
    docente = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='materias_asignadas')
    materia = models.ForeignKey(Materia, on_delete=models.CASCADE, related_name='docentes')
    periodo = models.ForeignKey(PeriodoAcademico, on_delete=models.CASCADE, related_name='docentes_materias')

    def __str__(self):
        return f'{self.docente} - {self.materia} - {self.periodo}'

    class Meta:
        verbose_name = 'Docente - Materia'
        verbose_name_plural = 'Docentes - Materias'
        ordering = ['id']
        constraints = [
            models.UniqueConstraint(fields=['docente', 'materia', 'periodo'], name='ux_docente_materia')
        ]


class Inscripcion(BaseModel):
    estudiante = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='inscripciones')
    materia = models.ForeignKey(Materia, on_delete=models.CASCADE, related_name='inscripciones')
    periodo = models.ForeignKey(PeriodoAcademico, on_delete=models.CASCADE, related_name='inscripciones')

    def __str__(self):
        return f'{self.estudiante} - {self.materia} - {self.periodo}'

    class Meta:
        verbose_name = 'Inscripción'
        verbose_name_plural = 'Inscripciones'
        ordering = ['id']
        constraints = [
            models.UniqueConstraint(fields=['estudiante', 'materia', 'periodo'], name='ux_inscripcion')
        ]

class Configuracion(BaseModel):
    """Parámetros de las reglas de tutorías (sección 7.1). Una sola fila,
    que editan la coordinación y el administrador: nada fijo en el código."""
    nota_minima = models.DecimalField(
        max_digits=3, decimal_places=2, default=Decimal('4.00'),
        validators=[MinValueValidator(0), MaxValueValidator(5)], verbose_name='nota_minima'
    )
    peso_corte1 = models.PositiveSmallIntegerField(default=30, validators=[MaxValueValidator(100)], verbose_name='peso_corte1')
    peso_corte2 = models.PositiveSmallIntegerField(default=30, validators=[MaxValueValidator(100)], verbose_name='peso_corte2')
    peso_corte3 = models.PositiveSmallIntegerField(default=40, validators=[MaxValueValidator(100)], verbose_name='peso_corte3')
    semestre_minimo_tutor = models.PositiveSmallIntegerField(default=3, validators=[MinValueValidator(1)], verbose_name='semestre_minimo_tutor')
    diferencia_semestres = models.PositiveSmallIntegerField(default=2, verbose_name='diferencia_semestres')
    cupos_semanales_tutor = models.PositiveSmallIntegerField(default=10, validators=[MinValueValidator(1)], verbose_name='cupos_semanales_tutor')
    horas_anticipacion_cancelar = models.PositiveSmallIntegerField(default=1, verbose_name='horas_anticipacion_cancelar')
    horas_anticipacion_reservar = models.PositiveSmallIntegerField(default=2, verbose_name='horas_anticipacion_reservar')
    calificacion_minima = models.PositiveSmallIntegerField(default=1, verbose_name='calificacion_minima')
    calificacion_maxima = models.PositiveSmallIntegerField(default=10, verbose_name='calificacion_maxima')

    def __str__(self):
        return 'Configuración de tutorías'

    @classmethod
    def actual(cls):
        return cls.objects.get_or_create(pk=1)[0]

    class Meta:
        verbose_name = 'Configuración'
        verbose_name_plural = 'Configuración'
        constraints = [
            models.CheckConstraint(condition=models.Q(id=1), name='ck_configuracion_unica'),
        ]

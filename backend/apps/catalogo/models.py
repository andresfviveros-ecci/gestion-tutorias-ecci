from django.db import models
from django.conf import settings
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
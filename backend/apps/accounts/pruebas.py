""" DATOS COMPARTIDOS PARA LAS PRUEBAS DE LAS APPS """
from datetime import date, time, timedelta
from itertools import count

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

from apps.catalogo.models import (
    DocenteMateria,
    Materia,
    PeriodoAcademico,
    ProgramaAcademico,
)
from apps.disponibilidad.models import BloqueDisponibilidad
from apps.tutorias.models import Tutoria

CLAVE = 'Clave2026*'
_secuencia = count(1)


def crear_usuario(grupo):
    n = next(_secuencia)
    user = get_user_model().objects.create_user(
        username=f'{grupo.lower()}{n}',
        email=f'{grupo.lower()}{n}@ecci.edu.co',
        password=CLAVE,
        documento=f'90000{n:05d}',
        rol=grupo,
    )
    user.groups.add(Group.objects.get_or_create(name=grupo)[0])
    return user


def crear_catalogo():
    n = next(_secuencia)
    programa = ProgramaAcademico.objects.create(codigo=f'PRG{n}', nombre='Ingeniería de Sistemas')
    # Solo puede haber un periodo activo (BE-25).
    PeriodoAcademico.objects.filter(activo=True).update(activo=False)
    periodo = PeriodoAcademico.objects.create(
        codigo=f'P{n}',
        fecha_inicio=date.today() - timedelta(days=30),
        fecha_fin=date.today() + timedelta(days=90),
        activo=True,
    )
    materia = Materia.objects.create(codigo=f'MAT{n}', nombre='Cálculo I', programa=programa)
    return programa, periodo, materia


def asignar_materia(docente, materia, periodo):
    """Sin asignación el docente no puede publicar bloques en la materia."""
    return DocenteMateria.objects.get_or_create(docente=docente, materia=materia, periodo=periodo)[0]


def crear_bloque(docente, periodo, materia, **extra):
    datos = {
        'fecha': date.today() + timedelta(days=7),
        'hora_inicio': time(8, 0),
        'hora_fin': time(9, 0),
        'modalidad': 'PRESENCIAL',
        'cupo_total': 2,
    }
    datos.update(extra)
    return BloqueDisponibilidad.objects.create(docente=docente, periodo=periodo, materia=materia, **datos)


def crear_tutoria(bloque, estudiante, estado='RESERVADA'):
    return Tutoria.objects.create(
        codigo=f'TUT-PRUEBA-{next(_secuencia)}',
        bloque=bloque,
        estudiante=estudiante,
        tema='Derivadas',
        estado=estado,
    )

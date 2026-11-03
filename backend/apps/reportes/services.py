""" INDICADORES DEL PANEL DE COORDINACIÓN """
from datetime import date

from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Q

from apps.tutorias.estados import CANCELADOS
from apps.tutorias.models import Tutoria

# Las canceladas y anuladas no cuentan como tutorías del mes.
ESTADOS_EXCLUIDOS = CANCELADOS


def indicadores_panel(hoy=None):
    hoy = hoy or date.today()
    User = get_user_model()
    tutorias_mes = Tutoria.objects.filter(
        bloque__fecha__year=hoy.year,
        bloque__fecha__month=hoy.month,
    ).exclude(estado__in=ESTADOS_EXCLUIDOS)
    total = tutorias_mes.count()

    mas_demandada = (
        tutorias_mes.exclude(bloque__materia=None)
        .values('bloque__materia__nombre')
        .annotate(total=Count('id'))
        .order_by('-total', 'bloque__materia__nombre')
        .first()
    )

    return {
        'tutorias_mes': total,
        'estudiantes_activos': User.objects.filter(groups__name='Estudiante', is_active=True).count(),
        'tutores_activos': User.objects.filter(groups__name='Docente', is_active=True).count(),
        'materia_mas_demandada': mas_demandada['bloque__materia__nombre'] if mas_demandada else None,
        'porcentaje_demandada': (
            f"{round(mas_demandada['total'] * 100 / total)}%" if mas_demandada else '0%'
        ),
    }


def reporte_tutores(periodo):
    """RF-09: por cada tutor con tutorías en el periodo, cuántas tuvo, cómo
    terminaron y el promedio de sus evaluaciones."""
    filas = (
        Tutoria.objects.filter(bloque__periodo=periodo)
        .values('bloque__docente')
        .annotate(
            tutorias=Count('id'),
            completadas=Count('id', filter=Q(estado='COMPLETADA')),
            no_asistio=Count('id', filter=Q(estado='NO_ASISTIO')),
            canceladas_por_tutor=Count('id', filter=Q(estado='CANCELADA_DOCENTE')),
            evaluaciones=Count('evaluacion'),
            promedio=Avg('evaluacion__calificacion'),
        )
    )
    User = get_user_model()
    tutores = User.objects.in_bulk([fila['bloque__docente'] for fila in filas])
    docentes = set(User.objects.filter(pk__in=tutores, groups__name='Docente').values_list('pk', flat=True))

    reporte = []
    for fila in filas:
        tutor = tutores[fila.pop('bloque__docente')]
        promedio = fila.pop('promedio')
        reporte.append({
            'id': tutor.pk,
            'nombre': tutor.get_full_name(),
            'tipo': 'Docente' if tutor.pk in docentes else 'Estudiante',
            **fila,
            'promedio_calificacion': round(promedio, 2) if promedio is not None else None,
        })
    # Primero los mejor calificados; los que no tienen evaluaciones, al final.
    return sorted(reporte, key=lambda f: (f['promedio_calificacion'] is None, -(f['promedio_calificacion'] or 0), f['nombre']))

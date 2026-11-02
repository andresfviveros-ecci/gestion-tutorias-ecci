""" INDICADORES DEL PANEL DE COORDINACIÓN """
from datetime import date

from django.contrib.auth import get_user_model
from django.db.models import Count

from apps.tutorias.models import Tutoria

# Las canceladas no cuentan como tutorías del mes.
ESTADOS_EXCLUIDOS = ('CANCELADA_ESTUDIANTE', 'CANCELADA_DOCENTE')


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

import django.core.validators
from django.db import migrations, models


def revisar_calificaciones(apps, schema_editor):
    """Se detiene con un mensaje claro: las calificaciones no se cambian solas."""
    Evaluacion = apps.get_model('tutorias', 'EvaluacionTutoria')
    fuera = Evaluacion.objects.exclude(calificacion__range=(1, 10))
    if fuera.exists():
        ids = list(fuera.values_list('id', flat=True)[:20])
        raise RuntimeError(
            f'Hay {fuera.count()} evaluaciones con calificación fuera de 1 a 10 '
            f'(ids: {ids}). Corrígelas antes de migrar.'
        )


class Migration(migrations.Migration):

    dependencies = [
        ('tutorias', '0004_estados_rf10'),
    ]

    operations = [
        migrations.RunPython(revisar_calificaciones, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='evaluaciontutoria',
            name='calificacion',
            field=models.SmallIntegerField(validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(10)], verbose_name='calificacion'),
        ),
        migrations.AddConstraint(
            model_name='evaluaciontutoria',
            constraint=models.CheckConstraint(condition=models.Q(('calificacion__gte', 1), ('calificacion__lte', 10)), name='ck_evaluacion_calificacion'),
        ),
    ]

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalogo', '0003_configuracion'),
    ]

    operations = [
        migrations.AlterField(
            model_name='configuracion',
            name='calificacion_minima',
            field=models.PositiveSmallIntegerField(default=1, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(10)], verbose_name='calificacion_minima'),
        ),
        migrations.AlterField(
            model_name='configuracion',
            name='calificacion_maxima',
            field=models.PositiveSmallIntegerField(default=10, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(10)], verbose_name='calificacion_maxima'),
        ),
    ]

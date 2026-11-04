from django.db import migrations


def separar_canceladas(apps, schema_editor):
    """BE-06: el estado CANCELADA no existe en las opciones. Hasta ahora solo
    cancelaba el estudiante, así que todas pasan a CANCELADA_ESTUDIANTE."""
    Tutoria = apps.get_model('tutorias', 'Tutoria')
    Tutoria.objects.filter(estado='CANCELADA').update(estado='CANCELADA_ESTUDIANTE')


def unir_canceladas(apps, schema_editor):
    Tutoria = apps.get_model('tutorias', 'Tutoria')
    Tutoria.objects.filter(estado='CANCELADA_ESTUDIANTE').update(estado='CANCELADA')


class Migration(migrations.Migration):

    dependencies = [
        ('tutorias', '0002_tutoria_idx_tutoria_estudiante_and_more'),
    ]

    operations = [
        migrations.RunPython(separar_canceladas, unir_canceladas),
    ]

from django.db import migrations

GRUPOS = ('Estudiante', 'Docente', 'Coordinador')


def crear_grupos(apps, schema_editor):
    """Los grupos los creaba solo datos_prueba; en una base vacía crear un
    usuario respondía 500 porque el grupo no existía."""
    Group = apps.get_model('auth', 'Group')
    for nombre in GRUPOS:
        Group.objects.get_or_create(name=nombre)


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_user_email_unico'),
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.RunPython(crear_grupos, migrations.RunPython.noop),
    ]

from django.db import migrations


def crear_grupo(apps, schema_editor):
    """RF-05: el Administrador gestiona a los coordinadores."""
    apps.get_model('auth', 'Group').objects.get_or_create(name='Administrador')


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_user_semestre'),
    ]

    operations = [
        migrations.RunPython(crear_grupo, migrations.RunPython.noop),
    ]

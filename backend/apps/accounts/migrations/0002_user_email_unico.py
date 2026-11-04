from django.db import migrations, models
from django.db.models.functions import Lower


def revisar_duplicados(apps, schema_editor):
    """Falla con un mensaje claro si hay correos repetidos: hay que limpiarlos
    a mano antes de aplicar la restricción."""
    User = apps.get_model('accounts', 'User')
    repetidos = (
        User.objects.exclude(email='')
        .annotate(correo=Lower('email'))
        .values('correo')
        .annotate(total=models.Count('id'))
        .filter(total__gt=1)
        .values_list('correo', flat=True)
    )
    if repetidos:
        raise RuntimeError(
            'Hay correos repetidos (sin distinguir mayúsculas): '
            + ', '.join(repetidos)
            + '. Corrígelos antes de migrar.'
        )


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(revisar_duplicados, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name='user',
            constraint=models.UniqueConstraint(
                Lower('email'),
                condition=models.Q(('email', ''), _negated=True),
                name='ux_user_email_ci',
            ),
        ),
    ]

""" NOTIFICACIONES
Toda notificación queda guardada para mostrarla en la aplicación; las que
llevan correo lo envían después del commit, para que un fallo de SMTP no
deshaga la operación que la generó. """
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction

from .models import Notificacion


def notificar(usuario, tipo, titulo, mensaje, tutoria=None, correo=False):
    notificacion = Notificacion.objects.create(
        usuario=usuario,
        tutoria=tutoria,
        tipo=tipo,
        titulo=titulo,
        mensaje=mensaje,
    )
    if correo:
        transaction.on_commit(lambda: enviar_correo(notificacion))
    return notificacion


def enviar_correo(notificacion):
    enviados = send_mail(
        notificacion.titulo,
        notificacion.mensaje,
        settings.DEFAULT_FROM_EMAIL,
        [notificacion.usuario.email],
        fail_silently=True,
    )
    if enviados:
        Notificacion.objects.filter(pk=notificacion.pk).update(enviada_email=True)

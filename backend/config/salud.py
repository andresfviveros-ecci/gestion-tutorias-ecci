""" SALUD DEL SERVICIO
Lo consulta el healthcheck de Railway (y cualquier monitor) para saber si
el backend está listo: responde 200 solo si la base de datos contesta. Es una
vista de Django sin DRF, así que no pide sesión ni sale en Swagger. """
from django.db import DatabaseError, connection
from django.http import JsonResponse


def salud(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
    except DatabaseError:
        return JsonResponse({'estado': 'sin base de datos'}, status=503)
    return JsonResponse({'estado': 'ok'})

#!/bin/sh
# Arranque de producción (Railway, VPS o «docker run»). docker-compose no lo
# usa: arranca el contenedor con su propio comando y runserver.
set -e

# Migraciones y tabla de la caché (PIN de recuperación y límites de intentos).
python manage.py migrate --noinput
python manage.py createcachetable

# Datos de prueba solo si se piden, para una demo. Con DEBUG apagado el comando
# exige --force: SEED_DEMO=1 ya es esa confirmación. Sin --reset no borra nada
# y, si los datos ya están, no hace nada. En producción real, SEED_DEMO=0.
if [ "$SEED_DEMO" = "1" ]; then
    python manage.py datos_prueba --force
fi

# Railway define PORT; en local queda 8000. WEB_CONCURRENCY = procesos de gunicorn.
exec gunicorn config.wsgi:application \
    --bind "0.0.0.0:${PORT:-8000}" \
    --workers "${WEB_CONCURRENCY:-2}" \
    --timeout "${GUNICORN_TIMEOUT:-60}" \
    --access-logfile -

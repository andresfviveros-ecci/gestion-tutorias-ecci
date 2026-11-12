import os

import dj_database_url

# Conexión a PostgreSQL.
# - En Railway (y en cualquier PaaS) la base llega en una sola variable,
#   DATABASE_URL, y tiene prioridad.
# - En docker-compose llega por partes desde el .env; los valores por defecto
#   coinciden con el servicio "db" del compose.
if os.getenv('DATABASE_URL'):
    POSTGRES = {
        # Reusa la conexión hasta 60 s y la revisa antes de usarla, para no
        # abrir una nueva en cada petición ni fallar si la base la cerró.
        'default': dj_database_url.config(conn_max_age=60, conn_health_checks=True),
    }
else:
    POSTGRES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('POSTGRES_DB', 'tutorias_ecci'),
            'USER': os.getenv('POSTGRES_USER', 'tutorias_user'),
            'PASSWORD': os.getenv('POSTGRES_PASSWORD', 'change_me_secure_password'),
            'HOST': os.getenv('POSTGRES_HOST', 'db'),
            'PORT': os.getenv('POSTGRES_INTERNAL_PORT', '5432'),
        }
    }

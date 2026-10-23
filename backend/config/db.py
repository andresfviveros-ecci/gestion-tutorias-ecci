import os

# Conexión a PostgreSQL. docker-compose pasa estas variables desde el .env;
# los valores por defecto coinciden con el servicio "db" del compose.
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

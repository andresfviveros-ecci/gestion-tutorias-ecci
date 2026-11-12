# Imagen del backend. La misma sirve para dos cosas:
#   - docker-compose (desarrollo): monta el código y arranca con runserver.
#   - producción (Railway, VPS, CD a GHCR): por defecto corre start.sh, que
#     migra y levanta gunicorn en el puerto $PORT.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /backend

# Primero las dependencias, para que Docker reuse esta capa si solo cambia el código.
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Estáticos del admin y de Swagger, servidos por whitenoise. DEBUG=True solo
# para este paso: collectstatic no necesita la clave secreta ni la base.
RUN DJANGO_DEBUG=True python manage.py collectstatic --noinput

# Sin root en producción.
RUN useradd --create-home --uid 1000 app && chown -R app /backend
USER app

EXPOSE 8000
CMD ["sh", "start.sh"]

# Backend — Gestión de Tutorías Académicas

Backend del sistema de **Gestión de Tutorías Académicas**, desarrollado con Django y Django REST Framework.

Proyecto académico de la asignatura **Gestión de Software** — Ingeniería en Sistemas, Universidad ECCI (Cali), octavo semestre.

El detalle de modelos, endpoints y reglas de negocio está en [DOCUMENTACION_BACKEND.md](DOCUMENTACION_BACKEND.md).

---

## Stack tecnológico

| Tecnología            | Versión |
| --------------------- | ------- |
| Python                | 3.10    |
| Django                | 5.2.18  |
| Django REST Framework | 3.18.3  |
| PostgreSQL            | 16      |
| SimpleJWT             | 5.5.1   |
| drf-spectacular       | 0.30.0  |
| django-filter         | 26.1    |
| django-cors-headers   | 4.9.0   |
| Docker                | —       |
| Docker Compose        | —       |

`django-filter` se mantiene en 26.1 porque la 26.2 exige Python 3.11.

---

## Estructura del backend

```text
backend/
├── apps/
│   ├── accounts/          # usuarios, roles, autenticación y comando datos_prueba
│   ├── catalogo/          # programas, materias, periodos, asignaciones e inscripciones
│   ├── disponibilidad/    # bloques horarios
│   ├── tutorias/          # reservas, asistencia, cancelaciones y evaluaciones
│   ├── reportes/          # modelo de auditoría (sin endpoints todavía)
│   ├── notificaciones/    # modelo de notificaciones (sin endpoints todavía)
│   └── models.py          # BaseModel con campos de auditoría
│
├── config/                # configuración de Django
│   ├── settings.py
│   ├── urls.py
│   ├── db.py
│   ├── asgi.py
│   └── wsgi.py
│
├── Dockerfile
├── pytest.ini
├── manage.py
└── requirements.txt
```

---

## Puesta en marcha

**Requisitos:** Docker y Docker Compose instalados.

Desde la raíz del proyecto:

```bash
# 1. Crear el .env a partir de la plantilla
cp .env.example .env

# 2. Levantar los servicios en segundo plano
docker compose up -d --build
```

Al arrancar, el contenedor del backend aplica las migraciones, carga los datos de prueba (si `SEED_DEMO=1`) y levanta el servidor de desarrollo.

---

## Migraciones

Crear migraciones después de modificar los modelos:

```bash
docker compose exec tutorias-django python manage.py makemigrations
```

Aplicar las migraciones (también se aplican solas al arrancar el contenedor):

```bash
docker compose exec tutorias-django python manage.py migrate
```

---

## Datos de prueba

```bash
# Cargar (si ya existen, no hace nada)
docker compose exec tutorias-django python manage.py datos_prueba

# Borrar solo los datos de prueba y volver a crearlos con fechas actualizadas
docker compose exec tutorias-django python manage.py datos_prueba --reset
```

Todos los usuarios de prueba tienen la contraseña `Aula2026*`. Accesos rápidos: `coordinador@aulalibre.test`, `docente@aulalibre.test`, `estudiante@aulalibre.test` y `admin@aulalibre.test` (superusuario para `/admin`).

---

## Comandos básicos

`tutorias-django` es el nombre del **servicio** en docker-compose; el contenedor se llama `tutorias_ecci`.

Ver los contenedores:

```bash
docker compose ps
```

Ver los logs del backend:

```bash
docker compose logs -f tutorias-django
```

Detener los servicios:

```bash
docker compose down
```

Verificar la configuración de Django:

```bash
docker compose exec tutorias-django python manage.py check
```

Abrir la consola de Django:

```bash
docker compose exec tutorias-django python manage.py shell
```

Crear un superusuario:

```bash
docker compose exec tutorias-django python manage.py createsuperuser
```

---

## Base de datos

El backend utiliza **PostgreSQL 16**, ejecutado mediante Docker.

La configuración de conexión está en `config/db.py` y se lee de variables de entorno que docker-compose toma del `.env`:

| Variable | Valor por defecto |
| --- | --- |
| `POSTGRES_DB` | `tutorias_ecci` |
| `POSTGRES_USER` | `tutorias_user` |
| `POSTGRES_PASSWORD` | `change_me_secure_password` |
| `POSTGRES_HOST` | `db` |
| `POSTGRES_INTERNAL_PORT` | `5432` |

Dentro de la red de Docker el backend siempre se conecta a `db:5432`. `POSTGRES_PORT` del `.env` solo cambia el puerto publicado en tu máquina (para conectarte con DBeaver o pgAdmin).

El volumen de PostgreSQL conserva los datos aunque los contenedores se detengan o se recreen. `docker compose down -v` sí los borra.

---

## Otras variables de entorno del backend

| Variable | Uso | Por defecto |
| --- | --- | --- |
| `DJANGO_DEBUG` | Modo debug | `True` |
| `DJANGO_SECRET_KEY` | Clave secreta | clave de desarrollo |
| `DJANGO_ALLOWED_HOSTS` | Hosts permitidos, separados por coma | `*` |
| `CORS_ALLOWED_ORIGINS` | Orígenes del frontend, separados por coma. docker-compose lo arma con `FRONTEND_PORT` | `http://localhost:5173,http://127.0.0.1:5173` |
| `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` | Correo de Gmail para la recuperación de contraseña | vacío |
| `SEED_DEMO` | `1` carga los datos de prueba al arrancar | `1` |

---

## Acceso

Una vez levantados los servicios (con los puertos por defecto):

| Servicio             | URL                              |
| -------------------- | -------------------------------- |
| Backend (redirige a Swagger) | http://localhost:8000    |
| Swagger UI           | http://localhost:8000/api/docs/  |
| Esquema OpenAPI      | http://localhost:8000/api/schema/ |
| Panel administrativo | http://localhost:8000/admin/     |
| Frontend             | http://localhost:5173            |

---

## Pruebas

Todavía no hay pruebas escritas (los `tests.py` tienen la plantilla de Django). El entorno ya está listo para pytest:

```bash
docker compose exec tutorias-django pytest
```

Con cobertura:

```bash
docker compose exec tutorias-django pytest --cov=apps
```

El CI corre `python manage.py test`, que encuentra las mismas pruebas.

---

## Desarrollo

El código local de `backend/` está montado dentro del contenedor, así que los cambios se reflejan sin reconstruir la imagen (el servidor de desarrollo se reinicia solo).

Después de cambiar `requirements.txt` o el `Dockerfile`, reconstruir:

```bash
docker compose up -d --build
```

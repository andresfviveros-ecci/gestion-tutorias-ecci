# Backend — Gestión de Tutorías Académicas

Backend del sistema de **Gestión de Tutorías Académicas**, desarrollado con Django y Django REST Framework.

Proyecto académico de la asignatura **Gestión de Software** — Ingeniería en Sistemas, Universidad ECCI (Cali), octavo semestre.

---

## Stack tecnológico

| Tecnología            | Versión |
| --------------------- | ------- |
| Python                | 3.10    |
| Django                | 5.2.17  |
| Django REST Framework | 3.18.1  |
| PostgreSQL            | 16      |
| SimpleJWT             | 5.5.1   |
| django-filter         | 26.1    |
| django-cors-headers   | 4.9.0   |
| Docker                | —       |
| Docker Compose        | —       |

---

## Estructura del backend

```text
backend/
├── apps/
│   ├── accounts/          # usuarios, roles y autenticación
│   ├── catalogo/          # programas, materias y periodos
│   ├── disponibilidad/    # bloques horarios
│   ├── tutorias/          # reservas, asistencia y cancelaciones
│   ├── reportes/          # indicadores
│   └── notificaciones/    # correos y avisos
│
├── config/                # configuración de Django
│   ├── settings.py
│   ├── urls.py
│   ├── db.py
│   ├── asgi.py
│   └── wsgi.py
│
├── Dockerfile
├── manage.py
└── requirements.txt
```

---

## Puesta en marcha

**Requisitos:** Docker y Docker Compose instalados.

Desde la raíz del proyecto:

```bash
# 1. Levantar los servicios
docker-compose up

# 2. O levantar en segundo plano
docker-compose up -d
```

El servicio de Django se inicia automáticamente mediante Docker Compose.

---

## Migraciones

Crear migraciones después de modificar los modelos:

```bash
docker-compose exec tutorias-django python manage.py makemigrations
```

Aplicar las migraciones:

```bash
docker-compose exec tutorias-django python manage.py migrate
```

---

## Comandos básicos

Ver los contenedores:

```bash
docker-compose ps
```

Ver los logs del backend:

```bash
docker-compose logs -f tutorias-django
```

Detener los servicios:

```bash
docker-compose down
```

Verificar la configuración de Django:

```bash
docker-compose exec tutorias-django python manage.py check
```

Abrir la consola de Django:

```bash
docker-compose exec tutorias-django python manage.py shell
```

Crear un superusuario:

```bash
docker-compose exec tutorias-django python manage.py createsuperuser
```

---

## Base de datos

El backend utiliza **PostgreSQL 16**, ejecutado mediante Docker.

La configuración de conexión se encuentra en:

```text
config/db.py
```

El backend se conecta al servicio PostgreSQL mediante:

```text
HOST=db
PORT=5432
```

El volumen de PostgreSQL permite conservar los datos aunque los contenedores sean detenidos o recreados.

---

## Acceso

Una vez levantados los servicios:

| Servicio             | URL                          |
| -------------------- | ---------------------------- |
| Backend              | http://localhost:8000        |
| Panel administrativo | http://localhost:8000/admin/ |

---

## Pruebas

Ejecutar las pruebas del backend:

```bash
docker-compose exec tutorias-django pytest
```

Ejecutar pruebas con cobertura:

```bash
docker-compose exec tutorias-django pytest --cov=apps
```

---

## Desarrollo

El código local de `backend/` está montado dentro del contenedor de Django.

Por lo tanto, los cambios realizados en el código se reflejan directamente en el contenedor durante el desarrollo.

Para iniciar nuevamente el entorno después de realizar cambios en Docker:

```bash
docker-compose up -d --build
```

# Documentación del backend

## Gestión de Tutorías Académicas — Universidad ECCI

Esta guía explica cómo está organizado el backend, qué información administra y cómo se comportan sus principales endpoints. Está dirigida a quien continúe el desarrollo y necesite familiarizarse con el código existente.

> La documentación describe el estado actual del código. Las funciones incompletas y los aspectos que conviene revisar están señalados al final.

## Contenido

- [Descripción](#descripción)
- [Tecnologías](#tecnologías)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Configuración general](#configuración-general)
- [Modelo de datos](#modelo-de-datos)
- [Autenticación y cuentas](#autenticación-y-cuentas)
- [Catálogo académico](#catálogo-académico)
- [Disponibilidad docente](#disponibilidad-docente)
- [Reservas y tutorías](#reservas-y-tutorías)
- [Documentación interactiva](#documentación-interactiva)
- [Ejecución y migraciones](#ejecución-y-migraciones)
- [Estado actual y aspectos por revisar](#estado-actual-y-aspectos-por-revisar)

## Descripción

El backend expone una API REST para gestionar usuarios, materias, programas académicos, periodos, disponibilidad docente y reservas de tutorías. Está desarrollado con Django y Django REST Framework, y utiliza PostgreSQL como base de datos.

La API incluye autenticación mediante tokens JWT y documentación interactiva con Swagger.

## Tecnologías

Las versiones fijadas en `requirements.txt` incluyen:

| Tecnología | Versión o uso |
| --- | --- |
| Python | 3.10 |
| Django | 5.2.18 |
| Django REST Framework | 3.18.3 |
| SimpleJWT | 5.5.1 |
| PostgreSQL | Base de datos, mediante `psycopg` |
| drf-spectacular | Generación del esquema OpenAPI y Swagger |
| django-cors-headers | Configuración de CORS para el frontend |
| django-import-export | Funciones de importación y exportación en el admin |

También están instalados Celery, Redis, pytest y Ruff. En el código revisado no se encontraron tareas de Celery ni configuración de Redis. Los archivos `tests.py` de las aplicaciones no contienen pruebas funcionales.

## Estructura del proyecto

```text
backend/
├── apps/
│   ├── accounts/          # Usuarios, roles, autenticación y recuperación
│   ├── catalogo/          # Programas, materias, periodos e inscripciones
│   ├── disponibilidad/    # Bloques y plantillas de disponibilidad
│   ├── tutorias/          # Reservas, cancelaciones y evaluaciones
│   ├── notificaciones/    # Modelo de notificaciones
│   ├── reportes/          # Modelo de auditoría
│   └── models.py          # Modelo abstracto de auditoría común
├── config/
│   ├── settings.py        # Configuración de Django y REST Framework
│   ├── urls.py            # Rutas principales de la API
│   ├── db.py              # Conexión a PostgreSQL
│   ├── asgi.py
│   └── wsgi.py
├── Dockerfile
├── manage.py
└── requirements.txt
```

Las aplicaciones contienen modelos, vistas, serializers y rutas según la funcionalidad que implementan. Las migraciones describen los cambios del esquema de la base de datos.

## Configuración general

Django registra las aplicaciones `accounts`, `catalogo`, `disponibilidad`, `notificaciones`, `reportes` y `tutorias`. El modelo de usuario configurado es `accounts.User`.

La configuración usa español, la zona horaria `America/Bogota` (con `USE_TZ = False`, así que las fechas se guardan sin zona horaria) y PostgreSQL. Las solicitudes protegidas se autentican mediante JWT. CORS toma los orígenes permitidos de la variable `CORS_ALLOWED_ORIGINS`; por defecto, `http://localhost:5173` y `http://127.0.0.1:5173`. Con Docker, docker-compose la arma con `FRONTEND_PORT`.

La raíz `/` redirige a Swagger. La conexión a PostgreSQL está en `config/db.py` y lee `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST` y `POSTGRES_INTERNAL_PORT`, con los mismos valores por defecto que usa el servicio `db` de docker-compose. `DEBUG`, `SECRET_KEY` y `ALLOWED_HOSTS` también se leen de variables (`DJANGO_DEBUG`, `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`).

## Modelo de datos

### Usuarios

`accounts.User` amplía el usuario estándar de Django y añade estos campos:

- `documento`: identificador único.
- `telefono`: teléfono de contacto.
- `codigo_institucional`: código único, opcional.
- `rol`: rol guardado como texto.
- `foto_url`: dirección de la foto, opcional.

Los serializers de registro asignan los roles `Estudiante`, `Docente` o `Coordinador` y agregan al usuario al grupo de Django con el mismo nombre. Esos grupos deben existir en la base de datos para que el registro funcione. El comando `datos_prueba` los crea; no hay todavía una migración de datos que los cree en una base vacía sin datos de prueba.

### Catálogo académico

- **ProgramaAcademico:** código, nombre, facultad y estado activo.
- **Materia:** código, nombre, créditos, semestre, programa relacionado y estado activo.
- **PeriodoAcademico:** código, fechas de inicio y fin, y estado activo.
- **DocenteMateria:** relación entre docente, materia y periodo. No permite repetir la misma combinación.
- **Inscripcion:** relación entre estudiante, materia y periodo. No permite repetir la misma combinación.

Estos modelos heredan los campos de auditoría de `BaseModel`.

### Disponibilidad

- **BloqueDisponibilidad:** fecha y franja horaria ofrecida por un docente. Puede estar asociada a materia y periodo; también guarda modalidad, lugar o enlace virtual, cupos, estado y observaciones.
- **PlantillaDisponibilidad:** disponibilidad recurrente por día de la semana. Actualmente no hay endpoints para administrarla.

Las modalidades son `PRESENCIAL` y `VIRTUAL`. Los estados de un bloque son `DISPONIBLE`, `COMPLETO`, `CANCELADO` y `CERRADO`.

### Tutorías

- **Tutoria:** reserva de un estudiante sobre un bloque. Incluye código, tema, descripción, estado, asistencia, retraso, horas reales, notas y compromisos.
- **Cancelacion:** registra quién canceló, el origen, el motivo, las horas previas y si hubo penalización.
- **EvaluacionTutoria:** evaluación asociada uno a uno con una tutoría.

Los estados definidos para una tutoría son `RESERVADA`, `CONFIRMADA`, `EN_CURSO`, `COMPLETADA`, `CANCELADA_ESTUDIANTE`, `CANCELADA_DOCENTE` y `NO_ASISTIO`.

La base de datos impide que un estudiante tenga más de una tutoría activa para el mismo bloque. También impide valores negativos en `minutos_retraso` y define índices para consultar tutorías por estudiante y estado, y por bloque.

### Auditoría y notificaciones

`BaseModel` es abstracto y ofrece campos de auditoría: usuario y fecha de creación, y usuario y fecha de actualización. Los modelos que heredan de él reciben esos campos sin crear una tabla independiente para `BaseModel`.

`Notificacion` almacena usuario, tutoría opcional, tipo, título, mensaje y los indicadores de lectura y envío por correo. `Auditoria` registra usuario, entidad, acción, datos anteriores y posteriores, e IP. Aunque los modelos existen, no hay endpoints funcionales para consultar o administrar notificaciones o reportes.

## Autenticación y cuentas

Las rutas de cuentas están bajo `/api/accounts/`.

| Método | Ruta | Función y acceso |
| --- | --- | --- |
| POST | `/api/accounts/login/` | Inicia sesión con correo y contraseña; responde con tokens JWT y grupos del usuario. |
| POST | `/api/accounts/recovery/` | Inicia la recuperación para una cuenta activa con correo `@ecci.edu.co`. |
| POST | `/api/accounts/recovery/change-password/` | Cambia la contraseña con el token y el PIN de recuperación. |
| GET, POST | `/api/accounts/estudiantes/` | Lista estudiantes o registra uno. Requiere grupo Coordinador. |
| GET, PUT, DELETE | `/api/accounts/estudiantes/<id>/` | Consulta, actualiza o elimina un estudiante. Requiere grupo Coordinador. |
| GET, POST | `/api/accounts/tutores/` | Lista docentes activos (Coordinador o Estudiante) o registra uno (Coordinador). |
| GET, PUT, DELETE | `/api/accounts/tutores/<id>/` | Consulta, actualiza o elimina un docente. Requiere grupo Coordinador. |
| GET, POST | `/api/accounts/coordinadores/` | Lista coordinadores activos o registra uno. Requiere grupo Coordinador. |
| GET, PUT, DELETE | `/api/accounts/coordinadores/<id>/` | Las operaciones responden `403`; no están implementadas. |

El inicio de sesión busca al usuario por correo y valida su contraseña con el sistema de autenticación de Django. La respuesta incluye los tokens de acceso y renovación, además de los grupos del usuario.

La recuperación genera un PIN de seis dígitos, lo guarda en caché durante cinco minutos y lo envía al correo. Para el envío se requieren las variables de entorno `EMAIL_HOST_USER` y `EMAIL_HOST_PASSWORD`; el código usa el servidor SMTP de Gmail con TLS. El cambio de contraseña verifica token, PIN y confirmación, y exige al menos ocho caracteres, un número y un carácter especial.

La recuperación solo acepta correos `@ecci.edu.co`, así que no funciona con los usuarios de prueba (`@aulalibre.test`). Es intencional: evita que el sistema envíe correos a direcciones inventadas.

## Catálogo académico

Las rutas están bajo `/api/catalogo/`. Todas requieren autenticación, pero las vistas no verifican el grupo o rol del usuario.

| Método | Ruta | Función |
| --- | --- | --- |
| GET, POST | `/api/catalogo/materias/` | Lista o crea materias. |
| GET, PUT, DELETE | `/api/catalogo/materias/<id>/` | Consulta, reemplaza o elimina una materia. |
| GET, POST | `/api/catalogo/programas/` | Lista o crea programas académicos. |
| GET, PUT, PATCH, DELETE | `/api/catalogo/programas/<id>/` | Consulta, actualiza o elimina un programa. |
| GET, POST | `/api/catalogo/periodos/` | Lista o crea periodos académicos. |
| GET, PUT, PATCH, DELETE | `/api/catalogo/periodos/<id>/` | Consulta, actualiza o elimina un periodo. |

El serializer de periodos valida que la fecha de fin sea igual o posterior a la fecha de inicio.

## Disponibilidad docente

Las rutas están bajo `/api/disponibilidad/` y requieren autenticación.

| Método | Ruta | Función |
| --- | --- | --- |
| GET, POST | `/api/disponibilidad/disponibilidad/` | Lista bloques con filtros o crea un bloque para el usuario autenticado. |
| GET, PUT, DELETE | `/api/disponibilidad/<id>/actualizar/` | Consulta, actualiza o elimina un bloque. |

El listado admite los filtros opcionales `docente`, `materia`, `fecha` y `estado`. Al crear o actualizar un bloque, el backend valida que la hora final sea posterior a la inicial, que el cupo sea positivo y que no exista otra disponibilidad del mismo docente con cruce de fecha y horario.

Solo el docente propietario puede actualizar o eliminar su bloque. No se puede reducir el cupo por debajo de los cupos ocupados ni eliminar un bloque que tenga reservas.

## Reservas y tutorías

Las rutas están bajo `/api/tutorias/` y requieren autenticación. Las consultas filtran por `estudiante = usuario autenticado`: un estudiante ve sus reservas, pero un docente o un coordinador recibe una lista vacía aunque haya tutorías en sus bloques (ver "Estado actual").

| Método | Ruta | Función |
| --- | --- | --- |
| GET, POST | `/api/tutorias/tutorias/` | Lista las tutorías propias o reserva una tutoría. |
| GET, PUT, PATCH, DELETE | `/api/tutorias/tutorias/<id>/` | Consulta, edita o cancela una tutoría propia. |

Para reservar, el cliente envía `bloque_id`, `tema` y, opcionalmente, `descripcion`. El backend comprueba que el bloque exista, esté disponible y tenga cupos. También impide que el estudiante cree otra reserva activa en el mismo bloque.

La reserva se ejecuta dentro de una transacción y bloquea el registro de disponibilidad mientras actualiza el cupo. Cuando se ocupa el último cupo, el bloque pasa a estado `COMPLETO`.

La edición y la cancelación solo se permiten mientras la tutoría esté en estado `RESERVADA`. La cancelación exige un motivo y libera un cupo. El detalle de una tutoría incluye el nombre del docente asociado al bloque.

## Documentación interactiva

Con el servidor en ejecución, las rutas son:

| Recurso | URL local |
| --- | --- |
| Swagger UI | `http://localhost:8000/api/docs/` |
| Esquema OpenAPI | `http://localhost:8000/api/schema/` |
| Administración Django | `http://localhost:8000/admin/` |

drf-spectacular genera el esquema OpenAPI y Swagger UI lo presenta de forma interactiva.

## Ejecución y migraciones

El `Dockerfile` prepara una imagen basada en Python 3.10, instala las dependencias y copia el backend. El archivo de Docker Compose está en la raíz del proyecto, por lo que estos comandos deben ejecutarse desde esa carpeta, con los servicios levantados. El **servicio** de Django en docker-compose se llama `tutorias-django` (es el nombre que se usa en `docker compose exec`); el **contenedor** se llama `tutorias_ecci`.

Al arrancar, el contenedor aplica las migraciones, carga los datos de prueba si `SEED_DEMO=1` (solo la primera vez) y levanta `runserver`.

Levantar los servicios:

```bash
docker compose up -d --build
```

Cargar o regenerar los datos de prueba:

```bash
docker compose exec tutorias-django python manage.py datos_prueba
docker compose exec tutorias-django python manage.py datos_prueba --reset
```

Crear migraciones después de modificar modelos:

```bash
docker compose exec tutorias-django python manage.py makemigrations
```

Aplicar las migraciones:

```bash
docker compose exec tutorias-django python manage.py migrate
```

Crear un superusuario:

```bash
docker compose exec tutorias-django python manage.py createsuperuser
```

Verificar la configuración de Django:

```bash
docker compose exec tutorias-django python manage.py check
```

## Estado actual y aspectos por revisar

- `notificaciones` y `reportes` tienen modelos, pero sus vistas son plantillas vacías y estas aplicaciones no están incluidas en las rutas principales.
- `PlantillaDisponibilidad` existe, pero no tiene serializer, vistas ni rutas.
- Los archivos `tests.py` contienen la plantilla inicial de Django; no hay pruebas funcionales implementadas.
- La cancelación guarda el estado `CANCELADA`, pero esa opción no aparece entre los estados definidos para `Tutoria` (`CANCELADA_ESTUDIANTE` y `CANCELADA_DOCENTE`). Conviene revisar esta diferencia.
- Los endpoints del catálogo requieren autenticación, pero no restringen las operaciones de escritura a coordinadores.
- Los endpoints de disponibilidad permiten crear bloques a cualquier usuario autenticado; el docente se asigna al usuario que realiza la solicitud.
- El registro depende de que existan previamente los grupos `Estudiante`, `Docente` y `Coordinador`. El comando `datos_prueba` los crea, pero no hay una migración de datos: con `SEED_DEMO=0` y una base vacía, el registro falla.
- `GET /api/tutorias/tutorias/` y el detalle `/api/tutorias/tutorias/<id>/` filtran solo por estudiante. Un docente no ve las tutorías reservadas en sus bloques.
- Por defecto `DEBUG` está activado y `ALLOWED_HOSTS` permite cualquier host. Para un despliegue hay que definir `DJANGO_DEBUG=False`, `DJANGO_SECRET_KEY` y `DJANGO_ALLOWED_HOSTS`.
- El código de una tutoría es `TUT-<bloque>-<estudiante>` y es único: si un estudiante cancela y vuelve a reservar el mismo bloque, la segunda reserva choca con el código de la primera.
- `celery` y `redis` están en `requirements.txt` pero no hay tareas ni configuración que los use.

## Variables de entorno

Copiar `.env.example` como `.env` en la raíz del proyecto. Todos los valores sirven tal cual para desarrollo local. Las credenciales del correo del sistema (`EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`) se piden al Scrum Master por un canal privado; nunca se suben al repositorio.

| Variable | Uso en el backend |
| --- | --- |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Base de datos (las usan el contenedor `db` y Django) |
| `POSTGRES_PORT` | Puerto publicado en la máquina; Django siempre usa `db:5432` dentro de Docker |
| `APP_PORT` | Puerto publicado del backend (por defecto 8000) |
| `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS` | Modo debug y hosts permitidos |
| `FRONTEND_PORT` | Se usa para armar `CORS_ALLOWED_ORIGINS` |
| `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` | Correo para recuperación de contraseña |
| `SEED_DEMO` | `1` carga los datos de prueba al arrancar |
# Documentación general — Gestión de Tutorías Académicas (Aula Libre)

Este documento reúne en un solo lugar lo que dice cada documento del repositorio, quién lo escribió, qué se encontró al validarlo contra el código y cómo quedó. Está pensado para quien entra al proyecto y necesita entenderlo completo sin saltar entre archivos.

Validación hecha el 23 de octubre de 2026 sobre `main`, revisando cada afirmación contra el código, `docker-compose.yml`, `requirements.txt`, `package.json` y las rutas reales de Django y React.

## Contenido

1. [Inventario de documentos](#1-inventario-de-documentos)
2. [Resultado de la validación](#2-resultado-de-la-validación)
3. [README raíz](#3-readme-raíz)
4. [Backend: README](#4-backend-readme)
5. [Backend: documentación técnica](#5-backend-documentación-técnica)
6. [Frontend: README](#6-frontend-readme)
7. [Frontend: rutas y endpoints para pruebas](#7-frontend-rutas-y-endpoints-para-pruebas)
8. [docs: esquema de datos](#8-docs-esquema-de-datos)
9. [Plantilla de pull request](#9-plantilla-de-pull-request)
10. [Docker, variables de entorno y datos de prueba](#10-docker-variables-de-entorno-y-datos-de-prueba)
11. [CI/CD](#11-cicd)
12. [Pendientes consolidados](#12-pendientes-consolidados)

---

## 1. Inventario de documentos

| Documento | Autor original | Fecha original | Propósito | Estado tras la validación |
|---|---|---|---|---|
| `README.md` (raíz) | Andrés Felipe Viveros Albán | 2026-09-03 | Presentación del proyecto, stack, arquitectura, puesta en marcha, equipo | Corregido: stack, arquitectura, estructura, pruebas y flujo de Git describían cosas planeadas como si existieran |
| `backend/README.md` (antes `README.MD`) | Daniel Ortiz Bedoya | 2026-09-12 | Guía rápida del backend: stack, estructura, comandos Docker | Renombrado a `.md`. Corregidos comandos (`docker compose`), versiones, pruebas y base de datos |
| `backend/DOCUMENTACION_BACKEND.md` | Daniel Ortiz Bedoya | 2026-10-21 | Documentación técnica del backend para nuevos integrantes | Muy precisa. Se quitó el `.env` con la contraseña del correo y se actualizaron configuración, nombre del contenedor y pendientes |
| `frontend/README.md` | Juan Esteban Soto Potes | 2026-09-22 | Era la plantilla en inglés de React + TypeScript + Vite | Reescrito con la documentación real del frontend; se conserva la recomendación de ESLint de la plantilla |
| `frontend/README_TESTS.md` | Juan Esteban Soto Potes | 2026-10-06 | Endpoints de la API y matriz de rutas del frontend para pruebas de integración | Corregido: varias rutas de la API no existían y faltaban 6 rutas del frontend |
| `docs/README.md` | Andrés Felipe Viveros Albán | 2026-09-03 | Mapa del esquema de datos y relación con el código | Corregido: describía `database/init.sql`, que no es el esquema que usa la app |
| `.github/pull_request_template.md` | Andrés Felipe Viveros Albán | 2026-10-23 | Plantilla que GitHub carga al abrir un PR | Vigente |
| `docs/DOCUMENTACION_GENERAL.md` | Andrés Felipe Viveros Albán | 2026-10-23 | Este documento | — |

Todos los documentos están en la carpeta que les corresponde: lo de backend en `backend/`, lo de frontend en `frontend/` y lo transversal en la raíz o en `docs/`. El único cambio de ubicación fue de nombre: `backend/README.MD` pasó a `backend/README.md`, porque la extensión en mayúsculas no la reconocen todos los visores y en Linux es un archivo distinto de `README.md`.

---

## 2. Resultado de la validación

### `README.md` (raíz)

| Decía | Realidad en el código | Cómo quedó |
|---|---|---|
| React 18 y shadcn/ui | React 19.3; shadcn/ui no está instalado | Stack real; shadcn/ui en "planeado" |
| Celery, Redis 7, Nginx como parte del stack | Celery y Redis están en `requirements.txt` pero sin configurar; no hay Nginx en desarrollo | Separado en "hoy" y "arquitectura objetivo"; Nginx solo en la imagen de producción del frontend |
| Vitest, Playwright, Locust | No están instalados | Marcados como planeados |
| Lógica de negocio en `services.py` | No existe ningún `services.py` | Marcado como regla planeada |
| Carpetas `nginx/`, `hooks/`, `config/celery` | No existen | Estructura real del repositorio |
| `docker compose exec api ...` | El servicio se llama `tutorias-django` | Comandos corregidos |
| GitFlow con rama `develop` | No hay rama `develop` | Flujo real: ramas `feat/`, `fix/`, `docs/`, `ci/` hacia `main` por PR |
| Daniel y Juan Esteban en el equipo | Salieron del equipo en octubre de 2026 | Anotado "(hasta octubre de 2026)" |
| `docs/` con SRS, casos de uso, diagramas | Esos documentos están en Word/PDF fuera del repo | Aclarado |

### `backend/README.MD`

- Comandos con `docker-compose` (Compose v1); se cambiaron a `docker compose`.
- Versiones desactualizadas (Django 5.2.17 → 5.2.18, DRF 3.18.1 → 3.18.3); faltaba drf-spectacular.
- `pytest` no funcionaba porque no había configuración; se agregó `backend/pytest.ini`.
- Decía que `reportes` maneja "indicadores" y `notificaciones` "correos y avisos": solo tienen modelos.
- La base de datos estaba fija en `config/db.py`; ahora lee variables de entorno.

### `backend/DOCUMENTACION_BACKEND.md`

Es el documento más preciso del repositorio: modelos, endpoints, permisos y reglas coinciden con el código. Correcciones:

- Al final tenía pegado el `.env` con la contraseña de aplicación del correo del sistema. Se quitó (la contraseña debe rotarse porque el repositorio es público).
- Decía que el contenedor se llama `tutorias-django`: ese es el nombre del **servicio**; el contenedor es `tutorias_ecci`.
- Configuración de CORS y de PostgreSQL: ahora vienen de variables de entorno.
- "Las consultas se limitan a las tutorías del usuario": en realidad filtran solo por estudiante, y un docente recibe una lista vacía.
- Los grupos de Django: ahora los crea el comando `datos_prueba`.
- Se agregaron pendientes encontrados en la validación (código de tutoría repetido al volver a reservar, Celery/Redis sin uso).

### `frontend/README.md`

Era el README de la plantilla de Vite, en inglés, sin nada del proyecto. Se reescribió con stack, estructura, roles, variables, scripts y Docker.

### `frontend/README_TESTS.md`

| Decía | Realidad |
|---|---|
| `POST /api/accounts/token/refresh/` | No existe |
| `/api/disponibilidades/` y `/api/disponibilidades/{id}/` | Son `/api/disponibilidad/disponibilidad/` y `/api/disponibilidad/{id}/actualizar/` |
| `POST/GET /api/tutorias/` | Son `/api/tutorias/tutorias/` y `/api/tutorias/tutorias/{id}/` |
| Catálogo solo con materias y periodos | También hay programas y detalle de cada recurso |
| `/inicio` → `pages/StudentHome.tsx` | El archivo está en `pages/estudiante/StudentHome.tsx` |
| (faltaban) | `/estudiante/dashboard`, `/estudiante/buscar-tutorias`, `/estudiante/mis-reservas`, `/estudiante/historial`, `/tutor/dashboard` y las redirecciones |

### `docs/README.md`

Describía las tablas de `database/init.sql` (`usuario`, `tutoria`, tipos ENUM, extensión `btree_gist`, constraint `EXCLUDE`). Ese archivo fue el diseño inicial; la base real la crean las migraciones de Django, con otros nombres de tabla, sin ENUM y sin el constraint de solape. Se documentó la diferencia y se corrigieron las rutas de las apps (`backend/apps/...`) y la referencia a `seeds.sql`.

---

## 3. README raíz

**Autor:** Andrés Felipe Viveros Albán. **Ubicación:** `README.md`.

### Descripción

Sistema web para la gestión de tutorías entre docentes y estudiantes. Los docentes publican su disponibilidad horaria, los estudiantes reservan y cancelan tutorías, y la coordinación hace seguimiento de asistencia, cancelaciones y retrasos. Proyecto académico de la asignatura Gestión de Software, Ingeniería en Sistemas, Universidad ECCI (Cali), octavo semestre.

### Funcionalidades

| Rol | Funcionalidad | Estado |
|---|---|---|
| Docente | Publicar bloques de disponibilidad (fecha, hora, modalidad, cupo) | Funciona |
| Docente | Ver la agenda de tutorías del día y de la semana | Parcial: ve sus bloques; la API no le devuelve las tutorías reservadas |
| Docente | Atender una tutoría: asistencia, retraso y notas | Los campos existen en el modelo; no hay endpoint para el docente |
| Docente | Cancelar bloques o tutorías con motivo | Puede eliminar bloques sin reservas; cancelar tutorías solo lo hace el estudiante |
| Estudiante | Buscar disponibilidad por docente, materia o fecha | Funciona (filtros de la API) |
| Estudiante | Reservar indicando el tema | Funciona |
| Estudiante | Consultar tutorías próximas e historial | Funciona |
| Estudiante | Cancelar dentro del plazo permitido | Cancela con motivo; el plazo no se valida |
| Coordinación | Panel de indicadores (realizadas, asistencia, cancelaciones, retrasos) | Pendiente |
| Coordinación | Reportes por docente y periodo | Pendiente |
| Coordinación | Gestión de estudiantes, docentes, coordinadores y catálogo | Funciona |

### Stack

| Capa | Tecnologías |
|---|---|
| Frontend | React 19, Vite 8, TypeScript 6, React Router 7, Zustand, TanStack Query, React Hook Form + Zod, Tailwind CSS 3, FullCalendar, GSAP, Framer Motion, Capacitor (Android) |
| Backend | Django 5.2, Django REST Framework, SimpleJWT, drf-spectacular, django-filter, django-cors-headers |
| Base de datos | PostgreSQL 16 |
| Infraestructura | Docker y Docker Compose; Nginx en la imagen de producción del frontend |
| Calidad y CI/CD | GitHub Actions, Ruff, ESLint, Gitleaks, Dependabot; pytest instalado |
| Planeado | Celery, Redis, shadcn/ui, Vitest, Playwright, Locust |

### Arquitectura

Monolito modular en capas con frontend desacoplado. Hoy, en desarrollo, el navegador carga el frontend desde el contenedor de Vite (`FRONTEND_PORT`) y llama directamente a la API de Django (`APP_PORT`), que usa PostgreSQL.

La arquitectura objetivo agrega Nginx como proxy inverso (estáticos + `/api`), un worker de Celery y Redis. La regla planeada es que la lógica de negocio viva en `services.py` por app, con vistas y serializers limitados a entrada, salida y permisos, para poder probarla sin HTTP.

### Flujo de trabajo con Git

- `main` protegida: solo por pull request con el CI en verde.
- Una rama por cambio (`feat/`, `fix/`, `docs/`, `ci/`) que sale de `main` y vuelve por PR.
- Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `ci:`.
- Cada merge a `main` publica las imágenes en GitHub Container Registry.

### Equipo

| Integrante | Rol |
|---|---|
| Andrés Felipe Viveros Albán | Líder Técnico |
| Daniel Ortiz Bedoya | Backend (hasta octubre de 2026) |
| Juan Esteban Soto Potes | Frontend (hasta octubre de 2026) |
| Sebastián Torres Villaquiran | UX/UI |
| Alejandro | QA y Calidad |
| Emely, Luis, Johan | Documentación y análisis |

Licencia: proyecto académico con fines educativos. Universidad ECCI, 2026.

---

## 4. Backend: README

**Autor:** Daniel Ortiz Bedoya. **Ubicación:** `backend/README.md`.

### Stack del backend

| Tecnología | Versión |
|---|---|
| Python | 3.10 |
| Django | 5.2.18 |
| Django REST Framework | 3.18.3 |
| PostgreSQL | 16 |
| SimpleJWT | 5.5.1 |
| drf-spectacular | 0.30.0 |
| django-filter | 26.1 (la 26.2 exige Python 3.11) |
| django-cors-headers | 4.9.0 |
| Otros en `requirements.txt` | celery 5.6.3, redis 8.1.0, psycopg 3.3.6, pytest 8.4.2, pytest-django 4.14.0, pytest-cov 7.1.0, ruff 0.17.1, django-import-export 4.4.3 |

### Estructura

```text
backend/
├── apps/
│   ├── accounts/          # usuarios, roles, autenticación y comando datos_prueba
│   ├── catalogo/          # programas, materias, periodos, asignaciones e inscripciones
│   ├── disponibilidad/    # bloques horarios
│   ├── tutorias/          # reservas, asistencia, cancelaciones y evaluaciones
│   ├── reportes/          # modelo de auditoría (sin endpoints)
│   ├── notificaciones/    # modelo de notificaciones (sin endpoints)
│   └── models.py          # BaseModel con campos de auditoría
├── config/                # settings.py, urls.py, db.py, asgi.py, wsgi.py
├── Dockerfile
├── pytest.ini
├── manage.py
└── requirements.txt
```

### Comandos (desde la raíz del proyecto)

| Tarea | Comando |
|---|---|
| Levantar | `docker compose up -d --build` |
| Ver servicios | `docker compose ps` |
| Logs del backend | `docker compose logs -f tutorias-django` |
| Detener | `docker compose down` |
| Crear migraciones | `docker compose exec tutorias-django python manage.py makemigrations` |
| Aplicar migraciones | `docker compose exec tutorias-django python manage.py migrate` (también al arrancar) |
| Verificar configuración | `docker compose exec tutorias-django python manage.py check` |
| Consola de Django | `docker compose exec tutorias-django python manage.py shell` |
| Superusuario | `docker compose exec tutorias-django python manage.py createsuperuser` |
| Datos de prueba | `docker compose exec tutorias-django python manage.py datos_prueba [--reset]` |
| Pruebas | `docker compose exec tutorias-django pytest [--cov=apps]` (aún no hay pruebas escritas) |

### Base de datos

PostgreSQL 16 en el contenedor `db`, con volumen persistente (`postgres_data`). Django se conecta siempre a `db:5432` dentro de la red de Docker; `POSTGRES_PORT` solo cambia el puerto publicado en la máquina. `docker compose down -v` borra el volumen.

### Desarrollo

`backend/` está montado en el contenedor: los cambios de código se ven sin reconstruir y `runserver` se reinicia solo. Después de cambiar `requirements.txt` o el `Dockerfile` hay que reconstruir con `docker compose up -d --build`.

### Accesos

| Servicio | URL |
|---|---|
| Backend (redirige a Swagger) | http://localhost:8000 |
| Swagger UI | http://localhost:8000/api/docs/ |
| Esquema OpenAPI | http://localhost:8000/api/schema/ |
| Admin de Django | http://localhost:8000/admin/ |

---

## 5. Backend: documentación técnica

**Autor:** Daniel Ortiz Bedoya. **Ubicación:** `backend/DOCUMENTACION_BACKEND.md`.

### Configuración general

- Apps registradas: `accounts`, `catalogo`, `disponibilidad`, `notificaciones`, `reportes`, `tutorias`. Usuario: `accounts.User`.
- Idioma español, zona horaria `America/Bogota`, `USE_TZ = False` (fechas sin zona horaria).
- Autenticación JWT (SimpleJWT) en todas las rutas protegidas. No hay endpoint de renovación del token.
- CORS desde `CORS_ALLOWED_ORIGINS` (por defecto `localhost:5173` y `127.0.0.1:5173`).
- La raíz `/` redirige a Swagger.
- PostgreSQL desde variables (`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_INTERNAL_PORT`).
- `DEBUG`, `SECRET_KEY` y `ALLOWED_HOSTS` desde `DJANGO_DEBUG`, `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`.
- Correo: SMTP de Gmail con TLS (puerto 587), usuario y contraseña desde `EMAIL_HOST_USER` y `EMAIL_HOST_PASSWORD`.

### Modelo de datos

**`BaseModel`** (abstracto): `user_creation`, `date_creation`, `user_updated`, `date_updated`. Lo heredan los modelos de catálogo, disponibilidad, tutorías, notificaciones y reportes.

**`User`** (extiende el usuario de Django): `documento` (único), `telefono`, `codigo_institucional` (único, opcional), `rol` (texto), `foto_url`. El rol real se maneja con los grupos de Django `Estudiante`, `Docente` y `Coordinador`.

**Catálogo:**

| Modelo | Campos | Reglas |
|---|---|---|
| `ProgramaAcademico` | código (único), nombre, facultad, activo | — |
| `PeriodoAcademico` | código (único), fecha_inicio, fecha_fin, activo | La API valida fin ≥ inicio |
| `Materia` | código (único), nombre, créditos (3 por defecto), semestre, programa, activa | El programa no se puede borrar si tiene materias |
| `DocenteMateria` | docente, materia, periodo | Combinación única |
| `Inscripcion` | estudiante, materia, periodo | Combinación única |

**Disponibilidad:**

| Modelo | Campos |
|---|---|
| `BloqueDisponibilidad` | docente, materia (opcional), periodo, fecha, hora_inicio, hora_fin, modalidad, lugar, enlace_virtual, cupo_total (1), cupo_ocupado (0), estado, observaciones |
| `PlantillaDisponibilidad` | docente, periodo, dia_semana, hora_inicio, hora_fin, modalidad, lugar, enlace_virtual, cupo_total, activa (sin endpoints) |

Modalidades: `PRESENCIAL`, `VIRTUAL`. Estados del bloque: `DISPONIBLE`, `COMPLETO`, `CANCELADO`, `CERRADO`.

**Tutorías:**

| Modelo | Campos |
|---|---|
| `Tutoria` | código (único, `TUT-<bloque>-<estudiante>`), bloque, estudiante, tema, descripción, estado, asistencia, minutos_retraso, hora_inicio_real, hora_fin_real, notas_docente, compromisos |
| `Cancelacion` | tutoría, cancelado_por, origen (`ESTUDIANTE`, `DOCENTE`, `SISTEMA`), motivo, horas_previas, penalizada |
| `EvaluacionTutoria` | tutoría (uno a uno), calificación, comentario |

Estados de tutoría: `RESERVADA`, `CONFIRMADA`, `EN_CURSO`, `COMPLETADA`, `CANCELADA_ESTUDIANTE`, `CANCELADA_DOCENTE`, `NO_ASISTIO`. Asistencia: `PENDIENTE`, `ASISTIO`, `ASISTIO_TARDE`, `NO_ASISTIO`.

Restricciones en la base: un estudiante no puede tener dos tutorías activas (`RESERVADA`, `CONFIRMADA`, `EN_CURSO`) en el mismo bloque; `minutos_retraso` no puede ser negativo; índices por (estudiante, estado) y por bloque.

**Soporte:** `Notificacion` (usuario, tutoría opcional, tipo, título, mensaje, leída, enviada por correo) y `Auditoria` (usuario, entidad, entidad_id, acción, datos antes y después, IP). Sin endpoints.

### Endpoints

**Cuentas** (`/api/accounts/`):

| Método | Ruta | Función y acceso |
|---|---|---|
| POST | `login/` | Login con correo y contraseña; devuelve `access`, `refresh` y grupos |
| POST | `recovery/` | Envía un PIN de 6 dígitos (válido 5 minutos) a un correo `@ecci.edu.co` activo |
| POST | `recovery/change-password/` | Cambia la contraseña con token y PIN; mínimo 8 caracteres, un número y un carácter especial |
| GET, POST | `estudiantes/` | Lista o registra estudiantes (Coordinador) |
| GET, PUT, DELETE | `estudiantes/<id>/` | Detalle, edición o eliminación (Coordinador) |
| GET, POST | `tutores/` | Lista docentes activos (Coordinador o Estudiante) o registra (Coordinador) |
| GET, PUT, DELETE | `tutores/<id>/` | Detalle, edición o eliminación (Coordinador) |
| GET, POST | `coordinadores/` | Lista o registra coordinadores (Coordinador) |
| GET, PUT, DELETE | `coordinadores/<id>/` | Responden 403: no implementados |

**Catálogo** (`/api/catalogo/`, requiere sesión pero no verifica rol):

| Método | Ruta |
|---|---|
| GET, POST | `materias/` |
| GET, PUT, DELETE | `materias/<id>/` |
| GET, POST | `programas/` |
| GET, PUT, PATCH, DELETE | `programas/<id>/` |
| GET, POST | `periodos/` |
| GET, PUT, PATCH, DELETE | `periodos/<id>/` |

**Disponibilidad** (`/api/disponibilidad/`):

| Método | Ruta | Función |
|---|---|---|
| GET, POST | `disponibilidad/` | Lista (filtros `docente`, `materia`, `fecha`, `estado`) o crea un bloque para el usuario autenticado |
| GET, PUT, DELETE | `<id>/actualizar/` | Detalle, edición o eliminación |

Reglas: hora final posterior a la inicial, cupo positivo, sin cruce de horario con otro bloque del mismo docente; solo el dueño edita o elimina; no se puede bajar el cupo por debajo de lo ocupado ni eliminar un bloque con reservas.

**Tutorías** (`/api/tutorias/`):

| Método | Ruta | Función |
|---|---|---|
| GET, POST | `tutorias/` | Lista las tutorías del estudiante o reserva (`bloque_id`, `tema`, `descripcion`) |
| GET, PUT, PATCH, DELETE | `tutorias/<id>/` | Detalle, edición o cancelación (con motivo) de una tutoría propia |

Reglas: el bloque debe existir, estar `DISPONIBLE` y tener cupo; la reserva corre en una transacción que bloquea el bloque; al ocupar el último cupo el bloque pasa a `COMPLETO`. Editar y cancelar solo en estado `RESERVADA`; cancelar libera el cupo.

### Pendientes que anotó el documento (vigentes)

- `notificaciones` y `reportes` sin vistas ni rutas.
- `PlantillaDisponibilidad` sin serializer, vistas ni rutas.
- `tests.py` sin pruebas.
- La cancelación guarda el estado `CANCELADA`, que no está entre los estados definidos.
- Catálogo sin restricción de escritura a coordinadores.
- Cualquier usuario autenticado puede crear bloques de disponibilidad.

---

## 6. Frontend: README

**Autor original:** Juan Esteban Soto Potes (plantilla de Vite). **Reescrito:** Andrés Felipe Viveros Albán. **Ubicación:** `frontend/README.md`.

### Stack del frontend

| Tecnología | Versión | Uso |
|---|---|---|
| React | 19.3 | Interfaz |
| TypeScript | 6.0 | Tipado |
| Vite | 8.3 | Servidor de desarrollo y build |
| React Router | 7.18 | Rutas y protección por rol |
| Zustand | 5.0 | Estado global (sesión en `localStorage` con clave `aula_auth_storage`) |
| TanStack Query | 5.104 | Caché de consultas |
| Axios | 1.20 | Cliente HTTP; adjunta el JWT salvo en login y recovery |
| React Hook Form + Zod | 7.90 / 3.25 | Formularios y validación |
| Tailwind CSS | 3.4 | Estilos |
| FullCalendar | 6.1.22 | Calendario del tutor |
| GSAP + Framer Motion | 3.15 / 14.4 | Animaciones |
| Capacitor | 8.5 | App Android (`appId: co.edu.ecci.aulalibre`, nombre "Aula Libre") |
| ESLint | 10.13 | Lint con `react-hooks` y `react-refresh` |

### Roles

| Grupo en el backend | Rol en el frontend |
|---|---|
| `Coordinador` | `admin` |
| `Docente` | `tutor` |
| `Estudiante` | `estudiante` |

### Variables

| Variable | Uso | Por defecto |
|---|---|---|
| `VITE_API_URL` | URL de la API que llama el navegador | `http://localhost:8000/api` |
| `VITE_EMAIL_DOMAINS` | Dominios aceptados en login y formularios | `ecci.edu.co` (en Docker de desarrollo: `ecci.edu.co,aulalibre.test`) |
| `VITE_USE_POLLING` | Detección de cambios dentro de Docker en Windows/Mac | `false` (en Docker: `true`) |

### Scripts

`npm run dev` (puerto 5173), `npm run build` (`tsc -b` + Vite), `npm run lint`, `npm run preview`.

### Imagen de producción

`frontend/Dockerfile` con destino `prod`: compila con Node 24 y sirve `dist/` con Nginx 1.27, con fallback a `index.html` para las rutas de React Router y caché larga para `/assets/`. El CD la publica en `ghcr.io/andresfviveros-ecci/gestion-tutorias-ecci-frontend`.

### Recomendación heredada de la plantilla

Para producción, activar las reglas de ESLint con información de tipos (`recommendedTypeChecked`, o `strictTypeChecked` y `stylisticTypeChecked`, con `parserOptions.project` en `tsconfig.node.json` y `tsconfig.app.json`) y los plugins `eslint-plugin-react-x` y `eslint-plugin-react-dom`. El React Compiler no está activado por su impacto en el rendimiento de desarrollo y build.

---

## 7. Frontend: rutas y endpoints para pruebas

**Autor:** Juan Esteban Soto Potes. **Ubicación:** `frontend/README_TESTS.md`.

### Interfaces del backend

Swagger en `/api/docs/`, esquema OpenAPI en `/api/schema/`, admin en `/admin/` (puerto 8000 por defecto).

### Matriz de rutas del frontend

| Ruta | Componente | Rol | Vista |
|---|---|---|---|
| `/` | `pages/Login.tsx` | Público | Login y recuperación de contraseña |
| `/inicio` | `pages/estudiante/StudentHome.tsx` | estudiante, admin | Portal del estudiante, disponibilidad del día y acceso a la reserva |
| `/estudiante` | — | — | Redirige a `/inicio` |
| `/estudiante/dashboard` | `pages/estudiante/DashboardEstudiante.tsx` | estudiante, admin | Próxima tutoría, tutorías tomadas, tutores disponibles, materias con tutoría |
| `/estudiante/buscar-tutorias` | `pages/estudiante/BuscarTutorias.tsx` | estudiante, admin | Búsqueda de disponibilidad y reserva |
| `/estudiante/mis-reservas` | `pages/estudiante/MisReservas.tsx` | estudiante, admin | Reservas, edición y cancelación |
| `/estudiante/historial` | `pages/estudiante/MisReservas.tsx` | estudiante, admin | Historial (mismo componente) |
| `/dashboard` | `pages/Dashboard.tsx` | admin | Panel de administración con estadísticas |
| `/estudiantes` | `pages/Estudiantes.tsx` | admin | Gestión de estudiantes |
| `/tutores` | `pages/Tutores.tsx` | admin | Gestión de docentes |
| `/coordinadores` | `pages/Coordinadores.tsx` | admin | Gestión de coordinadores |
| `/gestionar-usuarios` | `pages/GestionarUsuarios.tsx` | admin | Administración global de cuentas y roles |
| `/tutor/dashboard` | `pages/tutor/DashboardTutor.tsx` | tutor, admin | Agenda del día con bloques y estudiante asignado |
| `/tutor/mi-disponibilidad` | `pages/tutor/MiDisponibilidad.tsx` | tutor, admin | Publicación de horarios y matriz semanal |
| `/tutor/calendario` | `pages/tutor/Calendario.tsx` | tutor, admin | Calendario interactivo del tutor |
| cualquier otra | — | — | Redirige a `/` |

Los endpoints que usan estas vistas son los de la sección 5.

---

## 8. docs: esquema de datos

**Autor:** Andrés Felipe Viveros Albán. **Ubicación:** `docs/README.md`.

- `database/init.sql` es el diseño inicial del esquema (septiembre de 2026): tablas sin prefijo, tipos ENUM de PostgreSQL, extensión `btree_gist` y un constraint `EXCLUDE` contra bloques solapados.
- La base real la crean las migraciones de Django: tablas con prefijo de la app (`accounts_user`, `catalogo_materia`, `tutorias_tutoria`...), campos de texto con `choices` y sin el constraint de solape (se valida en la API).
- `database/seeds.sql` quedó vacío; los datos de desarrollo los crea el comando `datos_prueba`.
- Documentos previstos para `docs/`: arquitectura, modelo de datos, flujos de negocio, despliegue y decisiones técnicas (ADR). Hoy el modelo de datos y los flujos están cubiertos en la documentación del backend; arquitectura, SRS, casos de uso y diagramas están en Word/PDF fuera del repositorio.
- Convenciones: no versionar secretos (`.env.example`), los cambios de esquema se hacen con modelos y migraciones.

---

## 9. Plantilla de pull request

**Autor:** Andrés Felipe Viveros Albán. **Ubicación:** `.github/pull_request_template.md`.

Secciones que GitHub precarga en cada PR: qué cambia, tipo de cambio (feat, fix, docs, refactor/chore), cómo probarlo y checklist (CI en verde, migraciones incluidas si se tocaron modelos, sin contraseñas ni `.env`, aviso al frontend si cambiaron rutas de la API) y la línea `Cierra #` para enlazar el issue.

---

## 10. Docker, variables de entorno y datos de prueba

### Servicios de `docker-compose.yml`

Proyecto `gestion-tutorias` con tres servicios:

| Servicio | Contenedor | Imagen | Puerto | Qué hace |
|---|---|---|---|---|
| `db` | `tutorias_ecci_db` | `postgres:16` | `POSTGRES_PORT` → 5432 | Base de datos con volumen `postgres_data` |
| `tutorias-django` | `tutorias_ecci` | `backend/Dockerfile` (Python 3.10) | `APP_PORT` → 8000 | Migra, carga datos de prueba si `SEED_DEMO=1` y corre `runserver` |
| `frontend` | `tutorias_ecci_frontend` | `frontend/Dockerfile`, destino `dev` (Node 24) | `FRONTEND_PORT` → 5173 | Vite con recarga automática |

Cada servicio tiene healthcheck, y cada uno arranca cuando el anterior está sano: primero `db`, luego el backend y al final el frontend. `docker compose up -d --build --wait` termina cuando los tres están listos.

### Variables (`.env.example`)

| Variable | Por defecto | Uso |
|---|---|---|
| `FRONTEND_PORT` | 5173 | Puerto del frontend; también arma `CORS_ALLOWED_ORIGINS` |
| `APP_PORT` | 8000 | Puerto del backend; también arma `VITE_API_URL` |
| `POSTGRES_PORT` | 5432 | Puerto publicado de PostgreSQL |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | `tutorias_ecci`, `tutorias_user`, `change_me_secure_password` | Base de datos |
| `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS` | `True`, `*` | Backend |
| `SEED_DEMO` | 1 | Carga de datos de prueba |
| `VITE_EMAIL_DOMAINS` | `ecci.edu.co,aulalibre.test` | Dominios del login |
| `VITE_USE_POLLING` | `true` | Recarga en Docker sobre Windows/Mac |
| `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` | vacío | Correo del sistema; se piden al Scrum Master |

### Datos de prueba (`python manage.py datos_prueba`)

Crea datos ficticios con fechas calculadas a partir del día en que se corre: 6 programas (Sistemas, Industrial, Electrónica, Mecánica, Administración de Empresas, Lenguas Modernas), 27 materias con temas, periodo anterior y actual, 3 coordinadores, 10 docentes, 42 estudiantes, ~390 bloques (cuatro semanas atrás y tres adelante) y ~420 tutorías en todos los estados, con cancelaciones y evaluaciones. Si ya existen no hace nada; `--reset` borra solo los de prueba y los vuelve a crear. Se niega a correr con `DEBUG=False` salvo con `--force`.

| Rol | Correo | Contraseña |
|---|---|---|
| Coordinador | `coordinador@aulalibre.test` | `Aula2026*` |
| Docente | `docente@aulalibre.test` | `Aula2026*` |
| Estudiante | `estudiante@aulalibre.test` | `Aula2026*` |
| Superusuario (`/admin`) | `admin@aulalibre.test` | `Aula2026*` |

Personas, documentos, teléfonos y correos son inventados; el dominio `.test` está reservado y nunca recibe correo.

---

## 11. CI/CD

**CI** (`.github/workflows/ci.yml`, en cada PR y push a `main`):

| Job | Qué verifica |
|---|---|
| Detectar cambios | Qué partes cambiaron, para no correr todo en cada PR |
| Backend (Django + Postgres) | Ruff (informativo), `check`, migraciones pendientes, migraciones contra PostgreSQL 16, carga/segunda corrida/reset de datos de prueba, pruebas y esquema OpenAPI |
| Frontend (React + Vite) | ESLint, build e imagen de producción con Docker |
| Prueba de humo (docker compose) | Stack completo, API, login con usuario de prueba, frontend y CORS |
| Buscar secretos filtrados | Gitleaks sobre todo el historial |

**CD** (`.github/workflows/cd.yml`, en cada push a `main` y en tags `vX.Y.Z`): publica `gestion-tutorias-ecci-backend` y `gestion-tutorias-ecci-frontend` en GitHub Container Registry (`latest` y `sha-<commit>`) y, con un tag, crea un Release con el frontend compilado. La URL de la API del frontend de producción sale de la variable del repositorio `VITE_API_URL`.

**Dependabot:** un PR semanal agrupado para pip y otro para npm, y uno mensual para las actions; ignora versiones mayores y `django-filter` 26.2 o superior.

---

## 12. Pendientes consolidados

Ordenados por impacto:

1. **Tutorías del docente:** `GET /api/tutorias/tutorias/` filtra solo por estudiante; el docente no ve las reservas de sus bloques ni puede registrar asistencia.
2. **Rotar la contraseña del correo del sistema:** estuvo publicada en el historial del repositorio.
3. **Grupos por migración:** sin datos de prueba, los grupos `Estudiante`, `Docente` y `Coordinador` no existen y el registro falla.
4. **Estado `CANCELADA`:** la cancelación guarda un estado que no está en las opciones del modelo.
5. **Volver a reservar el mismo bloque** después de cancelar falla por el código único `TUT-<bloque>-<estudiante>`.
6. **Permisos:** catálogo y creación de bloques no verifican el rol.
7. **Plazo de cancelación** y penalización: los campos existen pero no se calculan.
8. **Pruebas automatizadas:** no hay ninguna; pytest ya está configurado.
9. **Reportes y notificaciones:** solo modelos.
10. **Python 3.10 → 3.12:** desbloquea Django 6 y `django-filter` 26.2.
11. **Despliegue:** definir `DJANGO_DEBUG=False`, `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS` y `VITE_API_URL` del entorno real.

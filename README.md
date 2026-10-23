# Gestión de Tutorías Académicas

Sistema web para la gestión de tutorías entre docentes y estudiantes. Permite a los docentes publicar su disponibilidad horaria, a los estudiantes reservar y cancelar tutorías, y a la coordinación hacer seguimiento de asistencia, cancelaciones y retrasos.

Proyecto académico de la asignatura **Gestión de Software** — Ingeniería en Sistemas, Universidad ECCI (Cali), octavo semestre.

---

## Funcionalidades

**Docente**
- Publicar bloques de disponibilidad (fecha, hora, modalidad, cupo)
- Ver la agenda de tutorías del día y de la semana
- Atender una tutoría: registrar asistencia, retraso y notas de sesión
- Cancelar bloques o tutorías indicando el motivo

**Estudiante**
- Buscar disponibilidad por docente, materia o fecha
- Reservar una tutoría indicando el tema de la consulta
- Consultar sus tutorías próximas y su historial
- Cancelar una reserva dentro del plazo permitido

**Coordinación**
- Panel de indicadores: tutorías realizadas, tasa de asistencia, cancelaciones y retrasos
- Reportes de desempeño por docente y por periodo académico

**Estado a octubre de 2026.** Ya funcionan: publicar disponibilidad, buscar y reservar, ver y cancelar las reservas propias del estudiante, gestión de usuarios y catálogo por parte de coordinación. Faltan en el backend: que el docente vea las tutorías de sus bloques y registre asistencia, la cancelación de tutorías por parte del docente, el plazo de cancelación y los indicadores y reportes (las apps `reportes` y `notificaciones` solo tienen modelos).

---

## Stack tecnológico

| Capa | Tecnologías |
|---|---|
| Frontend | React 19, Vite 8, TypeScript 6, React Router 7, Zustand, TanStack Query, React Hook Form + Zod, Tailwind CSS 3, FullCalendar, GSAP, Framer Motion, Capacitor (Android) |
| Backend | Django 5.2, Django REST Framework, SimpleJWT, drf-spectacular (Swagger), django-filter, django-cors-headers |
| Base de datos | PostgreSQL 16 |
| Infraestructura | Docker y Docker Compose (db, backend y frontend); Nginx en la imagen de producción del frontend |
| Calidad y CI/CD | GitHub Actions, Ruff, ESLint, Gitleaks, Dependabot; pytest instalado (aún sin pruebas) |

**Planeado, todavía no implementado:** Celery y Redis (instalados en `requirements.txt` pero sin configurar), shadcn/ui, Vitest, Playwright y Locust.

---

## Arquitectura

Monolito modular en capas con frontend desacoplado. La SPA de React consume la API REST de Django.

**Hoy, en desarrollo (docker compose):**

```
Navegador ── http://localhost:FRONTEND_PORT ──> frontend (Vite)
    |
    └──────── http://localhost:APP_PORT/api ──> tutorias-django (Django + DRF)
                                                      |
                                                     db (PostgreSQL 16)
```

**Arquitectura objetivo (documento de arquitectura):**

```
Navegador (React SPA)
        |
      Nginx  ──  estáticos + proxy /api
        |
   Django + DRF  ────  Celery Worker
        |                  |
   PostgreSQL           Redis
```

La regla planeada para el backend es que la lógica de negocio viva en un `services.py` por app y que vistas y serializers solo manejen entrada, salida y permisos. Hoy la lógica está en vistas y serializers; todavía no hay archivos `services.py`.

---

## Estructura del repositorio

```
.
├── .github/
│   ├── workflows/             # ci.yml y cd.yml
│   ├── dependabot.yml
│   └── pull_request_template.md
├── backend/
│   ├── apps/
│   │   ├── accounts/          # usuarios, roles, autenticación, comando datos_prueba
│   │   ├── catalogo/          # programas, materias, periodos
│   │   ├── disponibilidad/    # bloques horarios
│   │   ├── tutorias/          # reservas, asistencia, cancelaciones
│   │   ├── reportes/          # modelo de auditoría
│   │   └── notificaciones/    # modelo de notificaciones
│   ├── config/                # settings, urls, db
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/               # cliente axios
│   │   ├── components/
│   │   ├── pages/             # estudiante/, tutor/ y vistas de coordinación
│   │   ├── schemas/           # validaciones Zod
│   │   ├── store/             # estado global (Zustand)
│   │   └── types/
│   ├── Dockerfile             # destinos dev y prod
│   └── package.json
├── database/                  # init.sql: diseño inicial del esquema (referencia)
├── docs/                      # documentación consolidada
├── docker-compose.yml
└── .env.example
```

---

## Puesta en marcha

**Requisitos:** Docker y Docker Compose instalados. No hace falta instalar Python ni Node.

```bash
# 1. Clonar el repositorio
git clone https://github.com/andresfviveros-ecci/gestion-tutorias-ecci.git
cd gestion-tutorias-ecci

# 2. Crear el archivo de variables de entorno
cp .env.example .env

# 3. Levantar todo: base de datos, backend y frontend
#    Al arrancar se aplican las migraciones y se cargan los datos de prueba.
docker compose up -d --build --wait
```

`--wait` hace que el comando termine cuando los tres servicios están listos (la primera vez tarda un par de minutos).

Una vez levantado (con los puertos por defecto):

| Servicio | URL |
|---|---|
| Aplicación web | http://localhost:5173 |
| API | http://localhost:8000/api/ |
| Documentación de la API (Swagger) | http://localhost:8000/api/docs/ |
| Panel administrativo | http://localhost:8000/admin/ |

Comandos útiles:

```bash
docker compose ps                         # estado de los servicios
docker compose logs -f tutorias-django    # logs del backend
docker compose logs -f frontend           # logs del frontend
docker compose down                       # apagar (conserva la base)
docker compose down -v                    # apagar y borrar la base
```

### Datos de prueba

La primera vez que arranca el backend se crean datos ficticios para probar la aplicación completa: 6 programas, 27 materias, el periodo anterior y el actual, 3 coordinadores, 10 docentes, 42 estudiantes, unos 390 bloques de disponibilidad (cuatro semanas atrás y tres adelante) y más de 400 tutorías en todos los estados, con cancelaciones y evaluaciones.

Todos los usuarios tienen la contraseña `Aula2026*`. Para entrar rápido:

| Rol | Correo |
|---|---|
| Coordinador | `coordinador@aulalibre.test` |
| Docente | `docente@aulalibre.test` |
| Estudiante | `estudiante@aulalibre.test` |
| Admin de Django (`/admin`) | `admin@aulalibre.test` (es también el usuario) |

Las personas, documentos, teléfonos y correos son inventados. Los correos usan el dominio reservado `.test`, así que el sistema nunca le escribe a nadie real. El login acepta ese dominio porque `VITE_EMAIL_DOMAINS` lo incluye en desarrollo; la recuperación de contraseña no funciona con estos usuarios (solo acepta `@ecci.edu.co`).

```bash
# Volver a generar los datos (borra solo los de prueba y los crea de nuevo, con fechas actualizadas)
docker compose exec tutorias-django python manage.py datos_prueba --reset

# Arrancar sin datos de prueba: en el .env
SEED_DEMO=0
```

---

## Variables de entorno

Se configuran en el archivo `.env`, que **nunca se sube al repositorio**. La plantilla está en `.env.example` y sus valores sirven tal cual para desarrollo.

| Variable | Descripción | Por defecto |
|---|---|---|
| `FRONTEND_PORT` | Puerto del frontend en tu máquina | `5173` |
| `APP_PORT` | Puerto del backend en tu máquina | `8000` |
| `POSTGRES_PORT` | Puerto de PostgreSQL en tu máquina | `5432` |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Base de datos (las usan el contenedor `db` y Django) | ver `.env.example` |
| `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS` | Modo debug y hosts permitidos del backend | `True`, `*` |
| `SEED_DEMO` | `1` carga los datos de prueba al arrancar; `0` no | `1` |
| `VITE_EMAIL_DOMAINS` | Dominios de correo aceptados en el login | `ecci.edu.co,aulalibre.test` |
| `VITE_USE_POLLING` | Recarga automática del frontend dentro de Docker en Windows/Mac | `true` |
| `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` | Correo del sistema para recuperar contraseña. Se piden al Scrum Master | vacío |

Si cambias `FRONTEND_PORT` o `APP_PORT`, docker-compose ajusta solo la URL de la API del frontend y los orígenes CORS del backend.

---

## Pruebas

Hoy no hay pruebas automatizadas escritas. Lo que sí se verifica en cada PR (GitHub Actions):

- Backend: Ruff (informativo), `manage.py check`, migraciones pendientes, migraciones contra PostgreSQL 16, carga de datos de prueba y `manage.py test`.
- Frontend: ESLint, build (`tsc` + Vite) e imagen de producción.
- Prueba de humo: `docker compose up` completo, API, login con usuario de prueba, frontend y CORS.
- Gitleaks: búsqueda de secretos en el historial.

```bash
# Backend (cuando haya pruebas)
docker compose exec tutorias-django pytest --cov=apps

# Frontend
docker compose exec frontend npm run lint
docker compose exec frontend npm run build
```

Planeado: pruebas de componentes con Vitest, extremo a extremo con Playwright y concurrencia de reservas con Locust.

---

## Flujo de trabajo con Git

- `main` — código estable y entregable. Protegida: solo se modifica mediante pull request, con el CI en verde.
- `feat/<nombre>`, `fix/<nombre>`, `docs/<nombre>`, `ci/<nombre>` — una rama por cambio, sale de `main` y vuelve a `main` por PR.

No hay rama `develop` por ahora; con el tamaño actual del equipo, las ramas salen directo de `main`.

**Convención de commits** (Conventional Commits):

```
feat: agregar endpoint de cancelación de tutoría
fix: corregir cálculo de cupos disponibles
docs: actualizar diagrama de componentes
test: agregar prueba de concurrencia de reservas
refactor: mover validación de plazo a la capa de servicios
ci: agregar prueba de humo del frontend
```

Ningún pull request se mezcla con el pipeline de integración continua en rojo. Cada merge a `main` publica las imágenes del backend y del frontend en GitHub Container Registry.

---

## Equipo

| Integrante | Rol |
|---|---|
| Andrés Felipe Viveros Albán | Líder Técnico |
| Daniel Ortiz Bedoya | Backend (hasta octubre de 2026) |
| Juan Esteban Soto Potes | Frontend (hasta octubre de 2026) |
| Sebastián Torres Villaquiran | UX/UI |
| Alejandro | QA y Calidad |
| Emely, Luis, Johan | Documentación y análisis |

---

## Documentación

- [docs/DOCUMENTACION_GENERAL.md](docs/DOCUMENTACION_GENERAL.md): resumen de toda la documentación del repositorio, con autor y validación de cada documento.
- [backend/README.md](backend/README.md) y [backend/DOCUMENTACION_BACKEND.md](backend/DOCUMENTACION_BACKEND.md): backend, modelos y endpoints.
- [frontend/README.md](frontend/README.md) y [frontend/README_TESTS.md](frontend/README_TESTS.md): frontend, rutas y endpoints para pruebas de integración.
- [docs/README.md](docs/README.md): esquema de datos y relación con el código.

El documento SRS, los casos de uso, el cronograma, la arquitectura y los diagramas (componentes, despliegue, capas y entidad-relación) se manejan en Word/PDF fuera del repositorio.

---

## Licencia

Proyecto académico con fines educativos. Universidad ECCI, 2026.

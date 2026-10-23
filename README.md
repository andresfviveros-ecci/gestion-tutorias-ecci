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

---

## Stack tecnológico

| Capa | Tecnologías |
|---|---|
| Frontend | React 18, Vite, TypeScript, TanStack Query, Tailwind CSS, shadcn/ui, FullCalendar, GSAP |
| Backend | Django 5, Django REST Framework, SimpleJWT, Celery, django-filter |
| Base de datos | PostgreSQL 16 |
| Cache y cola | Redis 7 |
| Infraestructura | Docker, Docker Compose, Nginx |
| Calidad | Pytest, Vitest, Playwright, Locust, Ruff, ESLint |

La justificación de cada elección está en el documento de arquitectura, dentro de `docs/`.

---

## Arquitectura

Monolito modular en capas con frontend desacoplado. La SPA de React consume una API REST servida por Django detrás de un proxy inverso Nginx.

```
Navegador (React SPA)
        |
      Nginx  ──  estáticos + proxy /api
        |
   Django + DRF  ────  Celery Worker
        |                  |
   PostgreSQL           Redis
```

**Regla de organización del backend:** la lógica de negocio vive en `services.py` de cada app. Las vistas y los serializers solo manejan entrada, salida y permisos. Esto mantiene el código testeable sin necesidad de levantar HTTP.

---

## Estructura del repositorio

```
.
├── backend/
│   ├── apps/
│   │   ├── accounts/          # usuarios, roles, autenticación
│   │   ├── catalogo/          # programas, materias, periodos
│   │   ├── disponibilidad/    # bloques horarios
│   │   ├── tutorias/          # reservas, asistencia, cancelaciones
│   │   ├── reportes/          # indicadores
│   │   └── notificaciones/    # correos y avisos
│   ├── config/                # settings, urls, celery
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── api/               # cliente y tipos generados del OpenAPI
│   │   └── types/
│   └── package.json
├── docs/                      # arquitectura, SRS, casos de uso, diagramas
├── nginx/
├── docker-compose.yml
└── .env.example
```

---

## Puesta en marcha

**Requisitos:** Docker y Docker Compose instalados.

```bash
# 1. Clonar el repositorio
git clone https://github.com/andresfviveros-ecci/gestion-tutorias-ecci.git
cd gestion-tutorias-ecci

# 2. Crear el archivo de variables de entorno
cp .env.example .env

# 3. Levantar base de datos y backend
#    Al arrancar se aplican las migraciones y se cargan los datos de prueba.
docker compose up -d --build

# 4. Levantar el frontend
cd frontend
npm ci
npm run dev
```

Una vez levantado:

| Servicio | URL |
|---|---|
| Aplicación web | http://localhost:5173 |
| API | http://localhost:8000/api/ |
| Documentación de la API (Swagger) | http://localhost:8000/api/docs/ |
| Panel administrativo | http://localhost:8000/admin/ |

### Datos de prueba

La primera vez que arranca el backend se crean datos ficticios para probar la aplicación completa: 6 programas, 27 materias, el periodo anterior y el actual, 3 coordinadores, 10 docentes, 42 estudiantes, unos 390 bloques de disponibilidad (cuatro semanas atrás y tres adelante) y más de 400 tutorías en todos los estados, con cancelaciones y evaluaciones.

Todos los usuarios tienen la contraseña `Aula2026*`. Para entrar rápido:

| Rol | Correo |
|---|---|
| Coordinador | `coordinador@aulalibre.test` |
| Docente | `docente@aulalibre.test` |
| Estudiante | `estudiante@aulalibre.test` |
| Admin de Django (`/admin`) | `admin@aulalibre.test` (es también el usuario) |

Las personas, documentos, teléfonos y correos son inventados. Los correos usan el dominio reservado `.test`, así que el sistema nunca le escribe a nadie real.

```bash
# Volver a generar los datos (borra solo los de prueba y los crea de nuevo, con fechas actualizadas)
docker compose exec tutorias-django python manage.py datos_prueba --reset

# Arrancar sin datos de prueba: en el .env
SEED_DEMO=0
```

---

## Variables de entorno

Se configuran en el archivo `.env`, que **nunca se sube al repositorio**. La plantilla está en `.env.example`.

| Variable | Descripción |
|---|---|
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT` | Base de datos PostgreSQL del contenedor `db` |
| `APP_PORT` | Puerto local del backend (por defecto 8000) |
| `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` | Correo del sistema para recuperar contraseña. Se piden al Scrum Master |
| `SEED_DEMO` | `1` (por defecto) carga los datos de prueba al arrancar; `0` no los carga |

---

## Pruebas

```bash
# Backend: unitarias y de integración
docker compose exec api pytest --cov=apps

# Frontend: componentes
cd frontend && npm run test

# Extremo a extremo
npx playwright test

# Concurrencia (verifica que no haya sobreventa de cupos)
locust -f tests/load/reservas.py
```

---

## Flujo de trabajo con Git

Se trabaja con GitFlow simplificado:

- `main` — código estable y entregable. Protegida: solo se modifica mediante pull request aprobado.
- `develop` — rama de integración.
- `feature/<nombre>` — una rama por funcionalidad, sale de `develop` y vuelve a `develop`.

**Convención de commits** (Conventional Commits):

```
feat: agregar endpoint de cancelación de tutoría
fix: corregir cálculo de cupos disponibles
docs: actualizar diagrama de componentes
test: agregar prueba de concurrencia de reservas
refactor: mover validación de plazo a la capa de servicios
```

Ningún pull request se mezcla con el pipeline de integración continua en rojo.

---

## Equipo

| Integrante | Rol |
|---|---|
| Andrés Felipe Viveros Albán | Líder Técnico |
| Daniel Ortiz | Backend |
| Juan Esteban Soto Potes | Frontend |
| Sebastián Torres Villaquiran | UX/UI |
| Alejandro | QA y Calidad |
| Emely, Luis, Johan | Documentación y análisis |

---

## Documentación

Los documentos del proyecto se encuentran en la carpeta `docs/`:

- Arquitectura y tecnologías usadas
- Documento SRS (requisitos)
- Casos de uso
- Diagrama de fases y cronograma
- Diagramas: componentes, despliegue, capas y entidad-relación

---

## Licencia

Proyecto académico con fines educativos. Universidad ECCI, 2026.

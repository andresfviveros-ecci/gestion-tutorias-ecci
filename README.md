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

# 3. Levantar todos los servicios
docker compose up -d --build

# 4. Aplicar las migraciones
docker compose exec api python manage.py migrate

# 5. Crear un superusuario
docker compose exec api python manage.py createsuperuser

# 6. Cargar datos de prueba (opcional)
docker compose exec api python manage.py loaddata fixtures/demo.json
```

Una vez levantado:

| Servicio | URL |
|---|---|
| Aplicación web | http://localhost |
| API | http://localhost/api/v1/ |
| Documentación de la API | http://localhost/api/schema/swagger-ui/ |
| Panel administrativo | http://localhost/admin/ |

---

## Variables de entorno

Se configuran en el archivo `.env`, que **nunca se sube al repositorio**. La plantilla está en `.env.example`.

| Variable | Descripción |
|---|---|
| `DJANGO_SECRET_KEY` | Clave secreta de Django |
| `DJANGO_DEBUG` | `True` en desarrollo, `False` en producción |
| `DATABASE_URL` | Cadena de conexión a PostgreSQL |
| `REDIS_URL` | Cadena de conexión a Redis |
| `ALLOWED_HOSTS` | Dominios permitidos, separados por coma |
| `EMAIL_HOST` | Servidor SMTP para el envío de notificaciones |

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

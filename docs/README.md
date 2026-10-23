# Documentación — Gestión de Tutorías Académicas ECCI

Esta carpeta concentra la documentación técnica y funcional del módulo.

**Empieza por [DOCUMENTACION_GENERAL.md](DOCUMENTACION_GENERAL.md)**: reúne en un solo lugar lo que dice cada documento del repositorio, quién lo escribió y qué se corrigió al validarlo contra el código.

## Contenido previsto

| Documento | Propósito | Estado |
|-----------|-----------|--------|
| Arquitectura de software | Capas, apps Django, contratos API, diagrama de componentes | Pendiente en el repo (existe en Word/PDF fuera del repo) |
| Modelo de datos | Explicación del esquema | Cubierto en `backend/DOCUMENTACION_BACKEND.md` |
| Flujos de negocio | Reserva, cancelación, asistencia, evaluación | Parcial en `backend/DOCUMENTACION_BACKEND.md` |
| Despliegue | Docker, variables de entorno, PostgreSQL 16 | Cubierto en el `README.md` raíz y en `DOCUMENTACION_GENERAL.md` |
| Decisiones técnicas (ADR) | Justificación de stack y constraints | Pendiente |

## El esquema real es el de las migraciones de Django

`database/init.sql` fue el **diseño inicial** del esquema (septiembre de 2026). La base de datos que usa la aplicación **no se crea con ese archivo**: la crean las migraciones de Django (`backend/apps/*/migrations/`). Hay diferencias que conviene conocer:

| En `init.sql` | En la base real (Django) |
|---|---|
| Tablas `usuario`, `materia`, `tutoria`... | Tablas con prefijo de la app: `accounts_user`, `catalogo_materia`, `tutorias_tutoria`... |
| Tipos `ENUM` de PostgreSQL (`rol_usuario`, `estado_tutoria`...) | Campos de texto con `choices` de Django |
| Extensión `btree_gist` y constraint `EXCLUDE` contra bloques solapados | No existe en la base; el solape de horarios se valida en el serializer de disponibilidad |
| `rol_usuario` con `ESTUDIANTE`, `DOCENTE`, `COORDINADOR`, `ADMIN` | Campo `rol` de texto y grupos de Django `Estudiante`, `Docente`, `Coordinador` |

## Mapa rápido del esquema

### Identidad y catálogo

- `accounts_user` (usuario de Django extendido: documento, teléfono, código institucional, rol, foto)
- `catalogo_programaacademico`, `catalogo_periodoacademico`, `catalogo_materia`
- `catalogo_docentemateria`, `catalogo_inscripcion`

### Disponibilidad

- `disponibilidad_bloquedisponibilidad` (cupos, modalidad, estado)
- `disponibilidad_plantilladisponibilidad` (disponibilidad recurrente por día de semana; sin endpoints todavía)

### Tutorías

- `tutorias_tutoria` (estados de ciclo de vida + asistencia)
- `tutorias_cancelacion`
- `tutorias_evaluaciontutoria`

### Soporte transversal

- `notificaciones_notificacion`
- `reportes_auditoria`

## Relación con el código

| Carpeta app Django | Modelos |
|--------------------|---------|
| `backend/apps/accounts` | `User` |
| `backend/apps/catalogo` | `ProgramaAcademico`, `PeriodoAcademico`, `Materia`, `DocenteMateria`, `Inscripcion` |
| `backend/apps/disponibilidad` | `BloqueDisponibilidad`, `PlantillaDisponibilidad` |
| `backend/apps/tutorias` | `Tutoria`, `Cancelacion`, `EvaluacionTutoria` |
| `backend/apps/notificaciones` | `Notificacion` |
| `backend/apps/reportes` | `Auditoria` |

## Convenciones

- No versionar secretos: la plantilla de variables es `.env.example` en la raíz.
- Cambios de esquema: se hacen en los modelos y se generan migraciones (`makemigrations`). Si se mantiene `database/init.sql` como referencia, actualizarlo también.
- Datos de desarrollo: comando `python manage.py datos_prueba` (reemplaza a `database/seeds.sql`, que quedó vacío).

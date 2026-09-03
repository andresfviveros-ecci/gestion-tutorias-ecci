# Documentación — Gestión de Tutorías Académicas ECCI

Esta carpeta concentra la documentación técnica y funcional del módulo.

## Contenido previsto

| Documento | Propósito |
|-----------|-----------|
| Arquitectura de software | Capas, apps Django, contratos API, diagrama de componentes |
| Modelo de datos | Explicación del DDL en `../database/init.sql` |
| Flujos de negocio | Reserva, cancelación, asistencia, evaluación |
| Despliegue | Docker, variables de entorno, PostgreSQL 16 |
| Decisiones técnicas (ADR) | Justificación de stack y constraints |

## Mapa rápido del esquema

### Identidad y catálogo

- `usuario` + enum `rol_usuario`
- `programa_academico`, `periodo_academico`, `materia`
- `docente_materia`, `inscripcion`

### Disponibilidad

- `bloque_disponibilidad` (cupos, modalidad, exclusión GiST anti-solape)
- `plantilla_disponibilidad` (generación recurrente por día de semana)

### Tutorías

- `tutoria` (estados de ciclo de vida + asistencia)
- `cancelacion`
- `evaluacion_tutoria`

### Soporte transversal

- `notificacion`
- `auditoria`

## Extensiones PostgreSQL requeridas

- `btree_gist` — necesaria para el constraint `EXCLUDE` de solapes en `bloque_disponibilidad`.

## Relación con el código

| Carpeta app Django | Tablas principales |
|--------------------|--------------------|
| `backend/accounts` | `usuario` |
| `backend/catalogo` | `programa_academico`, `periodo_academico`, `materia`, `docente_materia`, `inscripcion` |
| `backend/disponibilidad` | `bloque_disponibilidad`, `plantilla_disponibilidad` |
| `backend/tutorias` | `tutoria`, `cancelacion`, `evaluacion_tutoria` |
| `backend/notificaciones` | `notificacion` |
| `backend/reportes` | consultas / vistas sobre tutorías y asistencia |

## Convenciones

- No versionar secretos (usar `.env.example`).
- Cambios de esquema: actualizar `database/init.sql` y documentar aquí el impacto.
- Seeds de desarrollo: `database/seeds.sql`.

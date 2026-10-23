# Documentación de Pruebas y Endpoints API - Aula Libre

Este documento especifica la estructura de rutas del sistema para la verificación de integración entre la interfaz gráfica en React y el backend en Django REST Framework.

Las URLs usan los puertos por defecto (`APP_PORT=8000`, `FRONTEND_PORT=5173`). Si se cambian en el `.env`, se cambian aquí también.

---

## 1. Documentación e Interfaces del Backend

* Swagger UI (Interfaz Interactiva): http://localhost:8000/api/docs/
* Esquema OpenAPI JSON: http://localhost:8000/api/schema/
* Panel de Administración Django: http://localhost:8000/admin/

---

## 2. Endpoints de la API Backend

Todos requieren el token JWT en `Authorization: Bearer <token>`, salvo login y recuperación. El detalle de cada uno está en `backend/DOCUMENTACION_BACKEND.md`.

### Autenticación (apps.accounts)
* POST /api/accounts/login/ - Inicio de sesión con correo y contraseña (retorna tokens JWT access, refresh y lista de grupos).
* POST /api/accounts/recovery/ - Solicitud del PIN de recuperación de contraseña (solo correos @ecci.edu.co).
* POST /api/accounts/recovery/change-password/ - Cambio de contraseña con el token y el PIN.

No hay endpoint de renovación del token (`token/refresh/`): cuando el access vence, hay que iniciar sesión de nuevo.

### Usuarios (apps.accounts)
* GET, POST /api/accounts/estudiantes/ - Lista o registra estudiantes (Coordinador).
* GET, PUT, DELETE /api/accounts/estudiantes/{id}/ - Detalle, edición o eliminación de un estudiante (Coordinador).
* GET, POST /api/accounts/tutores/ - Lista docentes activos (Coordinador o Estudiante) o registra uno (Coordinador).
* GET, PUT, DELETE /api/accounts/tutores/{id}/ - Detalle, edición o eliminación de un docente (Coordinador).
* GET, POST /api/accounts/coordinadores/ - Lista o registra coordinadores (Coordinador).
* GET, PUT, DELETE /api/accounts/coordinadores/{id}/ - Responden 403: no están implementados.

### Disponibilidad de Tutorías (apps.disponibilidad)
* GET /api/disponibilidad/disponibilidad/ - Lista los bloques de disponibilidad (filtros opcionales: docente, materia, fecha, estado).
* POST /api/disponibilidad/disponibilidad/ - Registro de un nuevo bloque para el usuario autenticado.
* GET /api/disponibilidad/{id}/actualizar/ - Detalle de un bloque de disponibilidad específico.
* PUT /api/disponibilidad/{id}/actualizar/ - Modificación de un bloque (solo el docente dueño).
* DELETE /api/disponibilidad/{id}/actualizar/ - Eliminación de un bloque sin reservas (solo el docente dueño).

### Agendamiento de Tutorías (apps.tutorias)
* POST /api/tutorias/tutorias/ - Reserva de una tutoría asociando un bloque de disponibilidad (`bloque_id`, `tema`, `descripcion` opcional).
* GET /api/tutorias/tutorias/ - Lista las tutorías del estudiante autenticado (un docente recibe una lista vacía; ver pendientes del backend).
* GET, PUT, PATCH /api/tutorias/tutorias/{id}/ - Detalle o edición de una tutoría propia en estado RESERVADA.
* DELETE /api/tutorias/tutorias/{id}/ - Cancelación con motivo; libera el cupo.

### Catálogo Académico (apps.catalogo)
* GET, POST /api/catalogo/materias/ - Listado o registro de materias.
* GET, PUT, DELETE /api/catalogo/materias/{id}/ - Detalle, edición o eliminación de una materia.
* GET, POST /api/catalogo/programas/ - Listado o registro de programas académicos.
* GET, PUT, PATCH, DELETE /api/catalogo/programas/{id}/ - Detalle, edición o eliminación de un programa.
* GET, POST /api/catalogo/periodos/ - Listado o registro de periodos académicos.
* GET, PUT, PATCH, DELETE /api/catalogo/periodos/{id}/ - Detalle, edición o eliminación de un periodo.

---

## 3. Matriz de Rutas del Frontend (React App)

El rol `admin` corresponde al grupo Coordinador, `tutor` a Docente y `estudiante` a Estudiante.

| Ruta de la URL | Componente / Archivo | Rol Permitido | Descripción de la Vista |
| :--- | :--- | :--- | :--- |
| http://localhost:5173/ | pages/Login.tsx | Público | Formulario de autenticación y flujo de recuperación de clave. |
| http://localhost:5173/inicio | pages/estudiante/StudentHome.tsx | estudiante, admin | Portal principal para estudiantes, disponibilidad del día y acceso a la reserva. |
| http://localhost:5173/estudiante | (redirección) | — | Redirige a /inicio. |
| http://localhost:5173/estudiante/dashboard | pages/estudiante/DashboardEstudiante.tsx | estudiante, admin | Resumen del estudiante: próxima tutoría, tutorías tomadas en el semestre, tutores disponibles y materias con tutoría. |
| http://localhost:5173/estudiante/buscar-tutorias | pages/estudiante/BuscarTutorias.tsx | estudiante, admin | Búsqueda de disponibilidad por docente, materia o fecha y reserva. |
| http://localhost:5173/estudiante/mis-reservas | pages/estudiante/MisReservas.tsx | estudiante, admin | Reservas del estudiante, edición y cancelación. |
| http://localhost:5173/estudiante/historial | pages/estudiante/MisReservas.tsx | estudiante, admin | Historial de tutorías (mismo componente que Mis reservas). |
| http://localhost:5173/dashboard | pages/Dashboard.tsx | admin | Panel principal de administración con estadísticas y métricas del sistema. |
| http://localhost:5173/estudiantes | pages/Estudiantes.tsx | admin | Gestión y visualización de estudiantes registrados. |
| http://localhost:5173/tutores | pages/Tutores.tsx | admin | Gestión y visualización del cuerpo docente / tutores. |
| http://localhost:5173/coordinadores | pages/Coordinadores.tsx | admin | Gestión y visualización de usuarios coordinadores. |
| http://localhost:5173/gestionar-usuarios | pages/GestionarUsuarios.tsx | admin | Administración global de cuentas de usuario y permisos de roles. |
| http://localhost:5173/tutor/dashboard | pages/tutor/DashboardTutor.tsx | tutor, admin | Resumen del tutor: agenda del día con sus bloques y el estudiante asignado a cada uno. |
| http://localhost:5173/tutor/mi-disponibilidad | pages/tutor/MiDisponibilidad.tsx | tutor, admin | Formulario de publicación de horarios y matriz semanal de disponibilidad docente. |
| http://localhost:5173/tutor/calendario | pages/tutor/Calendario.tsx | tutor, admin | Vista interactiva de calendario para gestión de agenda del tutor. |
| cualquier otra | (redirección) | — | Redirige al login (/). |

---

## 4. Usuarios para probar

Con los datos de prueba cargados (`SEED_DEMO=1`), todos con la contraseña `Aula2026*`:

| Rol | Correo | Qué probar |
| --- | --- | --- |
| Coordinador (admin) | coordinador@aulalibre.test | Rutas de administración y listados de usuarios. |
| Docente (tutor) | docente@aulalibre.test | Disponibilidad y calendario (tiene ISIS-101, ISIS-102 e ISIS-301). |
| Estudiante | estudiante@aulalibre.test | Búsqueda, reserva, cancelación e historial (~22 tutorías en varios estados). |

# Documentación de Pruebas y Endpoints API - Aula Libre

Este documento especifica la estructura de rutas del sistema para la verificación de integración entre la interfaz gráfica en React y el backend en Django REST Framework.

---

## 1. Documentación e Interfaces del Backend

* Swagger UI (Interfaz Interactiva): http://localhost:8000/api/docs/
* Esquema OpenAPI JSON: http://localhost:8000/api/schema/
* Panel de Administración Django: http://localhost:8000/admin/

---

## 2. Endpoints de la API Backend

### Autenticación (apps.accounts)
* POST /api/accounts/login/ - Inicio de sesión de usuarios (retorna tokens JWT access, refresh y lista de grupos).
* POST /api/accounts/recovery/ - Solicitud de código de verificación para recuperación de contraseña.
* POST /api/accounts/token/refresh/ - Renovación de token de acceso JWT.

### Disponibilidad de Tutorías (apps.disponibilidad)
* GET /api/disponibilidades/ - Lista los bloques de disponibilidad registrados.
* POST /api/disponibilidades/ - Registro de un nuevo bloque de disponibilidad (Docentes / Coordinadores).
* GET /api/disponibilidades/{id}/ - Detalle de un bloque de disponibilidad específico.
* PUT /api/disponibilidades/{id}/ - Modificación de un bloque de disponibilidad.
* DELETE /api/disponibilidades/{id}/ - Eliminación de un bloque de disponibilidad.

### Agendamiento de Tutorías (apps.tutorias)
* POST /api/tutorias/ - Realiza la reserva de una tutoría asociando un bloque de disponibilidad.
* GET /api/tutorias/ - Lista las tutorías agendadas asociadas al usuario autenticado.

### Catálogo Académico (apps.catalogo)
* GET /api/catalogo/materias/ - Consulta el listado de materias académicas disponibles.
* POST /api/catalogo/materias/ - Registro de una nueva materia académica.
* GET /api/catalogo/periodos/ - Consulta de los periodos académicos registrados.

---

## 3. Matriz de Rutas del Frontend (React App)

| Ruta de la URL | Componente / Archivo | Rol Permitido | Descripción de la Vista |
| :--- | :--- | :--- | :--- |
| http://localhost:5173/ | pages/Login.tsx | Público | Formulario de autenticación y flujo de recuperación de clave. |
| http://localhost:5173/inicio | pages/StudentHome.tsx | estudiante, admin | Portal principal para estudiantes, consulta de horarios y formulario de reserva. |
| http://localhost:5173/dashboard | pages/Dashboard.tsx | admin | Panel principal de administración con estadísticas y métricas del sistema. |
| http://localhost:5173/estudiantes | pages/Estudiantes.tsx | admin | Gestión y visualización de estudiantes registrados. |
| http://localhost:5173/tutores | pages/Tutores.tsx | admin | Gestión y visualización del cuerpo docente / tutores. |
| http://localhost:5173/coordinadores | pages/Coordinadores.tsx | admin | Gestión y visualización de usuarios coordinadores. |
| http://localhost:5173/gestionar-usuarios | pages/GestionarUsuarios.tsx | admin | Administración global de cuentas de usuario y permisos de roles. |
| http://localhost:5173/tutor/mi-disponibilidad | pages/tutor/MiDisponibilidad.tsx | tutor, admin | Formulario de publicación de horarios y matriz semanal de disponibilidad docente. |
| http://localhost:5173/tutor/calendario | pages/tutor/Calendario.tsx | tutor, admin | Vista interactiva de calendario para gestión de agenda del tutor. |
# Frontend — Aula Libre

Interfaz web del sistema de **Gestión de Tutorías Académicas** (Aula Libre). Es una SPA en React que consume la API REST del backend Django.

Las rutas de la app y los endpoints que usa están en [README_TESTS.md](README_TESTS.md).

---

## Stack

| Tecnología | Versión | Uso |
| --- | --- | --- |
| React | 19.3 | Interfaz |
| TypeScript | 6.0 | Tipado |
| Vite | 8.3 | Servidor de desarrollo y build |
| React Router | 7.18 | Rutas y protección por rol |
| Zustand | 5.0 | Estado global (sesión, disponibilidad, tutores) |
| TanStack Query | 5.104 | Caché de consultas |
| Axios | 1.20 | Cliente HTTP con el token JWT |
| React Hook Form + Zod | 7.90 / 3.25 | Formularios y validación |
| Tailwind CSS | 3.4 | Estilos |
| FullCalendar | 6.1.22 | Calendario del tutor |
| GSAP + Framer Motion | 3.15 / 14.4 | Animaciones |
| Capacitor | 8.5 | Empaquetado como app Android (`appId: co.edu.ecci.aulalibre`) |
| ESLint | 10.13 | Lint (con `react-hooks` y `react-refresh`) |

---

## Estructura

```text
frontend/
├── src/
│   ├── api/axios.ts        # cliente HTTP; adjunta el JWT salvo en login y recovery
│   ├── components/         # Layout, Loader, ProtectedRoute, Sidebar
│   ├── pages/
│   │   ├── Login.tsx       # login y recuperación de contraseña en 3 pasos
│   │   ├── Dashboard.tsx, Estudiantes.tsx, Tutores.tsx,
│   │   │   Coordinadores.tsx, GestionarUsuarios.tsx   # coordinación (rol admin)
│   │   ├── estudiante/     # StudentHome, DashboardEstudiante, BuscarTutorias, MisReservas
│   │   └── tutor/          # DashboardTutor, MiDisponibilidad, Calendario
│   ├── schemas/            # esquemas Zod (studentSchema)
│   ├── store/              # useAuthStore, useScheduleStore, useTutorStore
│   ├── types/              # tipos de la API (backend.ts) y de la app
│   ├── config.ts           # lee VITE_API_URL y VITE_EMAIL_DOMAINS
│   └── App.tsx             # definición de rutas
├── Dockerfile              # destinos dev (Vite) y prod (Nginx)
├── nginx.conf              # servidor de producción con fallback a index.html
├── capacitor.config.ts
└── vite.config.ts
```

---

## Roles

El login devuelve los grupos de Django del usuario y el frontend los traduce a un rol interno:

| Grupo en el backend | Rol en el frontend | Entra a |
| --- | --- | --- |
| `Coordinador` | `admin` | `/dashboard` y gestión de usuarios (también puede abrir las vistas de estudiante y tutor) |
| `Docente` | `tutor` | `/tutor/...` |
| `Estudiante` | `estudiante` | `/inicio` y `/estudiante/...` |

La sesión se guarda en `localStorage` con la clave `aula_auth_storage`.

---

## Correr con Docker (recomendado)

Desde la raíz del proyecto:

```bash
cp .env.example .env
docker compose up -d --build
```

Abre http://localhost:5173 (o el puerto que pongas en `FRONTEND_PORT`). El código de `frontend/` está montado en el contenedor y Vite recarga los cambios solo.

Para entrar con los datos de prueba: `estudiante@aulalibre.test`, `docente@aulalibre.test` o `coordinador@aulalibre.test`, contraseña `Aula2026*`.

## Correr sin Docker

```bash
cd frontend
npm ci
npm run dev
```

En ese caso el backend tiene que estar en http://localhost:8000 o hay que definir `VITE_API_URL`.

---

## Variables de entorno

| Variable | Uso | Por defecto |
| --- | --- | --- |
| `VITE_API_URL` | URL base de la API que llama el navegador | `http://localhost:8000/api` |
| `VITE_EMAIL_DOMAINS` | Dominios de correo aceptados en login y formularios, separados por coma | `ecci.edu.co` |
| `VITE_USE_POLLING` | `true` para que Vite detecte cambios dentro de Docker en Windows o Mac | `false` |
| `FRONTEND_PORT` | Puerto publicado en la máquina (solo docker-compose) | `5173` |

En docker-compose, `VITE_API_URL` se arma con `APP_PORT` y `VITE_EMAIL_DOMAINS` incluye `aulalibre.test` para poder entrar con los datos de prueba. La imagen de producción solo acepta `ecci.edu.co`.

---

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en el puerto 5173 |
| `npm run build` | Revisa tipos con `tsc -b` y genera `dist/` |
| `npm run lint` | ESLint |
| `npm run preview` | Sirve el build de `dist/` |

## Imagen de producción

```bash
docker build --target prod --build-arg VITE_API_URL=https://mi-api/api -t aula-libre-frontend ./frontend
docker run -p 8080:80 aula-libre-frontend
```

El CD publica esta imagen en `ghcr.io/andresfviveros-ecci/gestion-tutorias-ecci-frontend` en cada merge a `main`. La URL de la API sale de la variable del repositorio `VITE_API_URL`.

---

## ESLint con reglas que usan tipos

El proyecto nació de la plantilla oficial de React + TypeScript + Vite. Esa plantilla sugiere, para una aplicación en producción, activar las reglas de ESLint que usan la información de tipos (`tseslint.configs.recommendedTypeChecked`, o `strictTypeChecked` y `stylisticTypeChecked` para algo más estricto, con `parserOptions.project` apuntando a `tsconfig.node.json` y `tsconfig.app.json`), y agregar `eslint-plugin-react-x` y `eslint-plugin-react-dom` para reglas específicas de React. Hoy no están activadas.

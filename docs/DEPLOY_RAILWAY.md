# Despliegue en Railway

Aula Libre se despliega en Railway como **tres servicios dentro de un mismo proyecto**. Cada uno se construye con su propio Dockerfile y solo se vuelve a desplegar cuando cambia su carpeta.

| Servicio | Sale de | Qué corre | Healthcheck |
|---|---|---|---|
| **Postgres** | Plantilla de Railway | PostgreSQL | Lo maneja Railway |
| **backend** | `backend/` | Migraciones y gunicorn en `$PORT` (`start.sh`) | `/api/salud/` |
| **frontend** | `frontend/` | Build de Vite servido por Nginx en `$PORT` | `/` |

El backend y el frontend tienen su configuración en `backend/railway.json` y `frontend/railway.json`: Dockerfile, healthcheck, reinicio si falla y rutas que disparan el despliegue.

> Antes de desplegar en serio, revisa la sección **Correo**: en el plan Hobby de Railway el SMTP está bloqueado.

---

## 1. Crear el proyecto y la base de datos

1. En Railway: **New Project → Deploy from GitHub repo** y elige `gestion-tutorias-ecci`. Railway crea un servicio; ese será el **backend**, así que bórralo o configúralo en el paso 2.
2. En el proyecto: **+ Create → Database → PostgreSQL**. Queda un servicio llamado `Postgres`.

## 2. Servicio backend

En **Settings** del servicio:

| Opción | Valor |
|---|---|
| Source → Root Directory | `/backend` |
| Config-as-code → Railway Config File | `/backend/railway.json` (con la barra inicial: la ruta no sigue al Root Directory) |
| Networking → Public Networking | **Generate Domain** (queda algo como `aula-libre-api.up.railway.app`) |

En **Variables**:

| Variable | Valor | Para qué |
|---|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Conexión a la base por la red privada |
| `DJANGO_DEBUG` | `False` | |
| `DJANGO_SECRET_KEY` | Una clave larga y aleatoria | Generarla con `python -c "import secrets; print(secrets.token_urlsafe(50))"` |
| `DJANGO_ALLOWED_HOSTS` | Tu dominio propio, si tienes (si no, `localhost`) | El dominio de Railway y el host del healthcheck se agregan solos |
| `CORS_ALLOWED_ORIGINS` | `https://<dominio-del-frontend>` | Se llena en el paso 3 |
| `NUM_PROXIES` | `1` | La IP real del usuario llega por el proxy de Railway (límite de intentos y HTTPS) |
| `SEED_DEMO` | `1` para una demo, `0` en producción real | Carga los datos de prueba al arrancar si no están |
| `EMAIL_DOMAINS` | `ecci.edu.co,aulalibre.test` | Dominios de correo aceptados (quita `aulalibre.test` en producción real) |
| Correo | Ver la sección **Correo** | |

Opcionales: `WEB_CONCURRENCY` (procesos de gunicorn, 2 por defecto), `CSRF_TRUSTED_ORIGINS` (si el admin se abre con un dominio propio), `JWT_ACCESS_MINUTES`, `JWT_REFRESH_DAYS`.

Al desplegar, `start.sh` aplica las migraciones, crea la tabla de caché, carga los datos de prueba si `SEED_DEMO=1` y levanta gunicorn. Railway da el despliegue por bueno cuando `/api/salud/` responde 200, es decir, cuando la base ya contesta.

Para comprobarlo: `https://<dominio-del-backend>/api/salud/` debe responder `{"estado": "ok"}`, y `/api/docs/` debe abrir Swagger con estilos.

## 3. Servicio frontend

**+ Create → GitHub Repo** con el mismo repositorio. En **Settings**:

| Opción | Valor |
|---|---|
| Source → Root Directory | `/frontend` |
| Config-as-code → Railway Config File | `/frontend/railway.json` |
| Networking → Public Networking | **Generate Domain** |

En **Variables** (Railway las pasa al build como `ARG`; Vite las deja fijas en el JavaScript):

| Variable | Valor |
|---|---|
| `VITE_API_URL` | `https://${{backend.RAILWAY_PUBLIC_DOMAIN}}/api` |
| `VITE_EMAIL_DOMAINS` | El mismo valor de `EMAIL_DOMAINS` del backend |

Después vuelve al **backend** y pon `CORS_ALLOWED_ORIGINS=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}`.

> Como `VITE_API_URL` se fija al construir, si cambias el dominio del backend tienes que volver a desplegar el frontend.

## 4. Correo

Railway bloquea el SMTP saliente (puertos 25, 465 y 587) en los planes Free, Trial y Hobby; solo lo permite en Pro. Hay dos caminos:

**A. API de correo por HTTPS (recomendado en Hobby).** El backend trae `django-anymail`. Con Resend, por ejemplo:

| Variable | Valor |
|---|---|
| `EMAIL_BACKEND` | `anymail.backends.resend.EmailBackend` |
| `RESEND_API_KEY` | La clave de Resend |
| `DEFAULT_FROM_EMAIL` | Un remitente de un dominio verificado en Resend |

También están listos Brevo (`anymail.backends.brevo.EmailBackend` + `BREVO_API_KEY`), SendGrid, Mailgun y Postmark.

**B. SMTP en el plan Pro.** Las mismas variables de siempre (`EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend`, `EMAIL_HOST`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`), y un redespliegue después de subir de plan.

Si el correo falla, la tutoría o la recuperación de contraseña se guardan igual: el envío no rompe la petición y se rinde a los 10 s (`EMAIL_TIMEOUT`).

## 5. Primer administrador (producción real)

Con `SEED_DEMO=0` no hay usuarios. Para crear el primero:

1. Instala la [CLI de Railway](https://docs.railway.com/guides/cli) y vincula el proyecto: `railway link`.
2. Entra al contenedor del backend: `railway ssh --service backend`.
3. Corre `python manage.py createsuperuser`.
4. Entra a `https://<dominio-del-backend>/admin/`, abre ese usuario y agrégale el grupo **Administrador**. Sin el grupo, el frontend lo trata como estudiante.

Desde ahí, el Administrador crea a los coordinadores en la app.

## 6. Dominio propio (opcional)

En **Settings → Networking → Custom Domain** de cada servicio, Railway da un registro CNAME y uno TXT para crear en tu DNS. Usa subdominios, por ejemplo `app.tudominio.com` para el frontend y `api.tudominio.com` para el backend; un dominio raíz necesita un DNS con CNAME flattening, como Cloudflare.

Después de cambiar de dominio:
- backend: agrega el dominio a `DJANGO_ALLOWED_HOSTS` y `https://api.tudominio.com` a `CSRF_TRUSTED_ORIGINS`;
- backend: cambia `CORS_ALLOWED_ORIGINS` al dominio nuevo del frontend;
- frontend: cambia `VITE_API_URL` y vuelve a desplegar.

## Probar las imágenes de producción en tu máquina

El CI ya lo hace en cada PR (job «Imágenes de producción»). Para hacerlo a mano:

```bash
docker build -t aula-backend:prod backend
docker build -t aula-frontend:prod --build-arg VITE_API_URL=http://localhost:8000/api frontend
```

El backend necesita una base Postgres en `DATABASE_URL`, `DJANGO_DEBUG=False`, `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS=localhost` y `DJANGO_SECURE_COOKIES=False` (para poder entrar al admin por `http://`). El frontend corre con `docker run -p 8080:8080 -e PORT=8080 aula-frontend:prod`.

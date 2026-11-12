# Imagen del frontend con dos destinos:
#   dev  -> servidor de Vite con recarga automática (lo usa docker-compose)
#   prod -> build estático servido por Nginx (lo publica el CD y lo usa
#           Railway, que construye la última etapa por defecto)
# Se usa node slim (glibc) y no alpine: el lockfile no trae los binarios
# de Vite/Rolldown para musl.

FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# La URL de la API queda fija en el build (Vite la incrusta en el JS). En
# Railway llega como variable del servicio: Railway pasa como build args las
# variables que coinciden con un ARG.
FROM deps AS build
ARG VITE_API_URL=http://localhost:8000/api
ARG VITE_EMAIL_DOMAINS=ecci.edu.co
ENV VITE_API_URL=$VITE_API_URL \
    VITE_EMAIL_DOMAINS=$VITE_EMAIL_DOMAINS
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS prod
# La plantilla toma el puerto de $PORT al arrancar (Railway lo define).
ENV PORT=80
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

# Imagen del frontend con dos destinos:
#   dev  -> servidor de Vite con recarga automática (lo usa docker-compose)
#   prod -> build estático servido por Nginx (lo publica el CD)
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

FROM deps AS build
ARG VITE_API_URL=http://localhost:8000/api
ARG VITE_EMAIL_DOMAINS=ecci.edu.co
ENV VITE_API_URL=$VITE_API_URL \
    VITE_EMAIL_DOMAINS=$VITE_EMAIL_DOMAINS
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

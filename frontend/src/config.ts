// Configuración que llega por variables de entorno (ver .env.example en la raíz).
// En Docker las define docker-compose; en el build de producción, los build args.

export const API_URL: string = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// Dominios de correo aceptados en el login y en los formularios de usuarios.
// Producción: solo ecci.edu.co. Desarrollo: también aulalibre.test (datos de prueba).
export const DOMINIOS_CORREO: string[] = (import.meta.env.VITE_EMAIL_DOMAINS || "ecci.edu.co")
  .split(",")
  .map((dominio) => dominio.trim().toLowerCase())
  .filter(Boolean);

export const esCorreoPermitido = (correo: string): boolean =>
  DOMINIOS_CORREO.some((dominio) => correo.toLowerCase().endsWith(`@${dominio}`));

export const MENSAJE_DOMINIO = `Debe ser correo institucional ${DOMINIOS_CORREO.map((d) => `@${d}`).join(" o ")}`;

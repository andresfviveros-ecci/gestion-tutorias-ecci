import axios from "axios";
import { API_URL } from "../config";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const CLAVES_SESION = [
  "token",
  "refresh_token",
  "aula_auth_storage",
  "auth-storage",
];

const esEndpointAuth = (url?: string) =>
  Boolean(url?.includes("login") || url?.includes("recovery"));

/** Lee el JWT de cualquiera de los almacenamientos que usa la app. */
const leerTokenGuardado = (): string | null => {
  const directo =
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("access") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("sessionToken");

  if (directo) return directo;

  const desdePersist = (clave: string): string | null => {
    try {
      const crudo = localStorage.getItem(clave);
      if (!crudo) return null;
      const parsed = JSON.parse(crudo);
      return (
        parsed?.state?.token ||
        parsed?.state?.access ||
        parsed?.state?.access_token ||
        null
      );
    } catch {
      return null;
    }
  };

  // zustand persist guarda en 'aula_auth_storage'; 'auth-storage' queda por compatibilidad
  return desdePersist("aula_auth_storage") || desdePersist("auth-storage");
};

// Interceptor para adjuntar el Token JWT a endpoints protegidos
api.interceptors.request.use((config) => {
  if (esEndpointAuth(config.url)) {
    if (config.headers) {
      delete config.headers.Authorization;
    }
    return config;
  }

  const token = leerTokenGuardado();

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

let sesionExpiradaAvisada = false;

/**
 * El backend emite un access token de 5 minutos y todavía no hay refresh,
 * así que un 401 en un endpoint protegido significa sesión vencida:
 * se limpia el almacenamiento y se vuelve al login con un aviso.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url: string | undefined = error?.config?.url;

    if (status === 401 && !esEndpointAuth(url) && !sesionExpiradaAvisada) {
      sesionExpiradaAvisada = true;

      CLAVES_SESION.forEach((clave) => localStorage.removeItem(clave));
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("sessionToken");
      sessionStorage.setItem("auth_expired", "1");

      if (window.location.pathname !== "/") {
        window.location.replace("/");
      }
    }

    return Promise.reject(error);
  }
);

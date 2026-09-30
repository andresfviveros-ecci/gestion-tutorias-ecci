import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:8000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para adjuntar el Token JWT a endpoints protegidos
api.interceptors.request.use((config) => {
  const isPublicEndpoint =
    config.url?.includes("login") || config.url?.includes("recovery");

  if (!isPublicEndpoint) {
    let token =
      localStorage.getItem("token") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("access") ||
      sessionStorage.getItem("token") ||
      sessionStorage.getItem("sessionToken");

    if (!token) {
      try {
        const authStorage = localStorage.getItem("auth-storage");
        if (authStorage) {
          const parsed = JSON.parse(authStorage);
          token =
            parsed?.state?.token ||
            parsed?.state?.access ||
            parsed?.state?.access_token;
        }
      } catch {
        // Ignorar si no existe
      }
    }

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } else if (config.headers) {
    delete config.headers.Authorization;
  }

  return config;
});

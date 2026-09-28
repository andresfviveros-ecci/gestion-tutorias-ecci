import axios from 'axios';

// Instancia global conectada a tu servidor Django
export const api = axios.create({
  baseURL: 'http://localhost:8000/api', // Asegúrate si tu grupo usó el prefijo /api/ en el urls.py principal
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adjuntar el Token JWT cuando el usuario esté autenticado
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
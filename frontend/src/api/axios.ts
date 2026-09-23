import axios from 'axios';

export const api = axios.create({
  baseURL: 'https://api.aulalibre.edu.co/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const user = localStorage.getItem('aula_user');
  if (user && config.headers) {
    config.headers.Authorization = `Bearer fake-jwt-token`;
  }
  return config;
});
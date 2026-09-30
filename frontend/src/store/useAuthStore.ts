import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../api/axios';

export type UserRole = 'admin' | 'estudiante' | 'tutor';

export interface User {
  id?: string;
  nombre: string;
  correo: string;
  role: UserRole;
}

interface LoginBackendResponse {
  access: string;
  refresh: string;
  groups: [number, string][];
}

interface AuthState {
  user: User | null;
  token: string | null;
  login: (correo: string, pass: string) => Promise<User | null>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,

      login: async (correo: string, pass: string) => {
        try {
          const cleanEmail = correo.trim().toLowerCase();

          // Limpiar tokens previos en el almacenamiento antes de iniciar sesión
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');

          // Petición a http://localhost:8000/api/accounts/login/
          const response = await api.post<LoginBackendResponse>('accounts/login/', {
            email: cleanEmail,
            password: pass,
          });

          const { access, refresh, groups } = response.data;

          // Mapeo de grupos retornado por LoginView en Django
          let role: UserRole = 'estudiante';
          const groupNames = groups ? groups.map((g) => g[1]) : [];

          if (groupNames.includes('Coordinador')) {
            role = 'admin';
          } else if (groupNames.includes('Docente')) {
            role = 'tutor';
          } else if (groupNames.includes('Estudiante')) {
            role = 'estudiante';
          }

          const loggedUser: User = {
            id: cleanEmail,
            nombre: cleanEmail.split('@')[0],
            correo: cleanEmail,
            role: role,
          };

          // Guardar el nuevo token JWT
          localStorage.setItem('token', access);
          localStorage.setItem('refresh_token', refresh);

          set({
            user: loggedUser,
            token: access,
          });

          return loggedUser;
        } catch (error) {
          console.error('Error de inicio de sesión:', error);
          return null;
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        set({ user: null, token: null });
      },
    }),
    {
      name: 'aula_auth_storage',
    }
  )
);
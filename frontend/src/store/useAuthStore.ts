import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../api/axios';
import type { StudentFormData } from '../schemas/studentSchema';

export type UserRole = 'admin' | 'estudiante' | 'tutor';

export interface User {
  id?: string;
  nombre: string;
  correo: string;
  role: UserRole;
}

interface AuthState {
  user: User | null;
  token: string | null;
  students: StudentFormData[];
  login: (correo: string, pass: string) => Promise<User | null>;
  logout: () => void;
  addStudent: (student: StudentFormData) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      students: [
        {
          fullName: 'Juan Esteban Soto',
          idNumber: '1006543210',
          career: 'Ingeniería de Sistemas',
          email: 'usuario@ecci.edu.co',
        },
      ],

      login: async (correo: string, pass: string) => {
        try {
          const cleanEmail = correo.trim().toLowerCase();

          // Petición real al backend de Django
          const response = await api.post('/accounts/login/', {
            username: cleanEmail, // El serializer en Django valida por 'username'
            password: pass,
          });

          const { access, refresh, groups } = response.data;

          // Mapear el grupo que retorna Django con el rol del Frontend
          let role: UserRole = 'estudiante';
          if (groups && groups.length > 0) {
            const groupName = groups[0][1]; // 'Estudiante', 'Docente' o 'Coordinador'
            if (groupName === 'Docente') role = 'tutor';
            else if (groupName === 'Coordinador') role = 'admin';
            else role = 'estudiante';
          }

          const loggedUser: User = {
            id: cleanEmail,
            nombre: cleanEmail.split('@')[0],
            correo: cleanEmail,
            role: role,
          };

          // Guardar los tokens JWT en el navegador
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

      addStudent: (student) =>
        set((state) => ({
          students: [student, ...state.students],
        })),
    }),
    {
      name: 'aula_auth_storage',
    }
  )
);
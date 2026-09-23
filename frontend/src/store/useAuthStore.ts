import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StudentFormData } from '../schemas/studentSchema';

export interface User {
  email: string;
  name: string;
  role: 'admin' | 'estudiante';
}

interface AuthState {
  user: User | null;
  students: StudentFormData[];
  login: (email: string, pass: string) => User | null;
  logout: () => void;
  addStudent: (student: StudentFormData) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      students: [
        {
          fullName: 'Juan Esteban Soto',
          idNumber: '1006543210',
          career: 'Ingeniería de Sistemas',
          email: 'usuario@ecci.edu.co',
        },
      ],

      login: (email, pass) => {
        const cleanEmail = email.trim().toLowerCase();
        const cleanPass = pass.trim();

        if (cleanEmail === 'admin@ecci.edu.co' && cleanPass === 'admin') {
          const adminUser: User = {
            email: cleanEmail,
            name: 'Administrador ECCI',
            role: 'admin',
          };
          set({ user: adminUser });
          return adminUser;
        }

        if (cleanEmail === 'usuario@ecci.edu.co' && cleanPass === 'usuario') {
          const studentUser: User = {
            email: cleanEmail,
            name: 'Juan Esteban Soto',
            role: 'estudiante',
          };
          set({ user: studentUser });
          return studentUser;
        }

        return null;
      },

      logout: () => set({ user: null }),

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
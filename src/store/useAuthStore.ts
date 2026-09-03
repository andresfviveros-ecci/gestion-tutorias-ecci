import { create } from 'zustand';
import type { User, Estudiante } from '../types/index';

interface AuthStore {
  user: User | null;
  students: Estudiante[];
  login: (email: string, password: string) => boolean;
  logout: () => void;
  addStudent: (student: Estudiante) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: JSON.parse(localStorage.getItem('aula_user') || 'null'),
  students: JSON.parse(localStorage.getItem('aula_estudiantes') || '[]'),

  login: (email: string, pass: string) => {
    if (email === 'usuario@ecci.edu.co' && pass === 'usuario') {
      const userData: User = {
        email,
        name: 'Juan Esteban Soto',
        role: 'Administrador',
      };
      localStorage.setItem('aula_user', JSON.stringify(userData));
      set({ user: userData });
      return true;
    }
    return false;
  },

  logout: () => {
    localStorage.removeItem('aula_user');
    set({ user: null });
  },

  addStudent: (student: Estudiante) => {
    set((state) => {
      const updated = [student, ...state.students];
      localStorage.setItem('aula_estudiantes', JSON.stringify(updated));
      return { students: updated };
    });
  },
}));
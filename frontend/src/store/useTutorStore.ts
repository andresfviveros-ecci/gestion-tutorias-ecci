import { create } from 'zustand';
import { api } from '../api/axios';

export interface TutorGroup {
  facultyName: string;
  subjects: string[];
}

export interface Tutor {
  id: number | string;
  nombre: string;
  correo: string;
  groups: TutorGroup[];
}

export interface TutorBackend {
  id?: number | string;
  username?: string;
  nombre?: string;
  nombres?: string;
  apellidos?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  correo?: string;
  facultad?: string;
  materia?: string;
}

interface TutorStoreState {
  tutores: Tutor[];
  loading: boolean;
  fetchTutores: () => Promise<void>;
  addTutor: (tutorData: {
    nombres: string;
    apellidos: string;
    email: string;
    facultad: string;
    materia: string;
    password?: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

const parseBackendError = (error: unknown): string => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const res = (error as { response?: { data?: Record<string, unknown> | string } }).response;
    if (res && res.data) {
      const data = res.data;
      if (typeof data === 'string') return data;
      if (typeof data === 'object') {
        if (data.detail && typeof data.detail === 'string') return data.detail;
        
        if (data.email || data.username) {
          const emailMsg = data.email ? (Array.isArray(data.email) ? data.email.join(' ') : String(data.email)) : '';
          const userMsg = data.username ? (Array.isArray(data.username) ? data.username.join(' ') : String(data.username)) : '';
          const combined = `${emailMsg} ${userMsg}`.toLowerCase();

          if (combined.includes('already exists') || combined.includes('ya existe') || combined.includes('registrado')) {
            return 'El correo electrónico ya se encuentra registrado con otra cuenta.';
          }
          return `Correo: ${emailMsg || userMsg}`;
        }
        if (data.documento || data.identificacion) {
          return 'El número de identificación ya se encuentra registrado.';
        }
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          const val = data[firstKey];
          const msg = Array.isArray(val) ? val.join(' ') : String(val);
          return `${firstKey.toUpperCase()}: ${msg}`;
        }
      }
    }
  }
  return 'Ocurrió un error al guardar el tutor.';
};

export const useTutorStore = create<TutorStoreState>((set) => ({
  tutores: [],
  loading: false,

  fetchTutores: async () => {
    set({ loading: true });
    try {
      const response = await api.get<TutorBackend[]>('/accounts/tutores/');
      const mapped: Tutor[] = response.data.map((item) => {
        const fullName =
          `${item.nombres || item.first_name || ''} ${item.apellidos || item.last_name || ''}`.trim() ||
          item.nombre ||
          item.username ||
          'Tutor';

        return {
          id: item.id ?? Math.random(),
          nombre: fullName,
          correo: item.email || item.correo || '',
          groups: [
            {
              facultyName: item.facultad || 'Ingeniería',
              subjects: [item.materia || 'Tutorías Generales'],
            },
          ],
        };
      });
      set({ tutores: mapped, loading: false });
    } catch (error) {
      console.error('Error al obtener tutores:', error);
      set({ loading: false });
    }
  },

  addTutor: async (tutorData) => {
    try {
      const payload = {
        username: tutorData.email.trim(),
        email: tutorData.email.trim(),
        password: tutorData.password || '12345678',
        nombres: tutorData.nombres.trim(),
        apellidos: tutorData.apellidos.trim(),
        first_name: tutorData.nombres.trim(),
        last_name: tutorData.apellidos.trim(),
        documento: String(Math.floor(Math.random() * 89999999 + 10000000)),
        telefono: '3000000000',
        facultad: tutorData.facultad.trim(),
        materia: tutorData.materia.trim(),
      };

      await api.post('/accounts/tutores/', payload);

      const res = await api.get<TutorBackend[]>('/accounts/tutores/');
      const mapped: Tutor[] = res.data.map((item) => {
        const fullName =
          `${item.nombres || item.first_name || ''} ${item.apellidos || item.last_name || ''}`.trim() ||
          item.nombre ||
          'Tutor';

        return {
          id: item.id ?? Math.random(),
          nombre: fullName,
          correo: item.email || item.correo || '',
          groups: [
            {
              facultyName: item.facultad || tutorData.facultad || 'Ingeniería',
              subjects: [item.materia || tutorData.materia || 'Tutoría'],
            },
          ],
        };
      });
      set({ tutores: mapped });
      return { success: true };
    } catch (error) {
      const errorMsg = parseBackendError(error);
      return { success: false, error: errorMsg };
    }
  },
}));
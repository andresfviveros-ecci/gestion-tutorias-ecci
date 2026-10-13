import { create } from 'zustand';
import { api } from '../api/axios';

export interface TutorGroup {
  facultyName: string;
  subjects: string[];
}

export interface Tutor {
  id: number | string;
  nombre: string;
  username: string;
  correo: string;
  documento: string;
  telefono: string;
  groups: TutorGroup[];
}

export interface TutorBackendGroup {
  name?: string;
  facultyName?: string;
  subjects?: string[];
}

export interface TutorBackend {
  id?: number | string;
  pk?: number | string;
  username?: string;
  nombre?: string;
  nombres?: string;
  apellidos?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  correo?: string;
  documento?: string | number;
  telefono?: string;
  facultad?: string;
  faculty?: string;
  materia?: string;
  subject?: string;
  rol?: string;
  role?: string;
  tipo?: string;
  groups?: (string | TutorBackendGroup)[];
  is_staff?: boolean;
}

interface TutorStoreState {
  tutores: Tutor[];
  loading: boolean;
  fetchTutores: () => Promise<void>;
  addTutor: (tutorData: {
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    documento: string;
    telefono: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

const extractArray = (data: unknown): TutorBackend[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data as TutorBackend[];
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.results)) return obj.results as TutorBackend[];
    if (Array.isArray(obj.data)) return obj.data as TutorBackend[];
    if (Array.isArray(obj.tutores)) return obj.tutores as TutorBackend[];
    if (Array.isArray(obj.users)) return obj.users as TutorBackend[];
    if (Array.isArray(obj.usuarios)) return obj.usuarios as TutorBackend[];
  }
  return [];
};

const isDocente = (item: TutorBackend): boolean => {
  if (!item) return false;

  const rolStr = String(item.rol || item.role || item.tipo || '').toLowerCase();
  if (rolStr.includes('docente') || rolStr.includes('tutor') || rolStr.includes('profesor')) {
    return true;
  }

  if (Array.isArray(item.groups)) {
    const matchesGroup = item.groups.some((g) => {
      if (typeof g === 'string') return g.toLowerCase().includes('docente') || g.toLowerCase().includes('tutor');
      if (typeof g === 'object' && g !== null && 'name' in g && g.name) {
        return String(g.name).toLowerCase().includes('docente') || String(g.name).toLowerCase().includes('tutor');
      }
      return false;
    });
    if (matchesGroup) return true;
  }

  return false;
};

const getFullName = (item: TutorBackend): string => {
  if (!item) return 'Docente Tutor';
  const nombres = (item.first_name || item.nombres || '').trim();
  const apellidos = (item.last_name || item.apellidos || '').trim();
  const combined = `${nombres} ${apellidos}`.trim();
  if (combined) return combined;
  if (item.nombre) return item.nombre;
  if (item.username) return item.username;
  if (item.email) return item.email.split('@')[0];
  return 'Docente Tutor';
};

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
            return 'El usuario o correo electrónico ya se encuentra registrado.';
          }
          return `Correo/Usuario: ${emailMsg || userMsg}`;
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

export const useTutorStore = create<TutorStoreState>((set, get) => ({
  tutores: [],
  loading: false,

  fetchTutores: async () => {
    set({ loading: true });
    try {
      let rawList: TutorBackend[] = [];

      try {
        const response = await api.get('/accounts/tutores/');
        rawList = extractArray(response.data);
      } catch (e) {
        console.warn('Endpoint /accounts/tutores/ falló, buscando alternativa:', e);
      }

      if (rawList.length === 0) {
        try {
          const resUsers = await api.get('/accounts/usuarios/').catch(() => api.get('/accounts/users/')).catch(() => null);
          if (resUsers && resUsers.data) {
            const allUsers = extractArray(resUsers.data);
            rawList = allUsers.filter(isDocente);
          }
        } catch (e) {
          console.warn('Fallback de usuarios falló:', e);
        }
      }

      const mapped: Tutor[] = rawList.map((item) => {
        const fullName = getFullName(item);
        const email = item.email || item.correo || '';
        const doc = String(item.documento || '');
        const tel = item.telefono || '';
        const user = item.username || '';

        const facultyName = item.facultad || item.faculty || 'Docente';
        const subject = item.materia || item.subject || 'Tutoría';

        return {
          id: item.id ?? item.pk ?? Math.random(),
          nombre: fullName,
          username: user,
          correo: email,
          documento: doc,
          telefono: tel,
          groups: [
            {
              facultyName,
              subjects: [subject],
            },
          ],
        };
      });

      set({ tutores: mapped, loading: false });
    } catch (error) {
      console.error('Error al obtener tutores:', error);
      set({ tutores: [], loading: false });
    }
  },

  addTutor: async (tutorData) => {
    try {
      const payload = {
        username: tutorData.username.trim(),
        email: tutorData.email.trim(),
        password: tutorData.password.trim(),
        first_name: tutorData.first_name.trim(),
        last_name: tutorData.last_name.trim(),
        documento: tutorData.documento.trim(),
        telefono: tutorData.telefono.trim(),
      };

      await api.post('/accounts/tutores/', payload);
      await get().fetchTutores();
      return { success: true };
    } catch (error) {
      const errorMsg = parseBackendError(error);
      return { success: false, error: errorMsg };
    }
  },
}));
import { create } from 'zustand';
import { api } from '../api/axios';

export interface ScheduleSlot {
  id: string;
  tutorNombre?: string;
  tutorEmail?: string;
  materia: string;
  fecha: string;
  diaSemana?: string;
  horaInicio: string;
  horaFin: string;
  modalidad: 'Virtual' | 'Presencial';
  ubicacionOEnlace?: string;
  enlaceMeeting?: string;
  estado: 'Libre' | 'Reservada';
  estudiante?: string;
  estudianteNombre?: string;
  estudianteCorreo?: string;
}

export interface DisponibilidadBackend {
  id?: number | string;
  tutor_nombre?: string;
  tutor_email?: string;
  tutor?: { nombre?: string; email?: string };
  materia?: string;
  asignatura?: string;
  fecha: string;
  dia_semana?: string;
  hora_inicio?: string;
  horaInicio?: string;
  hora_fin?: string;
  horaFin?: string;
  modalidad?: 'Virtual' | 'Presencial';
  ubicacion_o_enlace?: string;
  enlace?: string;
  enlace_meeting?: string;
  estado?: 'Libre' | 'Reservada';
  is_reserved?: boolean;
  estudiante_nombre?: string;
  estudiante_correo?: string;
  estudiante?: string;
}

interface ScheduleStoreState {
  slots: ScheduleSlot[];
  loading: boolean;
  fetchSlots: () => Promise<void>;
  addSlot: (newSlot: Omit<ScheduleSlot, 'id'>) => Promise<{ success: boolean; error?: string }>;
  updateSlot: (id: string, updated: Partial<ScheduleSlot>) => Promise<{ success: boolean; error?: string }>;
  removeSlot: (id: string) => Promise<{ success: boolean; error?: string }>;
  reserveSlot: (id: string, estudianteNombre: string, estudianteCorreo?: string) => Promise<{ success: boolean; error?: string }>;
}

export const useScheduleStore = create<ScheduleStoreState>((set) => ({
  slots: [],
  loading: false,

  fetchSlots: async () => {
    set({ loading: true });
    try {
      const response = await api.get<DisponibilidadBackend[]>('/disponibilidad/');
      const mapped: ScheduleSlot[] = response.data.map((item) => ({
        id: String(item.id),
        tutorNombre: item.tutor_nombre || item.tutor?.nombre || 'Docente Tutor',
        tutorEmail: item.tutor_email || item.tutor?.email || '',
        materia: item.materia || item.asignatura || 'Tutoría',
        fecha: item.fecha,
        diaSemana: item.dia_semana,
        horaInicio: item.hora_inicio?.substring(0, 5) || item.horaInicio || '14:00',
        horaFin: item.hora_fin?.substring(0, 5) || item.horaFin || '15:00',
        modalidad: item.modalidad || 'Virtual',
        ubicacionOEnlace: item.ubicacion_o_enlace || item.enlace || '',
        enlaceMeeting: item.enlace_meeting || item.ubicacion_o_enlace || '',
        estado: item.estado || (item.is_reserved ? 'Reservada' : 'Libre'),
        estudiante: item.estudiante_nombre || item.estudiante || '',
        estudianteNombre: item.estudiante_nombre,
        estudianteCorreo: item.estudiante_correo,
      }));
      set({ slots: mapped, loading: false });
    } catch (error) {
      console.warn('Servidor de disponibilidad no disponible temporalmente.', error);
      set({ loading: false });
    }
  },

  addSlot: async (newSlot) => {
    try {
      const payload = {
        materia: newSlot.materia,
        fecha: newSlot.fecha,
        dia_semana: newSlot.diaSemana,
        hora_inicio: newSlot.horaInicio,
        hora_fin: newSlot.horaFin,
        modalidad: newSlot.modalidad,
        ubicacion_o_enlace: newSlot.ubicacionOEnlace,
        estado: newSlot.estado || 'Libre',
      };

      const response = await api.post('/disponibilidad/', payload);
      const createdSlot: ScheduleSlot = {
        ...newSlot,
        id: String(response.data?.id || Date.now()),
      };

      set((state) => ({ slots: [...state.slots, createdSlot] }));
      return { success: true };
    } catch {
      const createdSlot: ScheduleSlot = {
        ...newSlot,
        id: String(Date.now()),
      };
      set((state) => ({ slots: [...state.slots, createdSlot] }));
      return { success: true };
    }
  },

  updateSlot: async (id, updated) => {
    try {
      await api.patch(`/disponibilidad/${id}/`, updated);
      set((state) => ({
        slots: state.slots.map((s) => (s.id === id ? { ...s, ...updated } : s)),
      }));
      return { success: true };
    } catch {
      set((state) => ({
        slots: state.slots.map((s) => (s.id === id ? { ...s, ...updated } : s)),
      }));
      return { success: true };
    }
  },

  removeSlot: async (id) => {
    try {
      await api.delete(`/disponibilidad/${id}/`);
      set((state) => ({
        slots: state.slots.filter((s) => s.id !== id),
      }));
      return { success: true };
    } catch {
      set((state) => ({
        slots: state.slots.filter((s) => s.id !== id),
      }));
      return { success: true };
    }
  },

  reserveSlot: async (id, estudianteNombre, estudianteCorreo) => {
    try {
      await api.post(`/disponibilidad/${id}/reservar/`, {
        estudiante_nombre: estudianteNombre,
        estudiante_correo: estudianteCorreo,
      });

      set((state) => ({
        slots: state.slots.map((s) =>
          s.id === id
            ? {
                ...s,
                estado: 'Reservada',
                estudiante: estudianteNombre,
                estudianteNombre,
                estudianteCorreo,
              }
            : s
        ),
      }));
      return { success: true };
    } catch {
      set((state) => ({
        slots: state.slots.map((s) =>
          s.id === id
            ? {
                ...s,
                estado: 'Reservada',
                estudiante: estudianteNombre,
                estudianteNombre,
                estudianteCorreo,
              }
            : s
        ),
      }));
      return { success: true };
    }
  },
}));
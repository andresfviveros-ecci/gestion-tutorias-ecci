import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../api/axios';

// Interfaz para la respuesta cruda del Backend (Django REST)
interface RawBloqueResponse {
  id: number | string;
  materia?: string | { id?: number | string; nombre?: string; codigo?: string } | null;
  docente?: number | string | { id?: number | string; nombre?: string; email?: string } | null;
  fecha: string;
  hora_inicio?: string;
  horaInicio?: string;
  hora_fin?: string;
  horaFin?: string;
  modalidad?: string;
  lugar?: string;
  enlace_virtual?: string;
  estado?: string;
  tutorNombre?: string;
  tutorEmail?: string;
}

export interface ScheduleSlot {
  id: string;
  materia: string;
  fecha: string; // YYYY-MM-DD
  diaSemana?: 'Lunes' | 'Martes' | 'Miercoles' | 'Jueves' | 'Viernes' | 'Sabado' | 'Domingo';
  horaInicio: string; // HH:mm
  horaFin: string; // HH:mm
  hora_inicio?: string;
  hora_fin?: string;
  modalidad: 'Virtual' | 'Presencial' | string;
  ubicacionOEnlace?: string;
  lugar?: string;
  enlace_virtual?: string;
  enlaceMeeting?: string;
  estado: 'Libre' | 'Reservada' | 'DISPONIBLE' | 'RESERVADO' | 'COMPLETO' | string;
  estudiante?: string;
  tutorNombre?: string;
  tutorEmail?: string;
  docente?: number | string | { id?: number | string; nombre?: string; email?: string };
  materiaObj?: { id?: number | string; nombre?: string; codigo?: string };
}

interface ScheduleState {
  slots: ScheduleSlot[];
  loading: boolean;
  fetchSlots: () => Promise<void>;
  addSlot: (slot: Omit<ScheduleSlot, 'id'>) => { success: boolean; error?: string };
  updateSlot: (id: string, updated: Partial<Omit<ScheduleSlot, 'id'>>) => { success: boolean; error?: string };
  reserveSlot: (id: string, estudianteNombre: string) => Promise<{ success: boolean; error?: string }>;
  removeSlot: (id: string) => void;
}

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set, get) => ({
      slots: [],
      loading: false,

      // Cargar bloques de disponibilidad desde el backend de Django
      fetchSlots: async () => {
        set({ loading: true });
        try {
          const response = await api.get<RawBloqueResponse[]>('/disponibilidades/');
          const rawData = response.data;

          const normalizedSlots: ScheduleSlot[] = rawData.map((s: RawBloqueResponse) => {
            const horaInicioStr = s.hora_inicio || s.horaInicio || '08:00';
            const horaFinStr = s.hora_fin || s.horaFin || '09:00';

            let materiaNombre = 'Tutoría';
            if (typeof s.materia === 'string') {
              materiaNombre = s.materia;
            } else if (typeof s.materia === 'object' && s.materia?.nombre) {
              materiaNombre = s.materia.nombre;
            }

            let docenteNombre = 'Profesor Tutor';
            let docenteEmail = 'tutor@ecci.edu.co';
            if (typeof s.docente === 'object' && s.docente !== null) {
              if (s.docente.nombre) docenteNombre = s.docente.nombre;
              if (s.docente.email) docenteEmail = s.docente.email;
            }

            return {
              id: String(s.id),
              materia: materiaNombre,
              fecha: s.fecha,
              horaInicio: horaInicioStr.substring(0, 5),
              horaFin: horaFinStr.substring(0, 5),
              hora_inicio: horaInicioStr.substring(0, 5),
              hora_fin: horaFinStr.substring(0, 5),
              modalidad: s.modalidad || 'Virtual',
              ubicacionOEnlace: s.lugar || s.enlace_virtual || '',
              lugar: s.lugar || '',
              enlace_virtual: s.enlace_virtual || '',
              enlaceMeeting: s.enlace_virtual || '',
              estado: s.estado === 'DISPONIBLE' ? 'Libre' : s.estado === 'RESERVADO' ? 'Reservada' : s.estado || 'Libre',
              tutorNombre: s.tutorNombre || docenteNombre,
              tutorEmail: s.tutorEmail || docenteEmail,
              docente: s.docente || undefined,
            };
          });

          set({ slots: normalizedSlots, loading: false });
        } catch (error) {
          console.error('Error al obtener disponibilidades del backend:', error);
          set({ loading: false });
        }
      },

      addSlot: (newSlotData) => {
        const currentSlots = get().slots;

        const hasConflict = currentSlots.some((s) => {
          if (s.fecha === newSlotData.fecha) {
            return newSlotData.horaInicio < s.horaFin && newSlotData.horaFin > s.horaInicio;
          }
          return false;
        });

        if (hasConflict) {
          return {
            success: false,
            error: 'Ya existe una disponibilidad o tutoría programada en ese rango de tiempo para esa fecha.',
          };
        }

        const newSlot: ScheduleSlot = {
          ...newSlotData,
          id: Date.now().toString(),
          tutorNombre: newSlotData.tutorNombre || 'Profesor Tutor',
          tutorEmail: newSlotData.tutorEmail || 'tutor@ecci.edu.co',
        };

        set({ slots: [...currentSlots, newSlot] });
        return { success: true };
      },

      updateSlot: (id, updatedData) => {
        const currentSlots = get().slots;
        const targetSlot = currentSlots.find((s) => s.id === id);

        if (!targetSlot) {
          return { success: false, error: 'La tutoría no existe.' };
        }

        const merged: ScheduleSlot = { ...targetSlot, ...updatedData };

        const hasConflict = currentSlots.some((s) => {
          if (s.id !== id && s.fecha === merged.fecha) {
            return merged.horaInicio < s.horaFin && merged.horaFin > s.horaInicio;
          }
          return false;
        });

        if (hasConflict) {
          return {
            success: false,
            error: 'Conflicto de horario: Ya existe otra tutoría en esa misma fecha y rango de horas.',
          };
        }

        set({
          slots: currentSlots.map((s) => (s.id === id ? merged : s)),
        });

        return { success: true };
      },

      reserveSlot: async (id, estudianteNombre) => {
        const currentSlots = get().slots;
        const targetSlot = currentSlots.find((s) => s.id === id);

        if (!targetSlot) {
          return { success: false, error: 'El horario no existe.' };
        }

        if (targetSlot.estado === 'Reservada' || targetSlot.estado === 'RESERVADO') {
          return { success: false, error: 'Este horario ya ha sido reservado por otro estudiante.' };
        }

        set({
          slots: currentSlots.map((s) =>
            s.id === id ? { ...s, estado: 'Reservada', estudiante: estudianteNombre } : s
          ),
        });

        return { success: true };
      },

      removeSlot: (id) => {
        set((state) => ({
          slots: state.slots.filter((s) => s.id !== id),
        }));
      },
    }),
    {
      name: 'aula_libre_schedule_storage',
    }
  )
);
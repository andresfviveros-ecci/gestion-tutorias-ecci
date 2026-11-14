import axios from 'axios';
import { create } from 'zustand';
import { api } from '../api/axios';

/** Cada cuánto se consulta el contador de no leídas (lo pide el documento). */
const INTERVALO_MS = 60_000;

interface NotificacionesState {
  /** Cantidad de no leídas; null hasta la primera respuesta. */
  noLeidas: number | null;
  /** false si el backend no tiene el endpoint (404): la campana se oculta. */
  disponible: boolean;
  suscriptores: number;
  temporizador: ReturnType<typeof setInterval> | null;
  refrescar: () => Promise<void>;
  /** Cada campana montada se suscribe; la primera arranca la consulta periódica. */
  suscribir: () => void;
  /** La última campana que se desmonta detiene la consulta. */
  desuscribir: () => void;
}

/**
 * Contador de notificaciones compartido por todas las campanas. Los rails del
 * tutor y de coordinación montan dos (escritorio y móvil); con este estado
 * común se hace una sola consulta a /notificaciones/resumen/ cada 60 s.
 */
export const useNotificaciones = create<NotificacionesState>((set, get) => ({
  noLeidas: null,
  disponible: true,
  suscriptores: 0,
  temporizador: null,

  refrescar: async () => {
    if (!get().disponible) return;
    try {
      const { data } = await api.get<{ no_leidas?: number }>('/notificaciones/resumen/');
      set({ noLeidas: Number(data.no_leidas) || 0 });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // Sin endpoint no tiene sentido seguir preguntando.
        const { temporizador } = get();
        if (temporizador) clearInterval(temporizador);
        set({ disponible: false, temporizador: null });
      }
      // Otros fallos: se conserva el último valor y se reintenta en el siguiente ciclo.
    }
  },

  suscribir: () => {
    const { suscriptores, temporizador, refrescar } = get();
    set({ suscriptores: suscriptores + 1 });
    if (suscriptores === 0 && !temporizador) {
      void refrescar();
      set({ temporizador: setInterval(() => void get().refrescar(), INTERVALO_MS) });
    }
  },

  desuscribir: () => {
    const suscriptores = Math.max(get().suscriptores - 1, 0);
    set({ suscriptores });
    if (suscriptores === 0) {
      const { temporizador } = get();
      if (temporizador) clearInterval(temporizador);
      // Sin campanas (p. ej. tras cerrar sesión) se olvida el conteo del usuario anterior.
      set({ temporizador: null, noLeidas: null });
    }
  },
}));

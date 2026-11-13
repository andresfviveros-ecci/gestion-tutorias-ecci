import { create } from 'zustand';
import { useAuthStore, type ResultadoCierre } from './useAuthStore';

/** Punto de la pantalla desde donde crece la cortina (el botón que se pulsó). */
export interface Origen {
  x: number;
  y: number;
}

export type Transicion =
  | {
      tipo: 'entrada';
      nombre: string;
      /** Ruta del panel al que se entra cuando la cortina cubre la pantalla. */
      destino: string;
      origen?: Origen;
    }
  | {
      tipo: 'salida';
      nombre: string;
      /** El aviso al backend, lanzado una sola vez al confirmar. */
      tarea: Promise<ResultadoCierre>;
      origen?: Origen;
    };

interface TransicionState {
  /** Modal de «¿Cerrar sesión?» abierto. */
  confirmandoCierre: boolean;
  transicion: Transicion | null;
  pedirCierre: () => void;
  cancelarCierre: () => void;
  /** Confirma el cierre: avisa al backend y arranca la animación de salida. */
  confirmarCierre: (origen?: Origen) => void;
  /** Animación de entrada al panel después de un login correcto. */
  entrar: (nombre: string, destino: string, origen?: Origen) => void;
  terminar: () => void;
}

export const useTransicionSesion = create<TransicionState>()((set, get) => ({
  confirmandoCierre: false,
  transicion: null,

  pedirCierre: () => {
    if (get().transicion) return;
    set({ confirmandoCierre: true });
  },

  cancelarCierre: () => set({ confirmandoCierre: false }),

  confirmarCierre: (origen) => {
    if (get().transicion) return;
    const nombre = useAuthStore.getState().user?.nombre ?? '';
    // La petición sale aquí y no en un efecto: así StrictMode no la repite.
    const tarea = useAuthStore.getState().revocarSesion();
    set({ confirmandoCierre: false, transicion: { tipo: 'salida', nombre, tarea, origen } });
  },

  entrar: (nombre, destino, origen) => {
    if (get().transicion) return;
    set({ transicion: { tipo: 'entrada', nombre, destino, origen } });
  },

  terminar: () => set({ transicion: null }),
}));

/** El usuario pidió que el sistema no anime de más. */
export const prefiereMenosMovimiento = (): boolean =>
  typeof window !== 'undefined' &&
  Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

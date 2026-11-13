import { useEffect } from 'react';
import { create } from 'zustand';
import { api } from '../api/axios';
import { useAuthStore } from './useAuthStore';

/**
 * GT-255 / RF-01: si el estudiante puede publicar horarios (`puede_publicar`
 * de /accounts/me/). Se guarda una sola vez por sesión: cada pantalla monta
 * su propio rail y, si cada uno preguntaba de cero, las entradas de
 * estudiante tutor desaparecían y volvían a aparecer al navegar.
 */

/** Pasado este tiempo se vuelve a consultar en segundo plano (p. ej. si lo aprueban). */
const VIGENCIA_MS = 30_000;

interface PermisoTutorState {
  /** null mientras no se sabe. */
  puedePublicar: boolean | null;
  consultadoEn: number;
  cargar: () => Promise<void>;
}

let enCurso: Promise<void> | null = null;

export const usePermisoTutor = create<PermisoTutorState>()((set, get) => ({
  puedePublicar: null,
  consultadoEn: 0,

  cargar: () => {
    if (enCurso) return enCurso;
    if (get().puedePublicar !== null && Date.now() - get().consultadoEn < VIGENCIA_MS) {
      return Promise.resolve();
    }
    const usuario = useAuthStore.getState().user?.id;
    enCurso = api
      .get('/accounts/me/')
      .then(({ data }) => {
        // Si cambió la sesión mientras llegaba, la respuesta ya no aplica.
        if (useAuthStore.getState().user?.id !== usuario) return;
        set({ puedePublicar: Boolean(data?.puede_publicar), consultadoEn: Date.now() });
      })
      .catch(() => {
        // Sin respuesta se conserva lo que había; si no había nada, se oculta.
        if (get().puedePublicar === null) set({ puedePublicar: false, consultadoEn: 0 });
      })
      .finally(() => {
        enCurso = null;
      });
    return enCurso;
  },
}));

// Otra sesión (cerrar sesión o entrar con otra cuenta) empieza sin permiso conocido.
useAuthStore.subscribe((actual, anterior) => {
  if (actual.user?.id !== anterior.user?.id) {
    usePermisoTutor.setState({ puedePublicar: null, consultadoEn: 0 });
  }
});

/** Valor guardado al instante y, si está vencido, lo refresca en segundo plano. */
export const usePuedePublicar = (activo = true): boolean | null => {
  const puedePublicar = usePermisoTutor((state) => state.puedePublicar);
  const cargar = usePermisoTutor((state) => state.cargar);

  useEffect(() => {
    if (activo) void cargar();
  }, [activo, cargar]);

  return puedePublicar;
};

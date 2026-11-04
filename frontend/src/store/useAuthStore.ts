import axios from 'axios';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../api/axios';
import { rolDesdeGrupos, type UserRole } from '../navigation/modulos';

export type { UserRole };

export interface User {
  id?: string;
  nombre: string;
  correo: string;
  role: UserRole;
  rol?: string;
  /** Grupos de Django (Estudiante, Docente, Coordinador, Administrador). */
  grupos?: string[];
  first_name?: string;
  last_name?: string;
}

interface LoginBackendResponse {
  access: string;
  refresh: string;
  groups: [number, string][];
}

interface MeBackendResponse {
  id: number;
  nombre?: string;
  first_name?: string;
  last_name?: string;
}

/** Por qué no se pudo iniciar sesión (GT-205): cada caso tiene su mensaje en el login. */
export type FalloLogin = 'credenciales' | 'inactivo' | 'demasiados_intentos' | 'sin_conexion' | 'servidor';

export type ResultadoLogin =
  | { ok: true; user: User }
  | { ok: false; fallo: FalloLogin; mensaje?: string };

interface AuthState {
  user: User | null;
  token: string | null;
  login: (correo: string, pass: string) => Promise<ResultadoLogin>;
  logout: () => void;
}

const clasificarFallo = (error: unknown): { fallo: FalloLogin; mensaje?: string } => {
  if (!axios.isAxiosError(error) || !error.response) return { fallo: 'sin_conexion' };

  const { status, data } = error.response;
  if (status === 429) return { fallo: 'demasiados_intentos' };
  if (status >= 500) return { fallo: 'servidor' };

  // El backend responde 400 con {detail} (o non_field_errors en la versión anterior).
  const detalle =
    (typeof data?.detail === 'string' && data.detail) ||
    (Array.isArray(data?.non_field_errors) && String(data.non_field_errors[0])) ||
    '';
  if (/inactiv/i.test(detalle)) return { fallo: 'inactivo', mensaje: detalle };
  return { fallo: 'credenciales' };
};

/** Nombre real desde /accounts/me/; si el backend aún no lo tiene, sale del correo. */
const nombreDeSesion = async (correo: string): Promise<{ id?: string; nombre: string }> => {
  try {
    const { data } = await api.get<MeBackendResponse>('accounts/me/');
    const nombre = data.nombre || `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim();
    if (nombre) return { id: String(data.id), nombre };
  } catch {
    // Sin /me/ se usa la parte local del correo, como antes.
  }
  const local = correo.split('@')[0];
  return { nombre: local.charAt(0).toUpperCase() + local.slice(1) };
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,

      login: async (correo: string, pass: string) => {
        const cleanEmail = correo.trim().toLowerCase();

        // Limpiar tokens previos en el almacenamiento antes de iniciar sesión
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');

        let respuesta: LoginBackendResponse;
        try {
          const response = await api.post<LoginBackendResponse>('accounts/login/', {
            email: cleanEmail,
            password: pass,
          });
          respuesta = response.data;
        } catch (error) {
          return { ok: false, ...clasificarFallo(error) };
        }

        const { access, refresh, groups } = respuesta;
        localStorage.setItem('token', access);
        localStorage.setItem('refresh_token', refresh);

        const grupos = groups ? groups.map((g) => g[1]) : [];
        const { id, nombre } = await nombreDeSesion(cleanEmail);

        const loggedUser: User = {
          id: id ?? cleanEmail,
          nombre,
          correo: cleanEmail,
          role: rolDesdeGrupos(grupos),
          grupos,
          first_name: nombre.split(' ')[0],
        };

        set({ user: loggedUser, token: access });
        return { ok: true, user: loggedUser };
      },

      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        set({ user: null, token: null });
      },
    }),
    {
      name: 'aula_auth_storage',
    }
  )
);

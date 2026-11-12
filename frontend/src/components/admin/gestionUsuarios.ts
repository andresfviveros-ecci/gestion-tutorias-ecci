import axios from 'axios';
import { api } from '../../api/axios';
import { mensajeError } from '../../utils/api';

/**
 * Datos de Gestionar usuarios (GT-177).
 *
 * Esta lógica se movió sin cambios desde la página: la carga de las tres
 * listas, el PUT con `...rawBackendData` y el mapeo de campos se conservan
 * tal cual porque el backend puede esperar campos que no están en el tipo.
 */

export interface UserAccount {
  id: string; // ID único para el estado de React
  dbPk: string; // ID/PK principal en Django (número entero o UUID)
  endpoint: 'estudiantes' | 'tutores' | 'coordinadores';
  username: string;
  documento: string;
  nombre: string;
  correo: string;
  rol: 'Estudiante' | 'Tutor' | 'Coordinador' | 'Admin';
  telefono: string;
  /** RF-02: solo aplica a estudiantes; null = sin registrar. */
  semestre: number | null;
  activo: boolean;
  rawBackendData: Record<string, unknown>; // Objeto original completo recibido de Django
}

interface UserBackend {
  id?: number | string;
  pk?: number | string;
  usuario?: {
    id?: number | string;
    pk?: number | string;
    username?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    is_active?: boolean;
    activo?: boolean;
  } | number | string;
  user?: {
    id?: number | string;
    pk?: number | string;
    username?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    is_active?: boolean;
    activo?: boolean;
  } | number | string;
  username?: string;
  email?: string;
  correo?: string;
  nombres?: string;
  apellidos?: string;
  first_name?: string;
  last_name?: string;
  fullName?: string;
  nombre?: string;
  telefono?: string;
  phone?: string;
  documento?: string | number;
  identificacion?: string | number;
  semestre?: number | null;
  is_active?: boolean;
  activo?: boolean;
  rol?: string;
  is_superuser?: boolean;
  is_staff?: boolean;
}


export type BackendResult = { ok: true } | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const describeError = (err: unknown): { status?: number; data?: unknown; message: string } => {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const data = err.response?.data;

    if (status === 401) {
      return { status, data, message: 'Sesión no autorizada (401). Vuelve a iniciar sesión.' };
    }
    if (status === 403) {
      return { status, data, message: 'Sin permisos para realizar esta acción (403).' };
    }
    if (status === 404) {
      return { status, data, message: 'Registro no encontrado en el servidor (404).' };
    }
    if (data && typeof data === 'object') {
      return { status, data, message: mensajeError(err) };
    }
    return { status, data, message: err.message };
  }
  return { message: String(err) };
};

// Extrae ÚNICAMENTE la ID numérica real (PK de la BD)
const extractRealDbPk = (item: UserBackend): string => {
  const nestedUser =
    typeof item.usuario === 'object' && item.usuario !== null
      ? item.usuario
      : typeof item.user === 'object' && item.user !== null
      ? item.user
      : null;

  if (item.id !== undefined && item.id !== null) return String(item.id);
  if (item.pk !== undefined && item.pk !== null) return String(item.pk);
  if (nestedUser?.id !== undefined && nestedUser?.id !== null) return String(nestedUser.id);
  if (nestedUser?.pk !== undefined && nestedUser?.pk !== null) return String(nestedUser.pk);

  return '';
};

// Carga inicial de usuarios desde los endpoints de Django
export const loadUsersList = async (): Promise<UserAccount[]> => {
  const endpoints: Array<{ ep: 'estudiantes' | 'tutores' | 'coordinadores'; defaultRole: UserAccount['rol'] }> = [
    { ep: 'estudiantes', defaultRole: 'Estudiante' },
    { ep: 'tutores', defaultRole: 'Tutor' },
    { ep: 'coordinadores', defaultRole: 'Coordinador' },
  ];

  const results = await Promise.allSettled(
    endpoints.map((item) => api.get<UserBackend[] | { results: UserBackend[] }>(`accounts/${item.ep}/`))
  );

  const userMap = new Map<string, UserAccount>();

  results.forEach((res, index) => {
    const endpointInfo = endpoints[index];

    if (res.status !== 'fulfilled') {
      const info = describeError(res.reason);
      console.warn(`[GET INFO] accounts/${endpointInfo.ep}/:`, info.message);
      return;
    }

    if (!res.value?.data) return;

    const data = res.value.data;
    const rawList: UserBackend[] = Array.isArray(data)
      ? data
      : (data as { results?: UserBackend[] }).results && Array.isArray((data as { results?: UserBackend[] }).results)
      ? (data as { results: UserBackend[] }).results
      : [];

    rawList.forEach((item, itemIdx) => {
      const dbPk = extractRealDbPk(item);

      const nestedUser =
        typeof item.usuario === 'object' && item.usuario !== null
          ? item.usuario
          : typeof item.user === 'object' && item.user !== null
          ? item.user
          : null;

      const docVal = String(item.documento || item.identificacion || '').trim();
      const emailVal = String(
        item.email || item.correo || nestedUser?.email || item.username || nestedUser?.username || ''
      )
        .toLowerCase()
        .trim();

      const usernameVal = String(item.username || nestedUser?.username || emailVal).trim();
      const dedupeKey = `${endpointInfo.ep}-${dbPk || emailVal || usernameVal || itemIdx}`;

      if (userMap.has(dedupeKey)) return;

      const nom = String(item.nombres || item.first_name || nestedUser?.first_name || '').trim();
      const ape = String(item.apellidos || item.last_name || nestedUser?.last_name || '').trim();
      const combined = `${nom} ${ape}`.trim();
      const fullName =
        combined || item.fullName || item.nombre || usernameVal || (emailVal ? emailVal.split('@')[0] : '') || 'Usuario';

      let userRole = endpointInfo.defaultRole;
      if (item.is_superuser || item.is_staff || item.rol?.toLowerCase() === 'admin') {
        userRole = 'Admin';
      } else if (item.rol) {
        const rLower = item.rol.toLowerCase();
        if (rLower.includes('tutor') || rLower.includes('docente')) userRole = 'Tutor';
        else if (rLower.includes('coordinador')) userRole = 'Coordinador';
        else if (rLower.includes('admin')) userRole = 'Admin';
        else if (rLower.includes('estudiante')) userRole = 'Estudiante';
      }

      const phone = String(item.telefono || item.phone || '').trim();
      const semestreVal = typeof item.semestre === 'number' ? item.semestre : null;
      const isActive = item.is_active ?? item.activo ?? nestedUser?.is_active ?? nestedUser?.activo ?? true;

      userMap.set(dedupeKey, {
        id: dedupeKey,
        dbPk,
        endpoint: endpointInfo.ep,
        username: usernameVal,
        documento: docVal,
        nombre: fullName,
        correo: emailVal,
        rol: userRole,
        telefono: phone,
        semestre: semestreVal,
        activo: Boolean(isActive),
        rawBackendData: (item as unknown as Record<string, unknown>) || {},
      });
    });
  });

  return Array.from(userMap.values());
};

// Recupera nombres y apellidos tal como vienen del backend. Solo se parte el
// nombre visible si el administrador lo edito en el formulario.
const getNombrePartes = (user: UserAccount): { firstName: string; lastName: string } => {
  const raw = user.rawBackendData;
  const rawFirst = String(raw.first_name ?? raw.nombres ?? '').trim();
  const rawLast = String(raw.last_name ?? raw.apellidos ?? '').trim();
  const original = `${rawFirst} ${rawLast}`.trim();

  if (original && user.nombre.trim() === original) {
    return { firstName: rawFirst, lastName: rawLast };
  }

  const nameParts = user.nombre.trim().split(/\s+/);
  return {
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' '),
  };
};

// Actualizar estado de activación en Django mediante PUT
export const toggleUserActiveInBackend = async (user: UserAccount, newActiveState: boolean): Promise<BackendResult> => {
  if (!user.dbPk) {
    return { ok: false, error: 'Este usuario no posee un ID numérico válido en el backend.' };
  }

  const { firstName, lastName } = getNombrePartes(user);

  const url = `accounts/${user.endpoint}/${user.dbPk}/`;

  const payload = {
    ...user.rawBackendData,
    username: user.username || user.correo,
    email: user.correo,
    correo: user.correo,
    nombres: firstName,
    apellidos: lastName,
    first_name: firstName,
    last_name: lastName,
    documento: user.documento,
    telefono: user.telefono || null,
    activo: newActiveState,
    is_active: newActiveState,
  };

  try {
    await api.put(url, payload);
    return { ok: true };
  } catch (err) {
    const info = describeError(err);
    return { ok: false, error: info.message };
  }
};

// Guardar ediciones del perfil en Django mediante PUT
export const saveUserEditInBackend = async (user: UserAccount): Promise<BackendResult> => {
  if (!user.dbPk) {
    return { ok: false, error: 'Este usuario no posee un ID numérico válido en el backend.' };
  }

  const { firstName, lastName } = getNombrePartes(user);

  const url = `accounts/${user.endpoint}/${user.dbPk}/`;

  const payload = {
    ...user.rawBackendData,
    username: user.username || user.correo,
    email: user.correo,
    correo: user.correo,
    nombres: firstName,
    apellidos: lastName,
    first_name: firstName,
    last_name: lastName,
    documento: user.documento,
    telefono: user.telefono || null,
    rol: user.rol,
    activo: user.activo,
    is_active: user.activo,
    ...(user.endpoint === 'estudiantes' ? { semestre: user.semestre ?? null } : {}),
  };

  try {
    await api.put(url, payload);
    return { ok: true };
  } catch (err) {
    const info = describeError(err);
    return { ok: false, error: info.message };
  }
};

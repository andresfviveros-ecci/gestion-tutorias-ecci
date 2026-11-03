/**
 * Módulos de la aplicación y quién puede verlos (GT-209).
 *
 * El menú, la redirección después del login y la guarda de rutas leen esta
 * misma lista: un módulo nuevo se agrega aquí una sola vez y aparece en el
 * menú solo para los roles que lo tienen permitido.
 */

export type UserRole = 'admin' | 'estudiante' | 'tutor';

/** Datos de la sesión que deciden qué se muestra. */
export interface Permisos {
  role: UserRole;
  grupos?: string[];
}

export interface Modulo {
  id: string;
  etiqueta: string;
  ruta: string;
  seccion: 'Panel' | 'Usuarios' | 'Mi trabajo' | 'Tutorías' | 'Cuenta';
  roles: UserRole[];
  /** Grupos de Django que además se exigen (p. ej. solo el Administrador gestiona coordinadores). */
  grupos?: string[];
}

export const MODULOS: Modulo[] = [
  // Coordinación
  { id: 'dashboard', etiqueta: 'Dashboard', ruta: '/dashboard', seccion: 'Panel', roles: ['admin'] },
  { id: 'estudiantes', etiqueta: 'Estudiantes', ruta: '/estudiantes', seccion: 'Usuarios', roles: ['admin'] },
  { id: 'tutores', etiqueta: 'Tutores', ruta: '/tutores', seccion: 'Usuarios', roles: ['admin'] },
  {
    id: 'coordinadores',
    etiqueta: 'Coordinadores',
    ruta: '/coordinadores',
    seccion: 'Usuarios',
    roles: ['admin'],
    // RF-05: el backend solo deja gestionar coordinadores al Administrador.
    grupos: ['Administrador'],
  },
  { id: 'gestionar-usuarios', etiqueta: 'Gestionar usuarios', ruta: '/gestionar-usuarios', seccion: 'Cuenta', roles: ['admin'] },

  // Tutor / docente
  { id: 'tutor-panel', etiqueta: 'Dashboard', ruta: '/tutor/dashboard', seccion: 'Panel', roles: ['tutor'] },
  { id: 'tutor-disponibilidad', etiqueta: 'Mi disponibilidad', ruta: '/tutor/mi-disponibilidad', seccion: 'Mi trabajo', roles: ['tutor'] },
  { id: 'tutor-calendario', etiqueta: 'Calendario', ruta: '/tutor/calendario', seccion: 'Mi trabajo', roles: ['tutor'] },

  // Estudiante
  { id: 'estudiante-panel', etiqueta: 'Dashboard', ruta: '/estudiante/dashboard', seccion: 'Panel', roles: ['estudiante'] },
  { id: 'estudiante-buscar', etiqueta: 'Consultar horarios', ruta: '/estudiante/buscar-tutorias', seccion: 'Tutorías', roles: ['estudiante'] },
  { id: 'estudiante-reservas', etiqueta: 'Mis reservas', ruta: '/estudiante/mis-reservas', seccion: 'Tutorías', roles: ['estudiante'] },

  // Solo para los roles que tienen la ruta /inicio (antes un tutor llegaba a un 403 desde el menú).
  { id: 'inicio', etiqueta: 'Página de inicio', ruta: '/inicio', seccion: 'Cuenta', roles: ['estudiante', 'admin'] },
];

/** Panel al que llega cada rol al iniciar sesión. */
export const RUTA_INICIO: Record<UserRole, string> = {
  admin: '/dashboard',
  tutor: '/tutor/dashboard',
  estudiante: '/inicio',
};

/**
 * Rol de la app a partir de los grupos de Django. El Administrador y el
 * Coordinador usan el panel de coordinación.
 */
export const rolDesdeGrupos = (grupos: string[]): UserRole => {
  if (grupos.includes('Administrador') || grupos.includes('Coordinador')) return 'admin';
  if (grupos.includes('Docente')) return 'tutor';
  return 'estudiante';
};

/** Acepta el rol guardado en sesiones viejas ('Coordinador', 'Docente', 'rol', ...). */
export const normalizarRol = (role?: string): UserRole => {
  const r = String(role || '').toLowerCase();
  if (r.includes('admin') || r.includes('coordinador')) return 'admin';
  if (r.includes('tutor') || r.includes('docente')) return 'tutor';
  return 'estudiante';
};

export const puedeVer = (modulo: Modulo, permisos: Permisos): boolean => {
  if (!modulo.roles.includes(permisos.role)) return false;
  if (!modulo.grupos) return true;
  return modulo.grupos.some((grupo) => permisos.grupos?.includes(grupo));
};

export const modulosVisibles = (permisos: Permisos): Modulo[] =>
  MODULOS.filter((modulo) => puedeVer(modulo, permisos));

/** Si la ruta pertenece a un módulo que el usuario puede ver (para volver a donde iba tras el login). */
export const puedeEntrarA = (ruta: string, permisos: Permisos): boolean =>
  MODULOS.some((modulo) => modulo.ruta === ruta && puedeVer(modulo, permisos));

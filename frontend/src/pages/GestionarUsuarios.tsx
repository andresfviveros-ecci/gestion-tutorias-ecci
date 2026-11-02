import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { Loader } from '../components/Loader';
import { api } from '../api/axios';

interface UserAccount {
  id: string; // ID único para el estado de React
  dbPk: string; // ID/PK principal en Django (número entero o UUID)
  endpoint: 'estudiantes' | 'tutores' | 'coordinadores';
  username: string;
  documento: string;
  nombre: string;
  correo: string;
  rol: 'Estudiante' | 'Tutor' | 'Coordinador' | 'Admin';
  telefono: string;
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
  is_active?: boolean;
  activo?: boolean;
  rol?: string;
  is_superuser?: boolean;
  is_staff?: boolean;
}

interface ToastState {
  type: 'success' | 'error';
  title: string;
  message: string;
}

type BackendResult = { ok: true } | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Componente de Desplegable con Buscador Interno
// ---------------------------------------------------------------------------

interface SearchableSelectProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  defaultLabel: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  value,
  onChange,
  options,
  defaultLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Cierra el menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    return options.filter((opt) =>
      opt.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const selectedText = value ? value : defaultLabel;

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-[11px] font-semibold text-slate-600 mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a] flex items-center justify-between text-left cursor-pointer shadow-xs"
      >
        <span className={`truncate ${!value ? 'text-slate-500' : 'text-slate-800 font-medium'}`}>
          {selectedText}
        </span>
        <span className="text-[10px] text-slate-400 ml-2">▼</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-2 max-h-60 flex flex-col space-y-1.5">
          <div className="relative">
            <input
              type="text"
              autoFocus
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-8 pl-7 pr-3 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:border-[#0d1b2a]"
            />
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">🔍</span>
          </div>

          <div className="overflow-y-auto flex-1 max-h-40 divide-y divide-slate-50">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
                setSearchTerm('');
              }}
              className={`w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-slate-100 transition-colors flex items-center justify-between ${
                value === '' ? 'font-bold text-[#0d1b2a] bg-slate-50' : 'text-slate-600'
              }`}
            >
              <span>{defaultLabel}</span>
              {value === '' && <span className="text-emerald-600 font-bold">✓</span>}
            </button>

            {filteredOptions.length === 0 ? (
              <div className="px-2.5 py-2 text-[11px] text-slate-400 text-center">
                Sin coincidencias
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-slate-100 transition-colors flex items-center justify-between ${
                    value === opt ? 'font-bold text-[#0d1b2a] bg-slate-50' : 'text-slate-600'
                  }`}
                >
                  <span className="truncate">{opt}</span>
                  {value === opt && <span className="text-emerald-600 font-bold">✓</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

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
      return { status, data, message: `Error ${status ?? ''}: ${JSON.stringify(data).slice(0, 140)}` };
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
const loadUsersList = async (): Promise<UserAccount[]> => {
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
const toggleUserActiveInBackend = async (user: UserAccount, newActiveState: boolean): Promise<BackendResult> => {
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
const saveUserEditInBackend = async (user: UserAccount): Promise<BackendResult> => {
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
  };

  try {
    await api.put(url, payload);
    return { ok: true };
  } catch (err) {
    const info = describeError(err);
    return { ok: false, error: info.message };
  }
};

// ---------------------------------------------------------------------------
// Componente Principal
// ---------------------------------------------------------------------------

export const GestionarUsuarios: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [usuarioFilter, setUsuarioFilter] = useState('');
  const [correoFilter, setCorreoFilter] = useState('');
  const [rolFilter, setRolFilter] = useState('');
  const [actividadFilter, setActividadFilter] = useState('');

  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<UserAccount | null>(null);

  const showToast = (type: 'success' | 'error', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 5000);
  };

  const reloadUsersList = async () => {
    try {
      const data = await loadUsersList();
      if (data && data.length > 0) {
        setUsers(data);
      }
    } catch (err) {
      console.warn('Error al recargar usuarios:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    loadUsersList()
      .then((data) => {
        if (isMounted) {
          setUsers(data);
        }
      })
      .catch((error) => {
        console.error('Error al cargar usuarios iniciales:', error);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const openEditDrawer = (user: UserAccount) => {
    setEditingUser({ ...user });
    setTimeout(() => setIsDrawerOpen(true), 10);
  };

  const closeEditDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => {
      setEditingUser(null);
    }, 300);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingUser) closeEditDrawer();
        if (userToDeactivate) setUserToDeactivate(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingUser, userToDeactivate]);

  const uniqueUsuarios = useMemo(
    () => Array.from(new Set(users.map((u) => u.nombre.trim()).filter(Boolean))),
    [users]
  );
  const uniqueCorreos = useMemo(
    () => Array.from(new Set(users.map((u) => u.correo.trim()).filter(Boolean))),
    [users]
  );
  const uniqueRoles = useMemo(
    () => Array.from(new Set(users.map((u) => u.rol.trim()).filter(Boolean))),
    [users]
  );

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        searchTerm === '' ||
        u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.correo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.rol.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesUsuario = usuarioFilter === '' || u.nombre === usuarioFilter;
      const matchesCorreo = correoFilter === '' || u.correo === correoFilter;
      const matchesRol = rolFilter === '' || u.rol === rolFilter;
      const matchesActividad =
        actividadFilter === '' || (actividadFilter === 'Activo' ? u.activo : !u.activo);

      return matchesSearch && matchesUsuario && matchesCorreo && matchesRol && matchesActividad;
    });
  }, [users, searchTerm, usuarioFilter, correoFilter, rolFilter, actividadFilter]);

  // Activar usuario
  const handleToggleClick = async (user: UserAccount) => {
    if (user.activo) {
      setUserToDeactivate(user);
    } else {
      // Cambio optimista
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, activo: true } : u)));

      setLoading(true);
      const result = await toggleUserActiveInBackend(user, true);
      setLoading(false);

      if (result.ok) {
        showToast('success', 'Usuario activado', `${user.nombre} se reactivó correctamente.`);
        void reloadUsersList();
      } else {
        // Revertir si falla
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, activo: false } : u)));
        showToast('error', 'Error al guardar', `No se pudo activar a ${user.nombre}. ${result.error}`);
      }
    }
  };

  // Desactivar usuario
  const confirmDeactivation = async () => {
    if (!userToDeactivate) return;
    const targetUser = userToDeactivate;
    setUserToDeactivate(null);

    // Cambio optimista
    setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? { ...u, activo: false } : u)));

    setLoading(true);
    const result = await toggleUserActiveInBackend(targetUser, false);
    setLoading(false);

    if (result.ok) {
      showToast('error', 'Usuario desactivado', `${targetUser.nombre} ha sido desactivado.`);
      void reloadUsersList();
    } else {
      // Revertir si falla
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? { ...u, activo: true } : u)));
      showToast('error', 'Error al guardar', `No se pudo desactivar a ${targetUser.nombre}. ${result.error}`);
    }
  };

  // Guardar edición
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const targetUser = editingUser;
    const previousUser = users.find((u) => u.id === targetUser.id);
    closeEditDrawer();

    // Cambio optimista
    setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? targetUser : u)));

    setLoading(true);
    const result = await saveUserEditInBackend(targetUser);
    setLoading(false);

    if (result.ok) {
      showToast('success', 'Cambios guardados', `Información de ${targetUser.nombre} actualizada.`);
      void reloadUsersList();
    } else {
      // Revertir si falla
      if (previousUser) {
        setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? previousUser : u)));
      }
      showToast('error', 'Error al guardar', `No se pudo actualizar a ${targetUser.nombre}. ${result.error}`);
    }
  };

  return (
    <div className="w-full flex flex-col bg-[#f7f5ed] h-screen overflow-hidden relative">
      <Loader hidden={!loading} />

      {/* TOAST FLOTANTE */}
      {toast && (
        <div className="fixed top-5 right-5 z-[10000] max-w-sm w-full bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700/80 p-3.5 flex items-center gap-3 transition-all animate-in fade-in slide-in-from-top-5 duration-300">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              toast.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
            }`}
          >
            <i className={`fa-solid ${toast.type === 'success' ? 'fa-check animate-bounce' : 'fa-xmark'} text-xs`}></i>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-slate-100 tracking-tight">{toast.title}</h4>
            <p className="text-[11px] text-slate-300 break-words">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white text-xs px-1">
            ✕
          </button>
        </div>
      )}

      {/* CABECERA */}
      <header className="w-full h-14 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
        <div className="text-[0.82rem] text-slate-500">
          Usuarios / <span className="font-semibold text-[#0d1b2a]">Gestionar usuarios</span>
        </div>
        <div className="text-xs font-semibold text-slate-600">Administrador</div>
      </header>

      {/* ÁREA PRINCIPAL */}
      <main className="px-8 py-6 w-full max-w-[1400px] mx-auto flex-1 flex flex-col justify-start space-y-4 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display italic text-3xl font-semibold text-[#0d1b2a] mb-0.5">
              Gestionar usuarios
            </h1>
            <p className="text-[0.83rem] text-slate-500">
              Administra cuentas, activa/desactiva acceso y edita perfiles.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-8 bg-white border border-slate-200 rounded-full text-xs outline-none focus:border-[#0d1b2a] shadow-sm"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* FILTROS CON DESPLEGABLES BUSCABORTES */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm z-20 relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SearchableSelect
              label="Usuarios"
              value={usuarioFilter}
              onChange={setUsuarioFilter}
              options={uniqueUsuarios}
              defaultLabel="Todos los usuarios"
            />

            <SearchableSelect
              label="Correo"
              value={correoFilter}
              onChange={setCorreoFilter}
              options={uniqueCorreos}
              defaultLabel="Todos los correos"
            />

            <SearchableSelect
              label="Rol"
              value={rolFilter}
              onChange={setRolFilter}
              options={uniqueRoles}
              defaultLabel="Todos los roles"
            />

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Actividad</label>
              <select
                value={actividadFilter}
                onChange={(e) => setActividadFilter(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a]"
              >
                <option value="">Todas las actividades</option>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>
        </div>

        {/* TABLA DE USUARIOS */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex-1 flex flex-col min-h-0 z-10">
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-[0.7rem] tracking-wider font-bold sticky top-0 bg-white z-10">
                  <th className="pb-3 px-3">USUARIO</th>
                  <th className="pb-3 px-3">CORREO</th>
                  <th className="pb-3 px-3">ROL</th>
                  <th className="pb-3 px-3">TELEFONO</th>
                  <th className="pb-3 px-3 text-center">ACTIVAR/DESACTIVAR</th>
                  <th className="pb-3 px-3 text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-medium text-xs">
                      No hay usuarios registrados que coincidan.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3 font-semibold text-[#0d1b2a]">{u.nombre}</td>
                      <td className="py-3.5 px-3 text-slate-600">{u.correo}</td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded font-semibold text-[10px] ${
                            u.rol === 'Admin'
                              ? 'bg-purple-100 text-purple-800'
                              : u.rol === 'Tutor'
                              ? 'bg-emerald-100 text-emerald-800'
                              : u.rol === 'Coordinador'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {u.rol}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-600">{u.telefono || '—'}</td>

                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => void handleToggleClick(u)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            u.activo ? 'bg-[#1f7a5c]' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              u.activo ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={() => openEditDrawer(u)}
                          className="p-1.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-[#0d1b2a] transition-colors cursor-pointer"
                          title="Editar usuario"
                        >
                          ✏
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* DRAWER DE EDICIÓN */}
      {editingUser && (
        <div
          onClick={closeEditDrawer}
          className={`fixed inset-0 z-[1000] bg-black/40 backdrop-blur-xs flex justify-end transition-opacity duration-300 ${
            isDrawerOpen ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`bg-white w-full max-w-[420px] h-full shadow-2xl flex flex-col justify-between transform transition-transform duration-300 ease-in-out ${
              isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-display italic text-2xl font-semibold text-[#0d1b2a]">Editar Usuario</h2>
              <button onClick={closeEditDrawer} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">
                ✕
              </button>
            </div>

            <form id="editUserForm" onSubmit={handleSaveEdit} className="p-6 space-y-5 flex-1 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nombre completo</label>
                <input
                  type="text"
                  required
                  value={editingUser.nombre}
                  onChange={(e) => setEditingUser({ ...editingUser, nombre: e.target.value })}
                  className="w-full h-10 px-3.5 text-xs bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Código institucional</label>
                <input
                  type="text"
                  value={editingUser.documento}
                  onChange={(e) => setEditingUser({ ...editingUser, documento: e.target.value })}
                  className="w-full h-10 px-3.5 text-xs bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Teléfono de contacto</label>
                <input
                  type="text"
                  value={editingUser.telefono}
                  onChange={(e) => setEditingUser({ ...editingUser, telefono: e.target.value })}
                  className="w-full h-10 px-3.5 text-xs bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a]"
                />
              </div>
            </form>

            <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3 bg-white">
              <button
                type="button"
                onClick={closeEditDrawer}
                className="px-5 h-10 border border-slate-300 text-slate-700 rounded-md font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="editUserForm"
                className="px-5 h-10 bg-[#0d1b2a] hover:bg-[#1e2d4a] text-white rounded-md font-semibold text-xs transition-colors cursor-pointer"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DESACTIVAR */}
      {userToDeactivate && (
        <div
          onClick={() => setUserToDeactivate(null)}
          className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-xl space-y-4 animate-in fade-in zoom-in duration-200"
          >
            <div className="mx-auto w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 text-xl font-bold">
              ⚠️
            </div>

            <div>
              <h3 className="font-display italic text-xl font-semibold text-[#0d1b2a] mb-1">¿Desactivar usuario?</h3>
              <p className="text-xs text-slate-500">
                Estás a punto de desactivar a <br />
                <strong className="text-slate-800 font-semibold">{userToDeactivate.nombre}</strong>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUserToDeactivate(null)}
                className="h-10 border border-slate-300 text-slate-700 rounded-md font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmDeactivation()}
                className="h-10 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-semibold text-xs transition-colors cursor-pointer"
              >
                Sí, desactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
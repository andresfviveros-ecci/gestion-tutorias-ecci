import React, { useState, useEffect, useMemo } from 'react';
import { Loader } from '../components/Loader';

interface UserAccount {
  id: string;
  nombre: string;
  correo: string;
  rol: 'Estudiante' | 'Tutor' | 'Coordinador' | 'Admin';
  telefono: string;
  activo: boolean;
}

const INITIAL_USERS: UserAccount[] = [
  {
    id: '1',
    nombre: 'Usuario',
    correo: 'usuario@ecci.edu.co',
    rol: 'Estudiante',
    telefono: '123456789',
    activo: true,
  },
  {
    id: '2',
    nombre: 'Admin',
    correo: 'admin@ecci.edu.co',
    rol: 'Admin',
    telefono: '123456789',
    activo: true,
  },
];

export const GestionarUsuarios: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserAccount[]>(INITIAL_USERS);

  const [searchTerm, setSearchTerm] = useState('');

  const [usuarioFilter, setUsuarioFilter] = useState('');
  const [correoFilter, setCorreoFilter] = useState('');
  const [rolFilter, setRolFilter] = useState('');
  const [actividadFilter, setActividadFilter] = useState('');

  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<UserAccount | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1400);
    return () => clearTimeout(timer);
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

  const uniqueUsuarios = useMemo(() => {
    const names = users.map((u) => u.nombre.trim()).filter(Boolean);
    return Array.from(new Set(names));
  }, [users]);

  const uniqueCorreos = useMemo(() => {
    const emails = users.map((u) => u.correo.trim()).filter(Boolean);
    return Array.from(new Set(emails));
  }, [users]);

  const uniqueRoles = useMemo(() => {
    const roles = users.map((u) => u.rol.trim()).filter(Boolean);
    return Array.from(new Set(roles));
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        searchTerm === '' ||
        u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.correo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.rol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.telefono.includes(searchTerm);

      const matchesUsuario = usuarioFilter === '' || u.nombre === usuarioFilter;
      const matchesCorreo = correoFilter === '' || u.correo === correoFilter;
      const matchesRol = rolFilter === '' || u.rol === rolFilter;
      const matchesActividad =
        actividadFilter === '' ||
        (actividadFilter === 'Activo' ? u.activo : !u.activo);

      return (
        matchesSearch &&
        matchesUsuario &&
        matchesCorreo &&
        matchesRol &&
        matchesActividad
      );
    });
  }, [users, searchTerm, usuarioFilter, correoFilter, rolFilter, actividadFilter]);

  const handleToggleClick = (user: UserAccount) => {
    if (user.activo) {
      setUserToDeactivate(user);
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, activo: true } : u))
      );
    }
  };

  const confirmDeactivation = () => {
    if (!userToDeactivate) return;
    setUsers((prev) =>
      prev.map((u) => (u.id === userToDeactivate.id ? { ...u, activo: false } : u))
    );
    setUserToDeactivate(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setUsers((prev) =>
      prev.map((u) => (u.id === editingUser.id ? editingUser : u))
    );
    closeEditDrawer();
  };

  return (
    <div className="w-full flex flex-col bg-[#f7f5ed] h-screen overflow-hidden">
      <Loader hidden={!loading} />

      <header className="w-full h-14 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
        <div className="text-[0.82rem] text-slate-500">
          Usuarios / <span className="font-semibold text-[#0d1b2a]">Gestionar usuarios</span>
        </div>
        <div className="text-xs font-semibold text-slate-600">Administrador</div>
      </header>

      <main className="px-8 py-6 w-full max-w-[1400px] mx-auto flex-1 flex flex-col justify-start space-y-4 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display italic text-3xl font-semibold text-[#0d1b2a] mb-0.5">
              Gestionar usuarios
            </h1>
            <p className="text-[0.83rem] text-slate-500">
              Edita la información de cualquier usuario registrado en la plataforma.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-4 bg-white border border-slate-200 rounded-full text-xs outline-none focus:border-[#0d1b2a] focus:ring-2 focus:ring-[#0d1b2a]/10 shadow-sm transition-all"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
              🔍
            </span>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Usuarios
              </label>
              <select
                value={usuarioFilter}
                onChange={(e) => setUsuarioFilter(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a] text-slate-700 font-medium"
              >
                <option value="">Todos los usuarios</option>
                {uniqueUsuarios.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Correo
              </label>
              <select
                value={correoFilter}
                onChange={(e) => setCorreoFilter(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a] text-slate-700 font-medium"
              >
                <option value="">Todos los correos</option>
                {uniqueCorreos.map((email) => (
                  <option key={email} value={email}>
                    {email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Rol
              </label>
              <select
                value={rolFilter}
                onChange={(e) => setRolFilter(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a] text-slate-700 font-medium"
              >
                <option value="">Todos los roles</option>
                {uniqueRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Actividad
              </label>
              <select
                value={actividadFilter}
                onChange={(e) => setActividadFilter(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a] text-slate-700 font-medium"
              >
                <option value="">Todas las actividades</option>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex-1 flex flex-col min-h-0">
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-[0.7rem] tracking-wider font-bold sticky top-0 bg-white z-10">
                  <th className="pb-3 px-3">USUARIO</th>
                  <th className="pb-3 px-3">CORREO</th>
                  <th className="pb-3 px-3">ROL</th>
                  <th className="pb-3 px-3">TELEFONO</th>
                  <th className="pb-3 px-3 text-center">ACTIVAR/DESACTIVAR</th>
                  <th className="pb-3 px-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-medium text-xs">
                      No hay usuarios que coincidan con los filtros.
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
                      <td className="py-3.5 px-3 font-mono text-slate-600">{u.telefono}</td>
                      
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleClick(u)}
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
                          className="p-1.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-[#0d1b2a] transition-colors"
                          title="Editar usuario"
                        >
                          ✏️
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

      {editingUser && (
        <div
          onClick={closeEditDrawer}
          className={`fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex justify-end transition-opacity duration-300 ${
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
              <h2 className="font-display italic text-2xl font-semibold text-[#0d1b2a]">
                Editar Usuario
              </h2>
              <button
                onClick={closeEditDrawer}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form id="editUserForm" onSubmit={handleSaveEdit} className="p-6 space-y-5 flex-1 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nombre completo
                </label>
                <input
                  type="text"
                  required
                  value={editingUser.nombre}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, nombre: e.target.value })
                  }
                  className="w-full h-10 px-3.5 text-xs bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a] focus:ring-2 focus:ring-[#0d1b2a]/10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Correo institucional
                </label>
                <input
                  type="email"
                  required
                  value={editingUser.correo}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, correo: e.target.value })
                  }
                  className="w-full h-10 px-3.5 text-xs bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a] focus:ring-2 focus:ring-[#0d1b2a]/10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Teléfono de contacto
                </label>
                <input
                  type="text"
                  required
                  value={editingUser.telefono}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, telefono: e.target.value })
                  }
                  className="w-full h-10 px-3.5 text-xs bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a] focus:ring-2 focus:ring-[#0d1b2a]/10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Rol
                </label>
                <select
                  value={editingUser.rol}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      rol: e.target.value as UserAccount['rol'],
                    })
                  }
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a] focus:ring-2 focus:ring-[#0d1b2a]/10"
                >
                  <option value="Estudiante">Estudiante</option>
                  <option value="Tutor">Tutor</option>
                  <option value="Coordinador">Coordinador</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </form>

            <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3 bg-white">
              <button
                type="button"
                onClick={closeEditDrawer}
                className="px-5 h-10 border border-slate-300 text-slate-700 rounded-md font-semibold text-xs hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="editUserForm"
                className="px-5 h-10 bg-[#0d1b2a] hover:bg-[#1e2d4a] text-white rounded-md font-semibold text-xs transition-colors"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {userToDeactivate && (
        <div
          onClick={() => setUserToDeactivate(null)}
          className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-xl space-y-4 animate-in fade-in zoom-in duration-200"
          >
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-xl font-bold">
              ⚠️
            </div>

            <div>
              <h3 className="font-display italic text-xl font-semibold text-[#0d1b2a] mb-1">
                ¿Desactivar a este usuario?
              </h3>
              <p className="text-xs text-slate-500">
                Estás a punto de desactivar a <br />
                <strong className="text-slate-800 font-semibold">{userToDeactivate.nombre}</strong>
              </p>
            </div>

            <div className="bg-red-100/70 border border-red-200 rounded-lg p-3 text-left text-[11px] text-red-600 leading-relaxed">
              Mientras esté inactivo, no podrá iniciar sesión en la plataforma ni acceder a sus tutorías.
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUserToDeactivate(null)}
                className="h-10 border border-slate-300 text-slate-700 rounded-md font-semibold text-xs hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeactivation}
                className="h-10 bg-red-600 hover:bg-red-700 text-white rounded-md font-semibold text-xs transition-colors"
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
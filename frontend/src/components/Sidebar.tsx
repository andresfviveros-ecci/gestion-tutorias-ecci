import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export const Sidebar: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const roleStr = String(user?.role || user?.role || '').toLowerCase();
  const isAdmin = roleStr.includes('admin') || roleStr.includes('coordinador');
  const isTutor = roleStr.includes('tutor') || roleStr.includes('docente');
  const isEstudiante = roleStr.includes('estudiante') || (!isAdmin && !isTutor);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true, state: {} });
  };

  return (
    <aside className="w-[240px] h-screen sticky top-0 bg-[#111a2e] text-[#cbd5e1] flex flex-col justify-between shrink-0 border-r border-slate-800/60 z-30 overflow-y-auto font-body">
      <div>
        {/* HEADER BRANDING */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800/80">
          <span className="font-display italic text-xl font-bold tracking-tight text-white">
            Aula <span className="not-italic text-emerald-400">Libre</span>
          </span>
          <button className="text-slate-400 hover:text-white transition-colors p-1 text-sm">
            <i className="fa-solid fa-bars"></i>
          </button>
        </div>

        <div className="py-6 flex flex-col gap-6">
          {/* ROL ADMINISTRADOR */}
          {isAdmin && (
            <>
              <div>
                <span className="block text-[0.68rem] font-bold tracking-widest text-[#64748b] px-6 mb-2 uppercase">
                  PANEL
                </span>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    `relative flex items-center gap-2.5 px-6 py-2.5 text-[0.85rem] font-medium transition-colors ${
                      isActive
                        ? 'bg-[#1e2d4a] text-white font-semibold'
                        : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#d9a036]" />}
                      <span className="text-[#64748b] font-bold text-xs">•</span>
                      Dashboard
                    </>
                  )}
                </NavLink>
              </div>

              <div>
                <span className="block text-[0.68rem] font-bold tracking-widest text-[#64748b] px-6 mb-2 uppercase">
                  USUARIOS
                </span>

                <NavLink
                  to="/estudiantes"
                  className={({ isActive }) =>
                    `relative flex items-center gap-2.5 px-6 py-2.5 text-[0.85rem] font-medium transition-colors ${
                      isActive
                        ? 'bg-[#1e2d4a] text-white font-semibold'
                        : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#d9a036]" />}
                      <span className="text-[#64748b] font-bold text-xs">•</span>
                      Estudiantes
                    </>
                  )}
                </NavLink>

                <NavLink
                  to="/tutores"
                  className={({ isActive }) =>
                    `relative flex items-center gap-2.5 px-6 py-2.5 text-[0.85rem] font-medium transition-colors ${
                      isActive
                        ? 'bg-[#1e2d4a] text-white font-semibold'
                        : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#d9a036]" />}
                      <span className="text-[#64748b] font-bold text-xs">•</span>
                      Tutores
                    </>
                  )}
                </NavLink>

                <NavLink
                  to="/coordinadores"
                  className={({ isActive }) =>
                    `relative flex items-center gap-2.5 px-6 py-2.5 text-[0.85rem] font-medium transition-colors ${
                      isActive
                        ? 'bg-[#1e2d4a] text-white font-semibold'
                        : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#d9a036]" />}
                      <span className="text-[#64748b] font-bold text-xs">•</span>
                      Coordinadores
                    </>
                  )}
                </NavLink>
              </div>
            </>
          )}

          {/* ROL TUTOR / DOCENTE */}
          {isTutor && (
            <>
              <div>
                <span className="block text-[0.68rem] font-bold tracking-widest text-[#64748b] px-6 mb-2 uppercase">
                  PANEL
                </span>
                <NavLink
                  to="/tutor/dashboard"
                  className={({ isActive }) =>
                    `relative flex items-center gap-2.5 px-6 py-2.5 text-[0.85rem] font-medium transition-colors ${
                      isActive
                        ? 'bg-[#1e2d4a] text-white font-semibold'
                        : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#d9a036]" />}
                      <span className="text-[#64748b] font-bold text-xs">•</span>
                      Dashboard
                    </>
                  )}
                </NavLink>
              </div>

              <div>
                <span className="block text-[0.68rem] font-bold tracking-widest text-[#64748b] px-6 mb-2 uppercase">
                  MI TRABAJO
                </span>

                <NavLink
                  to="/tutor/mi-disponibilidad"
                  className={({ isActive }) =>
                    `relative flex items-center gap-2.5 px-6 py-2.5 text-[0.85rem] font-medium transition-colors ${
                      isActive
                        ? 'bg-[#1e2d4a] text-white font-semibold'
                        : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#d9a036]" />}
                      <span className="text-[#64748b] font-bold text-xs">•</span>
                      Mi disponibilidad
                    </>
                  )}
                </NavLink>

                <NavLink
                  to="/tutor/calendario"
                  className={({ isActive }) =>
                    `relative flex items-center gap-2.5 px-6 py-2.5 text-[0.85rem] font-medium transition-colors ${
                      isActive
                        ? 'bg-[#1e2d4a] text-white font-semibold'
                        : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#d9a036]" />}
                      <span className="text-[#64748b] font-bold text-xs">•</span>
                      Calendario
                    </>
                  )}
                </NavLink>
              </div>
            </>
          )}

          {/* ROL ESTUDIANTE */}
          {isEstudiante && (
            <>
              <div>
                <span className="block text-[0.68rem] font-bold tracking-widest text-[#64748b] px-6 mb-2 uppercase">
                  PANEL
                </span>
                <NavLink
                  to="/estudiante/dashboard"
                  className={({ isActive }) =>
                    `relative flex items-center gap-2.5 px-6 py-2.5 text-[0.85rem] font-medium transition-colors ${
                      isActive
                        ? 'bg-[#1e2d4a] text-white font-semibold'
                        : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#d9a036]" />}
                      <span className="text-[#64748b] font-bold text-xs">•</span>
                      Dashboard
                    </>
                  )}
                </NavLink>
              </div>

              <div>
                <span className="block text-[0.68rem] font-bold tracking-widest text-[#64748b] px-6 mb-2 uppercase">
                  TUTORÍAS
                </span>

                <NavLink
                  to="/estudiante/buscar-tutorias"
                  className={({ isActive }) =>
                    `relative flex items-center gap-2.5 px-6 py-2.5 text-[0.85rem] font-medium transition-colors ${
                      isActive
                        ? 'bg-[#1e2d4a] text-white font-semibold'
                        : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#d9a036]" />}
                      <span className="text-[#64748b] font-bold text-xs">•</span>
                      Consultar horarios
                    </>
                  )}
                </NavLink>

                <NavLink
                  to="/estudiante/mis-reservas"
                  className={({ isActive }) =>
                    `relative flex items-center gap-2.5 px-6 py-2.5 text-[0.85rem] font-medium transition-colors ${
                      isActive
                        ? 'bg-[#1e2d4a] text-white font-semibold'
                        : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#d9a036]" />}
                      <span className="text-[#64748b] font-bold text-xs">•</span>
                      Mis reservas
                    </>
                  )}
                </NavLink>

                {/* HISTORIAL DESHABILITADO (SIN NAVEGACIÓN NI ACCIÓN AL HACER CLIC) */}
                <div
                  className="relative flex items-center gap-2.5 px-6 py-2.5 text-[0.85rem] font-medium text-[#64748b]/50 cursor-not-allowed select-none"
                  title="Historial no disponible"
                >
                  <span className="text-[#64748b]/30 font-bold text-xs">•</span>
                  <span>Historial</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* SECCIÓN INFERIOR */}
      <div className="border-t border-slate-800/80 p-3 space-y-1">
        {isAdmin && (
          <NavLink
            to="/gestionar-usuarios"
            className={({ isActive }) =>
              `relative flex items-center gap-2.5 px-4 py-2.5 text-[0.82rem] rounded-md transition-colors ${
                isActive
                  ? 'bg-[#1e2d4a] text-white font-semibold'
                  : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#d9a036]" />}
                <span className="text-slate-500 font-mono text-xs font-bold">=</span>
                Gestionar usuarios
              </>
            )}
          </NavLink>
        )}

        {/* PÁGINA DE INICIO */}
        <NavLink
          to="/estudiante"
          end
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-4 py-2.5 text-[0.82rem] font-medium rounded-md transition-colors cursor-pointer ${
              isActive
                ? 'text-white bg-white/10'
                : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
            }`
          }
        >
          <i className="fa-solid fa-house text-xs text-emerald-400"></i>
          <span>Página de inicio</span>
        </NavLink>

        {/* CERRAR SESIÓN */}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[0.82rem] font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-md transition-colors cursor-pointer text-left"
        >
          <i className="fa-solid fa-right-from-bracket text-xs"></i>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
};
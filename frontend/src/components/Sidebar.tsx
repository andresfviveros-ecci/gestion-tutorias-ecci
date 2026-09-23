import React from 'react';
import { NavLink } from 'react-router-dom';

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-[240px] h-screen bg-[#111a2e] text-[#cbd5e1] flex flex-col justify-between shrink-0 border-r border-slate-800/60">
      <div>
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800/80">
          <span className="font-display italic text-xl font-bold tracking-tight text-white">
            Aula <span className="not-italic text-emerald-400">Libre</span>
          </span>
          <button className="text-slate-400 hover:text-white transition-colors p-1 text-sm">
            <i className="fa-solid fa-bars"></i>
          </button>
        </div>

        <div className="py-6 flex flex-col gap-6">
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
        </div>
      </div>

      <div className="border-t border-slate-800/80">
        <NavLink
          to="/gestionar-usuarios"
          className={({ isActive }) =>
            `relative flex items-center gap-2.5 px-6 py-4 text-[0.82rem] transition-colors ${
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
      </div>
    </aside>
  );
};
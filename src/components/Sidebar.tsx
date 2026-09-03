import React from 'react';
import { NavLink } from 'react-router-dom';

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-[240px] h-screen bg-[#111a2e] text-[#cbd5e1] flex flex-col justify-between py-6 shrink-0">
      <div className="flex flex-col gap-6">
        <div>
          <span className="block text-[0.68rem] font-bold tracking-widest text-[#64748b] px-7 mb-2">
            PANEL
          </span>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `relative flex items-center px-7 py-2.5 text-[0.85rem] font-medium transition-colors ${
                isActive
                  ? 'bg-[#1e2d4a] text-white font-semibold'
                  : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#d9a036]" />
                )}
                Dashboard
              </>
            )}
          </NavLink>
        </div>

        <div>
          <span className="block text-[0.68rem] font-bold tracking-widest text-[#64748b] px-7 mb-2">
            USUARIOS
          </span>
          <NavLink
            to="/estudiantes"
            className={({ isActive }) =>
              `relative flex items-center px-7 py-2.5 text-[0.85rem] font-medium transition-colors ${
                isActive
                  ? 'bg-[#1e2d4a] text-white font-semibold'
                  : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#d9a036]" />
                )}
                Estudiantes
              </>
            )}
          </NavLink>
          <a href="#" className="flex items-center px-7 py-2.5 text-[0.85rem] font-medium text-[#94a3b8] hover:text-white hover:bg-white/5">
            Tutores
          </a>
          <a href="#" className="flex items-center px-7 py-2.5 text-[0.85rem] font-medium text-[#94a3b8] hover:text-white hover:bg-white/5">
            Coordinadores
          </a>
        </div>
      </div>

      <div className="px-7">
        <a href="#" className="flex items-center gap-2 text-[0.82rem] text-[#94a3b8] hover:text-white transition-colors">
          <span>=</span> Gestionar usuarios
        </a>
      </div>
    </aside>
  );
};
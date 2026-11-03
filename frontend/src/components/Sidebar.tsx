import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { modulosVisibles, normalizarRol, type Modulo } from '../navigation/modulos';

/** Secciones del cuerpo del menú, en orden. 'Cuenta' va abajo, junto a cerrar sesión. */
const SECCIONES: Modulo['seccion'][] = ['Panel', 'Usuarios', 'Mi trabajo', 'Tutorías'];

const ItemMenu: React.FC<{ modulo: Modulo }> = ({ modulo }) => (
  <NavLink
    to={modulo.ruta}
    className={({ isActive }) =>
      `relative flex items-center gap-2.5 px-6 py-2.5 text-[0.85rem] font-medium transition-colors ${
        isActive ? 'bg-[#1e2d4a] text-white font-semibold' : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
      }`
    }
  >
    {({ isActive }) => (
      <>
        {isActive && <span className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#d9a036]" />}
        <span className="text-[#64748b] font-bold text-xs">•</span>
        {modulo.etiqueta}
      </>
    )}
  </NavLink>
);

const ItemCuenta: React.FC<{ modulo: Modulo }> = ({ modulo }) => (
  <NavLink
    to={modulo.ruta}
    end
    className={({ isActive }) =>
      `relative flex items-center gap-2.5 px-4 py-2.5 text-[0.82rem] font-medium rounded-md transition-colors ${
        isActive ? 'bg-[#1e2d4a] text-white font-semibold' : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
      }`
    }
  >
    {({ isActive }) => (
      <>
        {isActive && <span className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#d9a036]" />}
        {modulo.id === 'inicio' ? (
          <i className="fa-solid fa-house text-xs text-emerald-400"></i>
        ) : (
          <span className="text-slate-500 font-mono text-xs font-bold">=</span>
        )}
        <span>{modulo.etiqueta}</span>
      </>
    )}
  </NavLink>
);

/**
 * Menú lateral (GT-209). Los módulos salen de navigation/modulos.ts según el
 * rol y los grupos de la sesión: un rol nunca ve opciones de otro.
 */
export const Sidebar: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const modulos = user
    ? modulosVisibles({ role: normalizarRol(user.role), grupos: user.grupos })
    : [];

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

        <nav aria-label="Menú principal" className="py-6 flex flex-col gap-6">
          {SECCIONES.map((seccion) => {
            const items = modulos.filter((modulo) => modulo.seccion === seccion);
            if (items.length === 0) return null;
            return (
              <div key={seccion}>
                <span className="block text-[0.68rem] font-bold tracking-widest text-[#64748b] px-6 mb-2 uppercase">
                  {seccion}
                </span>
                {items.map((modulo) => (
                  <ItemMenu key={modulo.id} modulo={modulo} />
                ))}
              </div>
            );
          })}
        </nav>
      </div>

      {/* SECCIÓN INFERIOR */}
      <div className="border-t border-slate-800/80 p-3 space-y-1">
        {modulos
          .filter((modulo) => modulo.seccion === 'Cuenta')
          .map((modulo) => (
            <ItemCuenta key={modulo.id} modulo={modulo} />
          ))}

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

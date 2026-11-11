import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { CalendarIcon, ClockIcon, ListIcon } from '../constelacion/Icons';
import { useAuthStore } from '../../store/useAuthStore';

interface RailIconProps {
  label: string;
  to?: string;
  onClick?: () => void;
  children: React.ReactNode;
}

const RailIcon: React.FC<RailIconProps> = ({ label, to, onClick, children }) => {
  const base = 'flex h-10 w-10 items-center justify-center rounded-xl transition-colors';
  const idle = 'text-muted hover:bg-mist hover:text-carbon';
  const active = 'bg-mist text-carbon';

  if (to) {
    return (
      <NavLink
        to={to}
        title={label}
        aria-label={label}
        className={({ isActive }) => `${base} ${isActive ? active : idle}`}
      >
        {children}
      </NavLink>
    );
  }

  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className={`${base} ${idle}`}>
      {children}
    </button>
  );
};

const AulaLibreMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 52 52" className={className} fill="none" aria-hidden="true">
    <path
      d="M34 8H17C11.477 8 7 12.477 7 18V34C7 39.523 11.477 44 17 44H35C40.523 44 45 39.523 45 34V24"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
    />
    <circle cx="41" cy="10" r="6.5" fill="#5433EB" />
  </svg>
);

const GridIcon: React.FC = () => (
  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
    <rect x="3" y="3" width="6" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
    <rect x="11" y="3" width="6" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
    <rect x="3" y="11" width="6" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
    <rect x="11" y="11" width="6" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const HomeIcon: React.FC = () => (
  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
    <path
      d="M3.5 8.5 10 3.5l6.5 5V16a1 1 0 0 1-1 1h-3.5v-4.5h-4V17H4.5a1 1 0 0 1-1-1V8.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

const LogoutIcon: React.FC = () => (
  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
    <path d="M8 3.5H5a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 5 16.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12.5 6.5 16 10l-3.5 3.5M16 10H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const iniciales = (nombre: string): string => {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return 'T';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
};

/** Rail lateral del tutor (76 px), equivalente al del panel de estudiante. */
export const TutorRail: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const nombre =
    user?.nombre ||
    `${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
    'Tutor';

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true, state: {} });
  };

  return (
    <>
      <aside className="sticky top-0 z-30 hidden h-screen w-[76px] shrink-0 flex-col items-center justify-between border-r border-faint bg-white py-6 font-constelacion md:flex">
        <div className="flex flex-col items-center gap-2">
          <NavLink
            to="/tutor/dashboard"
            title="Aula Libre"
            aria-label="Aula Libre"
            className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl text-carbon"
          >
            <AulaLibreMark className="h-7 w-7" />
          </NavLink>

          <RailIcon to="/tutor/dashboard" label="Panel">
            <GridIcon />
          </RailIcon>
          <RailIcon to="/tutor/solicitudes" label="Solicitudes de tutor">
            <ListIcon className="h-5 w-5" />
          </RailIcon>
          <RailIcon to="/tutor/mi-disponibilidad" label="Gestión de disponibilidad">
            <CalendarIcon className="h-5 w-5" />
          </RailIcon>
          <RailIcon to="/tutor/calendario" label="Calendario">
            <ClockIcon className="h-5 w-5" />
          </RailIcon>
        </div>

        <div className="flex flex-col items-center gap-2">
          <RailIcon to="/tutor/dashboard" label="Página de inicio">
            <HomeIcon />
          </RailIcon>
          <RailIcon onClick={handleLogout} label="Cerrar sesión">
            <span className="text-peligro">
              <LogoutIcon />
            </span>
          </RailIcon>
          <div
            title={nombre}
            aria-label={`Sesión de ${nombre}`}
            className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-carbon text-[12px] font-semibold text-white"
          >
            {iniciales(nombre)}
          </div>
        </div>
      </aside>

      <nav
        aria-label="Navegación del tutor"
        className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-faint bg-white px-2 font-constelacion md:hidden"
      >
        <RailIcon to="/tutor/dashboard" label="Panel">
          <GridIcon />
        </RailIcon>
        <RailIcon to="/tutor/solicitudes" label="Solicitudes de tutor">
          <ListIcon className="h-5 w-5" />
        </RailIcon>
        <RailIcon to="/tutor/mi-disponibilidad" label="Gestión de disponibilidad">
          <CalendarIcon className="h-5 w-5" />
        </RailIcon>
        <RailIcon to="/tutor/calendario" label="Calendario">
          <ClockIcon className="h-5 w-5" />
        </RailIcon>
        <RailIcon to="/tutor/dashboard" label="Página de inicio">
          <HomeIcon />
        </RailIcon>
        <RailIcon onClick={handleLogout} label="Cerrar sesión">
          <span className="text-peligro">
            <LogoutIcon />
          </span>
        </RailIcon>
      </nav>
    </>
  );
};

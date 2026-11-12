import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarIcon, ClockIcon, ListIcon } from '../constelacion/Icons';
import { LogoutIcon, RailItem, RailLateral } from '../constelacion/Rail';
import { useAuthStore } from '../../store/useAuthStore';

const GridIcon: React.FC = () => (
  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
    <rect x="3" y="3" width="6" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
    <rect x="11" y="3" width="6" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
    <rect x="3" y="11" width="6" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
    <rect x="11" y="11" width="6" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

/** Rail lateral del tutor; se expande y contrae como el de estudiante y coordinación. */
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
      <RailLateral
        inicio="/tutor/dashboard"
        nombre={nombre}
        rol="Docente"
        inicialPorDefecto="T"
        visibilidad="hidden md:flex"
        arriba={
          <>
            <RailItem to="/tutor/dashboard" label="Panel">
              <GridIcon />
            </RailItem>
            <RailItem to="/tutor/solicitudes" label="Solicitudes de tutor">
              <ListIcon className="h-5 w-5" />
            </RailItem>
            <RailItem to="/tutor/mi-disponibilidad" label="Gestión de disponibilidad">
              <CalendarIcon className="h-5 w-5" />
            </RailItem>
            <RailItem to="/tutor/calendario" label="Calendario">
              <ClockIcon className="h-5 w-5" />
            </RailItem>
          </>
        }
        abajo={
          <RailItem onClick={handleLogout} label="Cerrar sesión" peligro>
            <LogoutIcon />
          </RailItem>
        }
      />

      <nav
        aria-label="Navegación del tutor"
        className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-faint bg-white px-2 font-constelacion md:hidden"
      >
        <RailItem to="/tutor/dashboard" label="Panel">
          <GridIcon />
        </RailItem>
        <RailItem to="/tutor/solicitudes" label="Solicitudes de tutor">
          <ListIcon className="h-5 w-5" />
        </RailItem>
        <RailItem to="/tutor/mi-disponibilidad" label="Gestión de disponibilidad">
          <CalendarIcon className="h-5 w-5" />
        </RailItem>
        <RailItem to="/tutor/calendario" label="Calendario">
          <ClockIcon className="h-5 w-5" />
        </RailItem>
        <RailItem onClick={handleLogout} label="Cerrar sesión" peligro>
          <LogoutIcon />
        </RailItem>
      </nav>
    </>
  );
};

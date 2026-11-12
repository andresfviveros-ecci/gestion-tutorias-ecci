import type { FC, ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayersIcon,
  ListIcon,
  UserIcon,
  UsersIcon,
} from '../constelacion/Icons';
import { useAuthStore } from '../../store/useAuthStore';
import { modulosVisibles, type Modulo } from '../../navigation/modulos';

interface RailIconProps {
  label: string;
  to?: string;
  onClick?: () => void;
  children: ReactNode;
}

const RailIcon: FC<RailIconProps> = ({ label, to, onClick, children }) => {
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

const AulaLibreMark: FC<{ className?: string }> = ({ className }) => (
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

const GridIcon: FC = () => (
  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
    <rect x="3" y="3" width="6" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
    <rect x="11" y="3" width="6" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
    <rect x="3" y="11" width="6" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
    <rect x="11" y="11" width="6" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const SlidersIcon: FC = () => (
  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
    <path d="M3 6h7M14 6h3M3 10h3M9 10h8M3 14h7M14 14h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="12.5" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="7" cy="10" r="1.5" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12.5" cy="14" r="1.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const ShieldIcon: FC = () => (
  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
    <path
      d="M10 2.8 16 5v4.6c0 3.6-2.4 6.4-6 7.6-3.6-1.2-6-4-6-7.6V5l6-2.2Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="m7.6 9.8 1.7 1.7 3.2-3.4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Icono de cada módulo; si se agrega uno nuevo en modulos.ts, cae en el genérico. */
const iconoDeModulo = (id: Modulo['id']): ReactNode => {
  switch (id) {
    case 'dashboard':
      return <GridIcon />;
    case 'estudiantes':
      return <UsersIcon className="h-5 w-5" />;
    case 'tutores':
      return <UserIcon className="h-5 w-5" />;
    case 'asignacion-materias':
      return <LayersIcon className="h-5 w-5" />;
    case 'coordinadores':
      return <ShieldIcon />;
    case 'gestionar-usuarios':
      return <ListIcon className="h-5 w-5" />;
    case 'configuracion':
      return <SlidersIcon />;
    default:
      return <GridIcon />;
  }
};

const LogoutIcon: FC = () => (
  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
    <path d="M8 3.5H5a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 5 16.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12.5 6.5 16 10l-3.5 3.5M16 10H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const iniciales = (nombre: string): string => {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return 'A';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
};

/** Rail lateral del administrador/coordinador (76 px), equivalente al de estudiante y tutor. */
export const AdminRail: FC = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const nombre =
    user?.nombre ||
    `${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
    'Administrador';

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true, state: {} });
  };

  // El rail sale de la misma lista que el menú legacy: los módulos nuevos
  // aparecen aquí sin tener que actualizar este componente.
  const modulos = modulosVisibles({ role: 'admin', grupos: user?.grupos });
  const principales = modulos.filter((modulo) => modulo.seccion !== 'Cuenta');
  const secundarios = modulos.filter((modulo) => modulo.seccion === 'Cuenta');

  return (
    <>
      <aside className="sticky top-0 z-30 hidden h-screen w-[76px] shrink-0 flex-col items-center justify-between border-r border-faint bg-white py-6 font-constelacion md:flex">
        <div className="flex flex-col items-center gap-2">
          <NavLink
            to="/dashboard"
            title="Aula Libre"
            aria-label="Aula Libre"
            className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl text-carbon"
          >
            <AulaLibreMark className="h-7 w-7" />
          </NavLink>

          {principales.map((modulo) => (
            <RailIcon key={modulo.id} to={modulo.ruta} label={modulo.etiqueta}>
              {iconoDeModulo(modulo.id)}
            </RailIcon>
          ))}
        </div>

        <div className="flex flex-col items-center gap-2">
          {secundarios.map((modulo) => (
            <RailIcon key={modulo.id} to={modulo.ruta} label={modulo.etiqueta}>
              {iconoDeModulo(modulo.id)}
            </RailIcon>
          ))}
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
        aria-label="Navegación del administrador"
        className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-start gap-1 overflow-x-auto border-t border-faint bg-white px-2 font-constelacion md:hidden"
      >
        {[...principales, ...secundarios].map((modulo) => (
          <RailIcon key={modulo.id} to={modulo.ruta} label={modulo.etiqueta}>
            {iconoDeModulo(modulo.id)}
          </RailIcon>
        ))}
        <RailIcon onClick={handleLogout} label="Cerrar sesión">
          <span className="text-peligro">
            <LogoutIcon />
          </span>
        </RailIcon>
      </nav>
    </>
  );
};

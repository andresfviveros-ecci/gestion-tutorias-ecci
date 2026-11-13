import type { FC, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckIcon,
  LayersIcon,
  ListIcon,
  UserIcon,
  UsersIcon,
} from '../constelacion/Icons';
import { LogoutIcon, RailItem, RailLateral } from '../constelacion/Rail';
import { useAuthStore } from '../../store/useAuthStore';
import { modulosVisibles, type Modulo } from '../../navigation/modulos';

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

const ChartIcon: FC = () => (
  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
    <path d="M3 16.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <rect x="4.5" y="9" width="3" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <rect x="9" y="5.5" width="3" height="9.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <rect x="13.5" y="11" width="3" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const BookIcon: FC = () => (
  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
    <path
      d="M3.5 4.2A1.7 1.7 0 0 1 5.2 2.5H9v15H5.2a1.7 1.7 0 0 1-1.7-1.7V4.2Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M16.5 4.2a1.7 1.7 0 0 0-1.7-1.7H11v15h3.8a1.7 1.7 0 0 0 1.7-1.7V4.2Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
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
    case 'reportes':
      return <ChartIcon />;
    case 'estudiantes':
      return <UsersIcon className="h-5 w-5" />;
    case 'tutores':
      return <UserIcon className="h-5 w-5" />;
    case 'materias':
      return <BookIcon />;
    case 'notas':
      return <BookIcon />;
    case 'asignacion-materias':
      return <LayersIcon className="h-5 w-5" />;
    case 'coordinadores':
      return <ShieldIcon />;
    case 'gestionar-usuarios':
      return <ListIcon className="h-5 w-5" />;
    case 'solicitudes':
      return <CheckIcon className="h-5 w-5" />;
    case 'configuracion':
      return <SlidersIcon />;
    default:
      return <GridIcon />;
  }
};

/** Rail lateral del administrador/coordinador; se expande y contrae como el de estudiante y tutor. */
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
      <RailLateral
        inicio="/dashboard"
        nombre={nombre}
        rol={user?.grupos?.includes('Administrador') ? 'Administración' : 'Coordinación'}
        inicialPorDefecto="A"
        visibilidad="hidden md:flex"
        arriba={principales.map((modulo) => (
          <RailItem key={modulo.id} to={modulo.ruta} label={modulo.etiqueta}>
            {iconoDeModulo(modulo.id)}
          </RailItem>
        ))}
        abajo={
          <>
            {secundarios.map((modulo) => (
              <RailItem key={modulo.id} to={modulo.ruta} label={modulo.etiqueta}>
                {iconoDeModulo(modulo.id)}
              </RailItem>
            ))}
            <RailItem onClick={handleLogout} label="Cerrar sesión" peligro>
              <LogoutIcon />
            </RailItem>
          </>
        }
      />

      <nav
        aria-label="Navegación del administrador"
        className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-start gap-1 overflow-x-auto border-t border-faint bg-white px-2 font-constelacion md:hidden"
      >
        {[...principales, ...secundarios].map((modulo) => (
          <RailItem key={modulo.id} to={modulo.ruta} label={modulo.etiqueta}>
            {iconoDeModulo(modulo.id)}
          </RailItem>
        ))}
        <RailItem onClick={handleLogout} label="Cerrar sesión" peligro>
          <LogoutIcon />
        </RailItem>
      </nav>
    </>
  );
};

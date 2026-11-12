import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { api } from "../../api/axios";

interface RailIconProps {
  label: string;
  to?: string;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

const RailIcon: React.FC<RailIconProps> = ({ label, to, onClick, disabled, children }) => {
  const base =
    "flex h-10 w-10 items-center justify-center rounded-xl transition-colors";
  const idle = "text-muted hover:bg-mist hover:text-carbon";
  const active = "bg-mist text-carbon";

  if (disabled) {
    return (
      <button
        type="button"
        title={`${label} (próximamente)`}
        aria-label={`${label} (próximamente)`}
        aria-disabled="true"
        className={`${base} cursor-not-allowed text-pebble`}
      >
        {children}
      </button>
    );
  }

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
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`${base} ${idle}`}
    >
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

const SearchIcon: React.FC = () => (
  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
    <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="m13.2 13.2 3.3 3.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const BellIcon: React.FC = () => (
  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
    <path
      d="M10 3a4.5 4.5 0 0 0-4.5 4.5v3L4 13.5h12l-1.5-3v-3A4.5 4.5 0 0 0 10 3Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M8.2 16a1.9 1.9 0 0 0 3.6 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const ClockIcon: React.FC = () => (
  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
    <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 6.5V10l2.4 1.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const GraduationIcon: React.FC = () => (
  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
    <path
      d="M2.5 8.2 10 4.5l7.5 3.7L10 11.9 2.5 8.2Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M5.6 10v3.1c0 1 2 2 4.4 2s4.4-1 4.4-2V10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path d="M17.2 8.6v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const CalendarIcon: React.FC = () => (
  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
    <rect x="3" y="4.5" width="14" height="12" rx="2.2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M3 8h14M6.5 3v3M13.5 3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const UsersIcon: React.FC = () => (
  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
    <circle cx="8" cy="7" r="2.6" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M3.5 16c.4-2.6 2.2-4.1 4.5-4.1s4.1 1.5 4.5 4.1"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M13 5.2a2.6 2.6 0 0 1 0 5M14.6 11.9c1.3.4 2.2 1.6 2.5 3.3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const ListIcon: React.FC = () => (
  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
    <path d="M6 5.5h10M6 10h10M6 14.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="3.5" cy="5.5" r="1" fill="currentColor" />
    <circle cx="3.5" cy="10" r="1" fill="currentColor" />
    <circle cx="3.5" cy="14.5" r="1" fill="currentColor" />
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
  if (partes.length === 0) return "E";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
};

export const StudentRail: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  // GT-255: solo el estudiante con una solicitud de tutor aprobada publica horarios.
  const [puedePublicar, setPuedePublicar] = useState(false);

  useEffect(() => {
    let activo = true;

    api
      .get('/accounts/me/')
      .then(({ data }) => {
        if (activo) setPuedePublicar(Boolean(data?.puede_publicar));
      })
      .catch(() => {
        // Sin la consulta se oculta la entrada; el resto del rail sigue igual.
      });

    return () => {
      activo = false;
    };
  }, []);

  const nombre =
    user?.nombre ||
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    "Estudiante";

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true, state: {} });
  };

  return (
    <aside className="sticky top-0 z-30 flex h-screen w-[76px] shrink-0 flex-col items-center justify-between border-r border-faint bg-white py-6 font-constelacion">
      <div className="flex flex-col items-center gap-2">
        <NavLink
          to="/estudiante/dashboard"
          title="Aula Libre"
          aria-label="Aula Libre"
          className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl text-carbon"
        >
          <AulaLibreMark className="h-7 w-7" />
        </NavLink>

        <RailIcon to="/estudiante/dashboard" label="Panel">
          <GridIcon />
        </RailIcon>
        <RailIcon to="/estudiante/buscar-tutorias" label="Consultar horarios">
          <SearchIcon />
        </RailIcon>
        <RailIcon label="Notificaciones" disabled>
          <BellIcon />
        </RailIcon>
        <RailIcon to="/estudiante/mis-reservas" label="Mis reservas">
          <ClockIcon />
        </RailIcon>
        <RailIcon to="/estudiante/postularme-tutor" label="Postúlate como tutor">
          <GraduationIcon />
        </RailIcon>
        {puedePublicar && (
          <>
            <RailIcon to="/estudiante/mis-tutorias-tutor" label="Mis tutorías como tutor">
              <UsersIcon />
            </RailIcon>
            <RailIcon to="/estudiante/mis-horarios" label="Mis horarios">
              <ListIcon />
            </RailIcon>
            <RailIcon to="/tutor/mi-disponibilidad" label="Mi disponibilidad">
              <CalendarIcon />
            </RailIcon>
          </>
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
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
  );
};

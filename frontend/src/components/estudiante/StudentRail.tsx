import React from "react";
import { LogoutIcon, RailItem, RailLateral } from "../constelacion/Rail";
import { useAuthStore } from "../../store/useAuthStore";
import { useTransicionSesion } from "../../store/useTransicionSesion";
import { usePuedePublicar } from "../../store/usePermisoTutor";

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

export const StudentRail: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  // Abre la confirmación; el cierre real y la animación los maneja App.
  const handleLogout = useTransicionSesion((state) => state.pedirCierre);
  // GT-255: solo el estudiante con una solicitud de tutor aprobada publica horarios.
  // Sale del valor guardado por sesión, así no parpadea al cambiar de pantalla.
  const puedePublicar = usePuedePublicar() === true;

  const nombre =
    user?.nombre ||
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    "Estudiante";

  return (
    <RailLateral
      inicio="/estudiante/dashboard"
      nombre={nombre}
      rol={puedePublicar ? "Estudiante tutor" : "Estudiante"}
      inicialPorDefecto="E"
      arriba={
        <>
          <RailItem to="/estudiante/dashboard" label="Panel">
            <GridIcon />
          </RailItem>
          <RailItem to="/estudiante/buscar-tutorias" label="Consultar horarios">
            <SearchIcon />
          </RailItem>
          <RailItem label="Notificaciones" disabled>
            <BellIcon />
          </RailItem>
          <RailItem to="/estudiante/mis-reservas" label="Mis reservas">
            <ClockIcon />
          </RailItem>
          <RailItem to="/estudiante/postularme-tutor" label="Postúlate como tutor">
            <GraduationIcon />
          </RailItem>
          {puedePublicar && (
            <>
              <RailItem to="/estudiante/mis-tutorias-tutor" label="Mis tutorías como tutor">
                <UsersIcon />
              </RailItem>
              <RailItem to="/estudiante/mis-horarios" label="Mis horarios">
                <ListIcon />
              </RailItem>
              <RailItem to="/tutor/mi-disponibilidad" label="Mi disponibilidad">
                <CalendarIcon />
              </RailItem>
            </>
          )}
        </>
      }
      abajo={
        <RailItem onClick={handleLogout} label="Cerrar sesión" peligro>
          <LogoutIcon />
        </RailItem>
      }
    />
  );
};

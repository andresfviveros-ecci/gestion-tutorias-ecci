import { createContext, useContext, useEffect, useState, type FC, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

/**
 * Rail lateral compartido por los tres roles. Contraído muestra solo los
 * iconos (76 px); expandido muestra también el nombre de cada sección. La
 * preferencia se guarda en el navegador para que se mantenga al cambiar de
 * pantalla o recargar.
 */

const CLAVE_EXPANDIDO = 'aula-libre:rail-expandido';

const leerExpandido = (): boolean => {
  try {
    return localStorage.getItem(CLAVE_EXPANDIDO) === '1';
  } catch {
    return false;
  }
};

const guardarExpandido = (valor: boolean) => {
  try {
    localStorage.setItem(CLAVE_EXPANDIDO, valor ? '1' : '0');
  } catch {
    // Sin almacenamiento (modo privado): el rail funciona igual, solo no recuerda.
  }
};

const RailContexto = createContext(false);

const CONSULTA_ANCHA = '(min-width: 768px)';

/** En celular el rail siempre va contraído para no tapar el contenido. */
const usePantallaAncha = (): boolean => {
  const [ancha, setAncha] = useState(() =>
    typeof window === 'undefined' || !window.matchMedia ? true : window.matchMedia(CONSULTA_ANCHA).matches,
  );

  useEffect(() => {
    if (!window.matchMedia) return;
    const consulta = window.matchMedia(CONSULTA_ANCHA);
    const cambiar = () => setAncha(consulta.matches);
    consulta.addEventListener('change', cambiar);
    return () => consulta.removeEventListener('change', cambiar);
  }, []);

  return ancha;
};

export const AulaLibreMark: FC<{ className?: string }> = ({ className }) => (
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

export const LogoutIcon: FC = () => (
  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
    <path
      d="M8 3.5H5a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 5 16.5h3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M12.5 6.5 16 10l-3.5 3.5M16 10H8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PanelIcon: FC<{ expandido: boolean }> = ({ expandido }) => (
  <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" aria-hidden="true">
    <rect x="2.75" y="3.5" width="14.5" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M7.5 3.5v13" stroke="currentColor" strokeWidth="1.5" />
    <path
      d={expandido ? 'm13.2 8-2 2 2 2' : 'm11 8 2 2-2 2'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const iniciales = (nombre: string, porDefecto: string): string => {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return porDefecto;
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
};

interface RailItemProps {
  label: string;
  to?: string;
  onClick?: () => void;
  /** Sección que todavía no existe: se ve, pero no navega. */
  disabled?: boolean;
  /** Para "Cerrar sesión". */
  peligro?: boolean;
  /** Número sobre el icono (p. ej. notificaciones sin leer); 0 o nada no lo muestra. */
  insignia?: number;
  /** Nombre accesible si debe decir más que el texto visible (p. ej. el conteo). */
  ariaLabel?: string;
  children: ReactNode;
}

/** Entrada del rail: solo icono si está contraído, icono y nombre si está expandido. */
export const RailItem: FC<RailItemProps> = ({
  label,
  to,
  onClick,
  disabled,
  peligro,
  insignia,
  ariaLabel,
  children,
}) => {
  const expandido = useContext(RailContexto);
  const forma = expandido
    ? 'h-10 w-full justify-start gap-3 px-3'
    : 'h-10 w-10 justify-center';
  const base = `flex shrink-0 items-center rounded-xl transition-colors ${forma}`;
  const idle = peligro
    ? 'text-peligro hover:bg-peligro/10'
    : 'text-muted hover:bg-mist hover:text-carbon';
  const activo = 'bg-mist text-carbon';
  const titulo = disabled ? `${label} (próximamente)` : label;

  const contenido = (
    <>
      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
        {children}
        {Boolean(insignia) && (
          <span
            aria-hidden="true"
            className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-violeta-accion px-1 text-[9.5px] font-semibold leading-none text-white"
          >
            {insignia && insignia > 9 ? '9+' : insignia}
          </span>
        )}
      </span>
      {expandido && (
        <span className="min-w-0 truncate text-[13px] font-medium">
          {label}
          {disabled && <span className="ml-1.5 text-[11px] font-normal text-pebble">pronto</span>}
        </span>
      )}
    </>
  );

  if (disabled) {
    return (
      <button
        type="button"
        title={titulo}
        aria-label={titulo}
        aria-disabled="true"
        className={`${base} cursor-not-allowed text-pebble`}
      >
        {contenido}
      </button>
    );
  }

  if (to) {
    return (
      <NavLink
        to={to}
        title={expandido ? undefined : label}
        aria-label={label}
        className={({ isActive }) => `${base} ${isActive ? activo : idle}`}
      >
        {contenido}
      </NavLink>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={expandido ? undefined : label}
      aria-label={ariaLabel ?? label}
      className={`${base} ${idle}`}
    >
      {contenido}
    </button>
  );
};

interface RailLateralProps {
  /** Panel al que lleva el logo. */
  inicio: string;
  /** Nombre completo de la sesión, para el avatar. */
  nombre: string;
  /** Rol que se muestra bajo el nombre cuando está expandido. */
  rol: string;
  /** Letra del avatar si no hay nombre. */
  inicialPorDefecto: string;
  /** Secciones principales. */
  arriba: ReactNode;
  /** Secciones de cuenta y cerrar sesión. */
  abajo: ReactNode;
  /** Visibilidad por tamaño de pantalla, por ejemplo `hidden md:flex`. */
  visibilidad?: string;
}

/** Contenedor del rail con el botón para expandir y contraer. */
export const RailLateral: FC<RailLateralProps> = ({
  inicio,
  nombre,
  rol,
  inicialPorDefecto,
  arriba,
  abajo,
  visibilidad = 'flex',
}) => {
  const [preferencia, setPreferencia] = useState(leerExpandido);
  const pantallaAncha = usePantallaAncha();
  const expandido = preferencia && pantallaAncha;

  const alternar = () => {
    setPreferencia((previo) => {
      guardarExpandido(!previo);
      return !previo;
    });
  };

  const textoBoton = expandido ? 'Contraer menú' : 'Expandir menú';

  return (
    <RailContexto.Provider value={expandido}>
      <aside
        className={`sticky top-0 z-30 h-screen shrink-0 flex-col justify-between border-r border-faint bg-white py-6 font-constelacion transition-[width] duration-200 ease-out ${
          expandido ? 'w-[232px] px-4' : 'w-[76px] items-center'
        } ${visibilidad}`}
      >
        <div className={`flex min-h-0 flex-1 flex-col ${expandido ? '' : 'items-center'}`}>
          <div
            className={`mb-5 flex shrink-0 ${
              expandido ? 'items-center justify-between' : 'flex-col items-center gap-2'
            }`}
          >
            <NavLink
              to={inicio}
              title="Aula Libre"
              aria-label="Aula Libre"
              className="flex h-11 items-center gap-2.5 rounded-xl px-0.5 text-carbon"
            >
              <AulaLibreMark className="h-7 w-7 shrink-0" />
              {expandido && <span className="text-[15px] font-semibold tracking-[-0.01em]">Aula Libre</span>}
            </NavLink>
            <button
              type="button"
              onClick={alternar}
              aria-expanded={expandido}
              aria-label={textoBoton}
              title={textoBoton}
              className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted md:flex transition-colors hover:bg-mist hover:text-carbon focus-visible:outline focus-visible:outline-2 focus-visible:outline-violeta-accion"
            >
              <PanelIcon expandido={expandido} />
            </button>
          </div>

          <nav
            aria-label="Secciones"
            className={`-mx-1 flex min-h-0 flex-col gap-1.5 overflow-y-auto px-1 ${expandido ? '' : 'items-center'}`}
          >
            {arriba}
          </nav>
        </div>

        <div className={`mt-4 flex shrink-0 flex-col gap-1.5 ${expandido ? '' : 'items-center'}`}>
          {abajo}
          <div
            title={expandido ? undefined : nombre}
            aria-label={`Sesión de ${nombre}`}
            className={`mt-1 flex items-center gap-3 ${expandido ? 'rounded-2xl bg-mist px-2.5 py-2' : ''}`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-carbon text-[12px] font-semibold text-white">
              {iniciales(nombre, inicialPorDefecto)}
            </span>
            {expandido && (
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-semibold text-tinta">{nombre}</span>
                <span className="block truncate text-[11px] text-muted">{rol}</span>
              </span>
            )}
          </div>
        </div>
      </aside>
    </RailContexto.Provider>
  );
};

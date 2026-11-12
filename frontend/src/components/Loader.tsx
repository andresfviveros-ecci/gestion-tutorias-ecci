interface LoaderProps {
  hidden: boolean;
}

/** Pantalla de carga con el nombre de la app sobre el color tinta del tema. */
export const Loader = ({ hidden }: LoaderProps) => (
  <div
    role="status"
    aria-live="polite"
    aria-hidden={hidden}
    className={`fixed inset-0 z-[9999] flex items-center justify-center bg-tinta/70 backdrop-blur-[14px] transition-all duration-500 ${
      hidden ? 'invisible pointer-events-none opacity-0' : 'visible opacity-100'
    }`}
  >
    <span className="sr-only">Cargando…</span>
    <svg className="h-[60px] w-[260px] overflow-visible" viewBox="0 0 240 60" aria-hidden="true">
      <text x="50%" y="42" textAnchor="middle" className="loader-text">
        Aula Libre
      </text>
    </svg>
  </div>
);

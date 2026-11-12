interface SkeletonFilasProps {
  /** Cantidad de filas mientras llegan los datos. */
  filas?: number;
  /** Alto de cada fila; usa una clase de Tailwind. */
  alto?: string;
  className?: string;
}

/** Filas de carga con la forma de las tablas y listas del panel. */
export const SkeletonFilas = ({
  filas = 4,
  alto = 'h-[52px]',
  className = '',
}: SkeletonFilasProps) => (
  <div className={`space-y-2 ${className}`} aria-hidden="true">
    {Array.from({ length: filas }, (_, indice) => (
      <div key={indice} className={`${alto} animate-pulse rounded-2xl bg-mist`} />
    ))}
  </div>
);

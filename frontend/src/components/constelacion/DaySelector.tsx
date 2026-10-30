export interface DiaOpcion {
  iso: string;
  /** 'LUN', 'MAR'... */
  etiqueta: string;
  numero: number;
  cantidad: number;
  esHoy: boolean;
  esPasado: boolean;
  ariaLabel: string;
}

interface DaySelectorProps {
  dias: DiaOpcion[];
  seleccionado: string | null;
  onSeleccionar: (iso: string | null) => void;
  etiquetaTodos?: string;
}

/**
 * Selector horizontal de días con un punto que resume la disponibilidad.
 * El color del punto sigue la escala: hoy > 8 > 4 > 0.
 */
export const DaySelector = ({
  dias,
  seleccionado,
  onSeleccionar,
  etiquetaTodos = 'Toda la semana',
}: DaySelectorProps) => (
  <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
    <button
      type="button"
      onClick={() => onSeleccionar(null)}
      aria-pressed={seleccionado === null}
      className={`flex h-[76px] w-[150px] shrink-0 items-center justify-center rounded-2xl px-4 text-[12px] font-medium transition-colors ${
        seleccionado === null
          ? 'bg-tinta text-white'
          : 'border border-faint bg-white text-slate-ink hover:bg-mist'
      }`}
    >
      {etiquetaTodos}
    </button>

    {dias.map((dia) => {
      const activo = seleccionado === dia.iso;

      let colorPunto = 'bg-pebble';
      if (dia.esHoy) colorPunto = 'bg-violeta';
      else if (dia.cantidad >= 8) colorPunto = 'bg-terracota';
      else if (dia.cantidad >= 4) colorPunto = 'bg-salvia';
      else if (dia.cantidad > 0) colorPunto = 'bg-arena';

      return (
        <button
          key={dia.iso}
          type="button"
          disabled={dia.esPasado}
          onClick={() => onSeleccionar(activo ? null : dia.iso)}
          aria-pressed={activo}
          aria-label={dia.ariaLabel}
          className={`flex h-[76px] min-w-[80px] max-w-[150px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl border bg-white transition-all ${
            activo ? 'border-violeta ring-4 ring-violeta/10' : 'border-faint hover:border-pebble'
          } ${dia.esPasado ? 'cursor-not-allowed opacity-40' : ''}`}
        >
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
            {dia.etiqueta}
          </span>
          <span className="text-[18px] font-semibold leading-none text-tinta">{dia.numero}</span>
          <span className={`h-1.5 w-1.5 rounded-full ${colorPunto}`} />
        </button>
      );
    })}
  </div>
);

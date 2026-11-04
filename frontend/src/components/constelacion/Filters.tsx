export interface OpcionSegmento<T extends string> {
  valor: T;
  texto: string;
}

interface SegmentedFilterProps<T extends string> {
  opciones: OpcionSegmento<T>[];
  valor: T;
  onChange: (valor: T) => void;
}

/** Control segmentado de una sola selección (p. ej. modalidad). */
export const SegmentedFilter = <T extends string>({
  opciones,
  valor,
  onChange,
}: SegmentedFilterProps<T>) => (
  <div className="inline-flex rounded-full border border-faint bg-white p-1">
    {opciones.map((opcion) => {
      const activo = valor === opcion.valor;
      return (
        <button
          key={opcion.valor}
          type="button"
          onClick={() => onChange(opcion.valor)}
          aria-pressed={activo}
          className={`rounded-full px-4 py-2 text-[12px] font-medium transition-colors ${
            activo ? 'bg-tinta text-white' : 'text-slate-ink hover:bg-mist'
          }`}
        >
          {opcion.texto}
        </button>
      );
    })}
  </div>
);

export interface ChipOpcion {
  id: number;
  texto: string;
  /** Clase de color del punto, p. ej. 'bg-terracota'. */
  color?: string;
}

interface FilterChipsProps {
  items: ChipOpcion[];
  activo: number | null;
  onToggle: (id: number) => void;
  tituloActivo?: string;
  tituloInactivo?: (texto: string) => string;
}

/** Chips con punto de color para filtrar por una categoría. */
export const FilterChips = ({
  items,
  activo,
  onToggle,
  tituloActivo = 'Quitar filtro',
  tituloInactivo = (texto) => `Filtrar por ${texto}`,
}: FilterChipsProps) => (
  <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-x-auto pb-1">
    {items.map((item) => {
      const seleccionado = activo === item.id;
      return (
        <button
          key={item.id}
          type="button"
          onClick={() => onToggle(item.id)}
          aria-pressed={seleccionado}
          title={seleccionado ? tituloActivo : tituloInactivo(item.texto)}
          className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[12px] font-medium transition-all ${
            seleccionado
              ? 'border-violeta bg-white text-tinta ring-2 ring-violeta/10'
              : 'border-faint bg-white text-slate-ink hover:border-pebble'
          }`}
        >
          {item.color && <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />}
          {item.texto}
        </button>
      );
    })}
  </div>
);

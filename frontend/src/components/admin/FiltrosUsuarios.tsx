import { SearchIcon } from '../constelacion/Icons';
import { SegmentedFilter, SelectFilter } from '../constelacion/Filters';
import { claseInput } from './usuarios';

export type FiltroEstado = 'todos' | 'activos' | 'inactivos';

export interface ValoresFiltros {
  usuario: string;
  correo: string;
  rol: string;
  estado: FiltroEstado;
}

interface FiltrosUsuariosProps {
  valores: ValoresFiltros;
  roles: string[];
  onChange: (valores: ValoresFiltros) => void;
}

const OPCIONES_ESTADO = [
  { valor: 'todos' as const, texto: 'Todos' },
  { valor: 'activos' as const, texto: 'Activos' },
  { valor: 'inactivos' as const, texto: 'Inactivos' },
];

/** Filtros de Gestionar usuarios: usuario, correo, rol y estado. */
export const FiltrosUsuarios = ({ valores, roles, onChange }: FiltrosUsuariosProps) => {
  const cambiar = <K extends keyof ValoresFiltros>(campo: K, valor: ValoresFiltros[K]) =>
    onChange({ ...valores, [campo]: valor });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_200px_auto]">
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-medium text-slate-ink">Usuario</span>
        <span className="relative block">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pebble" />
          <input
            type="search"
            value={valores.usuario}
            onChange={(event) => cambiar('usuario', event.target.value)}
            placeholder="Nombre o usuario"
            className={`${claseInput} pl-10`}
          />
        </span>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-medium text-slate-ink">Correo</span>
        <span className="relative block">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pebble" />
          <input
            type="search"
            value={valores.correo}
            onChange={(event) => cambiar('correo', event.target.value)}
            placeholder="correo@ecci.edu.co"
            className={`${claseInput} pl-10`}
          />
        </span>
      </label>

      <SelectFilter
        etiqueta="Rol"
        valor={valores.rol}
        onChange={(valor) => cambiar('rol', valor)}
        opciones={roles.map((rol) => ({ valor: rol, texto: rol }))}
        textoTodos="Todos los roles"
      />

      <div>
        <span className="mb-1.5 block text-[11px] font-medium text-slate-ink">Estado</span>
        <SegmentedFilter
          opciones={OPCIONES_ESTADO}
          valor={valores.estado}
          onChange={(valor) => cambiar('estado', valor)}
        />
      </div>
    </div>
  );
};

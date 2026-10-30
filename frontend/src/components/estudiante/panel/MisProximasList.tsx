import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowIcon, CloseIcon } from '../../constelacion/Icons';
import { EmptyState } from '../../constelacion/EmptyState';
import { temaPorIndice } from '../../constelacion/temas';
import { diaSemanaCorto, parseFecha } from '../../../utils/fechas';

/** Tutoría próxima ya resuelta para la lista lateral. */
export interface ItemProximo {
  id: number;
  titulo: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  docente: string;
  modalidad: string;
  puedeCancelar: boolean;
}

interface MisProximasListProps {
  items: ItemProximo[];
  /** Total de tutorías próximas; se usa para decidir si mostrar "Ver todas". */
  total: number;
  cargando: boolean;
  onCancelar: (id: number) => void;
  rutaVerTodas?: string;
}

/** Columna derecha con las próximas sesiones del estudiante. */
export const MisProximasList = ({
  items,
  total,
  cargando,
  onCancelar,
  rutaVerTodas = '/estudiante/mis-reservas',
}: MisProximasListProps) => (
  <motion.aside
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay: 0.09 }}
    className="order-2 flex min-w-0 flex-col rounded-[28px] bg-white p-5 shadow-[0_1px_2px_rgba(28,26,30,0.04)] sm:p-6 xl:order-none xl:col-start-2 xl:row-start-1 xl:self-start"
  >
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-tinta">
        Mis próximas tutorías
      </h2>
      <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-tinta px-2 text-[11px] font-semibold text-white">
        {total}
      </span>
    </div>

    <div className="mt-4 space-y-2.5">
      {cargando ? (
        Array.from({ length: 3 }).map((_, indice) => (
          <div key={indice} className="h-[76px] animate-pulse rounded-2xl bg-mist" />
        ))
      ) : items.length === 0 ? (
        <EmptyState
          titulo="Sin tutorías próximas"
          detalle="Cuando reserves un horario lo verás aquí."
        />
      ) : (
        items.map((item, indice) => {
          const tema = temaPorIndice(indice);

          return (
            <div key={item.id} className="flex items-start gap-3 rounded-2xl bg-mist px-3 py-3">
              <div
                className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl ${tema.bg} ${tema.text}`}
              >
                <span className="text-[8.5px] font-semibold uppercase tracking-wide opacity-80">
                  {diaSemanaCorto(item.fecha)}
                </span>
                <span className="text-[15px] font-semibold leading-none">
                  {parseFecha(item.fecha).getDate()}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-tinta">{item.titulo}</p>
                <p className="truncate text-[10.5px] text-muted">Tutor: {item.docente}</p>
                <p className="truncate text-[10px] text-muted">
                  {item.horaInicio} – {item.horaFin} · {item.modalidad}
                </p>
              </div>

              {item.puedeCancelar && (
                <button
                  type="button"
                  onClick={() => onCancelar(item.id)}
                  title="Cancelar tutoría"
                  aria-label={`Cancelar ${item.titulo}`}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-peligro transition-colors hover:bg-peligro hover:text-white"
                >
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })
      )}
    </div>

    <div className="mt-4 border-t border-faint pt-3">
      <p className="text-[10px] leading-relaxed text-muted">
        Las tutorías finalizadas o canceladas se muestran en tu Historial.
      </p>
      {total > 4 && (
        <Link
          to={rutaVerTodas}
          className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-ink hover:text-violeta-accion"
        >
          Ver todas
          <ArrowIcon className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  </motion.aside>
);

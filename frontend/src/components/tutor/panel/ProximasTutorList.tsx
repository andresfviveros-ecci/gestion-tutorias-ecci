import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowIcon } from '../../constelacion/Icons';
import { EmptyState } from '../../constelacion/EmptyState';
import { diaSemanaCorto, parseFecha } from '../../../utils/fechas';

/** Tutoría próxima ya resuelta para la lista del panel. */
export interface ProximaTutorItem {
  id: number;
  titulo: string;
  materia: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  modalidad: string;
  /** '1 hora', '45 min'... */
  duracion: string;
  esHoy: boolean;
  /** El backend ofrece acciones para esta tutoría (estados_siguientes). */
  puedeRegistrar?: boolean;
}

interface ProximasTutorListProps {
  items: ProximaTutorItem[];
  total: number;
  cargando: boolean;
  sinServicio: boolean;
  rutaAgenda?: string;
  onRegistrar?: (id: number) => void;
}

/** Lo que el docente tiene agendado próximamente. */
export const ProximasTutorList = ({
  items,
  total,
  cargando,
  sinServicio,
  rutaAgenda = '/tutor/calendario',
  onRegistrar,
}: ProximasTutorListProps) => (
  <motion.section
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay: 0.16 }}
    className="min-w-0 rounded-[28px] bg-white p-6 shadow-[0_1px_2px_rgba(28,26,30,0.04)] sm:p-7"
  >
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-[22px] font-semibold tracking-[-0.01em] text-tinta">
          Próximas tutorías
        </h2>
        <p className="mt-1 text-[12px] text-muted">Lo que tienes agendado próximamente.</p>
      </div>
      {total > 0 && (
        <Link
          to={rutaAgenda}
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11.5px] font-semibold text-tinta transition-colors hover:text-violeta-accion"
        >
          Ver agenda
          <ArrowIcon className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>

    <div className="mt-4">
      {cargando ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, indice) => (
            <div key={indice} className="h-[76px] animate-pulse rounded-2xl bg-mist" />
          ))}
        </div>
      ) : sinServicio ? (
        <EmptyState
          titulo="Agenda no disponible"
          detalle="Esta sección se activará cuando el servicio de tutorías esté disponible."
        />
      ) : items.length === 0 ? (
        <EmptyState
          titulo="Sin tutorías próximas"
          detalle="Publica disponibilidad para que los estudiantes puedan reservar."
        />
      ) : (
        <ul className="divide-y divide-faint">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-4 py-3.5 first:pt-1 last:pb-1">
              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-mist">
                <span className="text-[15px] font-semibold leading-none text-tinta">
                  {item.horaInicio || '—'}
                </span>
                <span className="mt-1 text-[8.5px] font-semibold uppercase tracking-wide text-muted">
                  {item.esHoy ? 'Hoy' : `${diaSemanaCorto(item.fecha)} ${parseFecha(item.fecha).getDate()}`}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold text-tinta">{item.titulo}</p>
                <p className="mt-0.5 truncate text-[11px] text-muted">· {item.materia}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-mist px-2.5 py-1 text-[10px] font-medium text-slate-ink">
                    {item.modalidad}
                    {item.duracion ? ` · ${item.duracion}` : ''}
                  </span>
                  {item.puedeRegistrar && onRegistrar && (
                    <button
                      type="button"
                      onClick={() => onRegistrar(item.id)}
                      className="rounded-full border border-faint px-2.5 py-1 text-[10px] font-semibold text-tinta transition-colors hover:bg-mist"
                    >
                      Registrar tutoría
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  </motion.section>
);

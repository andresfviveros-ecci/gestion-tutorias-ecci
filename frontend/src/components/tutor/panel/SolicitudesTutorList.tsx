import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowIcon } from '../../constelacion/Icons';
import { EmptyState } from '../../constelacion/EmptyState';

/** Solicitud ya resuelta para la lista del panel. */
export interface SolicitudVista {
  id: number;
  estudiante: string;
  materia: string;
  /** 'Jue, 15 oct · 10:00'. */
  fechaTexto: string;
  /** La solicitud más próxima se resalta como nueva. */
  nueva: boolean;
}

interface SolicitudesTutorListProps {
  items: SolicitudVista[];
  total: number;
  cargando: boolean;
  /** El endpoint de tutorías recibidas todavía no está disponible (404). */
  sinServicio: boolean;
  rutaVerTodas?: string;
}

const TONOS_AVATAR = [
  'bg-violet-wash/40 text-violeta-tinta',
  'bg-arena text-tinta',
  'bg-salvia text-tinta',
];

const inicial = (nombre: string): string =>
  nombre.trim().charAt(0).toUpperCase() || 'E';

/** Solicitudes de tutoría que esperan respuesta del docente. */
export const SolicitudesTutorList = ({
  items,
  total,
  cargando,
  sinServicio,
  rutaVerTodas = '/tutor/calendario',
}: SolicitudesTutorListProps) => (
  <motion.section
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay: 0.12 }}
    className="min-w-0 rounded-[28px] bg-white p-6 shadow-[0_1px_2px_rgba(28,26,30,0.04)] sm:p-7"
  >
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-[22px] font-semibold tracking-[-0.01em] text-tinta">
          Solicitudes de tutoría
        </h2>
        <p className="mt-1 text-[12px] text-muted">Revisa las solicitudes que esperan respuesta.</p>
      </div>
      {total > 0 && (
        <Link
          to={rutaVerTodas}
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11.5px] font-semibold text-tinta transition-colors hover:text-violeta-accion"
        >
          Ver todas
          <ArrowIcon className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>

    <div className="mt-4">
      {cargando ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, indice) => (
            <div key={indice} className="h-[58px] animate-pulse rounded-2xl bg-mist" />
          ))}
        </div>
      ) : sinServicio ? (
        <EmptyState
          titulo="Solicitudes no disponibles"
          detalle="Esta sección se activará cuando el servicio de tutorías esté disponible."
        />
      ) : items.length === 0 ? (
        <EmptyState
          titulo="Sin solicitudes pendientes"
          detalle="Cuando un estudiante reserve uno de tus horarios lo verás aquí."
        />
      ) : (
        <ul className="divide-y divide-faint">
          {items.map((item, indice) => (
            <li key={item.id} className="flex items-center gap-3 py-3.5 first:pt-1 last:pb-1">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[13px] font-semibold ${
                  TONOS_AVATAR[indice % TONOS_AVATAR.length]
                }`}
                aria-hidden="true"
              >
                {inicial(item.estudiante)}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold text-tinta">{item.estudiante}</p>
                <p className="truncate text-[11px] text-muted">
                  {item.materia} · {item.fechaTexto}
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-semibold ${
                  item.nueva
                    ? 'bg-violet-wash/40 text-violeta-accion'
                    : 'bg-mist text-muted'
                }`}
              >
                {item.nueva ? 'Nueva' : 'Pendiente'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  </motion.section>
);

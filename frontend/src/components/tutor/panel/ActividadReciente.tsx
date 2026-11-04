import { motion } from 'framer-motion';
import { CheckIcon, CloseIcon } from '../../constelacion/Icons';
import { EmptyState } from '../../constelacion/EmptyState';

export interface ActividadItem {
  id: number;
  /** 'Tutoría completada', 'Tutoría cancelada'... */
  titulo: string;
  /** 'Introducción a Python · Ayer'. */
  detalle: string;
  estado: string;
}

interface ActividadRecienteProps {
  item: ActividadItem | null;
  cargando: boolean;
  sinServicio: boolean;
}

const ESTADOS_CANCELADOS = ['CANCELADA_ESTUDIANTE', 'CANCELADA_DOCENTE'];

const insignia = (estado: string): { texto: string; clase: string } => {
  if (estado === 'COMPLETADA') {
    return { texto: 'Finalizada', clase: 'bg-salvia/45 text-exito' };
  }
  if (estado === 'NO_ASISTIO') {
    return { texto: 'No asistió', clase: 'bg-arena/60 text-advertencia' };
  }
  if (ESTADOS_CANCELADOS.includes(estado)) {
    return { texto: 'Cancelada', clase: 'bg-mist text-muted' };
  }
  return { texto: 'Cerrada', clase: 'bg-mist text-muted' };
};

/** Último movimiento de las tutorías del docente. */
export const ActividadReciente = ({ item, cargando, sinServicio }: ActividadRecienteProps) => {
  const esCancelada = item ? ESTADOS_CANCELADOS.includes(item.estado) : false;
  const etiqueta = item ? insignia(item.estado) : null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.17 }}
      className="rounded-[28px] bg-white p-5 shadow-[0_1px_2px_rgba(28,26,30,0.04)]"
    >
      <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-tinta">Actividad reciente</h2>
      <p className="mt-1 text-[11px] text-muted">Últimos movimientos de tus tutorías.</p>

      <div className="mt-4 border-t border-faint pt-4">
        {cargando ? (
          <div className="h-[52px] animate-pulse rounded-2xl bg-mist" />
        ) : sinServicio ? (
          <p className="text-[11px] text-muted">
            La actividad aparecerá cuando el servicio de tutorías esté disponible.
          </p>
        ) : !item ? (
          <EmptyState
            titulo="Sin actividad todavía"
            detalle="Tus tutorías completadas o canceladas se verán aquí."
          />
        ) : (
          <div className="flex items-center gap-3">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                esCancelada ? 'bg-mist text-muted' : 'bg-carbon text-white'
              }`}
            >
              {esCancelada ? (
                <CloseIcon className="h-4 w-4" />
              ) : (
                <CheckIcon className="h-4 w-4" />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[11.5px] font-semibold text-tinta">{item.titulo}</p>
              <p className="mt-0.5 truncate text-[10.5px] leading-snug text-muted">{item.detalle}</p>
            </div>

            {etiqueta && (
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[9.5px] font-semibold ${etiqueta.clase}`}
              >
                {etiqueta.texto}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.section>
  );
};

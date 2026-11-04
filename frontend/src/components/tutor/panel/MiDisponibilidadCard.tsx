import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowIcon } from '../../constelacion/Icons';

export interface DiaDisponibilidad {
  iso: string;
  /** 'Lun', 'Mar'... */
  etiqueta: string;
  numero: number;
  esHoy: boolean;
  tieneBloques: boolean;
}

interface MiDisponibilidadCardProps {
  cargando: boolean;
  dias: DiaDisponibilidad[];
  /** Minutos libres publicados para esta semana; null mientras carga. */
  minutosLibres: number | null;
  publicada: boolean;
}

const textoHoras = (minutos: number | null): string => {
  if (minutos === null) return '—';
  if (minutos <= 0) return '0 h libres';
  if (minutos < 60) return `${minutos} min libres`;
  const horas = (minutos / 60).toFixed(1).replace('.', ',').replace(',0', '');
  return `${horas} h libres`;
};

/** Resumen semanal de los horarios que el docente tiene publicados. */
export const MiDisponibilidadCard = ({
  cargando,
  dias,
  minutosLibres,
  publicada,
}: MiDisponibilidadCardProps) => (
  <motion.section
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay: 0.09 }}
    className="rounded-[28px] bg-white p-5 shadow-[0_1px_2px_rgba(28,26,30,0.04)]"
  >
    <div className="flex items-start justify-between gap-3">
      <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-tinta">Mi disponibilidad</h2>
      <span className="shrink-0 text-[10.5px] text-muted">
        {cargando ? 'Cargando...' : textoHoras(minutosLibres)}
      </span>
    </div>
    <p className="mt-1 text-[11px] text-muted">Horarios publicados para esta semana.</p>

    <div className="mt-4 grid grid-cols-7 gap-1.5">
      {dias.map((dia) => (
        <div
          key={dia.iso}
          className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 ${
            dia.esHoy ? 'bg-tinta text-white' : 'bg-mist text-tinta'
          }`}
          aria-label={`${dia.etiqueta} ${dia.numero}${dia.tieneBloques ? ', con disponibilidad' : ''}`}
        >
          <span
            className={`text-[8.5px] font-medium uppercase tracking-wide ${
              dia.esHoy ? 'text-white/70' : 'text-muted'
            }`}
          >
            {dia.etiqueta}
          </span>
          <span className="text-[12.5px] font-semibold leading-none">{dia.numero}</span>
          <span
            aria-hidden="true"
            className={`mt-0.5 h-1 w-1 rounded-full ${
              dia.tieneBloques
                ? dia.esHoy
                  ? 'bg-white'
                  : 'bg-violeta'
                : dia.esHoy
                  ? 'bg-white/30'
                  : 'bg-pebble/50'
            }`}
          />
        </div>
      ))}
    </div>

    <div className="mt-4 flex items-center gap-2">
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${publicada ? 'bg-exito' : 'bg-pebble'}`}
      />
      <span className="text-[10.5px] text-muted">
        {cargando
          ? 'Consultando disponibilidad...'
          : publicada
            ? 'Disponibilidad publicada'
            : 'Sin disponibilidad esta semana'}
      </span>
    </div>

    <Link
      to="/tutor/mi-disponibilidad"
      className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-tinta transition-colors hover:text-violeta-accion"
    >
      Gestionar disponibilidad
      <ArrowIcon className="h-3.5 w-3.5" />
    </Link>
  </motion.section>
);

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowIcon, VideoIcon } from '../../constelacion/Icons';

/** Datos ya resueltos de la próxima tutoría del docente. */
export interface ProximaTutorVista {
  tema: string;
  estudiante: string;
  materia: string;
  modalidad: string;
  /** 'Hoy', 'Mañana' o 'Jueves 29'. */
  relativa: string;
  /** 'Jueves 29'. */
  fechaTexto: string;
  horaInicio: string;
  horaFin: string;
  enlaceVirtual: string;
  /** El backend ofrece acciones para esta tutoría (estados_siguientes). */
  puedeRegistrar?: boolean;
}

interface ProximaTutoriaTutorCardProps {
  cargando: boolean;
  proxima: ProximaTutorVista | null;
  rutaAgenda?: string;
  onRegistrar?: () => void;
}

const claseAccion =
  'inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-3 text-[12px] font-medium text-tinta transition-transform hover:-translate-y-0.5';

/** Tarjeta oscura con la próxima sesión que atenderá el docente. */
export const ProximaTutoriaTutorCard = ({
  cargando,
  proxima,
  rutaAgenda = '/tutor/calendario',
  onRegistrar,
}: ProximaTutoriaTutorCardProps) => (
  <motion.section
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay: 0.06 }}
    className="relative flex min-h-[295px] flex-col justify-between overflow-hidden rounded-[28px] bg-carbon p-6 text-white sm:p-7"
  >
    <div
      aria-hidden="true"
      className="pointer-events-none absolute right-7 top-7 h-10 w-10 rounded-full bg-arena"
    />
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -bottom-20 -right-10 h-[260px] w-[260px] rounded-full bg-terracota"
    />

    <div className="relative z-10">
      <p className="text-[11px] font-medium tracking-wide text-white/70">
        Próxima tutoría
        {proxima && (
          <>
            <span className="mx-1.5 text-white/30">·</span>
            {(proxima.relativa === 'Hoy' || proxima.relativa === 'Mañana') && (
              <>
                <span className="text-arena">{proxima.relativa}</span>
                <span className="mx-1.5 text-white/30">·</span>
              </>
            )}
            <span>{proxima.fechaTexto}</span>
          </>
        )}
      </p>

      {cargando ? (
        <p className="mt-3 text-[13px] text-white/60">Cargando tu agenda...</p>
      ) : proxima ? (
        <>
          <h2 className="mt-2 line-clamp-2 max-w-[85%] text-[24px] font-medium leading-tight tracking-[-0.01em]">
            {proxima.tema}
          </h2>
          <p className="mt-1.5 truncate text-[12px] text-white/70">
            {proxima.estudiante}
            {proxima.materia && (
              <>
                <span className="mx-1.5 text-white/30">·</span>
                {proxima.materia}
              </>
            )}
            {proxima.modalidad && (
              <>
                <span className="mx-1.5 text-white/30">·</span>
                {proxima.modalidad}
              </>
            )}
          </p>
        </>
      ) : (
        <>
          <h2 className="mt-2 text-[24px] font-medium leading-tight tracking-[-0.01em]">
            Sin tutorías programadas
          </h2>
          <p className="mt-1.5 max-w-sm text-[12px] text-white/70">
            Cuando un estudiante reserve uno de tus horarios, la sesión aparecerá aquí.
          </p>
        </>
      )}
    </div>

    <div className="relative z-10 mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div>
        {proxima ? (
          <>
            <p className="text-[56px] font-medium leading-none tracking-[-0.03em] sm:text-[64px]">
              {proxima.horaInicio || '—'}
            </p>
            <p className="mt-2 text-[11px] text-white/60">
              {proxima.horaFin ? `hasta las ${proxima.horaFin}` : 'Hora por confirmar'}
            </p>
          </>
        ) : (
          <p className="text-[13px] text-white/60">Tu agenda está libre.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {proxima && proxima.enlaceVirtual ? (
          <a href={proxima.enlaceVirtual} target="_blank" rel="noreferrer" className={claseAccion}>
            <VideoIcon className="h-4 w-4" />
            Unirse a la reunión
          </a>
        ) : (
          <Link to={rutaAgenda} className={claseAccion}>
            Ver tutoría
            <ArrowIcon className="h-4 w-4" />
          </Link>
        )}
        {proxima?.puedeRegistrar && onRegistrar && (
          <button type="button" onClick={onRegistrar} className={claseAccion}>
            Registrar tutoría
          </button>
        )}
      </div>
    </div>
  </motion.section>
);

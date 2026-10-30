import { motion } from 'framer-motion';
import type { TemaTarjeta } from '../../constelacion/temas';

interface CupoCardProps {
  fechaTexto: string;
  horaInicio: string;
  horaFin: string;
  modalidad: string;
  docente: string;
  materia: string;
  codigo: string;
  lugar: string;
  cupoTotal: number;
  cupoOcupado: number;
  tema: TemaTarjeta;
  onReservar: () => void;
}

/** Tarjeta de un bloque con cupo disponible. */
export const CupoCard = ({
  fechaTexto,
  horaInicio,
  horaFin,
  modalidad,
  docente,
  materia,
  codigo,
  lugar,
  cupoTotal,
  cupoOcupado,
  tema,
  onReservar,
}: CupoCardProps) => {
  const libres = Math.max(cupoTotal - cupoOcupado, 0);
  const porcentaje = cupoTotal ? Math.round((libres / cupoTotal) * 100) : 0;

  return (
    <motion.article
      whileHover={{ y: -3 }}
      className="flex flex-col overflow-hidden rounded-[22px] border border-faint bg-white transition-shadow hover:shadow-[0_12px_32px_rgba(28,26,30,0.08)]"
    >
      <div className={`relative px-5 pb-5 pt-4 ${tema.bg} ${tema.text}`}>
        <p className="text-[12px] font-medium">{fechaTexto}</p>
        <p className="mt-2 text-[34px] font-medium leading-none tracking-[-0.03em]">{horaInicio}</p>
        <span className="absolute bottom-4 right-4 rounded-full bg-white px-3 py-1 text-[10px] font-medium text-tinta">
          {modalidad}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 px-5 py-4">
        <p className="truncate text-[13px] font-semibold text-tinta">{docente}</p>
        <p className="truncate text-[11px] text-muted">
          {materia}
          {codigo ? ` · ${codigo}` : ''}
        </p>
        <p className="line-clamp-2 text-[10.5px] leading-snug text-muted" title={lugar}>
          {horaInicio} – {horaFin} · {lugar}
        </p>

        <div className="mt-1">
          <div className="flex items-center justify-between text-[10.5px]">
            <span className="font-semibold text-slate-ink">Cupos</span>
            <span className="text-muted">
              {libres} de {cupoTotal} {libres === 1 ? 'libre' : 'libres'}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-faint">
            <div
              className="h-full rounded-full bg-tinta transition-all"
              style={{ width: `${Math.min(Math.max(porcentaje, 6), 100)}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onReservar}
          className="mt-auto h-10 w-full rounded-full bg-tinta text-[12px] font-medium text-white transition-colors hover:bg-black"
        >
          Reservar
        </button>
      </div>
    </motion.article>
  );
};

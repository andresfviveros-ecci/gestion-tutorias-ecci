import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarIcon, HistoryIcon, ListIcon, UserIcon } from '../../constelacion/Icons';

interface AccesosRapidosProps {
  /** Mi perfil todavía no tiene pantalla propia. */
  onPerfil: () => void;
}

interface Acceso {
  titulo: string;
  detalle: string;
  icono: ReactNode;
  to?: string;
  onClick?: () => void;
}

// Cada atajo lleva a la pantalla que nombra (antes tres iban al calendario).
const ACCESOS: Acceso[] = [
  {
    titulo: 'Solicitudes de tutor',
    detalle: 'Postulaciones por revisar',
    icono: <ListIcon className="h-[18px] w-[18px]" />,
    to: '/tutor/solicitudes',
  },
  {
    titulo: 'Publicar horario',
    detalle: 'Gestión de disponibilidad',
    icono: <CalendarIcon className="h-[18px] w-[18px]" />,
    to: '/tutor/mi-disponibilidad',
  },
  {
    titulo: 'Calendario',
    detalle: 'Tus bloques de la semana',
    icono: <HistoryIcon className="h-[18px] w-[18px]" />,
    to: '/tutor/calendario',
  },
  {
    titulo: 'Mi perfil',
    detalle: 'Datos y configuración',
    icono: <UserIcon className="h-[18px] w-[18px]" />,
  },
];

const claseTile =
  'flex min-w-0 items-center gap-2.5 rounded-2xl bg-mist px-3 py-3 text-left transition-colors hover:bg-faint';

/** Cuatro atajos a las tareas frecuentes del docente. */
export const AccesosRapidos = ({ onPerfil }: AccesosRapidosProps) => (
  <motion.section
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay: 0.13 }}
    className="rounded-[28px] bg-white p-5 shadow-[0_1px_2px_rgba(28,26,30,0.04)]"
  >
    <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-tinta">Accesos rápidos</h2>

    <div className="mt-3 grid grid-cols-2 gap-2.5">
      {ACCESOS.map((acceso) => {
        const contenido = (
          <>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-slate-ink">
              {acceso.icono}
            </span>
            <span className="min-w-0">
              <span className="block text-[10.5px] font-semibold leading-tight text-tinta">
                {acceso.titulo}
              </span>
              <span className="mt-0.5 block text-[9px] leading-tight text-muted">
                {acceso.detalle}
              </span>
            </span>
          </>
        );

        if (acceso.to) {
          return (
            <Link key={acceso.titulo} to={acceso.to} className={claseTile}>
              {contenido}
            </Link>
          );
        }

        return (
          <button
            key={acceso.titulo}
            type="button"
            onClick={acceso.onClick ?? onPerfil}
            title="Mi perfil estará disponible próximamente"
            className={claseTile}
          >
            {contenido}
          </button>
        );
      })}
    </div>
  </motion.section>
);

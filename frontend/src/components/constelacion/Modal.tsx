import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { CloseIcon } from './Icons';

interface ModalProps {
  onCerrar: () => void;
  /** Id del h2, para `aria-labelledby`. */
  tituloId: string;
  eyebrow: string;
  /** Color del texto superior; por defecto muted. */
  eyebrowClassName?: string;
  titulo: string;
  ancho?: 'md' | 'lg';
  children: ReactNode;
}

/**
 * Cascarón de modal: fondo difuminado, animación de entrada/salida,
 * cabecera con botón de cierre y ancho configurable.
 *
 * Se monta/desmonta desde un `<AnimatePresence>` del padre, que es quien
 * habilita la animación de salida.
 */
export const Modal = ({
  onCerrar,
  tituloId,
  eyebrow,
  eyebrowClassName = 'text-muted',
  titulo,
  ancho = 'lg',
  children,
}: ModalProps) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-end justify-center bg-tinta/40 p-4 backdrop-blur-sm sm:items-center"
    onClick={onCerrar}
  >
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby={tituloId}
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.98 }}
      transition={{ duration: 0.22 }}
      onClick={(event) => event.stopPropagation()}
      className={`w-full ${ancho === 'md' ? 'max-w-md' : 'max-w-lg'} overflow-hidden rounded-[28px] bg-white shadow-constelacion-float`}
    >
      <div className="flex items-start justify-between gap-3 px-6 pt-6 sm:px-7">
        <div>
          <p className={`text-[11px] font-medium ${eyebrowClassName}`}>{eyebrow}</p>
          <h2 id={tituloId} className="mt-1 text-[22px] font-semibold tracking-[-0.01em]">
            {titulo}
          </h2>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-mist hover:text-tinta"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      {children}
    </motion.div>
  </motion.div>
);

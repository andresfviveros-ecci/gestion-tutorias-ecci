import { AnimatePresence, motion } from 'framer-motion';
import { CheckIcon } from './Icons';

interface ToastProps {
  mensaje: string | null;
}

/** Confirmación flotante que desaparece sola (el temporizador lo maneja el padre). */
export const Toast = ({ mensaje }: ToastProps) => (
  <AnimatePresence>
    {mensaje && (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        className="fixed bottom-6 right-6 z-[60] flex max-w-sm items-center gap-3 rounded-full bg-tinta px-5 py-3 text-[12px] font-medium text-white shadow-constelacion-float"
        role="status"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-exito text-white">
          <CheckIcon className="h-3.5 w-3.5" />
        </span>
        {mensaje}
      </motion.div>
    )}
  </AnimatePresence>
);

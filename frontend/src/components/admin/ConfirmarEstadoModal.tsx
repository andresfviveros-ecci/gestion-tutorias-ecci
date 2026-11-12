import { Modal } from '../constelacion/Modal';
import type { UserAccount } from './gestionUsuarios';

interface ConfirmarEstadoModalProps {
  usuario: UserAccount;
  onCancelar: () => void;
  onConfirmar: () => void;
}

/** Confirmación antes de desactivar una cuenta. */
export const ConfirmarEstadoModal = ({ usuario, onCancelar, onConfirmar }: ConfirmarEstadoModalProps) => (
  <Modal
    onCerrar={onCancelar}
    tituloId="confirmar-desactivar"
    eyebrow="Confirmar"
    eyebrowClassName="text-peligro"
    titulo="¿Desactivar usuario?"
    ancho="md"
  >
    <div className="px-6 pb-6 pt-3 sm:px-7">
      <p className="text-[12.5px] leading-relaxed text-muted">
        Vas a desactivar a <strong className="font-semibold text-tinta">{usuario.nombre}</strong>. No podrá
        iniciar sesión hasta que lo vuelvas a activar.
      </p>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancelar}
          className="h-11 rounded-full border border-faint bg-white px-5 text-[12.5px] font-semibold text-tinta transition-colors hover:bg-mist"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirmar}
          className="h-11 rounded-full bg-peligro px-6 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          Sí, desactivar
        </button>
      </div>
    </div>
  </Modal>
);

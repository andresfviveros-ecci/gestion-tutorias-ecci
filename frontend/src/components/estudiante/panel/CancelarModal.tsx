import { useState } from 'react';
import type { FormEvent } from 'react';
import { Modal } from '../../constelacion/Modal';
import type { Tutoria } from '../../../types/panel';
import { mensajeError } from '../../../utils/api';

/** Detalle del bloque asociado, ya formateado. */
export interface DetalleCancelacion {
  fechaTexto: string;
  horaInicio: string;
  horaFin: string;
  modalidad: string;
}

interface CancelarModalProps {
  tutoria: Tutoria;
  docente: string;
  detalle: DetalleCancelacion | null;
  onCerrar: () => void;
  /** Debe lanzar si la cancelación falla; el modal muestra el mensaje. */
  onConfirmar: (motivo: string) => Promise<void>;
}

export const CancelarModal = ({
  tutoria,
  docente,
  detalle,
  onCerrar,
  onConfirmar,
}: CancelarModalProps) => {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const confirmar = async (event: FormEvent) => {
    event.preventDefault();

    if (!motivo.trim()) {
      setError('Cuéntanos brevemente por qué cancelas la tutoría.');
      return;
    }

    setEnviando(true);
    setError(null);

    try {
      await onConfirmar(motivo.trim());
    } catch (fallo) {
      setError(mensajeError(fallo));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      onCerrar={onCerrar}
      tituloId="titulo-cancelar"
      eyebrow="Cancelar reserva"
      eyebrowClassName="text-peligro"
      titulo="¿Cancelar esta tutoría?"
      ancho="md"
    >
      <form onSubmit={confirmar} className="px-6 pb-6 pt-4 sm:px-7 sm:pb-7">
        <div className="rounded-2xl bg-mist px-4 py-3.5">
          <p className="text-[12px] font-semibold text-tinta">{tutoria.tema || 'Tutoría'}</p>
          <p className="mt-1 text-[11px] text-muted">{docente}</p>
          {detalle && (
            <p className="mt-0.5 text-[10.5px] text-muted">
              {detalle.fechaTexto}
              <span className="mx-1.5 text-pebble">·</span>
              {detalle.horaInicio} – {detalle.horaFin}
              <span className="mx-1.5 text-pebble">·</span>
              {detalle.modalidad}
            </p>
          )}
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-muted">
          Al cancelar, el cupo vuelve a quedar disponible para otros estudiantes. Cuéntanos el
          motivo para completar el proceso.
        </p>

        <label htmlFor="motivo-cancelar" className="mt-4 block text-[11px] font-medium text-slate-ink">
          Motivo <span className="text-peligro">*</span>
        </label>
        <textarea
          id="motivo-cancelar"
          autoFocus
          value={motivo}
          onChange={(event) => setMotivo(event.target.value)}
          rows={3}
          placeholder="Ej. Se me cruzó una clase o ya no necesito la tutoría."
          className="mt-1.5 w-full resize-none rounded-xl border border-faint bg-white px-4 py-3 text-[13px] text-tinta outline-none transition-colors placeholder:text-pebble focus:border-peligro focus:ring-2 focus:ring-peligro/15"
        />

        {error && (
          <p className="mt-3 rounded-xl bg-peligro/10 px-3 py-2 text-[11px] text-peligro">{error}</p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCerrar}
            className="h-11 rounded-full border border-faint px-5 text-[12px] font-medium text-slate-ink transition-colors hover:bg-mist"
          >
            Conservar tutoría
          </button>
          <button
            type="submit"
            disabled={enviando}
            className="h-11 rounded-full bg-peligro px-6 text-[12px] font-medium text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? 'Cancelando...' : 'Sí, cancelar'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

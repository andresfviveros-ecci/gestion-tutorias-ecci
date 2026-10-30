import { useState } from 'react';
import type { FormEvent } from 'react';
import { Modal } from '../../constelacion/Modal';
import { temaDeMateria } from '../../constelacion/temas';
import type { Bloque } from '../../../types/panel';
import { mensajeError } from '../../../utils/api';
import { diaYNumero, horaCorta } from '../../../utils/fechas';
import { modalidadLegible } from '../../../utils/panel';

interface ReservaModalProps {
  bloque: Bloque;
  materia: string;
  docente: string;
  lugar: string;
  onCerrar: () => void;
  /** Debe lanzar si la reserva falla; el modal muestra el mensaje. */
  onConfirmar: (datos: { tema: string; descripcion: string }) => Promise<void>;
}

export const ReservaModal = ({
  bloque,
  materia,
  docente,
  lugar,
  onCerrar,
  onConfirmar,
}: ReservaModalProps) => {
  const [tema, setTema] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const confirmar = async (event: FormEvent) => {
    event.preventDefault();

    if (!tema.trim()) {
      setError('Escribe el tema que quieres trabajar con tu tutor.');
      return;
    }

    setEnviando(true);
    setError(null);

    try {
      await onConfirmar({ tema: tema.trim(), descripcion: descripcion.trim() });
    } catch (fallo) {
      setError(mensajeError(fallo));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      onCerrar={onCerrar}
      tituloId="titulo-reserva"
      eyebrow="Nueva reserva"
      titulo="Reservar tutoría"
    >
      <form onSubmit={confirmar} className="px-6 pb-6 pt-4 sm:px-7 sm:pb-7">
        <div className="rounded-2xl bg-mist px-4 py-3.5">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${temaDeMateria(bloque.materia).dot}`} />
            <p className="text-[12px] font-semibold text-tinta">{materia}</p>
          </div>
          <p className="mt-1.5 text-[11px] text-muted">
            {docente}
            <span className="mx-1.5 text-pebble">·</span>
            {diaYNumero(bloque.fecha)}
            <span className="mx-1.5 text-pebble">·</span>
            {horaCorta(bloque.hora_inicio)} – {horaCorta(bloque.hora_fin)}
          </p>
          <p className="mt-1 truncate text-[10.5px] text-muted">
            {modalidadLegible(bloque.modalidad)}
            <span className="mx-1.5 text-pebble">·</span>
            {lugar}
          </p>
        </div>

        <label htmlFor="tema-reserva" className="mt-5 block text-[11px] font-medium text-slate-ink">
          Tema de la tutoría <span className="text-peligro">*</span>
        </label>
        <input
          id="tema-reserva"
          autoFocus
          value={tema}
          onChange={(event) => setTema(event.target.value)}
          maxLength={200}
          placeholder="Ej. Repaso para el parcial de bases de datos"
          className="mt-1.5 h-12 w-full rounded-xl border border-faint bg-white px-4 text-[13px] text-tinta outline-none transition-colors placeholder:text-pebble focus:border-violeta focus:ring-2 focus:ring-violeta/15"
        />

        <label
          htmlFor="descripcion-reserva"
          className="mt-4 block text-[11px] font-medium text-slate-ink"
        >
          Descripción <span className="font-normal text-muted">(opcional)</span>
        </label>
        <textarea
          id="descripcion-reserva"
          value={descripcion}
          onChange={(event) => setDescripcion(event.target.value)}
          rows={3}
          placeholder="Cuéntale a tu tutor qué necesitas trabajar."
          className="mt-1.5 w-full resize-none rounded-xl border border-faint bg-white px-4 py-3 text-[13px] text-tinta outline-none transition-colors placeholder:text-pebble focus:border-violeta focus:ring-2 focus:ring-violeta/15"
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
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando}
            className="h-11 rounded-full bg-violeta-accion px-6 text-[12px] font-medium text-white shadow-constelacion-violet transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? 'Reservando...' : 'Confirmar reserva'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

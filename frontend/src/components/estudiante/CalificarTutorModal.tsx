import { useEffect, useState } from 'react';
import { Modal } from '../constelacion/Modal';
import { api } from '../../api/axios';
import { mensajeError } from '../../utils/api';

interface Escala {
  minima: number;
  maxima: number;
}

interface CalificarTutorModalProps {
  tutoriaId: number;
  materia: string;
  tutor: string;
  fechaTexto?: string;
  onCerrar: () => void;
  onGuardado: (calificacion: number) => void;
}

/** GT-226 / RF-09: el estudiante califica al tutor en la escala configurada. */
export const CalificarTutorModal = ({
  tutoriaId,
  materia,
  tutor,
  fechaTexto,
  onCerrar,
  onGuardado,
}: CalificarTutorModalProps) => {
  const [escala, setEscala] = useState<Escala>({ minima: 1, maxima: 10 });
  const [calificacion, setCalificacion] = useState(8);
  const [comentario, setComentario] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    api
      .get<{ calificacion_minima?: number; calificacion_maxima?: number }>(
        '/catalogo/configuracion/',
      )
      .then(({ data }) => {
        if (!activo) return;
        const minima = Number(data.calificacion_minima) || 1;
        const maxima = Number(data.calificacion_maxima) || 10;
        setEscala({ minima, maxima });
        setCalificacion(Math.round((minima + maxima) / 2));
      })
      .catch(() => {
        // Sin configuración se usa la escala por defecto (1 a 10).
      });

    return () => {
      activo = false;
    };
  }, []);

  const guardar = async () => {
    setGuardando(true);
    setError(null);

    try {
      await api.post(`/tutorias/tutorias/${tutoriaId}/evaluacion/`, {
        calificacion,
        comentario: comentario.trim() || undefined,
      });
      onGuardado(calificacion);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      onCerrar={onCerrar}
      tituloId="calificar-tutor"
      eyebrow="GT-226 · Evaluación del tutor"
      titulo="¿Cómo fue tu tutoría?"
      ancho="md"
      cerrable={!guardando}
    >
      <div className="px-6 pb-6 pt-4 sm:px-7">
        <div className="rounded-2xl bg-mist px-4 py-3">
          <p className="text-[12.6px] font-semibold text-tinta">{materia}</p>
          <p className="mt-0.5 text-[11.3px] text-muted">
            {tutor}
            {fechaTexto ? ` · ${fechaTexto}` : ''}
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-faint px-4 py-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11.9px] font-semibold text-tinta">Tu calificación</p>
              <p className="mt-0.5 text-[10.7px] text-muted">
                Escala de {escala.minima} a {escala.maxima}, según la configuración.
              </p>
            </div>
            <p className="text-[34px] font-semibold leading-none text-violeta-accion">
              {calificacion}
            </p>
          </div>

          <input
            type="range"
            min={escala.minima}
            max={escala.maxima}
            step={1}
            value={calificacion}
            onChange={(event) => setCalificacion(Number(event.target.value))}
            aria-label="Calificación del tutor"
            className="mt-3 h-2 w-full cursor-pointer accent-violeta-accion"
          />

          <div className="mt-1 flex justify-between text-[10px] text-muted">
            <span>{escala.minima}</span>
            <span>{escala.maxima}</span>
          </div>
        </div>

        <label
          htmlFor="comentario-evaluacion"
          className="mt-4 block text-[11.6px] font-semibold text-tinta"
        >
          Comentario (opcional)
        </label>
        <textarea
          id="comentario-evaluacion"
          rows={3}
          value={comentario}
          onChange={(event) => setComentario(event.target.value)}
          placeholder="Explicó muy claro y trajo ejercicios..."
          className="mt-1.5 w-full resize-none rounded-[14px] border border-faint bg-white px-3.5 py-3 text-[12.6px] text-tinta outline-none placeholder:text-pebble focus:border-violeta focus:ring-2 focus:ring-violeta/15"
        />

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-2xl border border-peligro/40 bg-[#FDF1EF] px-4 py-3 text-[11.6px] leading-relaxed text-peligro"
          >
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            className="h-11 rounded-full bg-mist px-5 text-[12.9px] font-semibold text-tinta transition-colors hover:bg-faint disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void guardar()}
            disabled={guardando}
            className="h-11 rounded-full bg-violeta-accion px-6 text-[12.8px] font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardando ? 'Guardando...' : 'Enviar calificación'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CalificarTutorModal;

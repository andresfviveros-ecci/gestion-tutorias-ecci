import { useState } from 'react';
import { Modal } from '../../constelacion/Modal';
import { api } from '../../../api/axios';
import { mensajeError } from '../../../utils/api';
import type { TutoriaRecibida } from '../../../types/tutor';
import { diaYNumero, hora12 } from '../../../utils/fechas';

interface OpcionEstado {
  valor: string;
  titulo: string;
  detalle: string;
}

/**
 * Las acciones salen de `estados_siguientes`, que calcula el backend: el
 * frontend no repite la regla de qué se puede hacer antes o después del inicio.
 */
const OPCIONES: Record<string, OpcionEstado> = {
  CONFIRMADA: {
    valor: 'CONFIRMADA',
    titulo: 'Confirmar tutoría',
    detalle: 'El estudiante recibirá la confirmación de la sesión.',
  },
  COMPLETADA: {
    valor: 'COMPLETADA',
    titulo: 'Marcar como completada',
    detalle: 'Registra cómo terminó la sesión y deja las observaciones.',
  },
  NO_ASISTIO: {
    valor: 'NO_ASISTIO',
    titulo: 'No asistió',
    detalle: 'El estudiante no se presentó a la tutoría.',
  },
  CANCELADA_DOCENTE: {
    valor: 'CANCELADA_DOCENTE',
    titulo: 'Cancelar tutoría',
    detalle: 'Se libera el cupo y se avisa por correo al estudiante.',
  },
};

const mensajeExito = (estado: string): string => {
  switch (estado) {
    case 'CONFIRMADA':
      return 'Confirmaste la tutoría. El estudiante ya puede verla confirmada.';
    case 'COMPLETADA':
      return 'Registraste la tutoría como completada.';
    case 'NO_ASISTIO':
      return 'Registraste que el estudiante no asistió.';
    case 'CANCELADA_DOCENTE':
      return 'Cancelaste la tutoría y se avisó al estudiante.';
    default:
      return 'El estado de la tutoría se actualizó.';
  }
};

interface RegistrarTutoriaModalProps {
  tutoria: TutoriaRecibida;
  onCerrar: () => void;
  onGuardado: (mensaje: string) => void;
}

/** GT-227 / RF-10: el tutor cierra el ciclo de una tutoría. */
export const RegistrarTutoriaModal = ({
  tutoria,
  onCerrar,
  onGuardado,
}: RegistrarTutoriaModalProps) => {
  const disponibles = (tutoria.estados_siguientes ?? [])
    .map((estado) => OPCIONES[estado])
    .filter((opcion): opcion is OpcionEstado => Boolean(opcion));

  const [estado, setEstado] = useState(disponibles[0]?.valor ?? '');
  const [motivo, setMotivo] = useState('');
  const [minutosRetraso, setMinutosRetraso] = useState('');
  const [notas, setNotas] = useState('');
  const [compromisos, setCompromisos] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bloque = tutoria.bloque_detalle;
  const materia = bloque?.materia?.nombre || 'Materia por confirmar';
  const fecha = bloque?.fecha ? diaYNumero(bloque.fecha) : 'Fecha por confirmar';
  const horario =
    bloque?.hora_inicio && bloque?.hora_fin
      ? `${hora12(bloque.hora_inicio)} – ${hora12(bloque.hora_fin)}`
      : 'Hora por confirmar';

  const guardar = async () => {
    if (!estado) return;

    if (estado === 'CANCELADA_DOCENTE' && !motivo.trim()) {
      setError('Escribe el motivo de la cancelación: el estudiante lo recibirá por correo.');
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      const cuerpo: Record<string, unknown> = { estado };

      if (estado === 'CANCELADA_DOCENTE') {
        cuerpo.motivo = motivo.trim();
      }

      if (estado === 'COMPLETADA') {
        if (minutosRetraso.trim()) cuerpo.minutos_retraso = Number(minutosRetraso);
        if (notas.trim()) cuerpo.notas_docente = notas.trim();
        if (compromisos.trim()) cuerpo.compromisos = compromisos.trim();
      }

      await api.patch(`/tutorias/recibidas/${tutoria.id}/`, cuerpo);
      onGuardado(mensajeExito(estado));
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      onCerrar={onCerrar}
      tituloId="registrar-tutoria"
      eyebrow="GT-227 · Registrar tutoría"
      titulo={tutoria.tema || 'Registrar tutoría'}
      ancho="md"
      cerrable={!guardando}
    >
      <div className="px-6 pb-6 pt-4 sm:px-7">
        <div className="rounded-2xl bg-mist px-4 py-3">
          <p className="text-[12.6px] font-semibold text-tinta">
            {tutoria.estudiante_nombre || 'Estudiante'}
          </p>
          <p className="mt-0.5 text-[11.3px] text-muted">
            {materia} · {fecha} · {horario}
          </p>
        </div>

        {disponibles.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-faint px-4 py-3 text-[12px] leading-relaxed text-muted">
            Esta tutoría ya no tiene acciones pendientes.
          </p>
        ) : (
          <>
            <p className="mt-4 text-[11.9px] font-semibold text-tinta">¿Cómo terminó la tutoría?</p>

            <div className="mt-2 space-y-2">
              {disponibles.map((opcion) => {
                const activo = estado === opcion.valor;
                return (
                  <button
                    key={opcion.valor}
                    type="button"
                    onClick={() => {
                      setEstado(opcion.valor);
                      setError(null);
                    }}
                    aria-pressed={activo}
                    className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                      activo
                        ? 'border-violeta-accion bg-violet-wash/20'
                        : 'border-faint bg-white hover:bg-mist'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        activo ? 'border-violeta-accion' : 'border-pebble'
                      }`}
                    >
                      {activo && <span className="h-2 w-2 rounded-full bg-violeta-accion" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[12.4px] font-semibold text-tinta">
                        {opcion.titulo}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
                        {opcion.detalle}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {estado === 'COMPLETADA' && (
              <div className="mt-4 space-y-3">
                <div>
                  <label
                    htmlFor="minutos-retraso"
                    className="block text-[11.6px] font-semibold text-tinta"
                  >
                    Minutos de retraso (opcional)
                  </label>
                  <input
                    id="minutos-retraso"
                    type="number"
                    min={0}
                    max={1440}
                    value={minutosRetraso}
                    onChange={(event) => setMinutosRetraso(event.target.value)}
                    placeholder="0"
                    className="mt-1.5 h-[42px] w-full rounded-[14px] border border-faint bg-white px-3.5 text-[12.6px] text-tinta outline-none focus:border-violeta focus:ring-2 focus:ring-violeta/15"
                  />
                  <p className="mt-1 text-[10.5px] text-muted">
                    Si lo dejas vacío, la asistencia queda como puntual.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="notas-docente"
                    className="block text-[11.6px] font-semibold text-tinta"
                  >
                    Observaciones de la sesión (opcional)
                  </label>
                  <textarea
                    id="notas-docente"
                    rows={3}
                    value={notas}
                    onChange={(event) => setNotas(event.target.value)}
                    placeholder="Qué se trabajó, dudas resueltas..."
                    className="mt-1.5 w-full resize-none rounded-[14px] border border-faint bg-white px-3.5 py-3 text-[12.6px] text-tinta outline-none placeholder:text-pebble focus:border-violeta focus:ring-2 focus:ring-violeta/15"
                  />
                </div>

                <div>
                  <label
                    htmlFor="compromisos"
                    className="block text-[11.6px] font-semibold text-tinta"
                  >
                    Compromisos para la próxima (opcional)
                  </label>
                  <textarea
                    id="compromisos"
                    rows={2}
                    value={compromisos}
                    onChange={(event) => setCompromisos(event.target.value)}
                    placeholder="Ej.: Ejercicios 3 y 4 del capítulo 2."
                    className="mt-1.5 w-full resize-none rounded-[14px] border border-faint bg-white px-3.5 py-3 text-[12.6px] text-tinta outline-none placeholder:text-pebble focus:border-violeta focus:ring-2 focus:ring-violeta/15"
                  />
                </div>
              </div>
            )}

            {estado === 'CANCELADA_DOCENTE' && (
              <div className="mt-4">
                <label
                  htmlFor="motivo-cancelacion"
                  className="block text-[11.6px] font-semibold text-tinta"
                >
                  Motivo de la cancelación
                </label>
                <textarea
                  id="motivo-cancelacion"
                  rows={3}
                  value={motivo}
                  onChange={(event) => setMotivo(event.target.value)}
                  placeholder="Ej.: Incapacidad médica, calamidad doméstica..."
                  className="mt-1.5 w-full resize-none rounded-[14px] border border-faint bg-white px-3.5 py-3 text-[12.6px] text-tinta outline-none placeholder:text-pebble focus:border-violeta focus:ring-2 focus:ring-violeta/15"
                />
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-2xl border border-peligro/40 bg-[#FDF1EF] px-4 py-3 text-[11.6px] leading-relaxed text-peligro"
              >
                {error}
              </p>
            )}
          </>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            className="h-11 rounded-full bg-mist px-5 text-[12.9px] font-semibold text-tinta transition-colors hover:bg-faint disabled:opacity-60"
          >
            {disponibles.length === 0 ? 'Cerrar' : 'Cancelar'}
          </button>
          {disponibles.length > 0 && (
            <button
              type="button"
              onClick={() => void guardar()}
              disabled={guardando || !estado}
              className="h-11 rounded-full bg-violeta-accion px-6 text-[12.8px] font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {guardando ? 'Guardando...' : 'Guardar estado'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default RegistrarTutoriaModal;

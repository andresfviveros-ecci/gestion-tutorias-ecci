import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Modal } from '../../constelacion/Modal';
import { CheckIcon, CloseIcon } from '../../constelacion/Icons';
import { mensajeError } from '../../../utils/api';
import type { EstadoSolicitud, SolicitudTutor } from '../../../types/tutores';

export type DecisionRevision = 'APROBADA' | 'RECHAZADA';

interface RevisionSolicitudModalProps {
  solicitud: SolicitudTutor;
  onCerrar: () => void;
  /** Debe lanzar si la revisión falla; el modal muestra el mensaje. */
  onConfirmar: (decision: DecisionRevision, motivo: string) => Promise<void>;
  /** Se llama al cerrar después de una decisión registrada. */
  onVerListado?: (estado: DecisionRevision) => void;
}

const ETIQUETAS: Record<EstadoSolicitud, string> = {
  PENDIENTE: 'Pendiente',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  REVOCADA: 'Revocada',
};

const chipEstado = (estado: EstadoSolicitud): string => {
  if (estado === 'APROBADA') return 'bg-exito/10 text-exito';
  if (estado === 'PENDIENTE') return 'bg-peligro/10 text-peligro';
  return 'bg-mist text-muted';
};

const iniciales = (nombre: string): string => {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return 'E';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
};

const EstadoChip = ({ estado }: { estado: EstadoSolicitud }) => (
  <span
    className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-[10.5px] font-semibold ${chipEstado(estado)}`}
  >
    {ETIQUETAS[estado]}
  </span>
);

interface DatoProps {
  etiqueta: string;
  children: ReactNode;
}

const Dato = ({ etiqueta, children }: DatoProps) => (
  <div className="flex items-start justify-between gap-4 border-b border-faint py-3 last:border-b-0">
    <span className="text-[11.5px] text-muted">{etiqueta}</span>
    <span className="text-right text-[11.5px] font-semibold text-tinta">{children}</span>
  </div>
);

/** Datos académicos que respaldan la decisión. */
const DetalleSolicitud = ({ solicitud }: { solicitud: SolicitudTutor }) => {
  const promedio = Number(solicitud.nota_final);

  return (
    <div className="mt-1">
      <Dato etiqueta="Materia solicitada">{solicitud.materia_nombre}</Dato>
      <Dato etiqueta="Promedio de la materia">
        {Number.isNaN(promedio) ? '—' : `${promedio.toFixed(1)}/5.0`}
      </Dato>
      <Dato etiqueta="Semestre del estudiante">
        {solicitud.estudiante_semestre ? `Semestre ${solicitud.estudiante_semestre}` : 'Sin registrar'}
      </Dato>
      <Dato etiqueta="Periodo académico">{solicitud.periodo_codigo}</Dato>
    </div>
  );
};

/**
 * Decisión del docente sobre una solicitud de tutor (GT-243, GT-244).
 *
 * Reproduce los tres estados de GT-231: revisión, motivo obligatorio y
 * decisión registrada. El motivo se exige en el frontend para aprobar y
 * rechazar; el backend lo exige al rechazar y al revocar.
 */
export const RevisionSolicitudModal = ({
  solicitud,
  onCerrar,
  onConfirmar,
  onVerListado,
}: RevisionSolicitudModalProps) => {
  const [fase, setFase] = useState<'revision' | 'error' | 'exito'>(
    solicitud.estado !== 'PENDIENTE' ? 'exito' : 'revision',
  );
  const [intento, setIntento] = useState<DecisionRevision | null>(null);
  const [decision, setDecision] = useState<DecisionRevision | null>(
    solicitud.estado === 'APROBADA'
      ? 'APROBADA'
      : solicitud.estado === 'RECHAZADA'
        ? 'RECHAZADA'
        : null,
  );
  const [motivo, setMotivo] = useState(solicitud.motivo ?? '');
  const [errorApi, setErrorApi] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [accionEnviando, setAccionEnviando] = useState<DecisionRevision | null>(null);
  const motivoRef = useRef<HTMLTextAreaElement>(null);

  const esExito = fase === 'exito';
  const esError = fase === 'error';
  const soloLectura = solicitud.estado !== 'PENDIENTE';
  const resultado = decision ?? solicitud.estado;
  const textoResultado =
    resultado === 'APROBADA' ? 'aprobada' : resultado === 'REVOCADA' ? 'revocada' : 'rechazada';
  const numero = `#${String(solicitud.id).padStart(4, '0')}`;

  const decidir = async (accion: DecisionRevision) => {
    setErrorApi(null);

    if (!motivo.trim()) {
      setIntento(accion);
      setFase('error');
      motivoRef.current?.focus();
      return;
    }

    setEnviando(true);
    setAccionEnviando(accion);
    try {
      await onConfirmar(accion, motivo.trim());
      setDecision(accion);
      setFase('exito');
    } catch (fallo) {
      setErrorApi(mensajeError(fallo));
    } finally {
      setEnviando(false);
      setAccionEnviando(null);
    }
  };

  const cambiarMotivo = (valor: string) => {
    setMotivo(valor);
    if (fase === 'error' && valor.trim()) {
      setFase('revision');
      setIntento(null);
    }
  };

  const cerrarYFiltrar = () => {
    onCerrar();
    if (decision) onVerListado?.(decision);
  };

  const botonRechazar = (
    <button
      type="button"
      onClick={() => void decidir('RECHAZADA')}
      disabled={enviando}
      className="h-11 whitespace-nowrap rounded-full border border-peligro px-5 text-[12.5px] font-semibold text-peligro transition-colors hover:bg-peligro/5 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {accionEnviando === 'RECHAZADA' ? 'Rechazando...' : 'Rechazar solicitud'}
    </button>
  );

  const botonAprobar = (
    <button
      type="button"
      onClick={() => void decidir('APROBADA')}
      disabled={enviando}
      className="h-11 whitespace-nowrap rounded-full bg-violeta-accion px-6 text-[12.5px] font-semibold text-white shadow-constelacion-violet transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {accionEnviando === 'APROBADA' ? 'Aprobando...' : 'Aprobar solicitud'}
    </button>
  );

  return (
    <Modal
      onCerrar={onCerrar}
      tituloId="titulo-revision-solicitud"
      eyebrow={`Gestión académica · Docente · Solicitud ${numero}`}
      titulo="Aprobación o rechazo de solicitud"
      ancho="xl"
      cerrable={!enviando}
    >
      <div className="max-h-[calc(100vh-9rem)] overflow-y-auto px-6 pb-6 pt-4 sm:px-7 sm:pb-7">
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* ------------------------- Solicitud ------------------------- */}
          <section className="rounded-[24px] bg-mist/60 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-[15px] font-semibold text-tinta">Solicitud de tutoría</h3>
                <p className="mt-0.5 text-[10.5px] text-muted">
                  Revisión docente · {solicitud.materia_nombre}
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-[10.5px] font-medium text-muted">
                {esExito ? 'Revisada' : 'Evaluación'}
              </span>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-arena/50 text-[12px] font-semibold text-tinta">
                {iniciales(solicitud.estudiante_nombre)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold text-tinta">
                  {solicitud.estudiante_nombre}
                </p>
                <p className="mt-0.5 text-[10.5px] text-muted">
                  Estudiante
                  {solicitud.estudiante_semestre
                    ? ` · Semestre ${solicitud.estudiante_semestre}`
                    : ''}
                </p>
              </div>
              <EstadoChip estado={esExito && decision ? decision : solicitud.estado} />
            </div>

            {esExito && decision && (
              <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-exito/30 bg-[#EAF4EE] px-4 py-3 text-exito">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-exito text-white">
                  <CheckIcon className="h-3 w-3" />
                </span>
                <p className="text-[11.5px] leading-relaxed">
                  La solicitud de {solicitud.estudiante_nombre} para ser tutor(a) de{' '}
                  {solicitud.materia_nombre} fue {textoResultado}.
                </p>
              </div>
            )}

            {(esExito || esError) && <DetalleSolicitud solicitud={solicitud} />}

            <label
              htmlFor="motivo-revision"
              className="mt-4 block text-[11.5px] font-semibold text-tinta"
            >
              Motivo de la decisión <span className="text-peligro">*</span>
            </label>
            <textarea
              id="motivo-revision"
              ref={motivoRef}
              rows={4}
              value={motivo}
              readOnly={esExito}
              onChange={(event) => cambiarMotivo(event.target.value)}
              aria-invalid={esError}
              aria-describedby={esError ? 'error-motivo-revision' : 'ayuda-motivo-revision'}
              placeholder="Escribe el motivo que respalde la aprobación o el rechazo de la solicitud..."
              className={`mt-1.5 w-full resize-none rounded-2xl border bg-white px-4 py-3 text-[12.5px] text-tinta outline-none transition-colors placeholder:text-pebble ${
                esError
                  ? 'border-peligro focus:border-peligro focus:ring-2 focus:ring-peligro/15'
                  : 'border-faint focus:border-violeta focus:ring-2 focus:ring-violeta/15'
              } ${esExito ? 'cursor-default bg-mist/50 text-muted' : ''}`}
            />
            <p id="ayuda-motivo-revision" className="mt-2 text-[10.5px] text-muted">
              {esError
                ? 'El motivo es obligatorio y se enviará al estudiante junto con el resultado.'
                : 'El motivo será comunicado al estudiante junto con el resultado de la revisión.'}
            </p>

            {errorApi && (
              <p role="alert" className="mt-3 rounded-xl bg-peligro/10 px-3 py-2 text-[11px] text-peligro">
                {errorApi}
              </p>
            )}

            <div className="mt-4 border-t border-faint pt-4">
              <p className="text-[10.5px] text-muted">
                {esExito
                  ? 'La decisión quedó registrada en la solicitud del estudiante.'
                  : esError
                    ? 'No se ha registrado ninguna decisión.'
                    : 'Selecciona una acción para continuar.'}
              </p>

              <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {esExito ? (
                  <>
                    {!soloLectura && (
                      <button
                        type="button"
                        onClick={cerrarYFiltrar}
                        className="h-11 whitespace-nowrap rounded-full border border-faint px-5 text-[12.5px] font-semibold text-slate-ink transition-colors hover:bg-mist"
                      >
                        Ver solicitudes
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onCerrar}
                      className="h-11 whitespace-nowrap rounded-full bg-violeta-accion px-6 text-[12.5px] font-semibold text-white shadow-constelacion-violet transition-opacity hover:opacity-95"
                    >
                      Volver a solicitudes
                    </button>
                  </>
                ) : esError ? (
                  <>
                    <button
                      type="button"
                      onClick={onCerrar}
                      className="h-11 whitespace-nowrap rounded-full border border-faint px-5 text-[12.5px] font-semibold text-slate-ink transition-colors hover:bg-mist"
                    >
                      Volver a solicitudes
                    </button>
                    {intento === 'RECHAZADA' ? botonRechazar : botonAprobar}
                  </>
                ) : (
                  <>
                    {botonRechazar}
                    {botonAprobar}
                  </>
                )}
              </div>
            </div>
          </section>

          {/* --------------------------- Panel --------------------------- */}
          <aside
            className={`rounded-[24px] border p-5 ${
              esExito
                ? 'border-exito/30 bg-[#F4FAF6]'
                : esError
                  ? 'border-peligro/30 bg-[#FDF5F4]'
                  : 'border-faint bg-white'
            }`}
          >
            <h3 className="text-[15px] font-semibold text-tinta">
              {esExito ? 'Decisión registrada' : esError ? 'Motivo obligatorio' : 'Información de solicitud'}
            </h3>
            <p className="mt-0.5 text-[10.5px] text-muted">
              {esExito || esError ? 'Resultado de la revisión' : 'Datos para apoyar la revisión'}
            </p>

            {esExito ? (
              <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-exito/40 bg-white px-4 py-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-exito text-white">
                  <CheckIcon className="h-3 w-3" />
                </span>
                <div>
                  <p className="text-[11.5px] font-semibold text-exito">Decisión registrada</p>
                  <p className="mt-1 text-[10.8px] leading-relaxed text-muted">
                    La solicitud fue {textoResultado}. El estado
                    se actualizó y se notificó al estudiante con el motivo registrado.
                  </p>
                </div>
              </div>
            ) : esError ? (
              <div
                id="error-motivo-revision"
                role="alert"
                className="mt-4 flex items-start gap-2.5 rounded-2xl border border-peligro/40 bg-white px-4 py-3"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-peligro text-white">
                  <CloseIcon className="h-3 w-3" />
                </span>
                <div>
                  <p className="text-[11.5px] font-semibold text-peligro">Motivo obligatorio</p>
                  <p className="mt-1 text-[10.8px] leading-relaxed text-muted">
                    Ingresa el motivo antes de confirmar. No se ha registrado ninguna decisión y la
                    solicitud continúa pendiente.
                  </p>
                </div>
              </div>
            ) : (
              <DetalleSolicitud solicitud={solicitud} />
            )}

            {(esExito || esError) && (
              <div className="mt-2">
                <Dato etiqueta="Estado">
                  {esExito && decision ? ETIQUETAS[decision] : 'Pendiente'}
                </Dato>
                <Dato etiqueta="Notificación">
                  {esExito ? 'Enviada al estudiante' : 'Sin enviar'}
                </Dato>
              </div>
            )}

            {!esExito && !esError && (
              <div className="mt-4 rounded-2xl bg-mist px-4 py-3">
                <p className="text-[11px] font-semibold text-tinta">Sobre la decisión</p>
                <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
                  Al aprobar o rechazar la solicitud, el estado se actualizará y el estudiante
                  recibirá una notificación con el motivo registrado.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </Modal>
  );
};

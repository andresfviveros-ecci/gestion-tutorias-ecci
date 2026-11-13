import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api/axios';
import { StudentRail } from '../../components/estudiante/StudentRail';
import { EmptyState } from '../../components/constelacion/EmptyState';
import { Modal } from '../../components/constelacion/Modal';
import { SkeletonFilas } from '../../components/constelacion/Skeleton';
import { Toast } from '../../components/constelacion/Toast';
import { CalendarIcon, ClockIcon } from '../../components/constelacion/Icons';
import type { BloqueDisponibilidad } from '../../types/tutor';
import { extraerLista, mensajeError } from '../../utils/api';
import { hoyLocalISO } from '../../utils/date';
import { diaYNumero, hora12, horaCorta } from '../../utils/fechas';

interface MateriaAPI {
  id: number;
  nombre: string;
}

/** Lo mínimo de /tutorias/recibidas/ para saber quién reservó cada bloque. */
interface ReservaRecibida {
  id: number;
  bloque: number;
  estado: string;
  estudiante_nombre?: string;
  tema?: string;
}

/**
 * RF-01: el estudiante tutor ve los horarios que publicó y puede suspenderlos.
 * Suspender es un DELETE con motivo: el backend cancela las reservas activas y
 * avisa por correo a cada estudiante.
 */
export const MisHorariosTutor = () => {
  const [cargando, setCargando] = useState(true);
  const [bloques, setBloques] = useState<BloqueDisponibilidad[]>([]);
  const [materias, setMaterias] = useState<MateriaAPI[]>([]);
  const [reservas, setReservas] = useState<ReservaRecibida[]>([]);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  // La pantalla de edición regresa aquí con el aviso de éxito en el estado de la navegación.
  const [toast, setToast] = useState<string | null>(
    () => (location.state as { toast?: string } | null)?.toast ?? null,
  );

  const [bloqueSuspender, setBloqueSuspender] = useState<BloqueDisponibilidad | null>(null);
  const [motivo, setMotivo] = useState('');
  const [suspendiendo, setSuspendiendo] = useState(false);
  const [errorSuspension, setErrorSuspension] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    const cargar = async () => {
      const [resBloques, resMaterias, resReservas] = await Promise.allSettled([
        api.get('/disponibilidad/disponibilidad/', { params: { docente: 'me' } }),
        api.get('/catalogo/materias/'),
        api.get('/tutorias/recibidas/'),
      ]);

      if (!activo) return;

      if (resBloques.status === 'fulfilled') {
        setBloques(extraerLista<BloqueDisponibilidad>(resBloques.value.data));
        setError(null);
      } else {
        setError(mensajeError(resBloques.reason));
      }

      if (resMaterias.status === 'fulfilled') {
        setMaterias(extraerLista<MateriaAPI>(resMaterias.value.data));
      }

      if (resReservas.status === 'fulfilled') {
        setReservas(extraerLista<ReservaRecibida>(resReservas.value.data));
      }

      setCargando(false);
    };

    void cargar();

    return () => {
      activo = false;
    };
  }, []);

  // Se limpia el estado para que el aviso no vuelva a salir al recargar.
  useEffect(() => {
    if ((location.state as { toast?: string } | null)?.toast) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!toast) return;
    const temporizador = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(temporizador);
  }, [toast]);

  // Reservas activas por bloque, para mostrar quién viene a cada horario.
  const reservasPorBloque = useMemo(() => {
    const mapa = new Map<number, ReservaRecibida[]>();
    reservas
      .filter((reserva) => ['RESERVADA', 'CONFIRMADA'].includes((reserva.estado || '').toUpperCase()))
      .forEach((reserva) => {
        mapa.set(reserva.bloque, [...(mapa.get(reserva.bloque) ?? []), reserva]);
      });
    return mapa;
  }, [reservas]);

  const materiasPorId = useMemo(
    () => new Map(materias.map((materia) => [materia.id, materia])),
    [materias],
  );

  const proximos = useMemo(() => {
    const hoy = hoyLocalISO();
    return bloques
      .filter(
        (bloque) =>
          bloque.fecha >= hoy && (bloque.estado || '').toUpperCase() !== 'CANCELADO',
      )
      .sort((a, b) =>
        `${a.fecha}T${horaCorta(a.hora_inicio)}`.localeCompare(
          `${b.fecha}T${horaCorta(b.hora_inicio)}`,
        ),
      );
  }, [bloques]);

  const abrirSuspension = (bloque: BloqueDisponibilidad) => {
    setMotivo('');
    setErrorSuspension(null);
    setBloqueSuspender(bloque);
  };

  const suspender = async () => {
    if (!bloqueSuspender) return;

    setSuspendiendo(true);
    setErrorSuspension(null);

    try {
      await api.delete(`/disponibilidad/${bloqueSuspender.id}/actualizar/`, {
        data: { motivo: motivo.trim() || 'Horario suspendido por el tutor' },
      });

      setBloques((previo) => previo.filter((bloque) => bloque.id !== bloqueSuspender.id));
      setToast(
        (bloqueSuspender.cupo_ocupado ?? 0) > 0
          ? 'Horario suspendido. Se avisó a los estudiantes que tenían reserva.'
          : 'Horario suspendido.',
      );
      setBloqueSuspender(null);
    } catch (err) {
      setErrorSuspension(mensajeError(err));
    } finally {
      setSuspendiendo(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-mist font-constelacion text-tinta">
      <StudentRail />

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1100px] px-5 py-6 pb-24 sm:px-7 md:pb-6 lg:px-8">
          <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11.5px] text-muted">Mi trabajo · Estudiante tutor</p>
              <h1 className="mt-1 text-[30px] font-medium leading-tight tracking-[-0.02em] text-tinta sm:text-[36px]">
                Mis horarios
              </h1>
              <p className="mt-1 max-w-[640px] text-[13px] leading-relaxed text-muted">
                Estos son los horarios que publicaste. Si tienes reservas activas, suspéndelos y
                publica uno nuevo: los estudiantes recibirán el aviso por correo.
              </p>
            </div>

            <Link
              to="/tutor/mi-disponibilidad"
              className="inline-flex h-11 items-center justify-center rounded-full bg-violeta-accion px-5 text-[12.5px] font-semibold text-white transition-colors hover:bg-violeta-profundo"
            >
              Publicar horario
            </Link>
          </header>

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-2xl border border-peligro/30 bg-peligro/5 px-4 py-3 text-peligro"
            >
              <p className="text-[12.5px] font-semibold">No pudimos cargar tus horarios</p>
              <p className="mt-1 text-[11.5px] leading-relaxed opacity-90">{error}</p>
            </div>
          )}

          {cargando ? (
            <SkeletonFilas alto="h-[104px]" filas={3} />
          ) : proximos.length === 0 ? (
            <section className="rounded-[28px] bg-white p-6 sm:p-7">
              <EmptyState
                titulo="No tienes horarios publicados"
                detalle="Publica tu disponibilidad para que los estudiantes puedan reservarte una tutoría."
              />
              <div className="mt-4 flex justify-center">
                <Link
                  to="/tutor/mi-disponibilidad"
                  className="inline-flex items-center gap-2 rounded-full bg-violeta-accion px-5 py-2.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-violeta-profundo"
                >
                  Publicar disponibilidad
                </Link>
              </div>
            </section>
          ) : (
            <div className="space-y-3">
              {proximos.map((bloque) => {
                const reservados = bloque.cupo_ocupado ?? 0;
                const materia = materiasPorId.get(bloque.materia);
                const esVirtual = (bloque.modalidad || '').toUpperCase() === 'VIRTUAL';

                return (
                  <article
                    key={bloque.id}
                    className="rounded-[24px] bg-white p-5 shadow-[0_1px_2px_rgba(28,26,30,0.04)] sm:p-6"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-mist">
                          <CalendarIcon className="h-5 w-5 text-slate-ink" />
                        </div>

                        <div className="min-w-0">
                          <h2 className="truncate text-[14px] font-semibold text-tinta">
                            {materia?.nombre || `Materia ${bloque.materia}`}
                          </h2>
                          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted">
                            <span className="inline-flex items-center gap-1.5">
                              <ClockIcon className="h-3.5 w-3.5" />
                              {diaYNumero(bloque.fecha)} · {hora12(horaCorta(bloque.hora_inicio))} –{' '}
                              {hora12(horaCorta(bloque.hora_fin))}
                            </span>
                            <span>{esVirtual ? 'Virtual' : 'Presencial'}</span>
                            <span>
                              {reservados} / {bloque.cupo_total}{' '}
                              {bloque.cupo_total === 1 ? 'cupo' : 'cupos'}
                            </span>
                          </p>

                          {reservados > 0 && (
                            <p className="mt-2 inline-flex rounded-full bg-advertencia/10 px-2.5 py-1 text-[10px] font-semibold text-advertencia">
                              {reservados === 1
                                ? '1 estudiante con reserva'
                                : `${reservados} estudiantes con reserva`}
                            </p>
                          )}
                          {(reservasPorBloque.get(bloque.id) ?? []).length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {(reservasPorBloque.get(bloque.id) ?? []).map((reserva) => (
                                <li key={reserva.id} className="text-[11px] text-slate-ink">
                                  <span className="font-semibold text-tinta">
                                    {reserva.estudiante_nombre || 'Estudiante'}
                                  </span>
                                  {reserva.tema ? ` · ${reserva.tema}` : ''}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {bloque.estado && (
                          <span className="rounded-full bg-mist px-3 py-1 text-[10px] font-semibold text-slate-ink">
                            {bloque.estado}
                          </span>
                        )}
                        <Link
                          to={`/tutor/mi-disponibilidad/${bloque.id}/editar`}
                          aria-label={`Editar el horario del ${diaYNumero(bloque.fecha)}`}
                          className="rounded-full border border-faint bg-white px-4 py-2 text-[11px] font-semibold text-tinta transition-colors hover:bg-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violeta-accion"
                        >
                          Editar
                        </Link>
                        <button
                          type="button"
                          onClick={() => abrirSuspension(bloque)}
                          className="rounded-full border border-peligro/40 px-4 py-2 text-[11px] font-semibold text-peligro transition-colors hover:bg-peligro/5"
                        >
                          Suspender
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {bloqueSuspender && (
        <Modal
          onCerrar={() => setBloqueSuspender(null)}
          tituloId="suspender-horario-estudiante"
          eyebrow="Mi horario · Suspender"
          eyebrowClassName="text-peligro"
          titulo="Suspender este horario"
          ancho="md"
          cerrable={!suspendiendo}
        >
          <div className="px-6 pb-6 pt-4 sm:px-7">
            <p className="text-[12.4px] leading-relaxed text-muted">
              {bloqueSuspender.cupo_ocupado > 0
                ? `Se cancelarán las ${bloqueSuspender.cupo_ocupado} ${
                    bloqueSuspender.cupo_ocupado === 1 ? 'reserva activa' : 'reservas activas'
                  } y se avisará por correo a cada estudiante.`
                : 'El horario dejará de estar visible para los estudiantes.'}{' '}
              Después podrás publicar uno nuevo cuando quieras.
            </p>

            <label
              htmlFor="motivo-suspension-estudiante"
              className="mt-4 block text-[11.9px] font-semibold text-tinta"
            >
              Motivo (opcional)
            </label>
            <textarea
              id="motivo-suspension-estudiante"
              rows={3}
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              placeholder="Ej.: Cambio de horario académico, parcial..."
              className="mt-1.5 w-full resize-none rounded-[14px] border border-faint bg-white px-3.5 py-3 text-[12.8px] text-tinta outline-none transition-colors placeholder:text-pebble focus:border-violeta focus:ring-2 focus:ring-violeta/15"
            />

            {errorSuspension && (
              <p
                role="alert"
                className="mt-4 rounded-2xl border border-peligro/40 bg-[#FDF1EF] px-4 py-3 text-[11.6px] leading-relaxed text-peligro"
              >
                {errorSuspension}
              </p>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setBloqueSuspender(null)}
                disabled={suspendiendo}
                className="h-11 rounded-full bg-mist px-5 text-[12.5px] font-semibold text-tinta transition-colors hover:bg-faint disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void suspender()}
                disabled={suspendiendo}
                className="h-11 rounded-full bg-peligro px-6 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {suspendiendo ? 'Suspendiendo...' : 'Sí, suspender horario'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <Toast mensaje={toast} />
    </div>
  );
};

export default MisHorariosTutor;

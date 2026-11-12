import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/axios';
import { StudentRail } from '../../components/estudiante/StudentRail';
import { RegistrarTutoriaModal } from '../../components/tutor/panel/RegistrarTutoriaModal';
import { EmptyState } from '../../components/constelacion/EmptyState';
import { SkeletonFilas } from '../../components/constelacion/Skeleton';
import { Toast } from '../../components/constelacion/Toast';
import type { TutoriaRecibida } from '../../types/tutor';
import { extraerLista, mensajeError } from '../../utils/api';
import { diaYNumero, hora12 } from '../../utils/fechas';

const ESTADOS: Record<string, string> = {
  RESERVADA: 'Reservada',
  CONFIRMADA: 'Confirmada',
  COMPLETADA: 'Completada',
  NO_ASISTIO: 'No asistió',
  CANCELADA_ESTUDIANTE: 'Cancelada por el estudiante',
  CANCELADA_DOCENTE: 'Cancelada por ti',
};

const textoEstado = (estado: string): string =>
  ESTADOS[(estado || '').toUpperCase()] || estado.toLowerCase().replace(/_/g, ' ');

/**
 * RF-01 / GT-227: el estudiante con una solicitud de tutor aprobada ve aquí las
 * tutorías que le reservaron y puede cerrarlas con las mismas acciones del
 * panel del tutor. El backend decide qué botones mostrar en `estados_siguientes`.
 */
export const MisTutoriasTutor = () => {
  const [cargando, setCargando] = useState(true);
  const [tutorias, setTutorias] = useState<TutoriaRecibida[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [tutoriaRegistrar, setTutoriaRegistrar] = useState<TutoriaRecibida | null>(null);

  const recargar = async () => {
    try {
      const { data } = await api.get('/tutorias/recibidas/');
      setTutorias(extraerLista<TutoriaRecibida>(data));
      setError(null);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    let activo = true;

    const cargar = async () => {
      try {
        const { data } = await api.get('/tutorias/recibidas/');
        if (!activo) return;
        setTutorias(extraerLista<TutoriaRecibida>(data));
        setError(null);
      } catch (err) {
        if (!activo) return;
        setError(mensajeError(err));
      } finally {
        if (activo) setCargando(false);
      }
    };

    void cargar();

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const temporizador = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(temporizador);
  }, [toast]);

  const ordenadas = useMemo(
    () =>
      [...tutorias].sort((a, b) => {
        const fechaA = a.bloque_detalle?.fecha || '';
        const fechaB = b.bloque_detalle?.fecha || '';
        return `${fechaB}T${b.bloque_detalle?.hora_inicio || ''}`.localeCompare(
          `${fechaA}T${a.bloque_detalle?.hora_inicio || ''}`,
        );
      }),
    [tutorias],
  );

  const alRegistrar = (mensaje: string) => {
    setTutoriaRegistrar(null);
    setToast(mensaje);
    setCargando(true);
    void recargar();
  };

  return (
    <div className="flex min-h-screen bg-mist font-constelacion text-tinta">
      <StudentRail />

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1100px] px-5 py-6 pb-24 sm:px-7 md:pb-6 lg:px-8">
          <header className="mb-6">
            <p className="text-[11.5px] text-muted">Mi trabajo · Estudiante tutor</p>
            <h1 className="mt-1 text-[30px] font-medium leading-tight tracking-[-0.02em] text-tinta sm:text-[36px]">
              Mis tutorías como tutor
            </h1>
            <p className="mt-1 max-w-[640px] text-[13px] leading-relaxed text-muted">
              Estas son las tutorías que reservaron en tus horarios. Confírmalas, márcalas como
              completadas o registra una inasistencia.
            </p>
          </header>

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-2xl border border-peligro/30 bg-peligro/5 px-4 py-3 text-peligro"
            >
              <p className="text-[12.5px] font-semibold">No pudimos cargar tus tutorías</p>
              <p className="mt-1 text-[11.5px] leading-relaxed opacity-90">{error}</p>
            </div>
          )}

          {cargando ? (
            <SkeletonFilas alto="h-[104px]" filas={3} />
          ) : ordenadas.length === 0 ? (
            <section className="rounded-[28px] bg-white p-6 sm:p-7">
              <EmptyState
                titulo="Todavía no tienes tutorías reservadas"
                detalle="Cuando un estudiante reserve uno de tus horarios aparecerá aquí."
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
              {ordenadas.map((tutoria) => {
                const bloque = tutoria.bloque_detalle;
                const acciones = tutoria.estados_siguientes ?? [];
                const activa = ['RESERVADA', 'CONFIRMADA'].includes(
                  (tutoria.estado || '').toUpperCase(),
                );

                return (
                  <article
                    key={tutoria.id}
                    className="rounded-[24px] bg-white p-5 shadow-[0_1px_2px_rgba(28,26,30,0.04)] sm:p-6"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-[14.5px] font-semibold text-tinta">
                            {tutoria.estudiante_nombre || 'Estudiante'}
                          </h2>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                              activa
                                ? 'bg-violet-wash/40 text-violeta-accion'
                                : 'bg-mist text-slate-ink'
                            }`}
                          >
                            {textoEstado(tutoria.estado)}
                          </span>
                        </div>

                        <p className="mt-1 text-[12px] text-muted">
                          {bloque?.materia?.nombre || tutoria.tema || 'Tutoría'}
                          {bloque?.fecha ? ` · ${diaYNumero(bloque.fecha)}` : ''}
                          {bloque?.hora_inicio && bloque?.hora_fin
                            ? ` · ${hora12(bloque.hora_inicio)} – ${hora12(bloque.hora_fin)}`
                            : ''}
                        </p>

                        {tutoria.descripcion && (
                          <p className="mt-2 line-clamp-2 text-[11.5px] leading-relaxed text-muted">
                            {tutoria.descripcion}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {bloque?.enlace_virtual && activa && (
                          <a
                            href={bloque.enlace_virtual}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-faint px-3.5 py-2 text-[11px] font-semibold text-slate-ink transition-colors hover:bg-mist"
                          >
                            Unirse
                          </a>
                        )}
                        {acciones.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setTutoriaRegistrar(tutoria)}
                            className="rounded-full bg-violeta-accion px-4 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-violeta-profundo"
                          >
                            Registrar tutoría
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {tutoriaRegistrar && (
        <RegistrarTutoriaModal
          tutoria={tutoriaRegistrar}
          onCerrar={() => setTutoriaRegistrar(null)}
          onGuardado={alRegistrar}
        />
      )}

      <Toast mensaje={toast} />
    </div>
  );
};

export default MisTutoriasTutor;

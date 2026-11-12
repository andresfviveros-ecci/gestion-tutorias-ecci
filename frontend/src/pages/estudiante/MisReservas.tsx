import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../../api/axios';
import { StudentRail } from '../../components/estudiante/StudentRail';
import { CalificarTutorModal } from '../../components/estudiante/CalificarTutorModal';
import { EmptyState } from '../../components/constelacion/EmptyState';
import { ClockIcon, VideoIcon } from '../../components/constelacion/Icons';
import { fechaLarga, hora12, horaCorta } from '../../utils/fechas';
import { hoyLocalISO } from '../../utils/date';

export interface TutoriaBackend {
  id: number | string;
  bloque?: number | string | { id?: number | string } | null;
  materia?: string | { nombre?: string };
  materia_nombre?: string;
  tutor_nombre?: string;
  docente_nombre?: string;
  docente?: { nombre?: string; first_name?: string; last_name?: string; email?: string } | string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  modalidad?: string;
  lugar?: string;
  enlace_virtual?: string;
  enlaceMeeting?: string;
  estado?: string;
  /** GT-226: el backend dice si ya se puede calificar y si ya hay evaluación. */
  puede_evaluar?: boolean;
  evaluacion?: { calificacion?: number; comentario?: string } | null;
  /** Lo que el estudiante escribió al reservar. */
  tema?: string;
  descripcion?: string | null;
  /** Lo que registró el tutor al completar la tutoría (GT-227). */
  notas_docente?: string | null;
  compromisos?: string | null;
  /** Quién canceló y por qué; null si no se canceló. */
  cancelacion?: {
    origen?: string;
    motivo?: string;
    cancelado_por?: string | null;
  } | null;
  /** El bloque viene anidado desde el backend, aunque ya no aparezca en la agenda. */
  bloque_detalle?: {
    fecha?: string;
    hora_inicio?: string;
    hora_fin?: string;
    modalidad?: string;
    lugar?: string;
    enlace_virtual?: string;
    materia?: { nombre?: string } | null;
  } | null;
}

const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const parseFechaBadge = (fechaStr: string) => {
  if (!fechaStr) return { mes: 'OCT', diaNum: '11', diaSem: 'Dom' };
  const partes = fechaStr.split('-');
  if (partes.length === 3) {
    const year = parseInt(partes[0], 10);
    const monthIdx = parseInt(partes[1], 10) - 1;
    const day = parseInt(partes[2], 10);
    const dateObj = new Date(year, monthIdx, day);

    return {
      mes: MESES[monthIdx] || 'OCT',
      diaNum: String(day),
      diaSem: DIAS_SEMANA[dateObj.getDay()] || 'Lun',
    };
  }
  return { mes: 'OCT', diaNum: '11', diaSem: 'Dom' };
};

const toArray = <T,>(data: unknown): T[] => {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && 'results' in data) {
    const results = (data as { results: unknown }).results;
    if (Array.isArray(results)) return results as T[];
  }
  return [];
};

const nombreMateria = (item: TutoriaBackend): string => {
  if (typeof item.materia === 'string') return item.materia;
  if (typeof item.materia === 'object' && item.materia !== null && item.materia.nombre) {
    return item.materia.nombre;
  }
  return item.materia_nombre || 'Asesoría académica';
};

const nombreTutor = (item: TutoriaBackend): string => {
  if (item.tutor_nombre) return item.tutor_nombre;
  if (item.docente_nombre) return item.docente_nombre;
  if (typeof item.docente === 'object' && item.docente !== null) {
    const full = `${item.docente.first_name || ''} ${item.docente.last_name || ''}`.trim();
    return full || item.docente.nombre || 'Docente tutor';
  }
  return 'Docente tutor';
};

const ESTADOS: Record<string, string> = {
  RESERVADA: 'Reservada',
  CONFIRMADA: 'Confirmada',
  COMPLETADA: 'Completada',
  NO_ASISTIO: 'No asistió',
  CANCELADA_ESTUDIANTE: 'Cancelada por ti',
  CANCELADA_DOCENTE: 'Cancelada por el tutor',
  ANULADA: 'Anulada',
};

const ESTADOS_HISTORIAL = ['COMPLETADA', 'NO_ASISTIO', 'CANCELADA_ESTUDIANTE', 'CANCELADA_DOCENTE', 'ANULADA'];

const textoEstado = (estado?: string): string => {
  const valor = (estado || 'CONFIRMADA').toUpperCase();
  return ESTADOS[valor] || valor.toLowerCase().replace(/_/g, ' ');
};

const esEstadoActivo = (estado?: string): boolean =>
  ['RESERVADA', 'CONFIRMADA'].includes((estado || 'RESERVADA').toUpperCase());

interface BloqueJoin {
  id: number | string;
  fecha?: string;
  hora_inicio?: string;
  hora_fin?: string;
  modalidad?: string;
  lugar?: string;
  enlace_virtual?: string;
  materia?: number | string | { id?: number | string; nombre?: string } | null;
}

interface MateriaJoin {
  id: number | string;
  nombre?: string;
}

interface TarjetaReservaProps {
  item: TutoriaBackend;
  hoy: boolean;
  onCalificar?: () => void;
}

const TarjetaReserva: React.FC<TarjetaReservaProps> = ({ item, hoy, onCalificar }) => {
  const badge = parseFechaBadge(item.fecha);
  const esVirtual = item.modalidad?.toLowerCase() === 'virtual';
  const enlace = item.enlace_virtual || item.enlaceMeeting;

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-4 rounded-2xl border border-faint p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
      <div className="flex min-w-0 items-center gap-4">
        <div
          className={`flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-2xl ${
            hoy ? 'bg-violeta-accion text-white' : 'bg-mist text-tinta'
          }`}
        >
          <span
            className={`text-[9px] font-bold uppercase tracking-[0.12em] ${
              hoy ? 'text-white/70' : 'text-muted'
            }`}
          >
            {badge.mes}
          </span>
          <span className="my-0.5 text-xl font-semibold leading-none">{badge.diaNum}</span>
          <span className={`text-[9px] font-medium ${hoy ? 'text-white/70' : 'text-muted'}`}>
            {badge.diaSem}
          </span>
        </div>

        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-[14px] font-semibold text-tinta">
              {nombreMateria(item)}
            </h3>
            {hoy && (
              <span className="rounded-full bg-advertencia/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-advertencia">
                Hoy
              </span>
            )}
          </div>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <ClockIcon className="h-3.5 w-3.5" />
              {hora12(horaCorta(item.hora_inicio))} - {hora12(horaCorta(item.hora_fin))}
            </span>
            <span>
              Tutor: <strong className="font-semibold text-slate-ink">{nombreTutor(item)}</strong>
            </span>
          </p>
          {item.tema && (
            <p className="text-[11.5px] text-muted">
              Tema: <span className="text-tinta">{item.tema}</span>
            </p>
          )}
          {(item.estado || '').toUpperCase() === 'COMPLETADA' &&
            (item.notas_docente || item.compromisos) && (
              <div className="mt-1.5 space-y-1 rounded-xl bg-mist px-3 py-2 text-[11px] leading-relaxed text-slate-ink">
                {item.notas_docente && (
                  <p>
                    <span className="font-semibold">Notas del tutor:</span> {item.notas_docente}
                  </p>
                )}
                {item.compromisos && (
                  <p>
                    <span className="font-semibold">Compromisos:</span> {item.compromisos}
                  </p>
                )}
              </div>
            )}
          {item.cancelacion?.motivo && (
            <p className="mt-1.5 rounded-xl bg-peligro/[0.06] px-3 py-2 text-[11px] leading-relaxed text-peligro">
              <span className="font-semibold">
                {item.cancelacion.origen === 'ESTUDIANTE'
                  ? 'Cancelaste:'
                  : item.cancelacion.cancelado_por
                    ? `Canceló ${item.cancelacion.cancelado_por}:`
                    : 'Motivo:'}
              </span>{' '}
              {item.cancelacion.motivo}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-faint pt-3 sm:items-end sm:border-t-0 sm:pt-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-faint px-3 py-1 text-[10px] font-semibold text-slate-ink">
            {item.modalidad || 'Virtual'}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
              esEstadoActivo(item.estado)
                ? 'bg-exito/10 text-exito'
                : 'bg-mist text-slate-ink'
            }`}
          >
            {textoEstado(item.estado)}
          </span>
        </div>

        {item.puede_evaluar && onCalificar && (
          <button
            type="button"
            onClick={onCalificar}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-violeta-accion px-4 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-violeta-profundo"
          >
            Calificar al tutor
          </button>
        )}

        {!item.puede_evaluar && item.evaluacion?.calificacion != null && (
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-ink">
            <span aria-hidden="true" className="text-advertencia">
              ★
            </span>
            Tu calificación: {item.evaluacion.calificacion}
          </p>
        )}

        {esVirtual ? (
          enlace ? (
            <a
              href={enlace}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-violeta-accion hover:underline"
            >
              <VideoIcon className="h-3.5 w-3.5" />
              Unirse a la reunión
            </a>
          ) : (
            <span className="text-[11px] italic text-muted">Enlace de reunión pendiente</span>
          )
        ) : (
          <span className="text-[11px] text-muted">
            {item.lugar || 'Ubicación asignada en campus'}
          </span>
        )}
      </div>
    </motion.article>
  );
};

export const MisReservas: React.FC = () => {
  const [tutorias, setTutorias] = useState<TutoriaBackend[]>([]);
  const [loading, setLoading] = useState(true);
  // GT-226: tutoría que se está calificando.
  const [tutoriaCalificar, setTutoriaCalificar] = useState<TutoriaBackend | null>(null);
  const [version, setVersion] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);

  // Cargar reservas del backend
  useEffect(() => {
    let isMounted = true;

    const fetchReservas = async () => {
      try {
        // La tutoria solo guarda el id del bloque (BE-22 pendiente), asi que
        // se cruzan los datos en el cliente mientras el backend los anida.
        const [tutoriasRes, bloquesRes, materiasRes] = await Promise.all([
          api.get<unknown>('/tutorias/tutorias/'),
          api.get<unknown>('/disponibilidad/disponibilidad/?incluir_pasados=1').catch(() => null),
          api.get<unknown>('/catalogo/materias/').catch(() => null),
        ]);

        const dataArray = toArray<TutoriaBackend>(tutoriasRes.data);
        const bloques = bloquesRes ? toArray<BloqueJoin>(bloquesRes.data) : [];
        const materias = materiasRes ? toArray<MateriaJoin>(materiasRes.data) : [];

        const bloquesPorId = new Map<string, BloqueJoin>();
        bloques.forEach((b) => bloquesPorId.set(String(b.id), b));

        const materiasPorId = new Map<string, string>();
        materias.forEach((m) => {
          if (m.nombre) materiasPorId.set(String(m.id), m.nombre);
        });

        const reservasCompletas = dataArray.map((tutoria) => {
          const bloqueId =
            typeof tutoria.bloque === 'object' && tutoria.bloque !== null
              ? tutoria.bloque.id
              : tutoria.bloque;
          const anidado = tutoria.bloque_detalle;
          const bloque =
            (bloqueId !== undefined ? bloquesPorId.get(String(bloqueId)) : undefined) ??
            (anidado
              ? ({ id: bloqueId ?? '', ...anidado, materia: anidado.materia ?? null } as BloqueJoin)
              : undefined);

          if (!bloque) return tutoria;

          const materiaId =
            typeof bloque.materia === 'object' && bloque.materia !== null
              ? bloque.materia.id
              : bloque.materia;
          const materiaNombre =
            typeof bloque.materia === 'object' && bloque.materia !== null
              ? bloque.materia.nombre
              : materiaId !== undefined
                ? materiasPorId.get(String(materiaId))
                : undefined;

          return {
            ...tutoria,
            fecha: bloque.fecha || tutoria.fecha || '',
            hora_inicio: bloque.hora_inicio || tutoria.hora_inicio || '',
            hora_fin: bloque.hora_fin || tutoria.hora_fin || '',
            modalidad: bloque.modalidad || tutoria.modalidad,
            lugar: bloque.lugar || tutoria.lugar,
            enlace_virtual: bloque.enlace_virtual || tutoria.enlace_virtual,
            materia_nombre: materiaNombre,
            tutor_nombre: typeof tutoria.docente === 'string' ? tutoria.docente : tutoria.tutor_nombre,
          };
        });

        if (isMounted) {
          setTutorias(reservasCompletas);
        }
      } catch (error) {
        console.error('Error al cargar mis reservas:', error);
        if (isMounted) setTutorias([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchReservas();

    return () => {
      isMounted = false;
    };
  }, [version]);

  const hoyISO = useMemo(() => hoyLocalISO(), []);

  const { tutoriasHoy, tutoriasProximas } = useMemo(() => {
    const hoy: TutoriaBackend[] = [];
    const proximas: TutoriaBackend[] = [];

    tutorias.forEach((t) => {
      // Solo las activas: canceladas, anuladas, completadas y no asistidas van al historial.
      const estado = (t.estado || 'RESERVADA').toUpperCase();
      if (!['RESERVADA', 'CONFIRMADA'].includes(estado)) return;

      if (t.fecha === hoyISO) {
        hoy.push(t);
      } else if (t.fecha > hoyISO) {
        proximas.push(t);
      }
    });

    proximas.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora_inicio.localeCompare(b.hora_inicio));

    return { tutoriasHoy: hoy, tutoriasProximas: proximas };
  }, [tutorias, hoyISO]);

  const totalProgramadas = tutoriasHoy.length + tutoriasProximas.length;

  // GT-226: el backend marca puede_evaluar solo si está completada y sin nota.
  const porCalificar = useMemo(
    () =>
      tutorias
        .filter((tutoria) => Boolean(tutoria.puede_evaluar))
        .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')),
    [tutorias],
  );

  const historial = useMemo(
    () =>
      tutorias
        .filter((tutoria) => {
          const estado = (tutoria.estado || '').toUpperCase();
          return ESTADOS_HISTORIAL.includes(estado) && !tutoria.puede_evaluar;
        })
        .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')),
    [tutorias],
  );

  const hayContenido = totalProgramadas > 0 || porCalificar.length > 0 || historial.length > 0;

  const calificar = (item: TutoriaBackend) => {
    setTutoriaCalificar(item);
  };

  const alCalificar = (calificacion: number) => {
    setTutoriaCalificar(null);
    setAviso(`Gracias, tu calificación de ${calificacion} quedó registrada.`);
    setVersion((valor) => valor + 1);
  };

  return (
    <div className="flex min-h-screen bg-mist font-constelacion text-tinta">
      <StudentRail />

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1200px] p-5 pb-24 sm:p-6 md:pb-6 lg:p-8">
          <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11.5px] text-muted">Mi trabajo · Estudiante</p>
              <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-[-0.02em] text-tinta sm:text-[34px]">
                Mis reservas
              </h1>
              <p className="mt-1 max-w-[620px] text-[12.5px] leading-relaxed text-muted">
                Consulta las fechas, horarios y el estado de las tutorías en las que estás inscrito.
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <span className="text-[11px] text-muted">{fechaLarga(new Date())}</span>
              <Link
                to="/estudiante/buscar-tutorias"
                className="inline-flex items-center gap-2 rounded-full border border-faint bg-white px-4 py-2.5 text-[11.5px] font-semibold text-tinta transition-colors hover:bg-mist"
              >
                Reservar una tutoría
              </Link>
            </div>
          </header>

          <div className="mb-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-faint bg-white px-4 py-2 text-[11.5px] font-semibold text-slate-ink">
              <ClockIcon className="h-4 w-4 text-violeta-accion" />
              {totalProgramadas}{' '}
              {totalProgramadas === 1 ? 'tutoría programada' : 'tutorías programadas'}
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, indice) => (
                <div
                  key={indice}
                  className="h-[104px] animate-pulse rounded-2xl border border-faint bg-white"
                />
              ))}
            </div>
          ) : !hayContenido ? (
            <section className="rounded-[28px] bg-white p-6 shadow-[0_1px_2px_rgba(28,26,30,0.04)] sm:p-7">
              <EmptyState
                titulo="No tienes tutorías programadas"
                detalle="Consulta los horarios disponibles y reserva una nueva asesoría."
              />
              <div className="mt-4 flex justify-center">
                <Link
                  to="/estudiante/buscar-tutorias"
                  className="inline-flex items-center gap-2 rounded-full bg-violeta-accion px-5 py-2.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-violeta-profundo"
                >
                  Ver horarios disponibles
                </Link>
              </div>
            </section>
          ) : (
            <div className="space-y-6">
              {tutoriasHoy.length > 0 && (
                <section className="rounded-[28px] bg-white p-6 shadow-[0_1px_2px_rgba(28,26,30,0.04)] sm:p-7">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-tinta">
                      Hoy
                    </h2>
                    <span className="rounded-full bg-advertencia/10 px-3 py-1 text-[10px] font-semibold text-advertencia">
                      {tutoriasHoy.length}{' '}
                      {tutoriasHoy.length === 1 ? 'tutoría' : 'tutorías'}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {tutoriasHoy.map((item) => (
                      <TarjetaReserva key={item.id} item={item} hoy />
                    ))}
                  </div>
                </section>
              )}

              {tutoriasProximas.length > 0 && (
                <section className="rounded-[28px] bg-white p-6 shadow-[0_1px_2px_rgba(28,26,30,0.04)] sm:p-7">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-tinta">
                      Próximas
                    </h2>
                    <span className="rounded-full bg-mist px-3 py-1 text-[10px] font-semibold text-slate-ink">
                      {tutoriasProximas.length}{' '}
                      {tutoriasProximas.length === 1 ? 'tutoría' : 'tutorías'}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {tutoriasProximas.map((item) => (
                      <TarjetaReserva key={item.id} item={item} hoy={false} />
                    ))}
                  </div>
                </section>
              )}

              {porCalificar.length > 0 && (
                <section className="rounded-[28px] bg-white p-6 shadow-[0_1px_2px_rgba(28,26,30,0.04)] sm:p-7">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-tinta">
                        Por calificar
                      </h2>
                      <p className="mt-0.5 text-[11.5px] text-muted">
                        Cuéntanos cómo fue la tutoría para mejorar el acompañamiento.
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-violet-wash/40 px-3 py-1 text-[10px] font-semibold text-violeta-accion">
                      {porCalificar.length}{' '}
                      {porCalificar.length === 1 ? 'pendiente' : 'pendientes'}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {porCalificar.map((item) => (
                      <TarjetaReserva
                        key={item.id}
                        item={item}
                        hoy={false}
                        onCalificar={() => calificar(item)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {historial.length > 0 && (
                <section className="rounded-[28px] bg-white p-6 shadow-[0_1px_2px_rgba(28,26,30,0.04)] sm:p-7">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-tinta">
                      Historial
                    </h2>
                    <span className="rounded-full bg-mist px-3 py-1 text-[10px] font-semibold text-slate-ink">
                      {historial.length}{' '}
                      {historial.length === 1 ? 'tutoría' : 'tutorías'}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {historial.map((item) => (
                      <TarjetaReserva key={item.id} item={item} hoy={false} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          <p className="pt-5 text-[11px] text-muted">
            Solo se muestran las tutorías activas, reservadas o confirmadas.
          </p>
        </div>
      </main>

      {tutoriaCalificar && (
        <CalificarTutorModal
          tutoriaId={Number(tutoriaCalificar.id)}
          materia={nombreMateria(tutoriaCalificar)}
          tutor={nombreTutor(tutoriaCalificar)}
          fechaTexto={fechaLarga(new Date(`${tutoriaCalificar.fecha}T00:00:00`))}
          onCerrar={() => setTutoriaCalificar(null)}
          onGuardado={alCalificar}
        />
      )}

      {aviso && (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 rounded-2xl bg-tinta px-4 py-3 text-center text-[12px] font-medium text-white shadow-lg"
        >
          {aviso}
        </div>
      )}
    </div>
  );
};

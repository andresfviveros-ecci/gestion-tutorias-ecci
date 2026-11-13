import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../../api/axios';
import { StudentRail } from '../../components/estudiante/StudentRail';
import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  InfoIcon,
} from '../../components/constelacion/Icons';
import { EmptyState } from '../../components/constelacion/EmptyState';
import { extraerLista, mensajeError } from '../../utils/api';
import {
  CONFIGURACION_POR_DEFECTO,
  ahoraMs,
  consultarConfiguracion,
  dentroDelPlazo,
  textoAnticipacion,
  type ConfiguracionTutorias,
} from '../../utils/configuracion';
import { hoyLocalISO } from '../../utils/date';
import {
  capitalizar,
  diaSemanaCorto,
  duracionLegible,
  fechaLarga,
  hora12,
  horaActual,
  horaCorta,
  parseFecha,
} from '../../utils/fechas';
import { modalidadLegible } from '../../utils/panel';

interface BloqueAPI {
  id: number;
  docente: number | { id?: number };
  /** Lo envía el backend desde #51; incluye a los estudiantes tutores. */
  docente_nombre?: string | null;
  materia: number | { id?: number; nombre?: string; codigo?: string };
  materia_nombre?: string | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  modalidad: string;
  lugar?: string | null;
  enlace_virtual?: string | null;
  cupo_total: number;
  cupo_ocupado: number;
  estado: string;
}

interface MateriaAPI {
  id: number;
  nombre: string;
  codigo?: string;
  activa?: boolean;
}

interface TutorAPI {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
}

interface TutoriaAPI {
  id: number | string;
  bloque?: number | string | { id?: number | string } | null;
  estado?: string;
}

const ESTADOS_ACTIVOS = ['RESERVADA', 'CONFIRMADA'];

/** Extrae un id numérico de un PK o de un objeto anidado. */
const idReferencia = (valor: unknown): number | null => {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor;
  if (typeof valor === 'string' && valor.trim() !== '') {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : null;
  }
  if (valor && typeof valor === 'object') {
    const id = (valor as { id?: unknown }).id;
    if (typeof id === 'number' && Number.isFinite(id)) return id;
    if (typeof id === 'string' && id.trim() !== '') {
      const numero = Number(id);
      return Number.isFinite(numero) ? numero : null;
    }
  }
  return null;
};

const minutosEntre = (inicio?: string, fin?: string): number => {
  if (!inicio || !fin) return 0;
  const [h1, m1] = inicio.split(':').map(Number);
  const [h2, m2] = fin.split(':').map(Number);
  if ([h1, m1, h2, m2].some((valor) => Number.isNaN(valor))) return 0;
  return Math.max(h2 * 60 + m2 - (h1 * 60 + m1), 0);
};

const nombreDeTutor = (tutor?: TutorAPI): string => {
  if (!tutor) return 'Docente por confirmar';
  const completo = `${tutor.first_name || ''} ${tutor.last_name || ''}`.trim();
  return completo || tutor.username || tutor.email || 'Docente por confirmar';
};

const iniciales = (nombre: string): string => {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return 'T';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
};

/** 'Jueves 29 de octubre de 2026' */
const fechaCompleta = (iso: string): string => {
  const fecha = parseFecha(iso);
  return `${fechaLarga(fecha)} de ${fecha.getFullYear()}`;
};

/** 'Jueves 29 de octubre', sin año, para el resumen lateral. */
const fechaResumen = (iso: string): string => {
  const fecha = parseFecha(iso);
  const mes = fecha.toLocaleDateString('es-ES', { month: 'long' }).replace('.', '');
  return `${capitalizar(diaSemanaCorto(iso).toLowerCase())} ${fecha.getDate()} de ${mes}`;
};

interface FilaResumenProps {
  icono: ReactNode;
  titulo: string;
  detalle: string;
}

/** Icono local para no acoplar este PR con los iconos del panel. */
const TutorIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
    <circle cx="8" cy="5.2" r="2.7" stroke="currentColor" strokeWidth="1.3" />
    <path
      d="M2.8 13.4c.5-2.4 2.5-3.9 5.2-3.9s4.7 1.5 5.2 3.9"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
);

const FilaResumen = ({ icono, titulo, detalle }: FilaResumenProps) => (
  <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mist text-slate-ink">
      {icono}
    </span>
    <div className="min-w-0">
      <p className="text-[11.5px] font-semibold text-tinta">{titulo}</p>
      <p className="mt-0.5 truncate text-[11px] text-muted">{detalle}</p>
    </div>
  </div>
);

interface DatosPanel {
  bloques: BloqueAPI[];
  materias: MateriaAPI[];
  tutores: TutorAPI[];
  tutorias: TutoriaAPI[];
  config: ConfiguracionTutorias;
  fallo: boolean;
}

const consultarPanel = async (): Promise<DatosPanel> => {
  const [resBloques, resMaterias, resTutores, resTutorias, config] = await Promise.allSettled([
    api.get('/disponibilidad/disponibilidad/?estado=DISPONIBLE'),
    api.get('/catalogo/materias/'),
    api.get('/accounts/tutores/'),
    api.get('/tutorias/tutorias/'),
    consultarConfiguracion(),
  ]);

  return {
    bloques: resBloques.status === 'fulfilled' ? extraerLista<BloqueAPI>(resBloques.value.data) : [],
    materias: resMaterias.status === 'fulfilled' ? extraerLista<MateriaAPI>(resMaterias.value.data) : [],
    tutores: resTutores.status === 'fulfilled' ? extraerLista<TutorAPI>(resTutores.value.data) : [],
    tutorias: resTutorias.status === 'fulfilled' ? extraerLista<TutoriaAPI>(resTutorias.value.data) : [],
    config: config.status === 'fulfilled' ? config.value : CONFIGURACION_POR_DEFECTO,
    fallo: resBloques.status === 'rejected',
  };
};

/**
 * Reserva de tutoría con el sistema visual Constelación.
 * Reemplaza la vista anterior de "Consultar horarios".
 */
export const BuscarTutorias = () => {
  // "Ver disponibilidad" desde la página de inicio llega con el tutor elegido.
  const location = useLocation();
  const tutorPedido = ((location.state as { tutorNombre?: string } | null)?.tutorNombre || '')
    .trim()
    .toLowerCase();

  const [bloques, setBloques] = useState<BloqueAPI[]>([]);
  const [materias, setMaterias] = useState<MateriaAPI[]>([]);
  const [tutores, setTutores] = useState<TutorAPI[]>([]);
  const [misTutorias, setMisTutorias] = useState<TutoriaAPI[]>([]);
  const [config, setConfig] = useState<ConfiguracionTutorias>(CONFIGURACION_POR_DEFECTO);

  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [errorReserva, setErrorReserva] = useState<string | null>(null);
  const [reservando, setReservando] = useState(false);

  const [materiaId, setMateriaId] = useState<number | null>(null);
  const [modalidad, setModalidad] = useState('');
  const [fecha, setFecha] = useState('');
  const [bloqueId, setBloqueId] = useState<number | null>(null);
  const [tema, setTema] = useState('');

  const [confirmada, setConfirmada] = useState<BloqueAPI | null>(null);

  const hoy = hoyLocalISO();
  const plazoReserva = config.horas_anticipacion_reservar;

  const aplicarDatos = useCallback((datos: DatosPanel) => {
    setBloques(datos.bloques);
    setMaterias(datos.materias);
    setTutores(datos.tutores);
    setMisTutorias(datos.tutorias);
    setConfig(datos.config);
    setErrorCarga(
      datos.fallo ? 'No pudimos cargar los horarios disponibles. Intenta de nuevo en un momento.' : null,
    );
    setCargando(false);
  }, []);

  const recargar = useCallback(async () => {
    const datos = await consultarPanel();
    aplicarDatos(datos);
  }, [aplicarDatos]);

  useEffect(() => {
    let activo = true;

    const ejecutar = async () => {
      const datos = await consultarPanel();
      if (!activo) return;
      aplicarDatos(datos);
    };

    void ejecutar();

    return () => {
      activo = false;
    };
  }, [aplicarDatos]);

  const materiasPorId = useMemo(() => {
    const mapa = new Map<number, MateriaAPI>();
    materias.forEach((materia) => mapa.set(materia.id, materia));
    return mapa;
  }, [materias]);

  const tutoresPorId = useMemo(() => {
    const mapa = new Map<number, TutorAPI>();
    tutores.forEach((tutor) => mapa.set(tutor.id, tutor));
    return mapa;
  }, [tutores]);

  const idsReservados = useMemo(() => {
    const ids = new Set<number>();
    misTutorias.forEach((tutoria) => {
      const estado = (tutoria.estado || '').toUpperCase();
      if (estado && !ESTADOS_ACTIVOS.includes(estado)) return;
      const id = idReferencia(tutoria.bloque);
      if (id !== null) ids.add(id);
    });
    return ids;
  }, [misTutorias]);

  const nombreMateria = useCallback(
    (bloque: BloqueAPI): string => {
      if (bloque.materia_nombre) return bloque.materia_nombre;
      const id = idReferencia(bloque.materia);
      return (id !== null ? materiasPorId.get(id)?.nombre : undefined) || 'Tutoría académica';
    },
    [materiasPorId],
  );

  const tutorDeBloque = useCallback(
    (bloque: BloqueAPI): string => {
      if (bloque.docente_nombre) return bloque.docente_nombre;
      const id = idReferencia(bloque.docente);
      return nombreDeTutor(id !== null ? tutoresPorId.get(id) : undefined);
    },
    [tutoresPorId],
  );

  /** Bloque que sigue abierto: futuro, con cupo y sin reserva propia. */
  const bloqueVigente = useCallback(
    (bloque: BloqueAPI): boolean => {
      if ((bloque.estado || '').toUpperCase() !== 'DISPONIBLE') return false;
      if (!bloque.fecha || bloque.fecha < hoy) return false;
      if ((bloque.cupo_ocupado || 0) >= (bloque.cupo_total || 1)) return false;
      if (idsReservados.has(bloque.id)) return false;
      // Un bloque que ya empezó no se puede reservar (el backend lo rechaza).
      if (bloque.fecha === hoy && horaCorta(bloque.hora_inicio) <= horaActual()) return false;
      return true;
    },
    [hoy, idsReservados],
  );

  const disponibles = useMemo(() => {
    const ahora = ahoraMs();

    return bloques
      .filter(
        (bloque) =>
          bloqueVigente(bloque) &&
          dentroDelPlazo(bloque.fecha, bloque.hora_inicio, plazoReserva, ahora),
      )
      .sort((a, b) => `${a.fecha}T${a.hora_inicio}`.localeCompare(`${b.fecha}T${b.hora_inicio}`));
  }, [bloques, bloqueVigente, plazoReserva]);

  /** Horarios abiertos que ya quedaron fuera del plazo mínimo de reserva. */
  const bloqueadosPorPlazo = useMemo(() => {
    const ahora = ahoraMs();

    return bloques
      .filter(
        (bloque) =>
          bloqueVigente(bloque) &&
          !dentroDelPlazo(bloque.fecha, bloque.hora_inicio, plazoReserva, ahora),
      )
      .sort((a, b) => `${a.fecha}T${a.hora_inicio}`.localeCompare(`${b.fecha}T${b.hora_inicio}`));
  }, [bloques, bloqueVigente, plazoReserva]);

  // Primer horario del tutor pedido desde inicio: fija materia, modalidad,
  // fecha y horario mientras el estudiante no elija otra cosa.
  const bloquePreferido = useMemo(() => {
    if (!tutorPedido) return null;
    return disponibles.find((bloque) => tutorDeBloque(bloque).trim().toLowerCase() === tutorPedido) ?? null;
  }, [disponibles, tutorDeBloque, tutorPedido]);

  const opcionesMateria = useMemo(() => {
    const ids = new Set<number>();
    disponibles.forEach((bloque) => {
      const id = idReferencia(bloque.materia);
      if (id !== null) ids.add(id);
    });
    return Array.from(ids)
      .map((id) => {
        const bloque = disponibles.find((b) => idReferencia(b.materia) === id);
        return { id, nombre: (bloque && bloque.materia_nombre) || materiasPorId.get(id)?.nombre || `Materia ${id}` };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [disponibles, materiasPorId]);

  const materiaActiva = useMemo(() => {
    if (materiaId !== null && opcionesMateria.some((opcion) => opcion.id === materiaId)) {
      return materiaId;
    }
    const preferida = bloquePreferido ? idReferencia(bloquePreferido.materia) : null;
    if (preferida !== null) return preferida;
    return opcionesMateria[0]?.id ?? null;
  }, [materiaId, opcionesMateria, bloquePreferido]);

  const opcionesModalidad = useMemo(() => {
    const valores = new Set<string>();
    disponibles.forEach((bloque) => {
      if (idReferencia(bloque.materia) !== materiaActiva) return;
      const valor = (bloque.modalidad || '').toUpperCase();
      if (valor) valores.add(valor);
    });
    return Array.from(valores).sort();
  }, [disponibles, materiaActiva]);

  const modalidadActiva = useMemo(() => {
    if (modalidad && opcionesModalidad.includes(modalidad.toUpperCase())) {
      return modalidad.toUpperCase();
    }
    const preferida = (bloquePreferido?.modalidad || '').toUpperCase();
    if (preferida && opcionesModalidad.includes(preferida)) return preferida;
    return opcionesModalidad[0] ?? '';
  }, [modalidad, opcionesModalidad, bloquePreferido]);

  const opcionesFecha = useMemo(() => {
    const valores = new Set<string>();
    disponibles.forEach((bloque) => {
      if (idReferencia(bloque.materia) !== materiaActiva) return;
      if ((bloque.modalidad || '').toUpperCase() !== modalidadActiva) return;
      if (bloque.fecha) valores.add(bloque.fecha);
    });
    return Array.from(valores).sort();
  }, [disponibles, materiaActiva, modalidadActiva]);

  const fechaActiva = useMemo(() => {
    if (fecha && opcionesFecha.includes(fecha)) return fecha;
    if (bloquePreferido && opcionesFecha.includes(bloquePreferido.fecha)) return bloquePreferido.fecha;
    return opcionesFecha[0] ?? '';
  }, [fecha, opcionesFecha, bloquePreferido]);

  const bloquesDelDia = useMemo(
    () =>
      disponibles.filter(
        (bloque) =>
          idReferencia(bloque.materia) === materiaActiva &&
          (bloque.modalidad || '').toUpperCase() === modalidadActiva &&
          bloque.fecha === fechaActiva,
      ),
    [disponibles, materiaActiva, modalidadActiva, fechaActiva],
  );

  const bloqueSeleccionado = useMemo(
    () =>
      bloquesDelDia.find((bloque) => bloque.id === bloqueId) ??
      bloquesDelDia.find((bloque) => bloque.id === bloquePreferido?.id) ??
      bloquesDelDia[0] ??
      null,
    [bloquesDelDia, bloqueId, bloquePreferido],
  );

  const confirmar = async (evento: FormEvent) => {
    evento.preventDefault();
    if (reservando) return;
    setErrorReserva(null);

    if (!bloqueSeleccionado) {
      setErrorReserva('Selecciona un horario disponible para continuar.');
      return;
    }

    if (
      !dentroDelPlazo(bloqueSeleccionado.fecha, bloqueSeleccionado.hora_inicio, plazoReserva)
    ) {
      setErrorReserva(
        `Este horario ya quedó fuera del plazo de reserva: las reservas se aceptan ${textoAnticipacion(
          plazoReserva,
        )}. Elige otro horario.`,
      );
      return;
    }

    const textoTema = tema.trim();
    if (!textoTema) {
      setErrorReserva('Escribe el tema de tu consulta.');
      return;
    }

    setReservando(true);
    try {
      await api.post('/tutorias/tutorias/', {
        bloque_id: bloqueSeleccionado.id,
        tema: textoTema,
        descripcion: '',
      });
      setConfirmada(bloqueSeleccionado);
      setTema('');
      await recargar();
    } catch (error) {
      setErrorReserva(mensajeError(error));
    } finally {
      setReservando(false);
    }
  };

  const nuevaReserva = () => {
    setConfirmada(null);
    setErrorReserva(null);
  };

  const tutorNombre = bloqueSeleccionado ? tutorDeBloque(bloqueSeleccionado) : 'Docente por confirmar';
  const materiaNombre = bloqueSeleccionado ? nombreMateria(bloqueSeleccionado) : 'Tutoría académica';
  const horaFin = horaCorta(bloqueSeleccionado?.hora_fin);
  const duracion = duracionLegible(
    minutosEntre(bloqueSeleccionado?.hora_inicio, bloqueSeleccionado?.hora_fin),
  );

  const tutorConfirmado = confirmada ? tutorDeBloque(confirmada) : '';
  const materiaConfirmada = confirmada ? nombreMateria(confirmada) : '';
  const modalidadConfirmada = confirmada ? modalidadLegible(confirmada.modalidad) : '';
  const inicioConfirmado = horaCorta(confirmada?.hora_inicio);
  const finConfirmado = horaCorta(confirmada?.hora_fin);

  // En la confirmación, el resumen debe seguir mostrando la reserva ya hecha.
  const bloqueResumen = confirmada ?? bloqueSeleccionado;
  const resumenTutor = bloqueResumen ? tutorDeBloque(bloqueResumen) : 'Sin horario seleccionado';
  const resumenFechaHora = bloqueResumen
    ? `${fechaResumen(bloqueResumen.fecha)} · ${hora12(horaCorta(bloqueResumen.hora_inicio))}`
    : 'Sin horario seleccionado';
  const resumenArea = bloqueResumen
    ? `${nombreMateria(bloqueResumen)} · ${modalidadLegible(bloqueResumen.modalidad)}`
    : 'Sin horario seleccionado';

  return (
    <div className="flex min-h-screen bg-mist font-constelacion text-tinta">
      <StudentRail />

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1500px] p-5 pb-24 sm:p-6 md:pb-6 lg:p-8">
          <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11.5px] text-muted">Mi trabajo · Estudiante</p>
              <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-[-0.02em] text-tinta sm:text-[34px]">
                {confirmada ? 'Reserva confirmada' : 'Reservar una tutoría'}
              </h1>
              <p className="mt-1 max-w-[620px] text-[12.5px] leading-relaxed text-muted">
                {confirmada
                  ? 'Tu tutoría quedó registrada. Revisa los detalles de la sesión programada.'
                  : 'Elige un horario disponible y reserva tu tutoría para recibir apoyo académico cuando lo necesites.'}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <span className="text-[11px] text-muted">
                Hoy, {fechaLarga(new Date()).replace(',', '').toLowerCase()}
              </span>
              <Link
                to="/estudiante/mis-reservas"
                className="inline-flex items-center gap-2 rounded-full border border-faint bg-white px-4 py-2.5 text-[11.5px] font-semibold text-tinta transition-colors hover:bg-mist"
              >
                Mis tutorías
              </Link>
            </div>
          </header>

          {errorCarga && (
            <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-peligro/20 bg-white px-5 py-4 text-[12px] text-peligro sm:flex-row sm:items-center sm:justify-between">
              <span>{errorCarga}</span>
              <button
                type="button"
                onClick={() => {
                  setCargando(true);
                  setErrorCarga(null);
                  void recargar();
                }}
                className="self-start rounded-full bg-peligro px-4 py-2 text-[11px] font-medium text-white transition-opacity hover:opacity-90"
              >
                Reintentar
              </button>
            </div>
          )}

          <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1">
              {confirmada ? (
                <motion.section
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="rounded-[28px] bg-white p-6 shadow-[0_1px_2px_rgba(28,26,30,0.04)] sm:p-7"
                >
                  <h2 className="text-[22px] font-semibold tracking-[-0.01em] text-tinta">
                    ¡Tu tutoría está programada!
                  </h2>
                  <p className="mt-1 text-[12px] text-muted">
                    La reserva se registró correctamente y el horario ya no está disponible para
                    otros estudiantes.
                  </p>

                  <div className="mt-5 flex items-center gap-3 border-y border-faint py-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-arena text-[12px] font-semibold text-tinta">
                      {iniciales(tutorConfirmado)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-tinta">
                        {tutorConfirmado}
                      </p>
                      <p className="truncate text-[11px] text-muted">Tutor · {materiaConfirmada}</p>
                    </div>
                  </div>

                  <dl className="divide-y divide-faint">
                    <div className="py-3">
                      <dt className="text-[11.5px] font-semibold text-tinta">Fecha</dt>
                      <dd className="mt-0.5 text-[11.5px] text-muted">
                        {fechaCompleta(confirmada.fecha)}
                      </dd>
                    </div>
                    <div className="py-3">
                      <dt className="text-[11.5px] font-semibold text-tinta">Hora</dt>
                      <dd className="mt-0.5 text-[11.5px] text-muted">
                        {hora12(inicioConfirmado)} - {hora12(finConfirmado)}
                      </dd>
                    </div>
                    <div className="py-3">
                      <dt className="text-[11.5px] font-semibold text-tinta">Modalidad y área</dt>
                      <dd className="mt-0.5 text-[11.5px] text-muted">
                        {modalidadConfirmada} · {materiaConfirmada}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-2 flex items-start gap-3 rounded-2xl border border-exito/20 bg-salvia/25 px-4 py-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-exito text-white">
                      <CheckIcon className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <p className="text-[11.5px] font-semibold text-exito">Notificaciones enviadas</p>
                      <p className="mt-0.5 text-[10.5px] leading-relaxed text-exito/80">
                        Se envió una confirmación con los detalles de la tutoría al estudiante y al
                        tutor.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col items-start gap-3 border-t border-faint pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[10.5px] text-muted">
                      La sesión se verá en “Mis tutorías programadas”.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={nuevaReserva}
                        className="rounded-full border border-faint px-5 py-2.5 text-[11.5px] font-medium text-slate-ink transition-colors hover:bg-mist"
                      >
                        Reservar otra
                      </button>
                      <Link
                        to="/estudiante/mis-reservas"
                        className="inline-flex items-center justify-center rounded-full bg-violeta-accion px-5 py-2.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-violeta-profundo"
                      >
                        Ver mis tutorías
                      </Link>
                    </div>
                  </div>
                </motion.section>
              ) : (
                <motion.section
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="rounded-[28px] bg-white p-6 shadow-[0_1px_2px_rgba(28,26,30,0.04)] sm:p-7"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-tinta">
                        Horarios disponibles
                      </h2>
                      <p className="mt-1 text-[11.5px] text-muted">
                        Selecciona un espacio y confirma tu reserva.
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${
                        bloqueSeleccionado
                          ? 'bg-violet-wash/40 text-violeta-accion'
                          : 'bg-mist text-muted'
                      }`}
                    >
                      {bloqueSeleccionado ? 'Disponible' : 'Sin horarios'}
                    </span>
                  </div>

                  <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-mist px-4 py-3 text-slate-ink">
                    <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    <p className="text-[10.5px] leading-relaxed">
                      {plazoReserva === 0
                        ? 'Puedes reservar hasta el inicio de la tutoría.'
                        : `Las reservas se cierran ${plazoReserva} h antes del inicio. Los horarios dentro de ese plazo aparecen bloqueados.`}
                    </p>
                  </div>

                  {bloqueadosPorPlazo.length > 0 && (
                    <div className="mt-3 rounded-2xl border border-advertencia/25 bg-advertencia/5 px-4 py-3">
                      <p className="flex items-center gap-2 text-[11px] font-semibold text-advertencia">
                        <ClockIcon className="h-3.5 w-3.5 shrink-0" />
                        {bloqueadosPorPlazo.length === 1
                          ? '1 horario fuera del plazo de reserva'
                          : `${bloqueadosPorPlazo.length} horarios fuera del plazo de reserva`}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {bloqueadosPorPlazo.slice(0, 4).map((bloque) => (
                          <li
                            key={bloque.id}
                            className="flex flex-wrap items-baseline gap-x-2 text-[10.5px] text-slate-ink"
                          >
                            <span className="font-semibold">
                              {fechaResumen(bloque.fecha)} · {hora12(horaCorta(bloque.hora_inicio))}
                            </span>
                            <span className="text-muted">{tutorDeBloque(bloque)}</span>
                          </li>
                        ))}
                        {bloqueadosPorPlazo.length > 4 && (
                          <li className="text-[10.5px] text-muted">
                            y {bloqueadosPorPlazo.length - 4} más
                          </li>
                        )}
                      </ul>
                      <p className="mt-2 text-[10px] leading-relaxed text-muted">
                        Las reservas se aceptan {textoAnticipacion(plazoReserva)}.
                      </p>
                    </div>
                  )}

                  {cargando ? (
                    <div className="mt-5 space-y-3">
                      <div className="h-[68px] animate-pulse rounded-2xl bg-mist" />
                      <div className="h-[232px] animate-pulse rounded-2xl bg-mist" />
                    </div>
                  ) : disponibles.length === 0 ? (
                    <div className="mt-5">
                      <EmptyState
                        titulo="No hay horarios disponibles"
                        detalle={
                          bloqueadosPorPlazo.length > 0
                            ? `Los horarios abiertos ya están fuera del plazo: las reservas se aceptan ${textoAnticipacion(
                                plazoReserva,
                              )}.`
                            : 'Cuando los tutores publiquen nuevos horarios aparecerán aquí.'
                        }
                      />
                    </div>
                  ) : (
                    <>
                      <div className="mt-5 flex items-center gap-3 border-y border-faint py-4">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-arena text-[12px] font-semibold text-tinta">
                          {iniciales(tutorNombre)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-tinta">
                            {tutorNombre}
                          </p>
                          <p className="truncate text-[11px] text-muted">
                            Tutor · {materiaNombre}
                          </p>
                        </div>
                        {bloqueSeleccionado && (
                          <span className="shrink-0 rounded-full bg-mist px-3 py-1 text-[10px] font-semibold text-slate-ink">
                            {modalidadLegible(bloqueSeleccionado.modalidad)}
                          </span>
                        )}
                      </div>

                      <form onSubmit={confirmar} className="mt-5">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="block" htmlFor="area-academica">
                            <span className="text-[11px] font-semibold text-tinta">
                              Área académica
                            </span>
                            <select
                              id="area-academica"
                              value={materiaActiva ?? ''}
                              onChange={(evento) => {
                                setMateriaId(Number(evento.target.value));
                                setModalidad('');
                                setFecha('');
                                setBloqueId(null);
                              }}
                              className="mt-1.5 h-11 w-full rounded-full border border-faint bg-white px-4 text-[12px] text-tinta outline-none transition focus:border-violeta-accion focus:ring-4 focus:ring-violeta-accion/15"
                            >
                              {opcionesMateria.map((opcion) => (
                                <option key={opcion.id} value={opcion.id}>
                                  {opcion.nombre}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="block" htmlFor="modalidad">
                            <span className="text-[11px] font-semibold text-tinta">Modalidad</span>
                            <select
                              id="modalidad"
                              value={modalidadActiva}
                              onChange={(evento) => {
                                setModalidad(evento.target.value);
                                setFecha('');
                                setBloqueId(null);
                              }}
                              className="mt-1.5 h-11 w-full rounded-full border border-faint bg-white px-4 text-[12px] text-tinta outline-none transition focus:border-violeta-accion focus:ring-4 focus:ring-violeta-accion/15"
                            >
                              {opcionesModalidad.map((valor) => (
                                <option key={valor} value={valor}>
                                  {modalidadLegible(valor)}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="block sm:col-span-2" htmlFor="fecha-disponible">
                            <span className="text-[11px] font-semibold text-tinta">
                              Fecha disponible
                            </span>
                            <select
                              id="fecha-disponible"
                              value={fechaActiva}
                              onChange={(evento) => {
                                setFecha(evento.target.value);
                                setBloqueId(null);
                              }}
                              className="mt-1.5 h-11 w-full rounded-full border border-faint bg-white px-4 text-[12px] text-tinta outline-none transition focus:border-violeta-accion focus:ring-4 focus:ring-violeta-accion/15"
                            >
                              {opcionesFecha.map((iso) => (
                                <option key={iso} value={iso}>
                                  {fechaCompleta(iso)}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="block" htmlFor="hora-inicio">
                            <span className="text-[11px] font-semibold text-tinta">
                              Hora de inicio
                            </span>
                            <select
                              id="hora-inicio"
                              value={bloqueSeleccionado?.id ?? ''}
                              onChange={(evento) => setBloqueId(Number(evento.target.value))}
                              className="mt-1.5 h-11 w-full rounded-full border border-faint bg-white px-4 text-[12px] text-tinta outline-none transition focus:border-violeta-accion focus:ring-4 focus:ring-violeta-accion/15"
                            >
                              {bloquesDelDia.map((bloque) => (
                                <option key={bloque.id} value={bloque.id}>
                                  {hora12(horaCorta(bloque.hora_inicio))}
                                  {bloquesDelDia.length > 1 ? ` · ${tutorDeBloque(bloque)}` : ''}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="block" htmlFor="hora-fin">
                            <span className="text-[11px] font-semibold text-tinta">
                              Hora de finalización
                            </span>
                            <input
                              id="hora-fin"
                              readOnly
                              value={hora12(horaFin)}
                              className="mt-1.5 h-11 w-full rounded-full border border-faint bg-mist px-4 text-[12px] text-muted outline-none"
                            />
                          </label>

                          <label className="block sm:col-span-2" htmlFor="tema">
                            <span className="text-[11px] font-semibold text-tinta">
                              Tema de la consulta
                            </span>
                            <input
                              id="tema"
                              type="text"
                              required
                              maxLength={200}
                              placeholder="Ej. Repaso para el parcial"
                              value={tema}
                              onChange={(evento) => setTema(evento.target.value)}
                              className="mt-1.5 h-11 w-full rounded-full border border-faint bg-white px-4 text-[12px] text-tinta outline-none transition placeholder:text-pebble focus:border-violeta-accion focus:ring-4 focus:ring-violeta-accion/15"
                            />
                          </label>
                        </div>

                        <p className="mt-3 text-[10.5px] text-muted">
                          {duracion
                            ? `Duración de la tutoría: ${duracion}`
                            : 'Duración por confirmar'}
                        </p>

                        {errorReserva && (
                          <p
                            role="alert"
                            className="mt-4 rounded-xl border border-peligro/20 bg-peligro/5 px-4 py-2.5 text-[11px] text-peligro"
                          >
                            {errorReserva}
                          </p>
                        )}

                        <div className="mt-6 flex flex-col items-start gap-3 border-t border-faint pt-5 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-[10.5px] text-muted">
                            Al confirmar, el horario queda reservado.
                          </p>
                          <button
                            type="submit"
                            disabled={reservando || !bloqueSeleccionado}
                            className="inline-flex items-center justify-center rounded-full bg-violeta-accion px-6 py-3 text-[12px] font-semibold text-white transition-colors hover:bg-violeta-profundo disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {reservando ? 'Reservando...' : 'Confirmar reserva'}
                          </button>
                        </div>
                      </form>
                    </>
                  )}
                </motion.section>
              )}
            </div>

            <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-[340px]">
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.08 }}
                className="rounded-[28px] bg-white p-5 shadow-[0_1px_2px_rgba(28,26,30,0.04)]"
              >
                <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-tinta">
                  Resumen de la reserva
                </h2>
                <p className="mt-1 text-[11px] text-muted">
                  Revisa los detalles antes de confirmar.
                </p>

                <div className="mt-4 divide-y divide-faint">
                  <FilaResumen
                    icono={<CalendarIcon className="h-4 w-4" />}
                    titulo="Fecha y hora"
                    detalle={resumenFechaHora}
                  />
                  <FilaResumen
                    icono={<ClockIcon className="h-4 w-4" />}
                    titulo="Área académica"
                    detalle={resumenArea}
                  />
                  <FilaResumen
                    icono={<TutorIcon className="h-4 w-4" />}
                    titulo="Tutor"
                    detalle={resumenTutor}
                  />
                </div>
              </motion.section>

              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.12 }}
                className="rounded-[28px] bg-white p-5 shadow-[0_1px_2px_rgba(28,26,30,0.04)]"
              >
                <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-tinta">
                  Después de reservar
                </h2>

                <div className="mt-4 divide-y divide-faint">
                  <FilaResumen
                    icono={<CheckIcon className="h-4 w-4" />}
                    titulo="Confirmación al reservar"
                    detalle="Te llega un correo con los datos de la tutoría, y al tutor también."
                  />
                  <FilaResumen
                    icono={<ClockIcon className="h-4 w-4" />}
                    titulo="Si no puedes asistir"
                    detalle="Cancela desde Mis reservas para liberar el cupo; el tutor recibe el aviso."
                  />
                </div>
              </motion.section>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BuscarTutorias;

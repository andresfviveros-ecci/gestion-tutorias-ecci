import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../../api/axios';
import { useAuthStore } from '../../store/useAuthStore';
import { StudentRail } from '../../components/estudiante/StudentRail';

/* ------------------------------------------------------------------ */
/* Tipos                                                              */
/* ------------------------------------------------------------------ */

interface Bloque {
  id: number;
  docente: number;
  materia: number;
  periodo?: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  modalidad: string;
  lugar?: string | null;
  enlace_virtual?: string | null;
  cupo_total: number;
  cupo_ocupado: number;
  estado: string;
  observaciones?: string | null;
}

interface Materia {
  id: number;
  nombre: string;
  codigo: string;
}

interface Tutor {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  username?: string;
}

interface Tutoria {
  id: number;
  codigo?: string;
  bloque?: Bloque | number | string | null;
  docente?: string;
  tema?: string;
  descripcion?: string;
  estado?: string;
  fecha?: string;
  hora_inicio?: string;
  hora_fin?: string;
}

type ModalidadFiltro = 'TODAS' | 'VIRTUAL' | 'PRESENCIAL';

interface ProximaTutoria {
  tutoria: Tutoria;
  bloque: Bloque | null;
  fecha: string;
  horaInicio: string;
  horaFin: string;
}

interface TemaTarjeta {
  bg: string;
  text: string;
  dot: string;
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                         */
/* ------------------------------------------------------------------ */

const PALETA: TemaTarjeta[] = [
  { bg: 'bg-terracota', text: 'text-white', dot: 'bg-terracota' },
  { bg: 'bg-carbon', text: 'text-white', dot: 'bg-carbon' },
  { bg: 'bg-salvia', text: 'text-tinta', dot: 'bg-salvia' },
  { bg: 'bg-arena', text: 'text-tinta', dot: 'bg-arena' },
  { bg: 'bg-cacao', text: 'text-white', dot: 'bg-cacao' },
];

const temaDeMateria = (materiaId: number): TemaTarjeta =>
  PALETA[Math.abs(materiaId - 1) % PALETA.length];

const capitalizar = (texto: string): string =>
  texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;

const aISOFecha = (fecha: Date): string => {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseFecha = (iso: string): Date => new Date(`${iso}T12:00:00`);

const hoyISO = (): string => aISOFecha(new Date());

const horaCorta = (hora?: string | null): string => (hora || '').slice(0, 5);

const fechaLarga = (fecha: Date): string =>
  capitalizar(
    fecha.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
  );

const diaSemana = (iso: string): string =>
  capitalizar(parseFecha(iso).toLocaleDateString('es-ES', { weekday: 'long' }));

const diaSemanaCorto = (iso: string): string =>
  parseFecha(iso)
    .toLocaleDateString('es-ES', { weekday: 'short' })
    .replace('.', '')
    .toUpperCase();

const diaYNumero = (iso: string): string =>
  `${diaSemana(iso)} ${parseFecha(iso).getDate()}`;

const etiquetaRelativa = (iso: string): string => {
  const hoy = new Date();
  hoy.setHours(12, 0, 0, 0);
  const objetivo = parseFecha(iso);
  const dias = Math.round((objetivo.getTime() - hoy.getTime()) / 86_400_000);
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  return `${diaSemana(iso)} ${objetivo.getDate()}`;
};

const modalidadLegible = (modalidad?: string): string => {
  const valor = (modalidad || '').toUpperCase();
  if (valor === 'VIRTUAL') return 'Virtual';
  if (valor === 'PRESENCIAL') return 'Presencial';
  return capitalizar((modalidad || 'Sin modalidad').toLowerCase());
};

const nombreTutor = (tutor?: Tutor): string => {
  if (!tutor) return 'Docente por confirmar';
  const completo = `${tutor.first_name || ''} ${tutor.last_name || ''}`.trim();
  return completo || tutor.username || tutor.email || 'Docente por confirmar';
};

const mensajeError = (error: unknown): string => {
  const data = (error as { response?: { data?: unknown } })?.response?.data;

  if (typeof data === 'string') return data;
  if (data && typeof data === 'object') {
    const registro = data as Record<string, unknown>;
    if (typeof registro.detail === 'string') return registro.detail;

    for (const valor of Object.values(registro)) {
      if (Array.isArray(valor) && valor.length > 0) return String(valor[0]);
      if (typeof valor === 'string') return valor;
    }
  }
  return 'No pudimos completar la operación. Intenta de nuevo.';
};

const extraerLista = <T,>(data: unknown): T[] => {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const results = (data as { results?: unknown }).results;
    if (Array.isArray(results)) return results as T[];
  }
  return [];
};

interface DatosPanel {
  bloques: Bloque[] | null;
  tutorias: Tutoria[] | null;
  materias: Materia[] | null;
  tutores: Tutor[] | null;
  fallo: boolean;
}

const consultarPanel = async (): Promise<DatosPanel> => {
  const [resBloques, resTutorias, resMaterias, resTutores] = await Promise.allSettled([
    api.get('/disponibilidad/disponibilidad/'),
    api.get('/tutorias/tutorias/'),
    api.get('/catalogo/materias/'),
    api.get('/accounts/tutores/'),
  ]);

  return {
    bloques:
      resBloques.status === 'fulfilled' ? extraerLista<Bloque>(resBloques.value.data) : null,
    tutorias:
      resTutorias.status === 'fulfilled' ? extraerLista<Tutoria>(resTutorias.value.data) : null,
    materias:
      resMaterias.status === 'fulfilled' ? extraerLista<Materia>(resMaterias.value.data) : null,
    tutores:
      resTutores.status === 'fulfilled' ? extraerLista<Tutor>(resTutores.value.data) : null,
    fallo: resBloques.status === 'rejected' && resTutorias.status === 'rejected',
  };
};

/* ------------------------------------------------------------------ */
/* Iconos                                                             */
/* ------------------------------------------------------------------ */

const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
    <rect x="2.2" y="3.4" width="11.6" height="10.2" rx="2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M2.2 6.4h11.6M5.4 2.2v2.4M10.6 2.2v2.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const VideoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
    <rect x="1.6" y="3.4" width="9" height="9.2" rx="2.2" stroke="currentColor" strokeWidth="1.3" />
    <path d="m10.6 7 3-1.8v5.6l-3-1.8V7Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
);

const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
    <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const ArrowIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
    <path d="m3.5 8.4 3 3 6-6.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Subcomponentes                                                     */
/* ------------------------------------------------------------------ */

const EstadoVacio: React.FC<{ titulo: string; detalle: string }> = ({ titulo, detalle }) => (
  <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-faint px-6 py-10 text-center">
    <p className="text-[13px] font-medium text-slate-ink">{titulo}</p>
    <p className="text-[11px] text-muted">{detalle}</p>
  </div>
);

const StatCard: React.FC<{ etiqueta: string; valor: React.ReactNode; detalle: string }> = ({
  etiqueta,
  valor,
  detalle,
}) => (
  <div className="rounded-2xl bg-mist px-4 py-3.5">
    <p className="text-[11px] font-medium leading-tight text-muted">{etiqueta}</p>
    <p className="mt-1.5 text-[24px] font-semibold leading-none tracking-tight text-tinta">{valor}</p>
    <p className="mt-1.5 text-[10px] text-muted">{detalle}</p>
  </div>
);

const BotonCerrar: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-mist hover:text-tinta"
  >
    <CloseIcon className="h-4 w-4" />
  </button>
);

/* ------------------------------------------------------------------ */
/* Página                                                             */
/* ------------------------------------------------------------------ */

export const StudentPanel: React.FC = () => {
  const user = useAuthStore((state) => state.user);

  const [bloques, setBloques] = useState<Bloque[]>([]);
  const [tutorias, setTutorias] = useState<Tutoria[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [tutores, setTutores] = useState<Tutor[]>([]);

  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);
  const [modalidad, setModalidad] = useState<ModalidadFiltro>('TODAS');
  const [materiaFiltro, setMateriaFiltro] = useState<number | null>(null);

  const [bloqueReserva, setBloqueReserva] = useState<Bloque | null>(null);
  const [tema, setTema] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [errorReserva, setErrorReserva] = useState<string | null>(null);
  const [enviandoReserva, setEnviandoReserva] = useState(false);

  const [tutoriaCancelar, setTutoriaCancelar] = useState<Tutoria | null>(null);
  const [motivo, setMotivo] = useState('');
  const [errorCancelar, setErrorCancelar] = useState<string | null>(null);
  const [enviandoCancelar, setEnviandoCancelar] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  const hoy = useMemo(() => new Date(), []);

  const nombre = useMemo(() => {
    const completo = user?.first_name || user?.nombre || 'Estudiante';
    return completo.trim().split(/\s+/)[0] || 'Estudiante';
  }, [user]);

  const aplicarDatos = useCallback((datos: DatosPanel) => {
    if (datos.bloques) setBloques(datos.bloques);
    if (datos.tutorias) setTutorias(datos.tutorias);
    if (datos.materias) setMaterias(datos.materias);
    if (datos.tutores) setTutores(datos.tutores);

    setErrorCarga(
      datos.fallo ? 'No pudimos cargar tu panel. Revisa tu conexión e intenta de nuevo.' : null,
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

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!bloqueReserva && !tutoriaCancelar) return;
    const alPresionar = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setBloqueReserva(null);
      setTutoriaCancelar(null);
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [bloqueReserva, tutoriaCancelar]);

  /* -------------------------- catálogos --------------------------- */

  const materiasPorId = useMemo(() => {
    const mapa = new Map<number, Materia>();
    materias.forEach((materia) => mapa.set(materia.id, materia));
    return mapa;
  }, [materias]);

  const tutoresPorId = useMemo(() => {
    const mapa = new Map<number, Tutor>();
    tutores.forEach((tutor) => mapa.set(tutor.id, tutor));
    return mapa;
  }, [tutores]);

  const bloquesPorId = useMemo(() => {
    const mapa = new Map<string, Bloque>();
    bloques.forEach((bloque) => mapa.set(String(bloque.id), bloque));
    return mapa;
  }, [bloques]);

  const obtenerBloque = useCallback(
    (tutoria: Tutoria): Bloque | null => {
      const ref = tutoria.bloque;
      if (ref && typeof ref === 'object') return ref as Bloque;
      if (ref === null || ref === undefined) return null;
      return bloquesPorId.get(String(ref)) ?? null;
    },
    [bloquesPorId],
  );

  const nombreMateria = (bloque: Bloque): string =>
    materiasPorId.get(bloque.materia)?.nombre || 'Materia por confirmar';

  const codigoMateria = (bloque: Bloque): string =>
    materiasPorId.get(bloque.materia)?.codigo || '';

  const docenteDeBloque = (bloque: Bloque): string =>
    nombreTutor(tutoresPorId.get(bloque.docente));

  const lugarDeBloque = (bloque: Bloque): string => {
    if ((bloque.modalidad || '').toUpperCase() === 'VIRTUAL') {
      return bloque.enlace_virtual || 'Enlace por confirmar';
    }
    return bloque.lugar || 'Lugar por confirmar';
  };

  /* ---------------------------- datos ----------------------------- */

  const tutoriasActivas = useMemo(
    () =>
      tutorias.filter((tutoria) =>
        ['RESERVADA', 'CONFIRMADA'].includes((tutoria.estado || '').toUpperCase()),
      ),
    [tutorias],
  );

  const bloquesReservados = useMemo(() => {
    const ids = new Set<string>();
    tutoriasActivas.forEach((tutoria) => {
      const bloque = obtenerBloque(tutoria);
      if (bloque) ids.add(String(bloque.id));
    });
    return ids;
  }, [tutoriasActivas, obtenerBloque]);

  const disponibles = useMemo(() => {
    const referencia = hoyISO();
    return bloques
      .filter(
        (bloque) =>
          (bloque.estado || '').toUpperCase() === 'DISPONIBLE' &&
          bloque.cupo_ocupado < bloque.cupo_total &&
          bloque.fecha >= referencia &&
          !bloquesReservados.has(String(bloque.id)),
      )
      .sort((a, b) =>
        `${a.fecha}T${a.hora_inicio}`.localeCompare(`${b.fecha}T${b.hora_inicio}`),
      );
  }, [bloques, bloquesReservados]);

  const proximas = useMemo<ProximaTutoria[]>(() => {
    const ahora = new Date();

    return tutoriasActivas
      .map((tutoria) => {
        const bloque = obtenerBloque(tutoria);
        return {
          tutoria,
          bloque,
          fecha: bloque?.fecha || tutoria.fecha || '',
          horaInicio: horaCorta(bloque?.hora_inicio || tutoria.hora_inicio),
          horaFin: horaCorta(bloque?.hora_fin || tutoria.hora_fin),
        };
      })
      .filter((item) => {
        if (!item.fecha) return false;
        const inicio = new Date(`${item.fecha}T${item.horaInicio || '23:59'}:00`);
        return inicio.getTime() >= ahora.getTime();
      })
      .sort((a, b) =>
        `${a.fecha}T${a.horaInicio}`.localeCompare(`${b.fecha}T${b.horaInicio}`),
      );
  }, [tutoriasActivas, obtenerBloque]);

  const proxima = proximas[0] ?? null;

  const stats = useMemo(() => {
    const materiasUnicas = new Set<number>();
    const tutoresUnicos = new Set<number>();
    disponibles.forEach((bloque) => {
      materiasUnicas.add(bloque.materia);
      tutoresUnicos.add(bloque.docente);
    });

    return {
      tomadas: tutorias.length,
      materias: materiasUnicas.size,
      tutores: tutoresUnicos.size,
    };
  }, [disponibles, tutorias.length]);

  /* --------------------------- filtros ---------------------------- */

  const dias = useMemo(() => {
    const base = new Date();
    base.setHours(12, 0, 0, 0);
    const lunes = new Date(base);
    lunes.setDate(base.getDate() - ((base.getDay() + 6) % 7));

    return Array.from({ length: 7 }, (_, indice) => {
      const dia = new Date(lunes);
      dia.setDate(lunes.getDate() + indice);
      return dia;
    });
  }, []);

  const referenciaHoy = hoyISO();

  const conteoPorDia = useMemo(() => {
    const mapa = new Map<string, number>();
    disponibles.forEach((bloque) => {
      mapa.set(bloque.fecha, (mapa.get(bloque.fecha) || 0) + 1);
    });
    return mapa;
  }, [disponibles]);

  const filtrados = useMemo(
    () =>
      disponibles.filter((bloque) => {
        if (diaSeleccionado && bloque.fecha !== diaSeleccionado) return false;
        if (modalidad !== 'TODAS' && (bloque.modalidad || '').toUpperCase() !== modalidad) {
          return false;
        }
        if (materiaFiltro && bloque.materia !== materiaFiltro) return false;
        return true;
      }),
    [disponibles, diaSeleccionado, modalidad, materiaFiltro],
  );

  const materiasChips = useMemo(() => {
    const ids = new Set<number>();
    disponibles
      .filter((bloque) => !diaSeleccionado || bloque.fecha === diaSeleccionado)
      .forEach((bloque) => ids.add(bloque.materia));

    if (materiaFiltro) ids.add(materiaFiltro);

    return Array.from(ids)
      .map((id) => materiasPorId.get(id))
      .filter((materia): materia is Materia => Boolean(materia))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .slice(0, 7);
  }, [disponibles, diaSeleccionado, materiaFiltro, materiasPorId]);

  const visibles = filtrados.slice(0, 10);

  /* -------------------------- acciones ---------------------------- */

  const abrirReserva = (bloque: Bloque) => {
    setBloqueReserva(bloque);
    setTema('');
    setDescripcion('');
    setErrorReserva(null);
  };

  const abrirCancelacion = (tutoria: Tutoria) => {
    setTutoriaCancelar(tutoria);
    setMotivo('');
    setErrorCancelar(null);
  };

  const confirmarReserva = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!bloqueReserva) return;

    if (!tema.trim()) {
      setErrorReserva('Escribe el tema que quieres trabajar con tu tutor.');
      return;
    }

    setEnviandoReserva(true);
    setErrorReserva(null);

    try {
      await api.post('/tutorias/tutorias/', {
        bloque_id: Number(bloqueReserva.id),
        tema: tema.trim(),
        descripcion: descripcion.trim(),
      });
      setBloqueReserva(null);
      setToast('Tutoría reservada. Te esperamos.');
      await recargar();
    } catch (error) {
      setErrorReserva(mensajeError(error));
    } finally {
      setEnviandoReserva(false);
    }
  };

  const confirmarCancelacion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!tutoriaCancelar) return;

    if (!motivo.trim()) {
      setErrorCancelar('Cuéntanos brevemente por qué cancelas la tutoría.');
      return;
    }

    setEnviandoCancelar(true);
    setErrorCancelar(null);

    try {
      await api.delete(`/tutorias/tutorias/${tutoriaCancelar.id}/`, {
        data: { origen: 'ESTUDIANTE', motivo: motivo.trim() },
      });
      setTutoriaCancelar(null);
      setToast('La tutoría fue cancelada y el cupo quedó libre.');
      await recargar();
    } catch (error) {
      setErrorCancelar(mensajeError(error));
    } finally {
      setEnviandoCancelar(false);
    }
  };

  /* --------------------------- render ----------------------------- */

  const bloqueProxima = proxima?.bloque ?? null;
  const enlaceProxima = bloqueProxima?.enlace_virtual || '';
  const relativaProxima = proxima ? etiquetaRelativa(proxima.fecha) : '';
  const bloqueCancelar = tutoriaCancelar ? obtenerBloque(tutoriaCancelar) : null;

  return (
    <div className="flex min-h-screen bg-mist font-constelacion text-tinta">
      <StudentRail />

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1760px] space-y-5 p-5 sm:p-6 lg:p-8">
          {errorCarga && (
            <div className="flex flex-col gap-3 rounded-2xl border border-peligro/20 bg-white px-5 py-4 text-[12px] text-peligro sm:flex-row sm:items-center sm:justify-between">
              <span>{errorCarga}</span>
              <button
                type="button"
                onClick={() => {
                  setErrorCarga(null);
                  setCargando(true);
                  void recargar();
                }}
                className="self-start rounded-full bg-peligro px-4 py-2 text-[11px] font-medium text-white transition-opacity hover:opacity-90"
              >
                Reintentar
              </button>
            </div>
          )}

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_322px]">
            <div className="contents">
              <div className="order-1 grid min-w-0 gap-5 lg:grid-cols-[740fr_690fr] xl:order-none xl:col-start-1 xl:row-start-1">
                {/* ------------------ Bienvenida ------------------ */}
                <motion.section
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                  className="flex flex-col justify-between rounded-[28px] bg-white p-6 shadow-[0_1px_2px_rgba(28,26,30,0.04)] sm:p-7"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-[12px] font-medium text-muted">Panel · Estudiante</p>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-faint px-3 py-1.5 text-[11px] font-medium text-slate-ink">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        {fechaLarga(hoy)}
                      </span>
                    </div>

                    <h1 className="mt-6 text-[30px] font-semibold leading-tight tracking-[-0.02em] text-tinta sm:text-[34px]">
                      ¡Hola, {nombre}!
                    </h1>
                    <p className="mt-2 max-w-md text-[12px] leading-relaxed text-muted">
                      Bienvenid@ de nuevo a Aula Libre. Aquí tienes un resumen de tu panel.
                    </p>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <StatCard
                      etiqueta="Tutorías tomadas"
                      valor={cargando ? '—' : stats.tomadas}
                      detalle="Este semestre"
                    />
                    <StatCard
                      etiqueta="Materias con tutoría disponible"
                      valor={cargando ? '—' : stats.materias}
                      detalle="Actualizado hoy"
                    />
                    <StatCard
                      etiqueta="Tutores disponibles ahora"
                      valor={cargando ? '—' : stats.tutores}
                      detalle="En tus materias"
                    />
                  </div>
                </motion.section>

                {/* ------------- Próxima tutoría ------------- */}
                <motion.section
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.06 }}
                  className="relative flex min-h-[260px] flex-col justify-between overflow-hidden rounded-[28px] bg-carbon p-6 text-white sm:p-7"
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute right-7 top-7 h-11 w-11 rounded-full bg-arena"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-24 -right-12 h-64 w-64 rounded-full bg-terracota"
                  />

                  <div className="relative z-10">
                    <p className="text-[11px] font-medium tracking-wide text-white/70">
                      Próxima tutoría
                      {proxima && (
                        <>
                          <span className="mx-1.5 text-white/30">·</span>
                          {(relativaProxima === 'Hoy' || relativaProxima === 'Mañana') && (
                            <>
                              <span className="text-arena">{relativaProxima}</span>
                              <span className="mx-1.5 text-white/30">·</span>
                            </>
                          )}
                          <span>{diaYNumero(proxima.fecha)}</span>
                        </>
                      )}
                    </p>

                    {cargando ? (
                      <p className="mt-3 text-[13px] text-white/60">Cargando tu agenda...</p>
                    ) : proxima ? (
                      <>
                        <h2 className="mt-2 line-clamp-2 max-w-[85%] text-[24px] font-medium leading-tight tracking-[-0.01em]">
                          {proxima.tutoria.tema || nombreMateria(bloqueProxima as Bloque)}
                        </h2>
                        <p className="mt-1.5 truncate text-[12px] text-white/70">
                          {bloqueProxima ? docenteDeBloque(bloqueProxima) : 'Docente por confirmar'}
                          {bloqueProxima && (
                            <>
                              <span className="mx-1.5 text-white/30">·</span>
                              {nombreMateria(bloqueProxima)}
                              <span className="mx-1.5 text-white/30">·</span>
                              {modalidadLegible(bloqueProxima.modalidad)}
                            </>
                          )}
                        </p>
                      </>
                    ) : (
                      <>
                        <h2 className="mt-2 text-[24px] font-medium leading-tight tracking-[-0.01em]">
                          Sin tutorías programadas
                        </h2>
                        <p className="mt-1.5 max-w-sm text-[12px] text-white/70">
                          Reserva un horario y aparecerá aquí con toda la información de tu sesión.
                        </p>
                      </>
                    )}
                  </div>

                  <div className="relative z-10 mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                    <div>
                      {proxima ? (
                        <>
                          <p className="text-[56px] font-medium leading-none tracking-[-0.03em] sm:text-[64px]">
                            {proxima.horaInicio || '—'}
                          </p>
                          <p className="mt-2 text-[11px] text-white/60">
                            {proxima.horaFin ? `hasta las ${proxima.horaFin}` : 'Hora por confirmar'}
                          </p>
                        </>
                      ) : (
                        <p className="text-[13px] text-white/60">Tu agenda está libre.</p>
                      )}
                    </div>

                    {proxima && enlaceProxima ? (
                      <a
                        href={enlaceProxima}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-3 text-[12px] font-medium text-tinta transition-transform hover:-translate-y-0.5"
                      >
                        <VideoIcon className="h-4 w-4" />
                        Unirse a la reunión
                      </a>
                    ) : proxima ? (
                      <Link
                        to="/estudiante/mis-reservas"
                        className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-3 text-[12px] font-medium text-tinta transition-transform hover:-translate-y-0.5"
                      >
                        Ver detalles
                        <ArrowIcon className="h-4 w-4" />
                      </Link>
                    ) : (
                      <Link
                        to="/estudiante/buscar-tutorias"
                        className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-3 text-[12px] font-medium text-tinta transition-transform hover:-translate-y-0.5"
                      >
                        Reservar
                        <ArrowIcon className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </motion.section>
              </div>

              {/* ------------- Horarios disponibles ------------- */}
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.12 }}
                className="order-3 min-w-0 rounded-[28px] bg-white p-6 shadow-[0_1px_2px_rgba(28,26,30,0.04)] sm:p-7 xl:order-none xl:col-start-1 xl:row-start-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[22px] font-semibold tracking-[-0.01em] text-tinta">
                      Consultar horarios disponibles
                    </h2>
                    <p className="mt-1 text-[12px] text-muted">
                      Elige un horario disponible y resérvalo al instante.
                    </p>
                  </div>
                  <span className="rounded-full border border-faint px-4 py-2 text-[11px] font-medium text-slate-ink">
                    {cargando
                      ? 'Cargando horarios...'
                      : `${filtrados.length} ${filtrados.length === 1 ? 'horario disponible' : 'horarios disponibles'}`}
                  </span>
                </div>

                {/* Selector de días */}
                <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setDiaSeleccionado(null)}
                    aria-pressed={diaSeleccionado === null}
                    className={`flex h-[76px] w-[150px] shrink-0 items-center justify-center rounded-2xl px-4 text-[12px] font-medium transition-colors ${
                      diaSeleccionado === null
                        ? 'bg-tinta text-white'
                        : 'border border-faint bg-white text-slate-ink hover:bg-mist'
                    }`}
                  >
                    Toda la semana
                  </button>

                  {dias.map((dia) => {
                    const iso = aISOFecha(dia);
                    const esPasado = iso < referenciaHoy;
                    const activo = diaSeleccionado === iso;
                    const cantidad = conteoPorDia.get(iso) || 0;
                    const esHoy = iso === referenciaHoy;

                    let colorPunto = 'bg-pebble';
                    if (esHoy) colorPunto = 'bg-violeta';
                    else if (cantidad >= 8) colorPunto = 'bg-terracota';
                    else if (cantidad >= 4) colorPunto = 'bg-salvia';
                    else if (cantidad > 0) colorPunto = 'bg-arena';

                    return (
                      <button
                        key={iso}
                        type="button"
                        disabled={esPasado}
                        onClick={() => setDiaSeleccionado(activo ? null : iso)}
                        aria-pressed={activo}
                        aria-label={`${diaYNumero(iso)}${cantidad ? `, ${cantidad} horarios` : ', sin horarios'}`}
                        className={`flex h-[76px] min-w-[80px] max-w-[150px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl border bg-white transition-all ${
                          activo
                            ? 'border-violeta ring-4 ring-violeta/10'
                            : 'border-faint hover:border-pebble'
                        } ${esPasado ? 'cursor-not-allowed opacity-40' : ''}`}
                      >
                        <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
                          {diaSemanaCorto(iso)}
                        </span>
                        <span className="text-[18px] font-semibold leading-none text-tinta">
                          {dia.getDate()}
                        </span>
                        <span className={`h-1.5 w-1.5 rounded-full ${colorPunto}`} />
                      </button>
                    );
                  })}
                </div>

                {/* Filtros */}
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <div className="inline-flex rounded-full border border-faint bg-white p-1">
                    {(['TODAS', 'VIRTUAL', 'PRESENCIAL'] as ModalidadFiltro[]).map((opcion) => {
                      const activo = modalidad === opcion;
                      const texto =
                        opcion === 'TODAS'
                          ? 'Todas'
                          : opcion === 'VIRTUAL'
                            ? 'Virtual'
                            : 'Presencial';
                      return (
                        <button
                          key={opcion}
                          type="button"
                          onClick={() => setModalidad(opcion)}
                          aria-pressed={activo}
                          className={`rounded-full px-4 py-2 text-[12px] font-medium transition-colors ${
                            activo
                              ? 'bg-tinta text-white'
                              : 'text-slate-ink hover:bg-mist'
                          }`}
                        >
                          {texto}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-x-auto pb-1">
                    {materiasChips.map((materia) => {
                      const activo = materiaFiltro === materia.id;
                      const tema = temaDeMateria(materia.id);
                      return (
                        <button
                          key={materia.id}
                          type="button"
                          onClick={() => setMateriaFiltro(activo ? null : materia.id)}
                          aria-pressed={activo}
                          title={activo ? 'Quitar filtro de materia' : `Filtrar por ${materia.nombre}`}
                          className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[12px] font-medium transition-all ${
                            activo
                              ? 'border-violeta bg-white text-tinta ring-2 ring-violeta/10'
                              : 'border-faint bg-white text-slate-ink hover:border-pebble'
                          }`}
                        >
                          <span className={`h-2.5 w-2.5 rounded-full ${tema.dot}`} />
                          {materia.nombre}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tarjetas de cupos */}
                {cargando ? (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {Array.from({ length: 5 }).map((_, indice) => (
                      <div
                        key={indice}
                        className="h-[268px] animate-pulse rounded-[22px] border border-faint bg-mist"
                      />
                    ))}
                  </div>
                ) : visibles.length === 0 ? (
                  <div className="mt-5">
                    <EstadoVacio
                      titulo="No hay horarios con estos filtros"
                      detalle="Prueba con otro día, otra modalidad u otra materia."
                    />
                    {(diaSeleccionado || modalidad !== 'TODAS' || materiaFiltro) && (
                      <div className="mt-3 flex justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            setDiaSeleccionado(null);
                            setModalidad('TODAS');
                            setMateriaFiltro(null);
                          }}
                          className="rounded-full border border-faint px-4 py-2 text-[11px] font-medium text-slate-ink transition-colors hover:bg-mist"
                        >
                          Limpiar filtros
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {visibles.map((bloque) => {
                      const tema = temaDeMateria(bloque.materia);
                      const libres = Math.max(bloque.cupo_total - bloque.cupo_ocupado, 0);
                      const porcentaje = bloque.cupo_total
                        ? Math.round((libres / bloque.cupo_total) * 100)
                        : 0;

                      return (
                        <motion.article
                          key={bloque.id}
                          whileHover={{ y: -3 }}
                          className="flex flex-col overflow-hidden rounded-[22px] border border-faint bg-white transition-shadow hover:shadow-[0_12px_32px_rgba(28,26,30,0.08)]"
                        >
                          <div className={`relative px-5 pb-5 pt-4 ${tema.bg} ${tema.text}`}>
                            <p className="text-[12px] font-medium">{diaYNumero(bloque.fecha)}</p>
                            <p className="mt-2 text-[34px] font-medium leading-none tracking-[-0.03em]">
                              {horaCorta(bloque.hora_inicio)}
                            </p>
                            <span className="absolute bottom-4 right-4 rounded-full bg-white px-3 py-1 text-[10px] font-medium text-tinta">
                              {modalidadLegible(bloque.modalidad)}
                            </span>
                          </div>

                          <div className="flex flex-1 flex-col gap-1.5 px-5 py-4">
                            <p className="truncate text-[13px] font-semibold text-tinta">
                              {docenteDeBloque(bloque)}
                            </p>
                            <p className="truncate text-[11px] text-muted">
                              {nombreMateria(bloque)}
                              {codigoMateria(bloque) ? ` · ${codigoMateria(bloque)}` : ''}
                            </p>
                            <p
                              className="line-clamp-2 text-[10.5px] leading-snug text-muted"
                              title={lugarDeBloque(bloque)}
                            >
                              {horaCorta(bloque.hora_inicio)} – {horaCorta(bloque.hora_fin)} ·{' '}
                              {lugarDeBloque(bloque)}
                            </p>

                            <div className="mt-1">
                              <div className="flex items-center justify-between text-[10.5px]">
                                <span className="font-semibold text-slate-ink">Cupos</span>
                                <span className="text-muted">
                                  {libres} de {bloque.cupo_total} {libres === 1 ? 'libre' : 'libres'}
                                </span>
                              </div>
                              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-faint">
                                <div
                                  className="h-full rounded-full bg-tinta transition-all"
                                  style={{ width: `${Math.min(Math.max(porcentaje, 6), 100)}%` }}
                                />
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => abrirReserva(bloque)}
                              className="mt-auto h-10 w-full rounded-full bg-tinta text-[12px] font-medium text-white transition-colors hover:bg-black"
                            >
                              Reservar
                            </button>
                          </div>
                        </motion.article>
                      );
                    })}
                  </div>
                )}

                {!cargando && filtrados.length > visibles.length && (
                  <div className="mt-5 flex justify-center">
                    <Link
                      to="/estudiante/buscar-tutorias"
                      className="inline-flex items-center gap-2 rounded-full border border-faint px-5 py-2.5 text-[12px] font-medium text-slate-ink transition-colors hover:bg-mist"
                    >
                      Ver los {filtrados.length} horarios
                      <ArrowIcon className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </motion.section>
            </div>

            {/* ------------- Mis próximas tutorías ------------- */}
            <motion.aside
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.09 }}
              className="order-2 flex min-w-0 flex-col rounded-[28px] bg-white p-5 shadow-[0_1px_2px_rgba(28,26,30,0.04)] sm:p-6 xl:order-none xl:col-start-2 xl:row-start-1 xl:self-start"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-tinta">
                  Mis próximas tutorías
                </h2>
                <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-tinta px-2 text-[11px] font-semibold text-white">
                  {proximas.length}
                </span>
              </div>

              <div className="mt-4 space-y-2.5">
                {cargando ? (
                  Array.from({ length: 3 }).map((_, indice) => (
                    <div key={indice} className="h-[76px] animate-pulse rounded-2xl bg-mist" />
                  ))
                ) : proximas.length === 0 ? (
                  <EstadoVacio
                    titulo="Sin tutorías próximas"
                    detalle="Cuando reserves un horario lo verás aquí."
                  />
                ) : (
                  proximas.slice(0, 4).map((item, indice) => {
                    const tema = PALETA[indice % PALETA.length];
                    const puedeCancelar =
                      (item.tutoria.estado || '').toUpperCase() === 'RESERVADA';
                    const bloque = item.bloque;

                    return (
                      <div
                        key={item.tutoria.id}
                        className="flex items-start gap-3 rounded-2xl bg-mist px-3 py-3"
                      >
                        <div
                          className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl ${tema.bg} ${tema.text}`}
                        >
                          <span className="text-[8.5px] font-semibold uppercase tracking-wide opacity-80">
                            {diaSemanaCorto(item.fecha)}
                          </span>
                          <span className="text-[15px] font-semibold leading-none">
                            {parseFecha(item.fecha).getDate()}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-semibold text-tinta">
                            {item.tutoria.tema || 'Tutoría'}
                          </p>
                          <p className="truncate text-[10.5px] text-muted">
                            Tutor: {bloque ? docenteDeBloque(bloque) : item.tutoria.docente || 'Por confirmar'}
                          </p>
                          <p className="truncate text-[10px] text-muted">
                            {item.horaInicio} – {item.horaFin} ·{' '}
                            {bloque ? modalidadLegible(bloque.modalidad) : 'Modalidad por confirmar'}
                          </p>
                        </div>

                        {puedeCancelar && (
                          <button
                            type="button"
                            onClick={() => abrirCancelacion(item.tutoria)}
                            title="Cancelar tutoría"
                            aria-label={`Cancelar ${item.tutoria.tema || 'la tutoría'}`}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-peligro transition-colors hover:bg-peligro hover:text-white"
                          >
                            <CloseIcon className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-4 border-t border-faint pt-3">
                <p className="text-[10px] leading-relaxed text-muted">
                  Las tutorías finalizadas o canceladas se muestran en tu Historial.
                </p>
                {proximas.length > 4 && (
                  <Link
                    to="/estudiante/mis-reservas"
                    className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-ink hover:text-violeta-accion"
                  >
                    Ver todas
                    <ArrowIcon className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </motion.aside>
          </div>
        </div>
      </main>

      {/* ---------------------- Modal reserva ---------------------- */}
      <AnimatePresence>
        {bloqueReserva && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-tinta/40 p-4 backdrop-blur-sm sm:items-center"
            onClick={() => setBloqueReserva(null)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-reserva"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.22 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-lg overflow-hidden rounded-[28px] bg-white shadow-constelacion-float"
            >
              <div className="flex items-start justify-between gap-3 px-6 pt-6 sm:px-7">
                <div>
                  <p className="text-[11px] font-medium text-muted">Nueva reserva</p>
                  <h2 id="titulo-reserva" className="mt-1 text-[22px] font-semibold tracking-[-0.01em]">
                    Reservar tutoría
                  </h2>
                </div>
                <BotonCerrar onClick={() => setBloqueReserva(null)} label="Cerrar" />
              </div>

              <form onSubmit={confirmarReserva} className="px-6 pb-6 pt-4 sm:px-7 sm:pb-7">
                <div className="rounded-2xl bg-mist px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${temaDeMateria(bloqueReserva.materia).dot}`} />
                    <p className="text-[12px] font-semibold text-tinta">
                      {nombreMateria(bloqueReserva)}
                    </p>
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted">
                    {docenteDeBloque(bloqueReserva)}
                    <span className="mx-1.5 text-pebble">·</span>
                    {diaYNumero(bloqueReserva.fecha)}
                    <span className="mx-1.5 text-pebble">·</span>
                    {horaCorta(bloqueReserva.hora_inicio)} – {horaCorta(bloqueReserva.hora_fin)}
                  </p>
                  <p className="mt-1 truncate text-[10.5px] text-muted">
                    {modalidadLegible(bloqueReserva.modalidad)}
                    <span className="mx-1.5 text-pebble">·</span>
                    {lugarDeBloque(bloqueReserva)}
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

                <label htmlFor="descripcion-reserva" className="mt-4 block text-[11px] font-medium text-slate-ink">
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

                {errorReserva && (
                  <p className="mt-3 rounded-xl bg-peligro/10 px-3 py-2 text-[11px] text-peligro">
                    {errorReserva}
                  </p>
                )}

                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setBloqueReserva(null)}
                    className="h-11 rounded-full border border-faint px-5 text-[12px] font-medium text-slate-ink transition-colors hover:bg-mist"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={enviandoReserva}
                    className="h-11 rounded-full bg-violeta-accion px-6 text-[12px] font-medium text-white shadow-constelacion-violet transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {enviandoReserva ? 'Reservando...' : 'Confirmar reserva'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --------------------- Modal cancelar --------------------- */}
      <AnimatePresence>
        {tutoriaCancelar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-tinta/40 p-4 backdrop-blur-sm sm:items-center"
            onClick={() => setTutoriaCancelar(null)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-cancelar"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.22 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-constelacion-float"
            >
              <div className="flex items-start justify-between gap-3 px-6 pt-6 sm:px-7">
                <div>
                  <p className="text-[11px] font-medium text-peligro">Cancelar reserva</p>
                  <h2 id="titulo-cancelar" className="mt-1 text-[22px] font-semibold tracking-[-0.01em]">
                    ¿Cancelar esta tutoría?
                  </h2>
                </div>
                <BotonCerrar onClick={() => setTutoriaCancelar(null)} label="Cerrar" />
              </div>

              <form onSubmit={confirmarCancelacion} className="px-6 pb-6 pt-4 sm:px-7 sm:pb-7">
                <div className="rounded-2xl bg-mist px-4 py-3.5">
                  <p className="text-[12px] font-semibold text-tinta">
                    {tutoriaCancelar.tema || 'Tutoría'}
                  </p>
                  <p className="mt-1 text-[11px] text-muted">
                    {bloqueCancelar
                      ? docenteDeBloque(bloqueCancelar)
                      : tutoriaCancelar.docente || 'Docente por confirmar'}
                  </p>
                  {bloqueCancelar && (
                    <p className="mt-0.5 text-[10.5px] text-muted">
                      {diaYNumero(bloqueCancelar.fecha)}
                      <span className="mx-1.5 text-pebble">·</span>
                      {horaCorta(bloqueCancelar.hora_inicio)} – {horaCorta(bloqueCancelar.hora_fin)}
                      <span className="mx-1.5 text-pebble">·</span>
                      {modalidadLegible(bloqueCancelar.modalidad)}
                    </p>
                  )}
                </div>

                <p className="mt-4 text-[11px] leading-relaxed text-muted">
                  Al cancelar, el cupo vuelve a quedar disponible para otros estudiantes.
                  Cuéntanos el motivo para completar el proceso.
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

                {errorCancelar && (
                  <p className="mt-3 rounded-xl bg-peligro/10 px-3 py-2 text-[11px] text-peligro">
                    {errorCancelar}
                  </p>
                )}

                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setTutoriaCancelar(null)}
                    className="h-11 rounded-full border border-faint px-5 text-[12px] font-medium text-slate-ink transition-colors hover:bg-mist"
                  >
                    Conservar tutoría
                  </button>
                  <button
                    type="submit"
                    disabled={enviandoCancelar}
                    className="h-11 rounded-full bg-peligro px-6 text-[12px] font-medium text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {enviandoCancelar ? 'Cancelando...' : 'Sí, cancelar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------------------- Toast ---------------------------- */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-6 right-6 z-[60] flex max-w-sm items-center gap-3 rounded-full bg-tinta px-5 py-3 text-[12px] font-medium text-white shadow-constelacion-float"
            role="status"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-exito text-white">
              <CheckIcon className="h-3.5 w-3.5" />
            </span>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentPanel;

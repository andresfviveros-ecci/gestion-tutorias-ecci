import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../../api/axios';
import { useAuthStore } from '../../store/useAuthStore';
import { StudentRail } from '../../components/estudiante/StudentRail';
import { ArrowIcon, CalendarIcon } from '../../components/constelacion/Icons';
import { StatCard } from '../../components/constelacion/StatCard';
import { EmptyState } from '../../components/constelacion/EmptyState';
import { DaySelector } from '../../components/constelacion/DaySelector';
import type { DiaOpcion } from '../../components/constelacion/DaySelector';
import { FilterChips, SegmentedFilter } from '../../components/constelacion/Filters';
import type { OpcionSegmento } from '../../components/constelacion/Filters';
import { Toast } from '../../components/constelacion/Toast';
import { ProximaTutoriaCard } from '../../components/estudiante/panel/ProximaTutoriaCard';
import type { ProximaVista } from '../../components/estudiante/panel/ProximaTutoriaCard';
import { CupoCard } from '../../components/estudiante/panel/CupoCard';
import { MisProximasList } from '../../components/estudiante/panel/MisProximasList';
import type { ItemProximo } from '../../components/estudiante/panel/MisProximasList';
import { ReservaModal } from '../../components/estudiante/panel/ReservaModal';
import { CancelarModal } from '../../components/estudiante/panel/CancelarModal';
import type { DetalleCancelacion } from '../../components/estudiante/panel/CancelarModal';
import { temaDeMateria } from '../../components/constelacion/temas';
import type {
  Bloque,
  DatosPanel,
  Materia,
  ModalidadFiltro,
  ProximaTutoria,
  Tutoria,
  Tutor,
} from '../../types/panel';
import { extraerLista } from '../../utils/api';
import {
  aISOFecha,
  diaSemanaCorto,
  diaYNumero,
  diasDeLaSemana,
  etiquetaRelativa,
  fechaLarga,
  hoyISO,
  horaCorta,
} from '../../utils/fechas';
import { modalidadLegible, nombreTutor } from '../../utils/panel';

const OPCIONES_MODALIDAD: OpcionSegmento<ModalidadFiltro>[] = [
  { valor: 'TODAS', texto: 'Todas' },
  { valor: 'VIRTUAL', texto: 'Virtual' },
  { valor: 'PRESENCIAL', texto: 'Presencial' },
];

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

export const StudentPanel = () => {
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
  const [tutoriaCancelar, setTutoriaCancelar] = useState<Tutoria | null>(null);
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

  const dias = useMemo(() => diasDeLaSemana(), []);

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

  const opcionesDia: DiaOpcion[] = dias.map((dia) => {
    const iso = aISOFecha(dia);
    const cantidad = conteoPorDia.get(iso) || 0;

    return {
      iso,
      etiqueta: diaSemanaCorto(iso),
      numero: dia.getDate(),
      cantidad,
      esHoy: iso === referenciaHoy,
      esPasado: iso < referenciaHoy,
      ariaLabel: `${diaYNumero(iso)}${cantidad ? `, ${cantidad} horarios` : ', sin horarios'}`,
    };
  });

  const chipsMaterias = materiasChips.map((materia) => ({
    id: materia.id,
    texto: materia.nombre,
    color: temaDeMateria(materia.id).dot,
  }));

  /* --------------------------- acciones ---------------------------- */

  const abrirReserva = (bloque: Bloque) => {
    setBloqueReserva(bloque);
  };

  const abrirCancelacion = (id: number) => {
    setTutoriaCancelar(tutorias.find((tutoria) => tutoria.id === id) ?? null);
  };

  const confirmarReserva = async (datos: { tema: string; descripcion: string }) => {
    if (!bloqueReserva) return;

    await api.post('/tutorias/tutorias/', {
      bloque_id: Number(bloqueReserva.id),
      tema: datos.tema,
      descripcion: datos.descripcion,
    });

    setBloqueReserva(null);
    setToast('Tutoría reservada. Te esperamos.');
    await recargar();
  };

  const confirmarCancelacion = async (motivo: string) => {
    if (!tutoriaCancelar) return;

    await api.delete(`/tutorias/tutorias/${tutoriaCancelar.id}/`, {
      data: { origen: 'ESTUDIANTE', motivo },
    });

    setTutoriaCancelar(null);
    setToast('La tutoría fue cancelada y el cupo quedó libre.');
    await recargar();
  };

  /* --------------------------- render ----------------------------- */

  const bloqueProxima = proxima?.bloque ?? null;

  const proximaVista: ProximaVista | null = proxima
    ? {
        tema: proxima.tutoria.tema || (bloqueProxima ? nombreMateria(bloqueProxima) : 'Tutoría'),
        docente: bloqueProxima ? docenteDeBloque(bloqueProxima) : 'Docente por confirmar',
        materia: bloqueProxima ? nombreMateria(bloqueProxima) : '',
        modalidad: bloqueProxima ? modalidadLegible(bloqueProxima.modalidad) : '',
        relativa: etiquetaRelativa(proxima.fecha),
        fechaTexto: diaYNumero(proxima.fecha),
        horaInicio: proxima.horaInicio,
        horaFin: proxima.horaFin,
        enlaceVirtual: bloqueProxima?.enlace_virtual || '',
        conBloque: Boolean(bloqueProxima),
      }
    : null;

  const itemsProximos: ItemProximo[] = proximas.slice(0, 4).map((item) => ({
    id: item.tutoria.id,
    titulo: item.tutoria.tema || 'Tutoría',
    fecha: item.fecha,
    horaInicio: item.horaInicio,
    horaFin: item.horaFin,
    docente: item.bloque
      ? docenteDeBloque(item.bloque)
      : item.tutoria.docente || 'Por confirmar',
    modalidad: item.bloque
      ? modalidadLegible(item.bloque.modalidad)
      : 'Modalidad por confirmar',
    puedeCancelar: (item.tutoria.estado || '').toUpperCase() === 'RESERVADA',
  }));

  const bloqueCancelar = tutoriaCancelar ? obtenerBloque(tutoriaCancelar) : null;

  const detalleCancelacion: DetalleCancelacion | null = bloqueCancelar
    ? {
        fechaTexto: diaYNumero(bloqueCancelar.fecha),
        horaInicio: horaCorta(bloqueCancelar.hora_inicio),
        horaFin: horaCorta(bloqueCancelar.hora_fin),
        modalidad: modalidadLegible(bloqueCancelar.modalidad),
      }
    : null;

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
                <ProximaTutoriaCard cargando={cargando} proxima={proximaVista} />
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

                <DaySelector
                  dias={opcionesDia}
                  seleccionado={diaSeleccionado}
                  onSeleccionar={setDiaSeleccionado}
                />

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <SegmentedFilter
                    opciones={OPCIONES_MODALIDAD}
                    valor={modalidad}
                    onChange={setModalidad}
                  />

                  <FilterChips
                    items={chipsMaterias}
                    activo={materiaFiltro}
                    onToggle={(id) => setMateriaFiltro(materiaFiltro === id ? null : id)}
                    tituloActivo="Quitar filtro de materia"
                    tituloInactivo={(texto) => `Filtrar por ${texto}`}
                  />
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
                    <EmptyState
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
                    {visibles.map((bloque) => (
                      <CupoCard
                        key={bloque.id}
                        fechaTexto={diaYNumero(bloque.fecha)}
                        horaInicio={horaCorta(bloque.hora_inicio)}
                        horaFin={horaCorta(bloque.hora_fin)}
                        modalidad={modalidadLegible(bloque.modalidad)}
                        docente={docenteDeBloque(bloque)}
                        materia={nombreMateria(bloque)}
                        codigo={codigoMateria(bloque)}
                        lugar={lugarDeBloque(bloque)}
                        cupoTotal={bloque.cupo_total}
                        cupoOcupado={bloque.cupo_ocupado}
                        tema={temaDeMateria(bloque.materia)}
                        onReservar={() => abrirReserva(bloque)}
                      />
                    ))}
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
            <MisProximasList
              items={itemsProximos}
              total={proximas.length}
              cargando={cargando}
              onCancelar={abrirCancelacion}
            />
          </div>
        </div>
      </main>

      {/* ---------------------- Modal reserva ---------------------- */}
      <AnimatePresence>
        {bloqueReserva && (
          <ReservaModal
            bloque={bloqueReserva}
            materia={nombreMateria(bloqueReserva)}
            docente={docenteDeBloque(bloqueReserva)}
            lugar={lugarDeBloque(bloqueReserva)}
            onCerrar={() => setBloqueReserva(null)}
            onConfirmar={confirmarReserva}
          />
        )}
      </AnimatePresence>

      {/* --------------------- Modal cancelar --------------------- */}
      <AnimatePresence>
        {tutoriaCancelar && (
          <CancelarModal
            tutoria={tutoriaCancelar}
            docente={
              bloqueCancelar
                ? docenteDeBloque(bloqueCancelar)
                : tutoriaCancelar.docente || 'Docente por confirmar'
            }
            detalle={detalleCancelacion}
            onCerrar={() => setTutoriaCancelar(null)}
            onConfirmar={confirmarCancelacion}
          />
        )}
      </AnimatePresence>

      {/* ---------------------------- Toast ---------------------------- */}
      <Toast mensaje={toast} />
    </div>
  );
};

export default StudentPanel;

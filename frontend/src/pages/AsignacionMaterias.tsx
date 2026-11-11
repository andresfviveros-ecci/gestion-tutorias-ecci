import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader } from '../components/Loader';
import {
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  SearchIcon,
} from '../components/constelacion/Icons';
import { EmptyState } from '../components/constelacion/EmptyState';
import { Toast } from '../components/constelacion/Toast';
import { temaDeMateria } from '../components/constelacion/temas';
import { api } from '../api/axios';
import { extraerLista, mensajeError } from '../utils/api';

interface TutorAPI {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  documento?: string;
  is_active?: boolean;
}

interface MateriaAPI {
  id: number;
  codigo: string;
  nombre: string;
  activa?: boolean;
}

interface PeriodoAPI {
  id: number;
  codigo: string;
  activo: boolean;
}

interface AsignacionAPI {
  id: number;
  docente: number;
  materia: number;
  periodo: number;
  materia_nombre?: string;
}

type FiltroEstado = 'todos' | 'con' | 'sin';

const inputClass =
  'h-10 w-full rounded-xl border border-faint bg-white px-3.5 text-[12px] text-tinta outline-none transition-colors placeholder:text-pebble focus:border-violeta-accion';

/** Minúsculas y sin tildes, para que la búsqueda no dependa de cómo se escriba. */
const normalizar = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const nombreDe = (tutor: TutorAPI): string =>
  `${tutor.first_name ?? ''} ${tutor.last_name ?? ''}`.trim() || tutor.username;

const iniciales = (texto: string): string =>
  texto
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('');

/** "Bases de Datos" -> "BD", "Programación Orientada a Objetos" -> "PO". */
const inicialesMateria = (nombre: string): string => {
  const palabras = nombre.split(/\s+/).filter((parte) => parte.length > 2);
  const inicialesTexto = palabras
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('');
  return inicialesTexto || nombre.slice(0, 2).toUpperCase();
};

/**
 * Asignación de materias a tutores (GT-249, HU-038).
 *
 * Solo frontend: usa `docentes-materias` para listar, crear y eliminar. El
 * backend hoy solo devuelve y acepta usuarios del grupo Docente, así que los
 * tutores estudiantes aparecerán cuando se amplíe ese endpoint (GT-251).
 */
export const AsignacionMaterias = () => {
  const [cargando, setCargando] = useState(true);
  const [tutores, setTutores] = useState<TutorAPI[]>([]);
  const [materias, setMaterias] = useState<MateriaAPI[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionAPI[]>([]);
  const [periodo, setPeriodo] = useState<PeriodoAPI | null>(null);

  const [busquedaTutor, setBusquedaTutor] = useState('');
  const [estado, setEstado] = useState<FiltroEstado>('todos');
  const [tutorId, setTutorId] = useState<number | null>(null);

  const [busquedaMateria, setBusquedaMateria] = useState('');
  const [seleccion, setSeleccion] = useState<number[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const recargarAsignaciones = useCallback(async (periodoId: number) => {
    const { data } = await api.get('/catalogo/docentes-materias/', {
      params: { periodo: periodoId },
    });
    setAsignaciones(extraerLista<AsignacionAPI>(data));
  }, []);

  useEffect(() => {
    let activo = true;

    const cargar = async () => {
      const [resTutores, resMaterias, resPeriodos] = await Promise.allSettled([
        api.get('/accounts/tutores/'),
        api.get('/catalogo/materias/'),
        api.get('/catalogo/periodos/'),
      ]);

      if (!activo) return;

      const listaTutores =
        resTutores.status === 'fulfilled' ? extraerLista<TutorAPI>(resTutores.value.data) : [];
      const listaMaterias =
        resMaterias.status === 'fulfilled' ? extraerLista<MateriaAPI>(resMaterias.value.data) : [];
      const listaPeriodos =
        resPeriodos.status === 'fulfilled' ? extraerLista<PeriodoAPI>(resPeriodos.value.data) : [];

      const periodoActual = listaPeriodos.find((item) => item.activo) ?? listaPeriodos[0] ?? null;

      setTutores(listaTutores);
      setMaterias(listaMaterias);
      setPeriodo(periodoActual);
      setTutorId((previo) => previo ?? listaTutores[0]?.id ?? null);

      if (resTutores.status === 'rejected' && resMaterias.status === 'rejected') {
        setError('No pudimos cargar los tutores y las materias. Revisa tu conexión e inténtalo de nuevo.');
      }

      if (periodoActual) {
        try {
          await recargarAsignaciones(periodoActual.id);
        } catch {
          if (activo) setError('No pudimos cargar las materias ya asignadas.');
        }
      }

      if (activo) setCargando(false);
    };

    void cargar();

    return () => {
      activo = false;
    };
  }, [recargarAsignaciones]);

  useEffect(() => {
    if (!toast) return;
    const temporizador = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(temporizador);
  }, [toast]);

  const asignacionesPorTutor = useMemo(() => {
    const mapa = new Map<number, AsignacionAPI[]>();
    asignaciones
      .filter((asignacion) => !periodo || asignacion.periodo === periodo.id)
      .forEach((asignacion) => {
        const lista = mapa.get(asignacion.docente) ?? [];
        lista.push(asignacion);
        mapa.set(asignacion.docente, lista);
      });
    return mapa;
  }, [asignaciones, periodo]);

  const tutoresFiltrados = useMemo(() => {
    const consulta = normalizar(busquedaTutor);

    return tutores.filter((tutor) => {
      const coincide =
        !consulta || normalizar(`${nombreDe(tutor)} ${tutor.email}`).includes(consulta);
      const cantidad = asignacionesPorTutor.get(tutor.id)?.length ?? 0;
      const coincideEstado =
        estado === 'todos' || (estado === 'con' ? cantidad > 0 : cantidad === 0);
      return coincide && coincideEstado;
    });
  }, [tutores, busquedaTutor, estado, asignacionesPorTutor]);

  const tutorSeleccionado = useMemo(
    () => tutores.find((tutor) => tutor.id === tutorId) ?? null,
    [tutores, tutorId],
  );

  const materiasPorId = useMemo(
    () => new Map(materias.map((materia) => [materia.id, materia])),
    [materias],
  );

  const asignadasDelTutor = useMemo(
    () => (tutorId === null ? [] : (asignacionesPorTutor.get(tutorId) ?? [])),
    [asignacionesPorTutor, tutorId],
  );

  const asignadasIds = useMemo(
    () => new Set(asignadasDelTutor.map((asignacion) => asignacion.materia)),
    [asignadasDelTutor],
  );

  const materiasDisponibles = useMemo(() => {
    const consulta = normalizar(busquedaMateria);

    return materias
      .filter((materia) => materia.activa !== false)
      .filter(
        (materia) =>
          !consulta ||
          normalizar(`${materia.nombre} ${materia.codigo}`).includes(consulta),
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [materias, busquedaMateria]);

  const seleccionarTutor = (id: number) => {
    setTutorId(id);
    setSeleccion([]);
    setBusquedaMateria('');
    setError(null);
  };

  const alternarMateria = (materiaId: number) => {
    if (asignadasIds.has(materiaId)) return;
    setError(null);
    setSeleccion((previo) =>
      previo.includes(materiaId)
        ? previo.filter((id) => id !== materiaId)
        : [...previo, materiaId],
    );
  };

  const asignar = async () => {
    if (!tutorSeleccionado || !periodo || seleccion.length === 0) return;

    setGuardando(true);
    setError(null);

    let fallos = 0;
    let primerFallo = '';

    for (const materiaId of seleccion) {
      try {
        await api.post('/catalogo/docentes-materias/', {
          docente: tutorSeleccionado.id,
          materia: materiaId,
          periodo: periodo.id,
        });
      } catch (err) {
        fallos += 1;
        if (!primerFallo) primerFallo = mensajeError(err);
      }
    }

    try {
      await recargarAsignaciones(periodo.id);
    } catch {
      // Se conserva lo que ya estaba en pantalla.
    }

    const total = seleccion.length;
    setSeleccion([]);
    setGuardando(false);

    if (fallos === 0) {
      setToast(total === 1 ? 'Materia asignada al tutor.' : `${total} materias asignadas al tutor.`);
      return;
    }

    setError(
      fallos === total
        ? primerFallo
        : `${primerFallo} (${total - fallos} de ${total} materias se asignaron).`,
    );
  };

  const quitar = async (asignacion: AsignacionAPI) => {
    if (!periodo) return;

    setGuardando(true);
    setError(null);

    try {
      await api.delete(`/catalogo/docentes-materias/${asignacion.id}/`);
      await recargarAsignaciones(periodo.id);
      setToast('Materia quitada del tutor.');
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="min-h-screen bg-mist font-constelacion text-tinta">
      <Loader hidden={!cargando} />

      <main className="mx-auto w-full max-w-[1500px] px-5 py-6 pb-24 sm:px-7 lg:px-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11.5px] text-muted">Materias · Administrador</p>
            <h1 className="mt-1 text-[30px] font-medium leading-tight tracking-[-0.02em] text-tinta sm:text-[36px]">
              Asignación de materias
            </h1>
            <p className="mt-1 max-w-[620px] text-[13px] leading-relaxed text-muted">
              Define en qué materias puede ofrecer tutorías cada tutor. Los estudiantes solo ven
              tutores autorizados para la materia que buscan.
            </p>
          </div>

          <div className="rounded-[22px] bg-white px-4 py-3 text-right">
            <p className="text-[10.5px] text-muted">Periodo académico</p>
            <p className="mt-0.5 text-[13.5px] font-medium text-tinta">
              {periodo ? periodo.codigo : 'Sin periodo activo'}
            </p>
          </div>
        </header>

        {!cargando && !periodo && (
          <div
            role="status"
            className="mb-4 rounded-2xl border border-advertencia/30 bg-advertencia/5 px-4 py-3 text-advertencia"
          >
            <p className="text-[12.5px] font-semibold">No hay un periodo académico activo</p>
            <p className="mt-1 text-[11.5px] leading-relaxed opacity-90">
              Las materias se asignan por periodo. Activa un periodo en coordinación para poder
              guardar cambios.
            </p>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-2xl border border-peligro/30 bg-peligro/5 px-4 py-3 text-peligro"
          >
            <p className="text-[12.5px] font-semibold">No pudimos completar la operación</p>
            <p className="mt-1 text-[11.5px] leading-relaxed opacity-90">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_430px]">
          {/* --------------------------- Tutores --------------------------- */}
          <section className="rounded-[32px] bg-white p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_210px]">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-medium text-slate-ink">Tutor</span>
                <span className="relative block">
                  <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pebble" />
                  <input
                    type="search"
                    value={busquedaTutor}
                    onChange={(event) => setBusquedaTutor(event.target.value)}
                    placeholder="Buscar por nombre o correo"
                    className={`${inputClass} pl-10`}
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-medium text-slate-ink">Estado</span>
                <select
                  value={estado}
                  onChange={(event) => setEstado(event.target.value as FiltroEstado)}
                  className={inputClass}
                >
                  <option value="todos">Todos</option>
                  <option value="con">Con materias asignadas</option>
                  <option value="sin">Sin materias asignadas</option>
                </select>
              </label>
            </div>

            <div className="mt-5 flex items-center justify-between px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
              <span>Tutor</span>
              <span className="hidden sm:inline">Materias asignadas</span>
            </div>

            <div className="mt-1">
              {tutoresFiltrados.length === 0 ? (
                <EmptyState
                  titulo="No encontramos tutores"
                  detalle={
                    tutores.length === 0
                      ? 'Cuando registres tutores aparecerán en esta lista.'
                      : 'Prueba con otro nombre, correo o filtro de estado.'
                  }
                />
              ) : (
                <ul className="divide-y divide-faint">
                  {tutoresFiltrados.map((tutor) => {
                    const asignadas = asignacionesPorTutor.get(tutor.id) ?? [];
                    const seleccionado = tutor.id === tutorId;

                    return (
                      <li key={tutor.id}>
                        <button
                          type="button"
                          onClick={() => seleccionarTutor(tutor.id)}
                          aria-pressed={seleccionado}
                          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors ${
                            seleccionado ? 'bg-violet-wash/25' : 'hover:bg-mist'
                          }`}
                        >
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
                              seleccionado ? 'bg-violeta-accion text-white' : 'bg-arena text-tinta'
                            }`}
                          >
                            {iniciales(nombreDe(tutor))}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium text-tinta">
                              {nombreDe(tutor)}
                            </span>
                            <span className="block truncate text-[11px] text-muted">
                              {tutor.email}
                            </span>
                          </span>

                          <span className="flex shrink-0 items-center gap-2">
                            <span className="hidden items-center -space-x-1 sm:flex">
                              {asignadas.slice(0, 4).map((asignacion) => (
                                <span
                                  key={asignacion.id}
                                  className={`h-2 w-2 rounded-full ring-2 ring-white ${
                                    temaDeMateria(asignacion.materia).dot
                                  }`}
                                />
                              ))}
                            </span>
                            <span className="hidden text-[11px] text-muted sm:inline">
                              {asignadas.length === 0
                                ? 'Sin materias'
                                : `${asignadas.length} ${
                                    asignadas.length === 1 ? 'materia' : 'materias'
                                  }`}
                            </span>
                            <ChevronRightIcon className="h-3.5 w-3.5 text-pebble" />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* ------------------------ Panel lateral ------------------------ */}
          <aside className="rounded-[32px] bg-white p-5 sm:p-6">
            {!tutorSeleccionado ? (
              <EmptyState
                titulo="Selecciona un tutor"
                detalle="Elige un tutor de la lista para ver y asignar sus materias."
              />
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-arena text-[14px] font-semibold text-tinta">
                    {iniciales(nombreDe(tutorSeleccionado))}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-medium text-tinta">
                      {nombreDe(tutorSeleccionado)}
                    </p>
                    <p
                      className={`mt-0.5 flex items-center gap-1 text-[11px] ${
                        tutorSeleccionado.is_active === false ? 'text-muted' : 'text-exito'
                      }`}
                    >
                      <CheckIcon className="h-3 w-3" />
                      {tutorSeleccionado.is_active === false ? 'Inactivo' : 'Docente activo'}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-faint pt-4">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">
                    Materias autorizadas
                  </p>
                  <span className="text-[11px] text-muted">{asignadasDelTutor.length}</span>
                </div>

                {asignadasDelTutor.length === 0 ? (
                  <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
                    Este tutor todavía no tiene materias asignadas.
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {asignadasDelTutor.map((asignacion) => {
                      const materia = materiasPorId.get(asignacion.materia);
                      const nombre =
                        materia?.nombre ?? asignacion.materia_nombre ?? `Materia ${asignacion.materia}`;

                      return (
                        <li
                          key={asignacion.id}
                          className="inline-flex items-center gap-1.5 rounded-full bg-mist py-1 pl-2.5 pr-1.5 text-[11px] text-slate-ink"
                        >
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              temaDeMateria(asignacion.materia).dot
                            }`}
                          />
                          {nombre}
                          <button
                            type="button"
                            onClick={() => quitar(asignacion)}
                            disabled={guardando}
                            aria-label={`Quitar ${nombre}`}
                            title="Quitar materia"
                            className="flex h-5 w-5 items-center justify-center rounded-full text-pebble transition-colors hover:bg-white hover:text-peligro disabled:opacity-40"
                          >
                            <CloseIcon className="h-2.5 w-2.5" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <div className="mt-5 border-t border-faint pt-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[12.5px] font-medium text-tinta">Asignar materias</p>
                    <p className="text-[10.5px] text-muted">Elige una o varias</p>
                  </div>

                  <span className="relative mt-2 block">
                    <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pebble" />
                    <input
                      type="search"
                      value={busquedaMateria}
                      onChange={(event) => setBusquedaMateria(event.target.value)}
                      placeholder="Buscar materia o código"
                      className={`${inputClass} pl-10`}
                    />
                  </span>

                  <div className="mt-2 max-h-[300px] space-y-0.5 overflow-y-auto pr-1">
                    {materiasDisponibles.length === 0 ? (
                      <p className="py-5 text-center text-[11px] text-muted">
                        No encontramos materias con esa búsqueda.
                      </p>
                    ) : (
                      materiasDisponibles.map((materia) => {
                        const asignada = asignadasIds.has(materia.id);
                        const marcada = seleccion.includes(materia.id);
                        const tema = temaDeMateria(materia.id);

                        return (
                          <button
                            key={materia.id}
                            type="button"
                            onClick={() => alternarMateria(materia.id)}
                            disabled={asignada || guardando}
                            aria-pressed={asignada || marcada}
                            className={`flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-colors ${
                              asignada
                                ? 'cursor-default opacity-70'
                                : 'hover:bg-mist disabled:opacity-60'
                            } ${marcada ? 'bg-violet-wash/20' : ''}`}
                          >
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[10px] font-semibold ${tema.bg} ${tema.text}`}
                            >
                              {inicialesMateria(materia.nombre)}
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[12px] font-medium text-tinta">
                                {materia.nombre}
                              </span>
                              <span className="block truncate text-[10.5px] text-muted">
                                {materia.codigo}
                              </span>
                            </span>

                            {asignada ? (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-exito/10 px-2 py-1 text-[10px] font-semibold text-exito">
                                <CheckIcon className="h-3 w-3" />
                                Ya asignada
                              </span>
                            ) : (
                              <span
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                                  marcada
                                    ? 'border-violeta-accion bg-violeta-accion text-white'
                                    : 'border-pebble'
                                }`}
                              >
                                {marcada && <CheckIcon className="h-2.5 w-2.5" />}
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSeleccion([]);
                        setBusquedaMateria('');
                      }}
                      disabled={guardando}
                      className="rounded-full border border-faint px-4 py-2 text-[11.5px] font-medium text-slate-ink transition-colors hover:bg-mist disabled:opacity-40"
                    >
                      Limpiar
                    </button>
                    <button
                      type="button"
                      onClick={asignar}
                      disabled={guardando || seleccion.length === 0 || !periodo}
                      className="rounded-full bg-violeta-accion px-4 py-2 text-[11.5px] font-medium text-white transition-colors hover:bg-violeta-profundo disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {guardando
                        ? 'Guardando...'
                        : seleccion.length > 1
                          ? `Asignar ${seleccion.length} materias`
                          : 'Asignar materias'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </aside>
        </div>
      </main>

      <Toast mensaje={toast} />
    </div>
  );
};

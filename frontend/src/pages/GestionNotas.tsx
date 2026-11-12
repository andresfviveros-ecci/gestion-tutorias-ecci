import { useEffect, useMemo, useState } from 'react';
import { AdminRail } from '../components/admin/AdminRail';
import { EmptyState } from '../components/constelacion/EmptyState';
import { Modal } from '../components/constelacion/Modal';
import { SkeletonFilas } from '../components/constelacion/Skeleton';
import { Toast } from '../components/constelacion/Toast';
import { SearchIcon } from '../components/constelacion/Icons';
import { api } from '../api/axios';
import { extraerLista, mensajeError } from '../utils/api';

interface EstudianteAPI {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  documento?: string | number;
  semestre?: number | null;
}

interface PeriodoAPI {
  id: number;
  codigo: string;
  activo: boolean;
}

interface MateriaAPI {
  id: number;
  codigo: string;
  nombre: string;
}

interface InscripcionAPI {
  id: number;
  estudiante: number;
  estudiante_nombre?: string;
  materia: number;
  materia_nombre?: string;
  periodo: number;
  periodo_codigo?: string;
  nota_corte1: string | null;
  nota_corte2: string | null;
  nota_corte3: string | null;
  nota_final: string | null;
}

interface ConfigAPI {
  nota_aprobatoria?: string | number;
}

const inputClass =
  'h-10 w-full rounded-xl border border-faint bg-white px-3.5 text-[12px] text-tinta outline-none transition-colors placeholder:text-pebble focus:border-violeta-accion';

const inputNota =
  'h-9 w-[72px] rounded-lg border border-faint bg-white px-2 text-center text-[12px] text-tinta outline-none transition-colors placeholder:text-pebble focus:border-violeta-accion';

const normalizar = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const nombreDe = (estudiante: EstudianteAPI): string =>
  `${estudiante.first_name ?? ''} ${estudiante.last_name ?? ''}`.trim() ||
  estudiante.username ||
  'Estudiante';

const iniciales = (texto: string): string =>
  texto
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('') || 'E';

const numeroONull = (texto: string): number | null => {
  const limpio = texto.trim().replace(',', '.');
  if (!limpio) return null;
  const valor = Number(limpio);
  return Number.isFinite(valor) ? valor : null;
};

interface FilaInscripcionProps {
  inscripcion: InscripcionAPI;
  aprobatoria: number;
  onGuardada: (inscripcion: InscripcionAPI) => void;
  onEliminar: (inscripcion: InscripcionAPI) => void;
}

const FilaInscripcion = ({
  inscripcion,
  aprobatoria,
  onGuardada,
  onEliminar,
}: FilaInscripcionProps) => {
  const [corte1, setCorte1] = useState(inscripcion.nota_corte1 ?? '');
  const [corte2, setCorte2] = useState(inscripcion.nota_corte2 ?? '');
  const [corte3, setCorte3] = useState(inscripcion.nota_corte3 ?? '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notaFinal = inscripcion.nota_final == null ? null : Number(inscripcion.nota_final);
  const aprobada = notaFinal != null && notaFinal >= aprobatoria;

  const guardar = async () => {
    const valores = [corte1, corte2, corte3].map(numeroONull);
    const invalido = [corte1, corte2, corte3].some(
      (texto, indice) =>
        texto.trim() !== '' &&
        (valores[indice] === null || valores[indice]! < 0 || valores[indice]! > 5),
    );

    if (invalido) {
      setError('Las notas deben estar entre 0,0 y 5,0.');
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      const { data } = await api.patch<InscripcionAPI>(
        `/catalogo/inscripciones/${inscripcion.id}/`,
        {
          nota_corte1: valores[0],
          nota_corte2: valores[1],
          nota_corte3: valores[2],
        },
      );
      onGuardada(data);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <article className="rounded-2xl border border-faint p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-tinta">
            {inscripcion.materia_nombre || `Materia ${inscripcion.materia}`}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            Periodo {inscripcion.periodo_codigo || inscripcion.periodo}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {[
            { id: `c1-${inscripcion.id}`, label: 'Corte 1', value: corte1, set: setCorte1 },
            { id: `c2-${inscripcion.id}`, label: 'Corte 2', value: corte2, set: setCorte2 },
            { id: `c3-${inscripcion.id}`, label: 'Corte 3', value: corte3, set: setCorte3 },
          ].map((campo) => (
            <label key={campo.id} className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">
                {campo.label}
              </span>
              <input
                id={campo.id}
                type="number"
                min={0}
                max={5}
                step={0.01}
                inputMode="decimal"
                value={campo.value}
                onChange={(event) => {
                  campo.set(event.target.value);
                  setError(null);
                }}
                placeholder="—"
                className={inputNota}
              />
            </label>
          ))}

          <div className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">
              Nota final
            </span>
            <span
              className={`inline-flex h-9 min-w-[92px] items-center justify-center rounded-lg px-2.5 text-[12px] font-semibold ${
                notaFinal == null
                  ? 'bg-mist text-muted'
                  : aprobada
                    ? 'bg-exito/10 text-exito'
                    : 'bg-peligro/10 text-peligro'
              }`}
              title="La calcula el backend con los pesos de Configuración."
            >
              {notaFinal == null ? 'Pendiente' : notaFinal.toFixed(2)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => void guardar()}
            disabled={guardando}
            className="h-9 rounded-full bg-violeta-accion px-4 text-[11px] font-semibold text-white transition-colors hover:bg-violeta-profundo disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardando ? 'Guardando...' : 'Guardar notas'}
          </button>

          <button
            type="button"
            onClick={() => onEliminar(inscripcion)}
            className="h-9 rounded-full border border-peligro/40 px-4 text-[11px] font-semibold text-peligro transition-colors hover:bg-peligro/5"
          >
            Quitar
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-[11px] font-medium text-peligro">
          {error}
        </p>
      )}
    </article>
  );
};

/**
 * RF-02 / GT-269: la coordinación consulta las materias cursadas por un
 * estudiante y corrige las notas de los tres cortes. La nota final la calcula
 * el backend; aquí solo se muestra.
 */
export const GestionNotas = () => {
  const [cargando, setCargando] = useState(true);
  const [estudiantes, setEstudiantes] = useState<EstudianteAPI[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoAPI[]>([]);
  const [materias, setMaterias] = useState<MateriaAPI[]>([]);
  const [aprobatoria, setAprobatoria] = useState(3);

  const [busqueda, setBusqueda] = useState('');
  const [estudianteId, setEstudianteId] = useState<number | null>(null);
  const [periodoFiltro, setPeriodoFiltro] = useState('');

  const [inscripciones, setInscripciones] = useState<InscripcionAPI[]>([]);
  const [cargandoNotas, setCargandoNotas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [materiaNueva, setMateriaNueva] = useState('');
  const [agregando, setAgregando] = useState(false);
  const [inscripcionAEliminar, setInscripcionAEliminar] = useState<InscripcionAPI | null>(null);

  useEffect(() => {
    let activo = true;

    const cargar = async () => {
      const [resEstudiantes, resPeriodos, resMaterias, resConfig] = await Promise.allSettled([
        api.get('/accounts/estudiantes/'),
        api.get('/catalogo/periodos/'),
        api.get('/catalogo/materias/'),
        api.get('/catalogo/configuracion/'),
      ]);

      if (!activo) return;

      if (resEstudiantes.status === 'fulfilled') {
        setEstudiantes(extraerLista<EstudianteAPI>(resEstudiantes.value.data));
      }
      if (resPeriodos.status === 'fulfilled') {
        const lista = extraerLista<PeriodoAPI>(resPeriodos.value.data);
        setPeriodos(lista);
        const activoPeriodo = lista.find((periodo) => periodo.activo) ?? lista[0];
        setPeriodoFiltro(activoPeriodo ? String(activoPeriodo.id) : '');
      }
      if (resMaterias.status === 'fulfilled') {
        setMaterias(extraerLista<MateriaAPI>(resMaterias.value.data));
      }
      if (resConfig.status === 'fulfilled') {
        setAprobatoria(Number((resConfig.value.data as ConfigAPI).nota_aprobatoria) || 3);
      }

      if (resEstudiantes.status === 'rejected') {
        setError('No pudimos cargar los estudiantes. Revisa tu conexión e inténtalo de nuevo.');
      }

      setCargando(false);
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

  useEffect(() => {
    if (estudianteId == null) return;

    let activo = true;

    const cargarInscripciones = async () => {
      setCargandoNotas(true);
      setError(null);

      try {
        const { data } = await api.get('/catalogo/inscripciones/', {
          params: { estudiante: estudianteId },
        });
        if (!activo) return;
        setInscripciones(extraerLista<InscripcionAPI>(data));
      } catch (err) {
        if (!activo) return;
        setInscripciones([]);
        setError(mensajeError(err));
      } finally {
        if (activo) setCargandoNotas(false);
      }
    };

    void cargarInscripciones();

    return () => {
      activo = false;
    };
  }, [estudianteId]);

  const estudiantesFiltrados = useMemo(() => {
    const consulta = normalizar(busqueda);
    return estudiantes
      .filter(
        (estudiante) =>
          !consulta ||
          normalizar(`${nombreDe(estudiante)} ${estudiante.documento ?? ''}`).includes(consulta),
      )
      .sort((a, b) => nombreDe(a).localeCompare(nombreDe(b), 'es'));
  }, [estudiantes, busqueda]);

  const estudianteSeleccionado = useMemo(
    () => estudiantes.find((estudiante) => estudiante.id === estudianteId) ?? null,
    [estudiantes, estudianteId],
  );

  const delPeriodo = useMemo(
    () =>
      inscripciones
        .filter(
          (inscripcion) =>
            !periodoFiltro || String(inscripcion.periodo) === String(periodoFiltro),
        )
        .sort((a, b) =>
          (a.materia_nombre ?? '').localeCompare(b.materia_nombre ?? '', 'es'),
        ),
    [inscripciones, periodoFiltro],
  );

  const materiasDisponibles = useMemo(() => {
    const inscritas = new Set(delPeriodo.map((inscripcion) => inscripcion.materia));
    return materias
      .filter((materia) => !inscritas.has(materia.id))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [materias, delPeriodo]);

  const agregar = async () => {
    if (!estudianteId || !periodoFiltro || !materiaNueva) {
      setError('Selecciona la materia y el periodo para registrar la inscripción.');
      return;
    }

    setAgregando(true);
    setError(null);

    try {
      const { data } = await api.post<InscripcionAPI>('/catalogo/inscripciones/', {
        estudiante: estudianteId,
        materia: Number(materiaNueva),
        periodo: Number(periodoFiltro),
      });
      setInscripciones((previo) => [...previo, data]);
      setMateriaNueva('');
      setToast('Materia cursada registrada.');
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setAgregando(false);
    }
  };

  const guardarInscripcion = (actualizada: InscripcionAPI) => {
    setInscripciones((previo) =>
      previo.map((inscripcion) =>
        inscripcion.id === actualizada.id ? { ...inscripcion, ...actualizada } : inscripcion,
      ),
    );
    setToast('Notas actualizadas.');
  };

  const eliminar = async () => {
    if (!inscripcionAEliminar) return;

    const eliminada = inscripcionAEliminar;
    setInscripcionAEliminar(null);
    setError(null);

    try {
      await api.delete(`/catalogo/inscripciones/${eliminada.id}/`);
      setInscripciones((previo) =>
        previo.filter((inscripcion) => inscripcion.id !== eliminada.id),
      );
      setToast('Inscripción eliminada.');
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  return (
    <div className="flex min-h-screen bg-mist font-constelacion text-tinta">
      <AdminRail />

      <main className="mx-auto w-full min-w-0 max-w-[1500px] flex-1 px-5 py-6 pb-24 sm:px-7 md:pb-6 lg:px-8">
        <header className="mb-6">
          <p className="text-[11.5px] text-muted">Estudiantes · Coordinación</p>
          <h1 className="mt-1 text-[30px] font-medium leading-tight tracking-[-0.02em] text-tinta sm:text-[36px]">
            Materias cursadas y notas
          </h1>
          <p className="mt-1 max-w-[680px] text-[13px] leading-relaxed text-muted">
            Consulta las materias que cursó un estudiante y corrige las notas de los tres cortes.
            La nota final se calcula con los pesos de Configuración.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-2xl border border-peligro/30 bg-peligro/5 px-4 py-3 text-peligro"
          >
            <p className="text-[12.5px] font-semibold">No pudimos completar la operación</p>
            <p className="mt-1 text-[11.5px] leading-relaxed opacity-90">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          {/* ------------------------- Estudiantes ------------------------- */}
          <section className="rounded-[32px] bg-white p-5 sm:p-6">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium text-slate-ink">
                Buscar estudiante
              </span>
              <span className="relative block">
                <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pebble" />
                <input
                  type="search"
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  placeholder="Nombre o documento"
                  className={`${inputClass} pl-10`}
                />
              </span>
            </label>

            <div className="mt-4 max-h-[560px] overflow-y-auto pr-1">
              {cargando ? (
                <SkeletonFilas filas={6} />
              ) : estudiantesFiltrados.length === 0 ? (
                <EmptyState
                  titulo="No encontramos estudiantes"
                  detalle="Prueba con otro nombre o documento."
                />
              ) : (
                <ul className="space-y-1">
                  {estudiantesFiltrados.map((estudiante) => {
                    const seleccionado = estudiante.id === estudianteId;
                    return (
                      <li key={estudiante.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setEstudianteId(estudiante.id);
                            setInscripciones([]);
                            setMateriaNueva('');
                            setError(null);
                          }}
                          aria-pressed={seleccionado}
                          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors ${
                            seleccionado ? 'bg-violet-wash/25' : 'hover:bg-mist'
                          }`}
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                              seleccionado ? 'bg-violeta-accion text-white' : 'bg-arena text-tinta'
                            }`}
                          >
                            {iniciales(nombreDe(estudiante))}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12.5px] font-medium text-tinta">
                              {nombreDe(estudiante)}
                            </span>
                            <span className="block truncate text-[10.5px] text-muted">
                              {estudiante.documento || estudiante.username || 'Sin documento'}
                              {estudiante.semestre
                                ? ` · Semestre ${estudiante.semestre}`
                                : ' · Sin semestre'}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* ---------------------------- Notas ---------------------------- */}
          <section className="rounded-[32px] bg-white p-5 sm:p-6">
            {!estudianteSeleccionado ? (
              <EmptyState
                titulo="Selecciona un estudiante"
                detalle="Elige un estudiante de la lista para ver sus materias cursadas y notas."
              />
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-[18px] font-medium text-tinta">
                      {nombreDe(estudianteSeleccionado)}
                    </h2>
                    <p className="mt-0.5 text-[11.5px] text-muted">
                      {estudianteSeleccionado.documento || 'Sin documento'}
                      {estudianteSeleccionado.semestre
                        ? ` · Semestre ${estudianteSeleccionado.semestre}`
                        : ' · Sin semestre registrado'}
                    </p>
                  </div>

                  <label className="block">
                    <span className="mb-1 block text-[10.5px] font-semibold text-muted">
                      Periodo
                    </span>
                    <select
                      value={periodoFiltro}
                      onChange={(event) => {
                        setPeriodoFiltro(event.target.value);
                        setMateriaNueva('');
                      }}
                      className={inputClass}
                    >
                      {periodos.map((periodo) => (
                        <option key={periodo.id} value={periodo.id}>
                          {periodo.codigo}
                          {periodo.activo ? ' · activo' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-5 rounded-2xl bg-mist/60 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <select
                      value={materiaNueva}
                      onChange={(event) => setMateriaNueva(event.target.value)}
                      className={inputClass}
                      aria-label="Materia cursada"
                    >
                      <option value="">Agregar una materia cursada...</option>
                      {materiasDisponibles.map((materia) => (
                        <option key={materia.id} value={materia.id}>
                          {materia.nombre} · {materia.codigo}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void agregar()}
                      disabled={agregando || !materiaNueva}
                      className="h-10 shrink-0 rounded-full bg-violeta-accion px-5 text-[11.5px] font-semibold text-white transition-colors hover:bg-violeta-profundo disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {agregando ? 'Agregando...' : 'Agregar materia'}
                    </button>
                  </div>
                  {materiasDisponibles.length === 0 && (
                    <p className="mt-2 text-[10.5px] text-muted">
                      Todas las materias del catálogo ya están registradas en este periodo.
                    </p>
                  )}
                </div>

                <div className="mt-4">
                  {cargandoNotas ? (
                    <div className="space-y-3">
                      {Array.from({ length: 2 }).map((_, indice) => (
                        <div
                          key={indice}
                          className="h-[104px] animate-pulse rounded-2xl border border-faint bg-white"
                        />
                      ))}
                    </div>
                  ) : delPeriodo.length === 0 ? (
                    <EmptyState
                      titulo="Sin materias en este periodo"
                      detalle="Agrega una materia cursada para registrar sus notas."
                    />
                  ) : (
                    <div className="space-y-3">
                      {delPeriodo.map((inscripcion) => (
                        <FilaInscripcion
                          key={`${inscripcion.id}-${inscripcion.nota_corte1 ?? ''}-${
                            inscripcion.nota_corte2 ?? ''
                          }-${inscripcion.nota_corte3 ?? ''}`}
                          inscripcion={inscripcion}
                          aprobatoria={aprobatoria}
                          onGuardada={guardarInscripcion}
                          onEliminar={setInscripcionAEliminar}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <p className="mt-4 text-[10.5px] leading-relaxed text-muted">
                  La materia cuenta como aprobada desde {aprobatoria.toFixed(1)}. El backend
                  calcula la nota final con los pesos 30/30/40 de Configuración.
                </p>
              </>
            )}
          </section>
        </div>
      </main>

      {inscripcionAEliminar && (
        <Modal
          onCerrar={() => setInscripcionAEliminar(null)}
          tituloId="eliminar-inscripcion"
          eyebrow="Quitar materia cursada"
          eyebrowClassName="text-peligro"
          titulo="Quitar la inscripción"
          ancho="md"
        >
          <div className="px-6 pb-6 pt-4 sm:px-7">
            <p className="text-[12.4px] leading-relaxed text-muted">
              Se quitará{' '}
              <strong className="font-semibold text-tinta">
                {inscripcionAEliminar.materia_nombre ||
                  `la materia ${inscripcionAEliminar.materia}`}
              </strong>{' '}
              del historial del estudiante en el periodo{' '}
              {inscripcionAEliminar.periodo_codigo || inscripcionAEliminar.periodo}. Esta acción no
              se puede deshacer.
            </p>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setInscripcionAEliminar(null)}
                className="h-11 rounded-full bg-mist px-5 text-[12.5px] font-semibold text-tinta transition-colors hover:bg-faint"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void eliminar()}
                className="h-11 rounded-full bg-peligro px-6 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-95"
              >
                Sí, quitar
              </button>
            </div>
          </div>
        </Modal>
      )}

      <Toast mensaje={toast} />
    </div>
  );
};

export default GestionNotas;

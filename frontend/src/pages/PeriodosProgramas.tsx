import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { AdminRail } from '../components/admin/AdminRail';
import { EmptyState } from '../components/constelacion/EmptyState';
import { SegmentedFilter } from '../components/constelacion/Filters';
import type { OpcionSegmento } from '../components/constelacion/Filters';
import { Modal } from '../components/constelacion/Modal';
import { SkeletonFilas } from '../components/constelacion/Skeleton';
import { Toast } from '../components/constelacion/Toast';
import { api } from '../api/axios';
import { erroresPorCampo, extraerLista, mensajeError } from '../utils/api';
import { fechaConAnio } from '../utils/fechas';

interface PeriodoAPI {
  id: number;
  codigo: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
}

interface ProgramaAPI {
  id: number;
  codigo: string;
  nombre: string;
  facultad: string | null;
  activo: boolean;
}

type Pestana = 'periodos' | 'programas';

const PESTANAS: OpcionSegmento<Pestana>[] = [
  { valor: 'periodos', texto: 'Periodos' },
  { valor: 'programas', texto: 'Programas' },
];

const inputClass =
  'h-10 w-full rounded-xl border bg-white px-3.5 text-[12px] text-tinta outline-none transition-colors placeholder:text-pebble focus:border-violeta-accion';

const claseInput = (error?: string) => `${inputClass} ${error ? 'border-peligro' : 'border-faint'}`;

const chipEstado = (activo: boolean) =>
  activo ? 'bg-exito/10 text-exito' : 'bg-mist text-muted';

interface CampoProps {
  id: string;
  etiqueta: string;
  error?: string;
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactElement;
}

/** Etiqueta, control y error del backend asociados por id. */
const Campo = ({ id, etiqueta, error, children }: CampoProps) => (
  <div>
    <label htmlFor={id} className="mb-1.5 block text-[11.5px] font-semibold text-tinta">
      {etiqueta}
    </label>
    {children({
      id,
      'aria-invalid': Boolean(error),
      'aria-describedby': error ? `${id}-error` : undefined,
    })}
    {error && (
      <p id={`${id}-error`} role="alert" className="mt-1.5 text-[10.5px] leading-relaxed text-peligro">
        {error}
      </p>
    )}
  </div>
);

interface ErrorFormulario {
  general: string;
  campos: Record<string, string>;
}

const BotonesModal = ({
  onCancelar,
  guardando,
  texto,
}: {
  onCancelar: () => void;
  guardando: boolean;
  texto: string;
}) => (
  <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
    <button
      type="button"
      onClick={onCancelar}
      disabled={guardando}
      className="h-11 rounded-full bg-mist px-5 text-[12.5px] font-semibold text-tinta transition-colors hover:bg-faint disabled:opacity-60"
    >
      Cancelar
    </button>
    <button
      type="submit"
      disabled={guardando}
      className="h-11 rounded-full bg-violeta-accion px-6 text-[12.5px] font-semibold text-white transition-colors hover:bg-violeta-profundo disabled:cursor-not-allowed disabled:opacity-60"
    >
      {guardando ? 'Guardando...' : texto}
    </button>
  </div>
);

/** Mensaje general, salvo que ya se muestre debajo de un campo. */
const AvisoGeneral = ({ error }: { error: ErrorFormulario | null }) =>
  error && !Object.values(error.campos).includes(error.general) ? (
    <p
      role="alert"
      className="mt-4 rounded-2xl border border-peligro/40 bg-peligro/5 px-4 py-3 text-[11.6px] leading-relaxed text-peligro"
    >
      {error.general}
    </p>
  ) : null;

/**
 * Periodos y programas académicos (antes solo desde el admin de Django).
 *
 * Periodos: crear y activar. Al activar uno, el backend desactiva el anterior
 * en la misma petición. No se borran periodos porque guardan historial.
 * Programas: crear, editar y desactivar/reactivar. No se borran porque las
 * materias los referencian (PROTECT).
 */
export const PeriodosProgramas = () => {
  const [pestana, setPestana] = useState<Pestana>('periodos');
  const [periodos, setPeriodos] = useState<PeriodoAPI[]>([]);
  const [programas, setProgramas] = useState<ProgramaAPI[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  // Periodo nuevo
  const [modalPeriodo, setModalPeriodo] = useState(false);
  const [codigoPeriodo, setCodigoPeriodo] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // Programa nuevo o en edición
  const [programaEditando, setProgramaEditando] = useState<ProgramaAPI | null>(null);
  const [modalPrograma, setModalPrograma] = useState(false);
  const [codigoPrograma, setCodigoPrograma] = useState('');
  const [nombrePrograma, setNombrePrograma] = useState('');
  const [facultad, setFacultad] = useState('');

  // Confirmaciones
  const [periodoPorActivar, setPeriodoPorActivar] = useState<PeriodoAPI | null>(null);
  const [programaPorDesactivar, setProgramaPorDesactivar] = useState<ProgramaAPI | null>(null);

  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<ErrorFormulario | null>(null);

  useEffect(() => {
    let activo = true;

    const cargar = async () => {
      setCargando(true);
      setErrorCarga(null);
      const [resPeriodos, resProgramas] = await Promise.allSettled([
        api.get('/catalogo/periodos/'),
        api.get('/catalogo/programas/'),
      ]);
      if (!activo) return;

      if (resPeriodos.status === 'fulfilled') {
        setPeriodos(extraerLista<PeriodoAPI>(resPeriodos.value.data));
      }
      if (resProgramas.status === 'fulfilled') {
        setProgramas(extraerLista<ProgramaAPI>(resProgramas.value.data));
      }
      const fallo = [resPeriodos, resProgramas].find((res) => res.status === 'rejected');
      setErrorCarga(fallo && fallo.status === 'rejected' ? mensajeError(fallo.reason) : null);
      setCargando(false);
    };

    void cargar();

    return () => {
      activo = false;
    };
  }, [intento]);

  useEffect(() => {
    if (!toast) return;
    const temporizador = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(temporizador);
  }, [toast]);

  const recargar = useCallback(() => setIntento((n) => n + 1), []);

  const periodosOrdenados = useMemo(
    () => [...periodos].sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio)),
    [periodos],
  );
  const periodoActivo = periodos.find((periodo) => periodo.activo) ?? null;

  const programasOrdenados = useMemo(
    () =>
      [...programas].sort(
        (a, b) => Number(b.activo) - Number(a.activo) || a.nombre.localeCompare(b.nombre),
      ),
    [programas],
  );

  const fallar = (error: unknown) =>
    setErrorForm({ general: mensajeError(error), campos: erroresPorCampo(error) });

  // --- Periodos -----------------------------------------------------------

  const abrirNuevoPeriodo = () => {
    setCodigoPeriodo('');
    setFechaInicio('');
    setFechaFin('');
    setErrorForm(null);
    setModalPeriodo(true);
  };

  const crearPeriodo = async (event: FormEvent) => {
    event.preventDefault();
    setGuardando(true);
    setErrorForm(null);
    try {
      await api.post('/catalogo/periodos/', {
        codigo: codigoPeriodo.trim(),
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      });
      setModalPeriodo(false);
      setToast(`Periodo ${codigoPeriodo.trim()} creado.`);
      recargar();
    } catch (error) {
      fallar(error);
    } finally {
      setGuardando(false);
    }
  };

  const activarPeriodo = async () => {
    if (!periodoPorActivar) return;
    setGuardando(true);
    setErrorForm(null);
    try {
      // Una sola petición: el backend desactiva el periodo que estaba activo.
      await api.patch(`/catalogo/periodos/${periodoPorActivar.id}/`, { activo: true });
      setToast(`${periodoPorActivar.codigo} es ahora el periodo activo.`);
      setPeriodoPorActivar(null);
      recargar();
    } catch (error) {
      fallar(error);
    } finally {
      setGuardando(false);
    }
  };

  // --- Programas ----------------------------------------------------------

  const abrirPrograma = (programa: ProgramaAPI | null) => {
    setProgramaEditando(programa);
    setCodigoPrograma(programa?.codigo ?? '');
    setNombrePrograma(programa?.nombre ?? '');
    setFacultad(programa?.facultad ?? '');
    setErrorForm(null);
    setModalPrograma(true);
  };

  const guardarPrograma = async (event: FormEvent) => {
    event.preventDefault();
    setGuardando(true);
    setErrorForm(null);
    const datos = {
      codigo: codigoPrograma.trim(),
      nombre: nombrePrograma.trim(),
      facultad: facultad.trim() || null,
    };
    try {
      if (programaEditando) {
        await api.patch(`/catalogo/programas/${programaEditando.id}/`, datos);
        setToast('Programa actualizado.');
      } else {
        await api.post('/catalogo/programas/', datos);
        setToast('Programa creado.');
      }
      setModalPrograma(false);
      recargar();
    } catch (error) {
      fallar(error);
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstadoPrograma = async (programa: ProgramaAPI) => {
    setGuardando(true);
    setErrorForm(null);
    try {
      await api.patch(`/catalogo/programas/${programa.id}/`, { activo: !programa.activo });
      setToast(programa.activo ? 'Programa desactivado.' : 'Programa reactivado.');
      setProgramaPorDesactivar(null);
      recargar();
    } catch (error) {
      if (programa.activo) {
        fallar(error);
      } else {
        setErrorCarga(mensajeError(error));
      }
    } finally {
      setGuardando(false);
    }
  };

  const cerrarModalPeriodo = useCallback(() => setModalPeriodo(false), []);
  const cerrarModalPrograma = useCallback(() => setModalPrograma(false), []);
  const cerrarActivar = useCallback(() => setPeriodoPorActivar(null), []);
  const cerrarDesactivar = useCallback(() => setProgramaPorDesactivar(null), []);

  const esPeriodos = pestana === 'periodos';
  const campos = errorForm?.campos ?? {};

  return (
    <div className="flex min-h-screen bg-mist font-constelacion text-tinta">
      <AdminRail />

      <main className="mx-auto w-full min-w-0 max-w-[1500px] flex-1 px-5 py-6 pb-24 sm:px-7 md:pb-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11.5px] text-muted">Catálogo · Coordinación</p>
            <h1 className="mt-1 text-[30px] font-medium leading-tight tracking-[-0.02em] text-tinta sm:text-[36px]">
              Periodos y programas
            </h1>
            <p className="mt-1 max-w-[640px] text-[13px] leading-relaxed text-muted">
              Crea el periodo académico y actívalo cuando empiece. Administra los programas a los
              que pertenecen las materias.
            </p>
          </div>

          <button
            type="button"
            onClick={() => (esPeriodos ? abrirNuevoPeriodo() : abrirPrograma(null))}
            className="h-11 rounded-full bg-violeta-accion px-5 text-[12.5px] font-semibold text-white transition-colors hover:bg-violeta-profundo"
          >
            {esPeriodos ? 'Nuevo periodo' : 'Nuevo programa'}
          </button>
        </header>

        {errorCarga && (
          <div
            role="alert"
            className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-peligro/30 bg-peligro/5 px-4 py-3 text-peligro"
          >
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold">No pudimos completar la operación</p>
              <p className="mt-1 text-[11.5px] leading-relaxed opacity-90">{errorCarga}</p>
            </div>
            <button
              type="button"
              onClick={recargar}
              className="h-9 rounded-full border border-peligro/40 bg-white px-4 text-[12px] font-semibold text-peligro transition-colors hover:bg-peligro/5"
            >
              Reintentar
            </button>
          </div>
        )}

        <section className="rounded-[32px] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SegmentedFilter opciones={PESTANAS} valor={pestana} onChange={setPestana} />
            <p className="text-[11px] text-muted">
              {esPeriodos
                ? periodoActivo
                  ? `Periodo activo: ${periodoActivo.codigo}`
                  : 'No hay periodo activo'
                : `${programas.filter((programa) => programa.activo).length} de ${programas.length} programas activos`}
            </p>
          </div>

          <div className="mt-5">
            {cargando ? (
              <SkeletonFilas filas={4} />
            ) : esPeriodos ? (
              periodosOrdenados.length === 0 ? (
                <EmptyState
                  titulo="Aún no hay periodos"
                  detalle="Crea el primer periodo con «Nuevo periodo» y actívalo para publicar horarios."
                />
              ) : (
                <>
                  <ul className="space-y-2.5 md:hidden">
                    {periodosOrdenados.map((periodo) => (
                      <li key={periodo.id} className="rounded-[22px] border border-faint p-4">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-[14px] font-semibold text-tinta">{periodo.codigo}</p>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${chipEstado(periodo.activo)}`}>
                            {periodo.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                          {fechaConAnio(periodo.fecha_inicio)} → {fechaConAnio(periodo.fecha_fin)}
                        </p>
                        {!periodo.activo && (
                          <button
                            type="button"
                            onClick={() => {
                              setErrorForm(null);
                              setPeriodoPorActivar(periodo);
                            }}
                            className="mt-3 rounded-full border border-faint px-4 py-2 text-[11px] font-semibold text-slate-ink transition-colors hover:bg-mist"
                          >
                            Activar
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>

                  <table className="hidden w-full text-left text-[12px] md:table">
                    <thead>
                      <tr className="border-b border-faint text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                        <th className="px-3 pb-3">Código</th>
                        <th className="px-3 pb-3">Inicio</th>
                        <th className="px-3 pb-3">Fin</th>
                        <th className="px-3 pb-3">Estado</th>
                        <th className="px-3 pb-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-faint">
                      {periodosOrdenados.map((periodo) => (
                        <tr key={periodo.id} className="hover:bg-mist/60">
                          <td className="px-3 py-3 font-semibold text-tinta">{periodo.codigo}</td>
                          <td className="px-3 py-3 text-slate-ink">{fechaConAnio(periodo.fecha_inicio)}</td>
                          <td className="px-3 py-3 text-slate-ink">{fechaConAnio(periodo.fecha_fin)}</td>
                          <td className="px-3 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${chipEstado(periodo.activo)}`}>
                              {periodo.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            {!periodo.activo && (
                              <button
                                type="button"
                                onClick={() => {
                                  setErrorForm(null);
                                  setPeriodoPorActivar(periodo);
                                }}
                                aria-label={`Activar el periodo ${periodo.codigo}`}
                                className="rounded-full border border-faint px-3 py-1.5 text-[10.5px] font-semibold text-slate-ink transition-colors hover:bg-mist"
                              >
                                Activar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )
            ) : programasOrdenados.length === 0 ? (
              <EmptyState
                titulo="Aún no hay programas"
                detalle="Crea el primer programa con «Nuevo programa» para poder registrar materias."
              />
            ) : (
              <>
                <ul className="space-y-2.5 md:hidden">
                  {programasOrdenados.map((programa) => (
                    <li key={programa.id} className="rounded-[22px] border border-faint p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-semibold text-tinta">{programa.nombre}</p>
                          <p className="mt-0.5 font-mono text-[10.5px] text-muted">{programa.codigo}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${chipEstado(programa.activo)}`}>
                          {programa.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[11px] text-muted">{programa.facultad || 'Sin facultad'}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => abrirPrograma(programa)}
                          className="rounded-full border border-faint px-4 py-2 text-[11px] font-semibold text-slate-ink transition-colors hover:bg-mist"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          disabled={guardando}
                          onClick={() => {
                            setErrorForm(null);
                            if (programa.activo) setProgramaPorDesactivar(programa);
                            else void cambiarEstadoPrograma(programa);
                          }}
                          className={`rounded-full px-4 py-2 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                            programa.activo
                              ? 'border border-peligro/40 text-peligro hover:bg-peligro/5'
                              : 'border border-exito/40 text-exito hover:bg-exito/5'
                          }`}
                        >
                          {programa.activo ? 'Desactivar' : 'Reactivar'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                <table className="hidden w-full text-left text-[12px] md:table">
                  <thead>
                    <tr className="border-b border-faint text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                      <th className="px-3 pb-3">Programa</th>
                      <th className="px-3 pb-3">Código</th>
                      <th className="px-3 pb-3">Facultad</th>
                      <th className="px-3 pb-3">Estado</th>
                      <th className="px-3 pb-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-faint">
                    {programasOrdenados.map((programa) => (
                      <tr key={programa.id} className="hover:bg-mist/60">
                        <td className="px-3 py-3 font-semibold text-tinta">{programa.nombre}</td>
                        <td className="px-3 py-3 font-mono text-[11px] text-slate-ink">{programa.codigo}</td>
                        <td className="px-3 py-3 text-slate-ink">{programa.facultad || '—'}</td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${chipEstado(programa.activo)}`}>
                            {programa.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => abrirPrograma(programa)}
                              aria-label={`Editar el programa ${programa.nombre}`}
                              className="rounded-full border border-faint px-3 py-1.5 text-[10.5px] font-semibold text-slate-ink transition-colors hover:bg-mist"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              disabled={guardando}
                              onClick={() => {
                                setErrorForm(null);
                                if (programa.activo) setProgramaPorDesactivar(programa);
                                else void cambiarEstadoPrograma(programa);
                              }}
                              aria-label={`${programa.activo ? 'Desactivar' : 'Reactivar'} el programa ${programa.nombre}`}
                              className={`rounded-full px-3 py-1.5 text-[10.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                                programa.activo
                                  ? 'border border-peligro/40 text-peligro hover:bg-peligro/5'
                                  : 'border border-exito/40 text-exito hover:bg-exito/5'
                              }`}
                            >
                              {programa.activo ? 'Desactivar' : 'Reactivar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </section>
      </main>

      {modalPeriodo && (
        <Modal
          onCerrar={cerrarModalPeriodo}
          tituloId="periodo-form"
          eyebrow="Catálogo · Periodo académico"
          titulo="Nuevo periodo"
          ancho="md"
          cerrable={!guardando}
        >
          <form onSubmit={crearPeriodo} className="px-6 pb-6 pt-4 sm:px-7">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Campo id="periodo-codigo" etiqueta="Código *" error={campos.codigo}>
                  {(props) => (
                    <input
                      {...props}
                      type="text"
                      required
                      maxLength={10}
                      value={codigoPeriodo}
                      onChange={(event) => setCodigoPeriodo(event.target.value)}
                      placeholder="Ej.: 2027-1"
                      className={claseInput(campos.codigo)}
                    />
                  )}
                </Campo>
              </div>
              <Campo id="periodo-inicio" etiqueta="Fecha de inicio *" error={campos.fecha_inicio}>
                {(props) => (
                  <input
                    {...props}
                    type="date"
                    required
                    value={fechaInicio}
                    onChange={(event) => setFechaInicio(event.target.value)}
                    className={claseInput(campos.fecha_inicio)}
                  />
                )}
              </Campo>
              <Campo id="periodo-fin" etiqueta="Fecha de fin *" error={campos.fecha_fin}>
                {(props) => (
                  <input
                    {...props}
                    type="date"
                    required
                    value={fechaFin}
                    onChange={(event) => setFechaFin(event.target.value)}
                    className={claseInput(campos.fecha_fin)}
                  />
                )}
              </Campo>
            </div>
            <p className="mt-3 text-[10.5px] leading-relaxed text-muted">
              El periodo se crea inactivo. Actívalo desde la lista cuando empiece.
            </p>
            <AvisoGeneral error={errorForm} />
            <BotonesModal onCancelar={cerrarModalPeriodo} guardando={guardando} texto="Crear periodo" />
          </form>
        </Modal>
      )}

      {modalPrograma && (
        <Modal
          onCerrar={cerrarModalPrograma}
          tituloId="programa-form"
          eyebrow="Catálogo · Programa académico"
          titulo={programaEditando ? 'Editar programa' : 'Nuevo programa'}
          ancho="md"
          cerrable={!guardando}
        >
          <form onSubmit={guardarPrograma} className="px-6 pb-6 pt-4 sm:px-7">
            <div className="space-y-4">
              <Campo id="programa-codigo" etiqueta="Código *" error={campos.codigo}>
                {(props) => (
                  <input
                    {...props}
                    type="text"
                    required
                    maxLength={20}
                    value={codigoPrograma}
                    onChange={(event) => setCodigoPrograma(event.target.value)}
                    placeholder="Ej.: ISW"
                    className={claseInput(campos.codigo)}
                  />
                )}
              </Campo>
              <Campo id="programa-nombre" etiqueta="Nombre *" error={campos.nombre}>
                {(props) => (
                  <input
                    {...props}
                    type="text"
                    required
                    maxLength={150}
                    value={nombrePrograma}
                    onChange={(event) => setNombrePrograma(event.target.value)}
                    placeholder="Ej.: Ingeniería de Software"
                    className={claseInput(campos.nombre)}
                  />
                )}
              </Campo>
              <Campo id="programa-facultad" etiqueta="Facultad" error={campos.facultad}>
                {(props) => (
                  <input
                    {...props}
                    type="text"
                    maxLength={100}
                    value={facultad}
                    onChange={(event) => setFacultad(event.target.value)}
                    placeholder="Opcional"
                    className={claseInput(campos.facultad)}
                  />
                )}
              </Campo>
            </div>
            <AvisoGeneral error={errorForm} />
            <BotonesModal
              onCancelar={cerrarModalPrograma}
              guardando={guardando}
              texto={programaEditando ? 'Guardar cambios' : 'Crear programa'}
            />
          </form>
        </Modal>
      )}

      {periodoPorActivar && (
        <Modal
          onCerrar={cerrarActivar}
          tituloId="activar-periodo"
          eyebrow="Confirmar"
          titulo={`¿Activar ${periodoPorActivar.codigo}?`}
          ancho="md"
          cerrable={!guardando}
        >
          <div className="px-6 pb-6 pt-3 sm:px-7">
            <p className="text-[12.5px] leading-relaxed text-muted">
              {periodoActivo ? (
                <>
                  <strong className="font-semibold text-tinta">{periodoActivo.codigo}</strong> dejará
                  de estar activo y{' '}
                  <strong className="font-semibold text-tinta">{periodoPorActivar.codigo}</strong>{' '}
                  pasará a ser el periodo activo.
                </>
              ) : (
                <>
                  <strong className="font-semibold text-tinta">{periodoPorActivar.codigo}</strong>{' '}
                  pasará a ser el periodo activo.
                </>
              )}{' '}
              Las nuevas publicaciones, asignaciones y reportes usarán este periodo.
            </p>
            <AvisoGeneral error={errorForm} />
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cerrarActivar}
                disabled={guardando}
                className="h-11 rounded-full bg-mist px-5 text-[12.5px] font-semibold text-tinta transition-colors hover:bg-faint disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void activarPeriodo()}
                disabled={guardando}
                className="h-11 rounded-full bg-violeta-accion px-6 text-[12.5px] font-semibold text-white transition-colors hover:bg-violeta-profundo disabled:cursor-not-allowed disabled:opacity-60"
              >
                {guardando ? 'Activando...' : 'Sí, activar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {programaPorDesactivar && (
        <Modal
          onCerrar={cerrarDesactivar}
          tituloId="desactivar-programa"
          eyebrow="Confirmar"
          eyebrowClassName="text-peligro"
          titulo="¿Desactivar programa?"
          ancho="md"
          cerrable={!guardando}
        >
          <div className="px-6 pb-6 pt-3 sm:px-7">
            <p className="text-[12.5px] leading-relaxed text-muted">
              <strong className="font-semibold text-tinta">{programaPorDesactivar.nombre}</strong> dejará
              de aparecer al crear materias. Sus materias se conservan y puedes reactivarlo cuando
              quieras.
            </p>
            <AvisoGeneral error={errorForm} />
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cerrarDesactivar}
                disabled={guardando}
                className="h-11 rounded-full bg-mist px-5 text-[12.5px] font-semibold text-tinta transition-colors hover:bg-faint disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void cambiarEstadoPrograma(programaPorDesactivar)}
                disabled={guardando}
                className="h-11 rounded-full bg-peligro px-6 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {guardando ? 'Desactivando...' : 'Sí, desactivar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <Toast mensaje={toast} />
    </div>
  );
};

export default PeriodosProgramas;

import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { api } from '../../../api/axios';
import { StatCard } from '../../constelacion/StatCard';
import { EmptyState } from '../../constelacion/EmptyState';
import { SegmentedFilter } from '../../constelacion/Filters';
import type { OpcionSegmento } from '../../constelacion/Filters';
import { Toast } from '../../constelacion/Toast';
import { ArrowIcon } from '../../constelacion/Icons';
import { RevisionSolicitudModal } from './RevisionSolicitudModal';
import type { DecisionRevision } from './RevisionSolicitudModal';
import { extraerLista, mensajeError } from '../../../utils/api';
import { parseFecha } from '../../../utils/fechas';
import type { EstadoSolicitud, SolicitudTutor } from '../../../types/tutores';

/** 'tutor': el docente revisa las de sus materias. 'coordinacion': las de materias sin docente. */
export type VarianteSolicitudes = 'tutor' | 'coordinacion';

type Filtro = 'SIN_DOCENTE' | 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'TODAS';

const FILTROS: OpcionSegmento<Filtro>[] = [
  { valor: 'PENDIENTE', texto: 'Pendientes' },
  { valor: 'APROBADA', texto: 'Aprobadas' },
  { valor: 'RECHAZADA', texto: 'Rechazadas' },
  { valor: 'TODAS', texto: 'Todas' },
];

const FILTROS_COORDINACION: OpcionSegmento<Filtro>[] = [
  { valor: 'SIN_DOCENTE', texto: 'Sin docente' },
  ...FILTROS,
];

/**
 * RF-03: la coordinación solo revisa si la materia no tiene docente en el
 * periodo de la solicitud. El backend lo dice con `revisores` (los docentes
 * de la materia en ese periodo); null si la respuesta no trae el dato.
 */
const sinDocente = (solicitud: SolicitudTutor): boolean | null =>
  Array.isArray(solicitud.revisores) ? solicitud.revisores.length === 0 : null;

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

const fechaSolicitud = (iso: string): string => {
  if (!iso) return '';
  const dia = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return '';
  const fecha = parseFecha(dia);
  const mes = fecha.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
  return `${fecha.getDate()} de ${mes} de ${fecha.getFullYear()}`;
};

/**
 * Solicitudes de tutor por revisar (GT-242). Lo usan el panel del docente y
 * el de la coordinación; cada uno pone su rail alrededor.
 *
 * El backend entrega al docente las solicitudes de las materias que tiene
 * asignadas en el periodo, y a la coordinación todas. La decisión se toma en
 * un modal (GT-243) con motivo obligatorio (GT-244).
 */
export const ContenidoSolicitudes = ({ variante }: { variante: VarianteSolicitudes }) => {
  const esCoordinacion = variante === 'coordinacion';
  const [solicitudes, setSolicitudes] = useState<SolicitudTutor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>(esCoordinacion ? 'SIN_DOCENTE' : 'PENDIENTE');
  const [seleccionada, setSeleccionada] = useState<SolicitudTutor | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const consultar = useCallback(async () => {
    try {
      const { data } = await api.get('/tutores/solicitudes/');
      return { solicitudes: extraerLista<SolicitudTutor>(data), error: null as string | null };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        return {
          solicitudes: [] as SolicitudTutor[],
          error: esCoordinacion
            ? 'Tu cuenta no tiene permisos de coordinación para ver las solicitudes de tutor.'
            : 'Tu cuenta no tiene permisos de docente para revisar solicitudes de tutor.',
        };
      }
      return { solicitudes: [] as SolicitudTutor[], error: mensajeError(error) };
    }
  }, [esCoordinacion]);

  const aplicar = useCallback(
    (datos: { solicitudes: SolicitudTutor[]; error: string | null }) => {
      setSolicitudes(datos.solicitudes);
      setErrorCarga(datos.error);
      setCargando(false);
    },
    [],
  );

  const cargar = useCallback(async () => {
    aplicar(await consultar());
  }, [aplicar, consultar]);

  useEffect(() => {
    let activo = true;

    const ejecutar = async () => {
      const datos = await consultar();
      if (!activo) return;
      aplicar(datos);
    };

    void ejecutar();

    return () => {
      activo = false;
    };
  }, [aplicar, consultar]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const conteos = useMemo(() => {
    const pendientes = solicitudes.filter((item) => item.estado === 'PENDIENTE').length;
    const aprobadas = solicitudes.filter((item) => item.estado === 'APROBADA').length;
    const rechazadas = solicitudes.filter((item) => item.estado === 'RECHAZADA').length;
    const pendientesSinDocente = solicitudes.filter(
      (item) => item.estado === 'PENDIENTE' && sinDocente(item) === true,
    ).length;
    return { pendientes, aprobadas, rechazadas, pendientesSinDocente };
  }, [solicitudes]);

  // Si alguna solicitud no trae `revisores`, no se puede saber cuáles le tocan a la coordinación.
  const sinVerificarDocente = esCoordinacion && solicitudes.some((item) => sinDocente(item) === null);

  const visibles = useMemo(
    () =>
      solicitudes
        .filter((item) => {
          if (filtro === 'TODAS') return true;
          // Sin el dato de revisores no se esconde nada: el backend decide al revisar.
          if (filtro === 'SIN_DOCENTE') return sinDocente(item) !== false;
          return item.estado === filtro;
        })
        .sort((a, b) => b.id - a.id),
    [solicitudes, filtro],
  );

  const confirmar = async (decision: DecisionRevision, motivo: string) => {
    if (!seleccionada) return;

    const accion = decision === 'APROBADA' ? 'aprobar' : 'rechazar';
    let data: SolicitudTutor;
    try {
      ({ data } = await api.post<SolicitudTutor>(
        `/tutores/solicitudes/${seleccionada.id}/${accion}/`,
        { motivo },
      ));
    } catch (error) {
      // 403: la materia tiene docente. Se refresca la lista y el modal
      // muestra el mensaje del backend.
      if (axios.isAxiosError(error) && error.response?.status === 403) void cargar();
      throw error;
    }

    setSolicitudes((previas) =>
      previas.map((item) => (item.id === seleccionada.id ? { ...item, ...data } : item)),
    );
    setToast(
      decision === 'APROBADA'
        ? `Aprobaste la solicitud de ${seleccionada.estudiante_nombre}.`
        : `Rechazaste la solicitud de ${seleccionada.estudiante_nombre}.`,
    );
  };

  const reintentar = () => {
    setCargando(true);
    setErrorCarga(null);
    void cargar();
  };

  const textoVacio =
    filtro === 'SIN_DOCENTE'
      ? {
          titulo: 'No hay solicitudes de materias sin docente',
          detalle:
            'Cuando un estudiante pida ser tutor de una materia sin docente asignado en el periodo, aparecerá aquí.',
        }
      : esCoordinacion && filtro === 'PENDIENTE'
        ? {
            titulo: 'No hay solicitudes pendientes',
            detalle: 'Las solicitudes pendientes de todas las materias aparecerán aquí.',
          }
        : filtro === 'PENDIENTE'
      ? {
          titulo: 'No tienes solicitudes pendientes',
          detalle: 'Cuando un estudiante pida ser tutor de una de tus materias, aparecerá aquí.',
        }
      : filtro === 'TODAS'
        ? {
            titulo: 'Todavía no hay solicitudes',
            detalle: 'Las solicitudes de tus estudiantes aparecerán en este listado.',
          }
        : {
            titulo: `No hay solicitudes ${filtro === 'APROBADA' ? 'aprobadas' : 'rechazadas'}`,
            detalle: 'Prueba con otro filtro para ver el resto de solicitudes.',
          };

  return (
    <>
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1240px] px-5 py-6 pb-24 sm:px-7 md:pb-6 lg:px-8">
          <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11.5px] text-muted">
                {esCoordinacion ? 'Panel · Coordinación' : 'Mi trabajo · Tutor'}
              </p>
              <h1 className="mt-1 text-[30px] font-medium leading-tight tracking-[-0.02em] text-tinta sm:text-[36px]">
                Solicitudes de tutor
              </h1>
              <p className="mt-1 max-w-[620px] text-[13px] leading-relaxed text-muted">
                {esCoordinacion
                  ? 'Si una materia se quedó sin docente en el periodo, la solicitud la revisa la coordinación. Las demás las revisa el docente asignado.'
                  : 'Revisa las solicitudes de tus estudiantes para ser tutores de las materias que dictas. Cada decisión se le comunica al estudiante con el motivo que registres.'}
              </p>
            </div>

            <div className="rounded-[22px] bg-white px-4 py-3 text-right">
              <p className="text-[10.5px] text-muted">Por revisar</p>
              <p className="mt-0.5 text-[20px] font-semibold leading-none text-tinta">
                {cargando ? '—' : esCoordinacion ? conteos.pendientesSinDocente : conteos.pendientes}
              </p>
            </div>
          </header>

          {sinVerificarDocente && !cargando && (
            <p
              role="status"
              className="mb-5 rounded-2xl border border-advertencia/30 bg-advertencia/5 px-4 py-3 text-[12px] text-advertencia"
            >
              No se pudo verificar si la materia tiene docente. El sistema lo valida al aprobar o
              rechazar.
            </p>
          )}

          {errorCarga && (
            <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-peligro/20 bg-white px-5 py-4 text-[12px] text-peligro sm:flex-row sm:items-center sm:justify-between">
              <span>{errorCarga}</span>
              <button
                type="button"
                onClick={reintentar}
                className="self-start rounded-full bg-peligro px-4 py-2 text-[11px] font-medium text-white transition-opacity hover:opacity-90"
              >
                Reintentar
              </button>
            </div>
          )}

          <section className="rounded-[28px] bg-white p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard
                etiqueta="Pendientes"
                valor={cargando ? '—' : conteos.pendientes}
                detalle={esCoordinacion ? 'De todas las materias' : 'Esperando tu revisión'}
              />
              <StatCard
                etiqueta="Aprobadas"
                valor={cargando ? '—' : conteos.aprobadas}
                detalle="Habilitadas como tutor"
              />
              <StatCard
                etiqueta="Rechazadas"
                valor={cargando ? '—' : conteos.rechazadas}
                detalle="Con motivo registrado"
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-faint pt-5">
              <div className="max-w-full overflow-x-auto">
                <SegmentedFilter
                  opciones={esCoordinacion ? FILTROS_COORDINACION : FILTROS}
                  valor={filtro}
                  onChange={setFiltro}
                />
              </div>
              <p className="text-[11px] text-muted">
                {cargando
                  ? 'Cargando solicitudes…'
                  : `${visibles.length} ${visibles.length === 1 ? 'solicitud' : 'solicitudes'}`}
              </p>
            </div>

            <div className="mt-4">
              {cargando ? (
                <ul className="space-y-2.5">
                  {[0, 1, 2].map((item) => (
                    <li key={item} className="h-[86px] animate-pulse rounded-[22px] bg-mist" />
                  ))}
                </ul>
              ) : visibles.length === 0 ? (
                <EmptyState titulo={textoVacio.titulo} detalle={textoVacio.detalle} />
              ) : (
                <ul className="space-y-2.5">
                  {visibles.map((solicitud) => {
                    const pendiente = solicitud.estado === 'PENDIENTE';
                    // La coordinación no decide si la materia tiene docente (RF-03).
                    const conDocente = esCoordinacion && sinDocente(solicitud) === false;
                    const bloqueada = conDocente && pendiente;
                    const fecha = fechaSolicitud(solicitud.date_creation);
                    const promedio = Number(solicitud.nota_final);

                    return (
                      <li key={solicitud.id}>
                        <article className="rounded-[22px] border border-faint bg-white px-4 py-4 transition-colors hover:border-pebble sm:px-5">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="flex min-w-0 items-center gap-3 sm:flex-1">
                              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-arena/50 text-[12px] font-semibold text-tinta">
                                {iniciales(solicitud.estudiante_nombre)}
                              </span>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-semibold text-tinta">
                                  {solicitud.estudiante_nombre}
                                </p>
                                <p className="mt-0.5 text-[10.8px] text-muted">
                                  {solicitud.estudiante_semestre
                                    ? `Semestre ${solicitud.estudiante_semestre}`
                                    : 'Semestre sin registrar'}
                                  {fecha ? ` · Solicitó el ${fecha}` : ''}
                                </p>
                                {conDocente && (
                                  <p className="mt-0.5 text-[10.8px] text-slate-ink">
                                    La revisa el docente asignado:{' '}
                                    {(solicitud.revisores ?? []).join(', ')}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                              <span className="inline-flex items-center rounded-full bg-mist px-3 py-1 text-[10.5px] font-medium text-slate-ink">
                                {solicitud.materia_nombre}
                              </span>
                              <span className="text-[10.8px] text-muted">
                                Promedio{' '}
                                <span className="font-semibold text-tinta">
                                  {Number.isNaN(promedio) ? '—' : `${promedio.toFixed(1)}/5.0`}
                                </span>
                              </span>
                              <span
                                className={`inline-flex items-center rounded-full px-3 py-1 text-[10.5px] font-semibold ${chipEstado(solicitud.estado)}`}
                              >
                                {ETIQUETAS[solicitud.estado]}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setSeleccionada(solicitud)}
                              disabled={bloqueada}
                              title={bloqueada ? 'La revisa el docente asignado' : undefined}
                              className={`inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-full px-4 text-[11.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${
                                pendiente && !bloqueada
                                  ? 'bg-violeta-accion text-white hover:opacity-95'
                                  : 'border border-faint text-slate-ink hover:bg-mist'
                              }`}
                            >
                              {bloqueada ? 'La revisa el docente' : pendiente ? 'Revisar' : 'Ver detalle'}
                              {!bloqueada && <ArrowIcon className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </article>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>
      </main>

      {seleccionada && (
        <RevisionSolicitudModal
          key={seleccionada.id}
          solicitud={seleccionada}
          onCerrar={() => setSeleccionada(null)}
          onConfirmar={confirmar}
          onVerListado={(estado) => setFiltro(estado)}
        />
      )}

      <Toast mensaje={toast} />
    </>
  );
};

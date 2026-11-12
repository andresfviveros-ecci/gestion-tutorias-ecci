import { useCallback, useEffect, useMemo, useState } from 'react';
import { StudentRail } from '../../components/estudiante/StudentRail';
import { EmptyState } from '../../components/constelacion/EmptyState';
import { SkeletonFilas } from '../../components/constelacion/Skeleton';
import { Toast } from '../../components/constelacion/Toast';
import { CheckIcon, CloseIcon } from '../../components/constelacion/Icons';
import { temaDeMateria } from '../../components/constelacion/temas';
import { api } from '../../api/axios';
import { extraerLista, mensajeError } from '../../utils/api';
import {
  esSolicitudVigente,
  estadoPostulacion,
  fechaPostulacion,
  formatoNota,
  listarNombres,
  normalizarHistorial,
  type ConfigTutor,
  type HistorialTutor,
  type MateriaHistorial,
  type SolicitudTutorAPI,
} from '../../utils/postulacionTutor';

interface MeAPI {
  id: number;
  semestre?: number | null;
}

interface ConfigAPI {
  semestre_minimo_tutor?: number;
  nota_minima?: string;
  diferencia_semestres?: number;
}

interface RequisitoVista {
  clave: 'semestre' | 'nota' | 'avance';
  titulo: string;
  detalle: string;
  valor: string;
  cumple: boolean | null;
}

const inicialesMateria = (nombre: string): string => {
  const palabras = nombre.split(/\s+/).filter((parte) => parte.length > 2);
  const iniciales = palabras
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('');
  return iniciales.length >= 2 ? iniciales : nombre.slice(0, 2).toUpperCase();
};

const requisitosDe = (
  materia: MateriaHistorial | null,
  config: ConfigTutor,
  semestre: number | null,
): RequisitoVista[] => {
  const nota = materia?.nota ?? null;
  const cursado = materia?.semestre_cursado ?? null;
  const avance = semestre !== null && cursado !== null ? semestre - cursado : null;
  const calculados = materia?.requisitos;

  return [
    {
      clave: 'semestre',
      titulo: 'Semestre actual',
      detalle: `Cursar al menos ${config.semestre_minimo_tutor}.º semestre`,
      valor: semestre !== null ? `${semestre}.º` : '—',
      cumple:
        calculados?.semestre?.cumple ??
        (semestre !== null ? semestre >= config.semestre_minimo_tutor : null),
    },
    {
      clave: 'nota',
      titulo: 'Nota ponderada',
      detalle: `Mínimo ${formatoNota(config.nota_minima)} en la materia`,
      valor: formatoNota(nota),
      cumple:
        calculados?.nota?.cumple ??
        (nota !== null ? Number(nota) >= Number(config.nota_minima) : null),
    },
    {
      clave: 'avance',
      titulo: 'Avance sobre la materia',
      detalle: `Superarla por ${config.diferencia_semestres} ${
        config.diferencia_semestres === 1 ? 'semestre' : 'semestres'
      } o más`,
      valor:
        avance !== null && semestre !== null && cursado !== null
          ? `${semestre} − ${cursado} = ${avance}`
          : '—',
      cumple:
        calculados?.avance?.cumple ??
        (avance !== null ? avance >= config.diferencia_semestres : null),
    },
  ];
};

/**
 * Postulación del estudiante para ser tutor (GT-268, HU-043).
 *
 * La vista consume `GET /tutores/historial-materias/` (GT-269) y registra la
 * postulación con `POST /tutores/solicitudes/` enviando solo la materia
 * (GT-270). Los requisitos y la elegibilidad los decide el backend.
 */
export const PostulateComoTutor = () => {
  const [cargando, setCargando] = useState(true);
  const [historial, setHistorial] = useState<HistorialTutor | null>(null);
  const [me, setMe] = useState<MeAPI | null>(null);
  const [config, setConfig] = useState<ConfigAPI | null>(null);
  const [solicitudes, setSolicitudes] = useState<SolicitudTutorAPI[]>([]);
  const [seleccionId, setSeleccionId] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const cargar = useCallback(async (mostrarLoader = true) => {
    if (mostrarLoader) setCargando(true);
    setErrorCarga(null);

    const [resHistorial, resMe, resConfig, resSolicitudes] = await Promise.allSettled([
      api.get('/tutores/historial-materias/'),
      api.get('/accounts/me/'),
      api.get('/catalogo/configuracion/'),
      api.get('/tutores/solicitudes/', { params: { estudiante: 'me' } }),
    ]);

    const normalizado =
      resHistorial.status === 'fulfilled' ? normalizarHistorial(resHistorial.value.data) : null;

    setHistorial(normalizado);
    setMe(resMe.status === 'fulfilled' ? (resMe.value.data as MeAPI) : null);
    setConfig(resConfig.status === 'fulfilled' ? (resConfig.value.data as ConfigAPI) : null);
    setSolicitudes(
      resSolicitudes.status === 'fulfilled'
        ? extraerLista<SolicitudTutorAPI>(resSolicitudes.value.data)
        : [],
    );

    setSeleccionId((previo) => {
      if (previo !== null && normalizado?.materias.some((item) => item.materia === previo)) {
        return previo;
      }
      const primera =
        normalizado?.materias.find(
          (item) =>
            item.elegible && !(item.solicitud && esSolicitudVigente(item.solicitud.estado)),
        ) ??
        normalizado?.materias[0];
      return primera?.materia ?? null;
    });

    if (resHistorial.status === 'rejected') {
      setErrorCarga(
        'No pudimos cargar tu historial académico. Revisa tu conexión e inténtalo de nuevo.',
      );
    } else if (
      resMe.status === 'rejected' &&
      resConfig.status === 'rejected' &&
      resSolicitudes.status === 'rejected'
    ) {
      setErrorCarga('No pudimos cargar tu información. Revisa tu conexión e inténtalo de nuevo.');
    }

    setCargando(false);
  }, []);

  useEffect(() => {
    // Se difiere un microtask: la carga actualiza estado y no debe encadenar
    // renders dentro del cuerpo del efecto.
    const iniciar = async () => {
      await Promise.resolve();
      await cargar();
    };
    void iniciar();
  }, [cargar]);

  useEffect(() => {
    if (!toast) return;
    const temporizador = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(temporizador);
  }, [toast]);

  const configEfectiva: ConfigTutor = useMemo(
    () => ({
      semestre_minimo_tutor:
        historial?.config.semestre_minimo_tutor ?? config?.semestre_minimo_tutor ?? 3,
      nota_minima: historial?.config.nota_minima ?? config?.nota_minima ?? '4.00',
      diferencia_semestres:
        historial?.config.diferencia_semestres ?? config?.diferencia_semestres ?? 2,
    }),
    [historial, config],
  );

  const semestre = historial?.semestre ?? me?.semestre ?? null;
  const materias = useMemo(() => historial?.materias ?? [], [historial]);

  const seleccionada = useMemo(
    () => materias.find((item) => item.materia === seleccionId) ?? null,
    [materias, seleccionId],
  );

  const solicitudVigente = useMemo(() => {
    if (!seleccionada) return null;
    if (seleccionada.solicitud && esSolicitudVigente(seleccionada.solicitud.estado)) {
      return seleccionada.solicitud;
    }
    return (
      solicitudes.find(
        (solicitud) =>
          solicitud.materia === seleccionada.materia && esSolicitudVigente(solicitud.estado),
      ) ?? null
    );
  }, [seleccionada, solicitudes]);

  // La última solicitud de la materia elegida, con quién la revisa o la revisó.
  const ultimaSolicitud = useMemo(() => {
    if (!seleccionada) return null;
    return (
      solicitudes
        .filter((solicitud) => solicitud.materia === seleccionada.materia)
        .sort((a, b) => (b.date_creation || '').localeCompare(a.date_creation || ''))[0] ?? null
    );
  }, [seleccionada, solicitudes]);

  const revisoresSeleccionada = listarNombres(seleccionada?.revisores);

  const requisitos = useMemo(
    () => requisitosDe(seleccionada, configEfectiva, semestre),
    [seleccionada, configEfectiva, semestre],
  );

  const todosCumplen = requisitos.every((requisito) => requisito.cumple === true);
  const pendientes = requisitos
    .filter((requisito) => requisito.cumple === false)
    .map((requisito) => requisito.titulo.toLowerCase());

  const puedePostular =
    historial !== null &&
    seleccionada !== null &&
    seleccionada.elegible &&
    semestre !== null &&
    solicitudVigente === null &&
    !enviando;

  const postular = async () => {
    if (!seleccionada || !puedePostular) return;

    setEnviando(true);
    setErrorAccion(null);

    try {
      await api.post('/tutores/solicitudes/', { materia: seleccionada.materia });
      setToast(
        revisoresSeleccionada
          ? `Tu postulación se envió a ${revisoresSeleccionada}.`
          : 'Tu postulación se envió. El docente de la materia la revisará.',
      );
      await cargar(false);
    } catch (error) {
      setErrorAccion(mensajeError(error));
    } finally {
      setEnviando(false);
    }
  };

  const estado = solicitudVigente ? estadoPostulacion(solicitudVigente.estado) : null;

  const notaPanel = (() => {
    if (!seleccionada) {
      return 'Elige una materia de la lista para ver si cumples los 3 requisitos.';
    }
    if (solicitudVigente?.estado === 'APROBADA') {
      return 'Ya estás habilitado como tutor de esta materia.';
    }
    if (solicitudVigente?.estado === 'PENDIENTE') {
      const quien = listarNombres(ultimaSolicitud?.revisores) || revisoresSeleccionada;
      return quien
        ? `Tu postulación está en revisión con ${quien}. Te avisaremos el resultado.`
        : 'Tu postulación está en revisión. El docente te avisará el resultado.';
    }
    const anterior = seleccionada.solicitud?.estado;
    if (seleccionada.elegible && (anterior === 'RECHAZADA' || anterior === 'REVOCADA')) {
      const motivo = ultimaSolicitud?.motivo
        ? ` Motivo: «${ultimaSolicitud.motivo.trim().replace(/[.!?]+$/, '')}».`
        : '';
      return `Tu postulación anterior fue ${
        anterior === 'RECHAZADA' ? 'rechazada' : 'revocada'
      }.${motivo} Cumples los requisitos y puedes postularte de nuevo.`;
    }
    // El backend explica casos que los 3 requisitos no muestran (sin docente, sin nota...).
    if (!seleccionada.elegible && seleccionada.motivo) {
      return seleccionada.motivo;
    }
    if (todosCumplen) {
      return `Cumples los 3 requisitos. Tu nota ${formatoNota(
        seleccionada.nota,
      )} se asociará a la postulación.`;
    }
    return pendientes.length > 0
      ? `Aún no cumples: ${pendientes.join(', ')}.`
      : 'Revisa tus requisitos antes de postularte.';
  })();

  const textoBoton = enviando
    ? 'Enviando...'
    : solicitudVigente?.estado === 'PENDIENTE'
      ? 'Postulación enviada'
      : solicitudVigente?.estado === 'APROBADA'
        ? 'Habilitación aprobada'
        : 'Postúlate como tutor';

  return (
    <div className="flex min-h-screen bg-mist font-constelacion text-tinta">
      <StudentRail />

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1400px] px-5 py-6 pb-24 sm:px-7 lg:px-8">
          <header className="flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0">
              <p className="text-[11.5px] text-muted">Tutorías · Estudiante</p>
              <h1 className="mt-1 text-[30px] font-medium leading-tight tracking-[-0.02em] text-tinta sm:text-[36px]">
                Postúlate como tutor
              </h1>
              <p className="mt-1 max-w-[560px] text-[12.5px] leading-relaxed text-muted">
                Elige una materia que ya aprobaste. Verificamos tu avance académico y, si cumples,
                enviamos tu postulación al docente.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <ChipResumen
                valor={semestre !== null ? `${semestre}.º` : '—'}
                etiqueta="Semestre actual"
                detalle={`mínimo ${configEfectiva.semestre_minimo_tutor}.º`}
              />
              <ChipResumen
                valor={historial ? String(historial.resumen.materias_aprobadas) : '—'}
                etiqueta="Materias aprobadas"
                detalle="en tu historial"
              />
              <ChipResumen
                valor={historial ? String(historial.resumen.elegibles) : '—'}
                etiqueta="Elegibles"
                detalle="cumples los requisitos"
                destacado
              />
            </div>
          </header>

          {errorCarga && (
            <div
              role="alert"
              className="mt-5 flex flex-col gap-3 rounded-2xl border border-peligro/20 bg-white px-4 py-3.5 text-[12px] text-peligro sm:flex-row sm:items-center sm:justify-between"
            >
              <span>{errorCarga}</span>
              <button
                type="button"
                onClick={() => void cargar()}
                className="self-start rounded-full bg-peligro px-4 py-2 text-[11px] font-medium text-white transition-opacity hover:opacity-90"
              >
                Reintentar
              </button>
            </div>
          )}

          {historial && semestre === null && (
            <div
              role="status"
              className="mt-5 rounded-2xl border border-advertencia/25 bg-advertencia/5 px-4 py-3.5 text-advertencia"
            >
              <p className="text-[12px] font-semibold">Tu semestre no está registrado</p>
              <p className="mt-0.5 text-[11px] leading-relaxed opacity-90">
                Pídele a coordinación que actualice tu semestre para poder verificar los requisitos.
              </p>
            </div>
          )}

          {errorAccion && (
            <div
              role="alert"
              className="mt-5 rounded-2xl border border-peligro/20 bg-white px-4 py-3.5 text-[12px] text-peligro"
            >
              {errorAccion}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
            <div className="flex min-w-0 flex-col gap-5">
              {/* ------------------------ Materias ------------------------ */}
              <section className="rounded-[30px] bg-white p-5 sm:p-6">
                <h2 className="text-[20px] font-medium tracking-[-0.01em] text-tinta">
                  Tus materias aprobadas
                </h2>
                <p className="mt-1 text-[11.5px] text-muted">
                  Selecciona la materia en la que quieres orientar a otros estudiantes.
                </p>

                {cargando ? (
                  <SkeletonFilas className="mt-4" alto="h-[88px]" filas={4} />
                ) : materias.length === 0 ? (
                  <div className="mt-4">
                    <EmptyState
                      titulo={
                        historial
                          ? 'Aún no tienes materias aprobadas'
                          : 'No pudimos cargar tu historial'
                      }
                      detalle={
                        historial
                          ? 'Cuando apruebes una materia en un periodo anterior aparecerá aquí.'
                          : 'Revisa tu conexión e inténtalo de nuevo desde el botón Reintentar.'
                      }
                    />
                  </div>
                ) : (
                  <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {materias.map((materia) => {
                      const tema = temaDeMateria(materia.materia);
                      const activa = materia.materia === seleccionId;

                      return (
                        <li key={materia.materia}>
                          <button
                            type="button"
                            onClick={() => {
                              setSeleccionId(materia.materia);
                              setErrorAccion(null);
                            }}
                            aria-pressed={activa}
                            className={`flex h-full w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors ${
                              activa
                                ? 'border-violeta-accion bg-violet-wash/15'
                                : 'border-transparent bg-mist/70 hover:bg-mist'
                            }`}
                          >
                            <span
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-semibold ${tema.bg} ${tema.text}`}
                            >
                              {inicialesMateria(materia.nombre)}
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[12.5px] font-semibold text-tinta">
                                {materia.nombre}
                              </span>
                              <span className="mt-0.5 block truncate text-[10.5px] text-muted">
                                {materia.semestre_cursado !== null
                                  ? `Semestre ${materia.semestre_cursado} · `
                                  : ''}
                                Nota {formatoNota(materia.nota)}
                              </span>
                              <span
                                className={`mt-1 flex items-center gap-1 text-[10.5px] font-medium ${
                                  materia.elegible ? 'text-exito' : 'text-advertencia'
                                }`}
                              >
                                {materia.elegible && <CheckIcon className="h-3 w-3" />}
                                {materia.elegible ? 'Elegible' : 'No cumple requisitos'}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {/* ---------------------- Postulaciones ---------------------- */}
              <section className="rounded-[30px] bg-white p-5 sm:p-6">
                <h2 className="text-[20px] font-medium tracking-[-0.01em] text-tinta">
                  Mis postulaciones
                </h2>
                <p className="mt-1 text-[11.5px] text-muted">
                  Estado de tus solicitudes para ser tutor.
                </p>

                {cargando ? (
                  <SkeletonFilas className="mt-4" filas={2} />
                ) : solicitudes.length === 0 ? (
                  <div className="mt-4 flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-mist/70 px-6 py-10 text-center">
                    <div className="relative mb-1 h-9 w-14" aria-hidden="true">
                      <span className="absolute left-0 top-0 h-8 w-10 rounded-xl bg-salvia/70" />
                      <span className="absolute bottom-0 right-0 h-7 w-9 rounded-lg bg-arena/80 ring-2 ring-white" />
                    </div>
                    <p className="text-[12px] font-semibold text-tinta">Aún no te has postulado</p>
                    <p className="max-w-[280px] text-[11px] leading-relaxed text-muted">
                      Elige una materia, revisa los requisitos y postúlate cuando cumplas.
                    </p>
                  </div>
                ) : (
                  <ul className="mt-3 divide-y divide-faint">
                    {solicitudes.map((solicitud) => {
                      const tema = temaDeMateria(solicitud.materia);
                      const chip = estadoPostulacion(solicitud.estado);
                      const fecha = fechaPostulacion(solicitud.date_creation);
                      const decidida = solicitud.estado !== 'PENDIENTE';
                      const quien = decidida
                        ? solicitud.revisada_por_nombre
                          ? `${solicitud.estado === 'APROBADA' ? 'Aprobó' : solicitud.estado === 'REVOCADA' ? 'Revocó' : 'Rechazó'} ${solicitud.revisada_por_nombre}${
                              solicitud.fecha_revision
                                ? ` · ${fechaPostulacion(solicitud.fecha_revision)}`
                                : ''
                            }`
                          : ''
                        : listarNombres(solicitud.revisores)
                          ? `La revisa ${listarNombres(solicitud.revisores)}`
                          : '';

                      return (
                        <li
                          key={solicitud.id}
                          className="flex flex-wrap items-center gap-3 py-3 first:pt-1 last:pb-1"
                        >
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tema.dot}`} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] font-medium text-tinta">
                              {solicitud.materia_nombre}
                            </p>
                            <p className="mt-0.5 truncate text-[10.5px] text-muted">
                              {fecha ? `${fecha} · ` : ''}Nota {formatoNota(solicitud.nota_final)}
                            </p>
                            {quien && (
                              <p className="mt-0.5 text-[10.5px] text-tinta/80">{quien}</p>
                            )}
                            {decidida && solicitud.motivo && (
                              <p className="mt-1 rounded-xl bg-mist px-2.5 py-1.5 text-[10.5px] leading-relaxed text-muted">
                                Motivo: {solicitud.motivo}
                              </p>
                            )}
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${chip.clase}`}
                          >
                            {chip.texto}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>

            {/* ------------------------- Requisitos ------------------------- */}
            <aside className="rounded-[30px] bg-white p-5 sm:p-6 lg:sticky lg:top-6">
              <h2 className="text-[19px] font-medium tracking-[-0.01em] text-tinta">
                Requisitos para ser tutor
              </h2>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    seleccionada ? temaDeMateria(seleccionada.materia).dot : 'bg-pebble'
                  }`}
                />
                <span className="truncate text-[11.5px] text-muted">
                  {seleccionada ? seleccionada.nombre : 'Elige una materia'}
                </span>
              </div>

              {solicitudVigente && estado && (
                <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-exito/20 bg-exito/[0.06] px-3.5 py-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-exito text-white">
                    <CheckIcon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11.5px] font-semibold text-exito">
                      {solicitudVigente.estado === 'APROBADA'
                        ? 'Habilitación aprobada'
                        : 'Postulación registrada'}
                    </p>
                    <p className="mt-0.5 text-[10.5px] leading-relaxed text-exito/80">
                      {solicitudVigente.estado === 'APROBADA'
                        ? `${
                            ultimaSolicitud?.revisada_por_nombre
                              ? `La aprobó ${ultimaSolicitud.revisada_por_nombre}${
                                  ultimaSolicitud.fecha_revision
                                    ? ` (${fechaPostulacion(ultimaSolicitud.fecha_revision)})`
                                    : ''
                                }. `
                              : ''
                          }Ya puedes publicar horarios de ${seleccionada?.nombre ?? 'esta materia'}.`
                        : `Se asoció tu nota ${formatoNota(
                            seleccionada?.nota,
                          )} en ${seleccionada?.nombre ?? 'esta materia'}. ${
                            listarNombres(ultimaSolicitud?.revisores) || revisoresSeleccionada
                              ? `La revisará ${
                                  listarNombres(ultimaSolicitud?.revisores) || revisoresSeleccionada
                                }`
                              : 'El docente la revisará'
                          } y te avisaremos el resultado.`}
                    </p>
                  </div>
                </div>
              )}

              <ul className="mt-3 divide-y divide-faint">
                {requisitos.map((requisito) => (
                  <li key={requisito.clave} className="flex items-start gap-2.5 py-3">
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        requisito.cumple === true
                          ? 'bg-exito/10 text-exito'
                          : requisito.cumple === false
                            ? 'bg-advertencia/10 text-advertencia'
                            : 'bg-mist text-pebble'
                      }`}
                    >
                      {requisito.cumple === true ? (
                        <CheckIcon className="h-3 w-3" />
                      ) : requisito.cumple === false ? (
                        <CloseIcon className="h-3 w-3" />
                      ) : (
                        <span className="h-1 w-1 rounded-full bg-current" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11.5px] font-medium text-tinta">{requisito.titulo}</p>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
                        {requisito.detalle}
                      </p>
                    </div>
                    <span className="shrink-0 text-[12px] font-semibold text-tinta">
                      {requisito.valor}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="border-t border-faint pt-3 text-[10.5px] leading-relaxed text-muted">
                {notaPanel}
              </p>

              <button
                type="button"
                onClick={() => void postular()}
                disabled={!puedePostular}
                className="mt-3 w-full rounded-full bg-violeta-accion px-5 py-3 text-[12px] font-semibold text-white transition-colors hover:bg-violeta-profundo disabled:cursor-not-allowed disabled:bg-faint disabled:text-muted"
              >
                {textoBoton}
              </button>
              <p className="mt-2 text-center text-[9.5px] leading-relaxed text-muted">
                {!seleccionada
                  ? 'Tu postulación se enviará al docente de la materia.'
                  : revisoresSeleccionada
                    ? `Tu postulación le llegará a ${revisoresSeleccionada}, docente de ${seleccionada.nombre} en este periodo.`
                    : 'Esta materia todavía no tiene docente asignado en el periodo.'}
              </p>
            </aside>
          </div>
        </div>
      </main>

      <Toast mensaje={toast} />
    </div>
  );
};

interface ChipResumenProps {
  valor: string;
  etiqueta: string;
  detalle: string;
  /** El chip de elegibles se resalta en tinta, como en el diseño. */
  destacado?: boolean;
}

/** Métrica compacta de la cabecera (semestre, materias aprobadas, elegibles). */
const ChipResumen = ({ valor, etiqueta, detalle, destacado }: ChipResumenProps) => (
  <div className="flex items-center gap-2.5 rounded-full bg-white px-3 py-2">
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11.5px] font-semibold ${
        destacado ? 'bg-tinta text-white' : 'bg-[#F4F0E6] text-tinta'
      }`}
    >
      {valor}
    </span>
    <span className="pr-1">
      <span className="block text-[11px] font-medium leading-tight text-tinta">{etiqueta}</span>
      <span className="block text-[9.5px] leading-tight text-muted">{detalle}</span>
    </span>
  </div>
);

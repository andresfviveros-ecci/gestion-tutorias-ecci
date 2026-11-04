import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { api } from '../../api/axios';
import { useAuthStore } from '../../store/useAuthStore';
import { TutorRail } from '../../components/tutor/TutorRail';
import { CalendarIcon } from '../../components/constelacion/Icons';
import { StatCard } from '../../components/constelacion/StatCard';
import { Toast } from '../../components/constelacion/Toast';
import { ProximaTutoriaTutorCard } from '../../components/tutor/panel/ProximaTutoriaTutorCard';
import type { ProximaTutorVista } from '../../components/tutor/panel/ProximaTutoriaTutorCard';
import { SolicitudesTutorList } from '../../components/tutor/panel/SolicitudesTutorList';
import type { SolicitudVista } from '../../components/tutor/panel/SolicitudesTutorList';
import { ProximasTutorList } from '../../components/tutor/panel/ProximasTutorList';
import type { ProximaTutorItem } from '../../components/tutor/panel/ProximasTutorList';
import { MiDisponibilidadCard } from '../../components/tutor/panel/MiDisponibilidadCard';
import type { DiaDisponibilidad } from '../../components/tutor/panel/MiDisponibilidadCard';
import { AccesosRapidos } from '../../components/tutor/panel/AccesosRapidos';
import { ActividadReciente } from '../../components/tutor/panel/ActividadReciente';
import type { ActividadItem } from '../../components/tutor/panel/ActividadReciente';
import type {
  BloqueDisponibilidad,
  DatosPanelTutor,
  TutoriaRecibida,
} from '../../types/tutor';
import { extraerLista } from '../../utils/api';
import { idUsuarioDesdeToken } from '../../utils/auth';
import { fechaLocalISO } from '../../utils/date';
import {
  capitalizar,
  diaSemanaCorto,
  diaYNumero,
  diasDeLaSemana,
  duracionLegible,
  etiquetaRelativa,
  fechaLarga,
  horaActual,
  horaCorta,
  parseFecha,
} from '../../utils/fechas';
import { modalidadLegible } from '../../utils/panel';

const ESTADOS_ACTIVOS = ['RESERVADA', 'CONFIRMADA'];
const ESTADOS_FINALES = [
  'COMPLETADA',
  'NO_ASISTIO',
  'CANCELADA_ESTUDIANTE',
  'CANCELADA_DOCENTE',
  'ANULADA',
];

const minutosEntre = (inicio: string, fin: string): number => {
  if (!inicio || !fin) return 0;
  const [h1, m1] = inicio.split(':').map(Number);
  const [h2, m2] = fin.split(':').map(Number);
  if ([h1, m1, h2, m2].some((valor) => Number.isNaN(valor))) return 0;
  return Math.max(h2 * 60 + m2 - (h1 * 60 + m1), 0);
};

/** '2026-10-15' + '10:00' -> 'Jue, 15 oct · 10:00'. */
const fechaCortaSolicitud = (iso: string, hora: string): string => {
  const fecha = parseFecha(iso);
  const mes = fecha.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
  const dia = capitalizar(diaSemanaCorto(iso).toLowerCase());
  return `${dia}, ${fecha.getDate()} ${mes} · ${hora}`;
};

/** 'Ayer', 'Hoy' o 'Jueves 13' para la actividad reciente. */
const etiquetaActividad = (iso: string, hoyIso: string): string => {
  if (!iso) return 'Sin fecha';
  if (iso === hoyIso) return 'Hoy';
  const ayer = parseFecha(hoyIso);
  ayer.setDate(ayer.getDate() - 1);
  if (iso === fechaLocalISO(ayer)) return 'Ayer';
  return diaYNumero(iso);
};

const consultarPanel = async (docenteId: number | null): Promise<DatosPanelTutor> => {
  const consultaDisponibilidad = docenteId
    ? api.get('/disponibilidad/disponibilidad/', { params: { docente: docenteId } })
    : Promise.resolve({ data: [] as BloqueDisponibilidad[] });

  const [resRecibidas, resDisponibilidad] = await Promise.allSettled([
    api.get('/tutorias/recibidas/'),
    consultaDisponibilidad,
  ]);

  let recibidas: TutoriaRecibida[] | null = null;
  let sinRecibidas = false;

  if (resRecibidas.status === 'fulfilled') {
    recibidas = extraerLista<TutoriaRecibida>(resRecibidas.value.data);
  } else if (axios.isAxiosError(resRecibidas.reason)) {
    const estado = resRecibidas.reason.response?.status;
    // 404: el endpoint llega con el PR de tutorías recibidas.
    // 403: un coordinador entra al panel, pero no es docente.
    if (estado === 404 || estado === 403) {
      sinRecibidas = true;
    }
  }

  const disponibilidad =
    resDisponibilidad.status === 'fulfilled'
      ? extraerLista<BloqueDisponibilidad>(resDisponibilidad.value.data)
      : null;

  return {
    recibidas,
    disponibilidad,
    sinRecibidas,
    fallo:
      (resRecibidas.status === 'rejected' && !sinRecibidas) ||
      resDisponibilidad.status === 'rejected',
  };
};

export const TutorPanel = () => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);

  const [recibidas, setRecibidas] = useState<TutoriaRecibida[]>([]);
  const [disponibilidad, setDisponibilidad] = useState<BloqueDisponibilidad[]>([]);
  const [sinRecibidas, setSinRecibidas] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const hoy = useMemo(() => new Date(), []);
  const hoyISO = fechaLocalISO(hoy);

  const docenteId = useMemo(
    () => idUsuarioDesdeToken(token) ?? idUsuarioDesdeToken(localStorage.getItem('token')),
    [token],
  );

  const nombre = useMemo(() => {
    const completo = user?.first_name || user?.nombre || 'Tutor';
    return completo.trim().split(/\s+/)[0] || 'Tutor';
  }, [user]);

  const aplicarDatos = useCallback((datos: DatosPanelTutor) => {
    setRecibidas(datos.recibidas ?? []);
    setDisponibilidad(datos.disponibilidad ?? []);
    setSinRecibidas(datos.sinRecibidas);
    setErrorCarga(
      datos.fallo ? 'No pudimos cargar tu panel. Revisa tu conexión e intenta de nuevo.' : null,
    );
    setCargando(false);
  }, []);

  const recargar = useCallback(async () => {
    const datos = await consultarPanel(docenteId);
    aplicarDatos(datos);
  }, [aplicarDatos, docenteId]);

  useEffect(() => {
    let activo = true;

    const ejecutar = async () => {
      const datos = await consultarPanel(docenteId);
      if (!activo) return;
      aplicarDatos(datos);
    };

    void ejecutar();

    return () => {
      activo = false;
    };
  }, [aplicarDatos, docenteId]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(id);
  }, [toast]);

  /* --------------------------- semana ---------------------------- */

  const semana = useMemo(() => diasDeLaSemana(hoy), [hoy]);
  const diasSet = useMemo(() => new Set(semana.map((dia) => fechaLocalISO(dia))), [semana]);

  /* --------------------------- tutorías -------------------------- */

  const tutoriasConHorario = useMemo(
    () =>
      recibidas.map((tutoria) => {
        const bloque = tutoria.bloque_detalle ?? null;
        return {
          tutoria,
          bloque,
          fecha: bloque?.fecha ?? '',
          horaInicio: horaCorta(bloque?.hora_inicio),
          horaFin: horaCorta(bloque?.hora_fin),
        };
      }),
    [recibidas],
  );

  const activas = useMemo(
    () =>
      tutoriasConHorario.filter(
        (item) =>
          item.fecha && ESTADOS_ACTIVOS.includes((item.tutoria.estado || '').toUpperCase()),
      ),
    [tutoriasConHorario],
  );

  const proximas = useMemo(() => {
    const ahora = new Date();

    return activas
      .filter((item) => {
        const fin = new Date(`${item.fecha}T${item.horaFin || item.horaInicio || '23:59'}:00`);
        return fin.getTime() >= ahora.getTime();
      })
      .sort((a, b) =>
        `${a.fecha}T${a.horaInicio}`.localeCompare(`${b.fecha}T${b.horaInicio}`),
      );
  }, [activas]);

  const solicitudes = useMemo(
    () =>
      proximas.filter((item) => (item.tutoria.estado || '').toUpperCase() === 'RESERVADA'),
    [proximas],
  );

  const stats = useMemo(() => {
    const pendientes = proximas.filter(
      (item) => (item.tutoria.estado || '').toUpperCase() === 'RESERVADA',
    ).length;
    const programadas = proximas.filter((item) => diasSet.has(item.fecha)).length;
    const estudiantes = new Set(recibidas.map((tutoria) => tutoria.estudiante)).size;

    return { pendientes, programadas, estudiantes };
  }, [proximas, diasSet, recibidas]);

  /* --------------------------- disponibilidad -------------------- */

  const bloquesSemana = useMemo(
    () => disponibilidad.filter((bloque) => diasSet.has(bloque.fecha)),
    [disponibilidad, diasSet],
  );

  const minutosLibres = useMemo(() => {
    if (cargando) return null;

    return bloquesSemana
      .filter((bloque) => {
        if ((bloque.estado || '').toUpperCase() !== 'DISPONIBLE') return false;
        if (bloque.fecha > hoyISO) return true;
        if (bloque.fecha < hoyISO) return false;
        return horaCorta(bloque.hora_fin) > horaActual();
      })
      .reduce((total, bloque) => total + minutosEntre(bloque.hora_inicio, bloque.hora_fin), 0);
  }, [bloquesSemana, cargando, hoyISO]);

  const publicada = useMemo(
    () =>
      bloquesSemana.some(
        (bloque) =>
          (bloque.estado || '').toUpperCase() === 'DISPONIBLE' && bloque.fecha >= hoyISO,
      ),
    [bloquesSemana, hoyISO],
  );

  const diasDisponibilidad = useMemo<DiaDisponibilidad[]>(
    () =>
      semana.map((dia) => {
        const iso = fechaLocalISO(dia);
        return {
          iso,
          etiqueta: capitalizar(diaSemanaCorto(iso).toLowerCase()),
          numero: dia.getDate(),
          esHoy: iso === hoyISO,
          tieneBloques: bloquesSemana.some(
            (bloque) =>
              bloque.fecha === iso && (bloque.estado || '').toUpperCase() === 'DISPONIBLE',
          ),
        };
      }),
    [semana, bloquesSemana, hoyISO],
  );

  /* --------------------------- vistas ---------------------------- */

  const proxima = proximas[0] ?? null;

  const proximaVista: ProximaTutorVista | null = proxima
    ? {
        tema: proxima.tutoria.tema || proxima.bloque?.materia?.nombre || 'Tutoría',
        estudiante: proxima.tutoria.estudiante_nombre || 'Estudiante',
        materia: proxima.bloque?.materia?.nombre || '',
        modalidad: modalidadLegible(proxima.bloque?.modalidad),
        relativa: etiquetaRelativa(proxima.fecha),
        fechaTexto: diaYNumero(proxima.fecha),
        horaInicio: proxima.horaInicio,
        horaFin: proxima.horaFin,
        enlaceVirtual: proxima.bloque?.enlace_virtual || '',
      }
    : null;

  const itemsSolicitudes = useMemo<SolicitudVista[]>(
    () =>
      solicitudes.slice(0, 3).map((item, indice) => ({
        id: item.tutoria.id,
        estudiante: item.tutoria.estudiante_nombre || 'Estudiante',
        materia: item.bloque?.materia?.nombre || 'Materia por confirmar',
        fechaTexto: fechaCortaSolicitud(item.fecha, item.horaInicio),
        nueva: indice === 0,
      })),
    [solicitudes],
  );

  const itemsProximas = useMemo<ProximaTutorItem[]>(
    () =>
      proximas.slice(0, 3).map((item) => ({
        id: item.tutoria.id,
        titulo: item.tutoria.tema || item.bloque?.materia?.nombre || 'Tutoría',
        materia: item.bloque?.materia?.nombre || 'Materia por confirmar',
        fecha: item.fecha,
        horaInicio: item.horaInicio,
        horaFin: item.horaFin,
        modalidad: modalidadLegible(item.bloque?.modalidad),
        duracion: duracionLegible(minutosEntre(item.horaInicio, item.horaFin)),
        esHoy: item.fecha === hoyISO,
      })),
    [proximas, hoyISO],
  );

  const actividad = useMemo<ActividadItem | null>(() => {
    const finales = tutoriasConHorario
      .filter(
        (item) =>
          item.fecha && ESTADOS_FINALES.includes((item.tutoria.estado || '').toUpperCase()),
      )
      .sort((a, b) =>
        `${b.fecha}T${b.horaInicio}`.localeCompare(`${a.fecha}T${a.horaInicio}`),
      );

    const ultima = finales[0];
    if (!ultima) return null;

    const estado = (ultima.tutoria.estado || '').toUpperCase();
    const titulo =
      estado === 'COMPLETADA'
        ? 'Tutoría completada'
        : estado === 'NO_ASISTIO'
          ? 'Tutoría no asistida'
          : 'Tutoría cancelada';

    return {
      id: ultima.tutoria.id,
      titulo,
      detalle: `${
        ultima.tutoria.tema || ultima.bloque?.materia?.nombre || 'Tutoría'
      } · ${etiquetaActividad(ultima.fecha, hoyISO)}`,
      estado,
    };
  }, [tutoriasConHorario, hoyISO]);

  /* --------------------------- render ---------------------------- */

  return (
    <div className="flex min-h-screen bg-mist font-constelacion text-tinta">
      <TutorRail />

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1760px] space-y-5 p-5 pb-24 sm:p-6 md:pb-6 lg:p-8">
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

          <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
            <div className="min-w-0 flex-1 space-y-5">
              <div className="grid min-w-0 gap-5 lg:grid-cols-[740fr_690fr]">
                {/* ------------------ Bienvenida ------------------ */}
                <motion.section
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                  className="flex flex-col justify-between rounded-[28px] bg-white p-6 shadow-[0_1px_2px_rgba(28,26,30,0.04)] sm:p-7"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="rounded-full bg-mist px-3 py-1.5 text-[11px] font-medium text-slate-ink">
                        Panel · Tutor
                      </p>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-faint px-3 py-1.5 text-[11px] font-medium text-slate-ink">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        {fechaLarga(hoy)}
                      </span>
                    </div>

                    <h1 className="mt-6 text-[30px] font-semibold leading-tight tracking-[-0.02em] text-tinta sm:text-[34px]">
                      ¡Hola, {nombre}!
                    </h1>
                    <p className="mt-2 max-w-md text-[12px] leading-relaxed text-muted">
                      Bienvenid@ de nuevo a Aula Libre. Aquí tienes un resumen de tu actividad como
                      tutor.
                    </p>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <StatCard
                      etiqueta="Solicitudes pendientes"
                      valor={cargando || sinRecibidas ? '—' : stats.pendientes}
                      detalle="Por revisar"
                    />
                    <StatCard
                      etiqueta="Tutorías programadas"
                      valor={cargando || sinRecibidas ? '—' : stats.programadas}
                      detalle="Esta semana"
                    />
                    <StatCard
                      etiqueta="Estudiantes asignados"
                      valor={cargando || sinRecibidas ? '—' : stats.estudiantes}
                      detalle="En seguimiento"
                    />
                  </div>
                </motion.section>

                {/* ------------- Próxima tutoría ------------- */}
                <ProximaTutoriaTutorCard cargando={cargando} proxima={proximaVista} />
              </div>

              {/* ------------- Solicitudes ------------- */}
              <SolicitudesTutorList
                items={itemsSolicitudes}
                total={solicitudes.length}
                cargando={cargando}
                sinServicio={sinRecibidas}
              />

              {/* ------------- Próximas tutorías ------------- */}
              <ProximasTutorList
                items={itemsProximas}
                total={proximas.length}
                cargando={cargando}
                sinServicio={sinRecibidas}
              />
            </div>

            {/* ------------- Aside ------------- */}
            <aside className="flex w-full shrink-0 flex-col gap-5 xl:w-[322px]">
              <MiDisponibilidadCard
                cargando={cargando}
                dias={diasDisponibilidad}
                minutosLibres={minutosLibres}
                publicada={publicada}
              />
              <AccesosRapidos
                onPerfil={() => setToast('Mi perfil estará disponible próximamente.')}
              />
              <ActividadReciente
                item={actividad}
                cargando={cargando}
                sinServicio={sinRecibidas}
              />
            </aside>
          </div>
        </div>
      </main>

      <Toast mensaje={toast} />
    </div>
  );
};

export default TutorPanel;

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../api/axios';

export interface TutoriaBackend {
  id: number | string;
  materia?: string | { nombre?: string };
  materia_nombre?: string;
  tutor_nombre?: string;
  docente_nombre?: string;
  docente?: { nombre?: string; first_name?: string; last_name?: string; email?: string } | string;
  fecha: string; // Formato YYYY-MM-DD
  hora_inicio: string;
  hora_fin: string;
  modalidad?: string;
  lugar?: string;
  enlace_virtual?: string;
  enlaceMeeting?: string;
  estado?: string;
}

const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// Formateador para las tarjetas de fecha (Día, Número y Mes)
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

// Formateador de horas
const formatHora = (horaStr?: string) => {
  if (!horaStr) return '00:00';
  return horaStr.substring(0, 5);
};

export const MisReservas: React.FC = () => {
  const [tutorias, setTutorias] = useState<TutoriaBackend[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar reservas desde el backend
  useEffect(() => {
    let isMounted = true;

    const fetchReservas = async () => {
      try {
        const response = await api.get<unknown>('/tutorias/');
        let dataArray: TutoriaBackend[] = [];

        if (Array.isArray(response.data)) {
          dataArray = response.data as TutoriaBackend[];
        } else if (
          typeof response.data === 'object' &&
          response.data !== null &&
          'results' in response.data &&
          Array.isArray((response.data as { results: unknown }).results)
        ) {
          dataArray = (response.data as { results: TutoriaBackend[] }).results;
        }

        if (isMounted) {
          setTutorias(dataArray);
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
  }, []);

  // Fecha actual en formato YYYY-MM-DD
  const hoyISO = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Helpers para extraer nombres limpios sin usar 'any'
  const getMateriaNombre = (item: TutoriaBackend): string => {
    if (typeof item.materia === 'string') return item.materia;
    if (typeof item.materia === 'object' && item.materia !== null && item.materia.nombre) {
      return item.materia.nombre;
    }
    return item.materia_nombre || 'Asesoría Académica';
  };

  const getTutorNombre = (item: TutoriaBackend): string => {
    if (item.tutor_nombre) return item.tutor_nombre;
    if (item.docente_nombre) return item.docente_nombre;
    if (typeof item.docente === 'object' && item.docente !== null) {
      const full = `${item.docente.first_name || ''} ${item.docente.last_name || ''}`.trim();
      return full || item.docente.nombre || 'Docente Tutor';
    }
    return 'Docente Tutor';
  };

  // Filtrado de tutorías activas (HOY y PRÓXIMAS)
  const { tutoriasHoy, tutoriasProximas } = useMemo(() => {
    const hoy: TutoriaBackend[] = [];
    const proximas: TutoriaBackend[] = [];

    tutorias.forEach((t) => {
      const estadoLower = (t.estado || '').toLowerCase();
      // Excluir canceladas o finalizadas
      if (estadoLower.includes('cancel') || estadoLower.includes('finaliz')) return;

      if (t.fecha === hoyISO) {
        hoy.push(t);
      } else if (t.fecha > hoyISO) {
        proximas.push(t);
      }
    });

    // Ordenar por fecha y hora ascendente
    proximas.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora_inicio.localeCompare(b.hora_inicio));

    return { tutoriasHoy: hoy, tutoriasProximas: proximas };
  }, [tutorias, hoyISO]);

  const totalProgramadas = tutoriasHoy.length + tutoriasProximas.length;

  return (
    <div className="p-6 md:p-10 bg-[#f7f5ed] min-h-screen font-body text-slate-800 space-y-6">
      {/* BREADCRUMB */}
      <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
        <div>
          <span>Tutorías</span> <span className="mx-1">/</span>{' '}
          <span className="text-slate-800">Mis reservas</span>
        </div>
        <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[11px] text-slate-600 shadow-sm font-medium">
          Estudiante
        </span>
      </div>

      {/* TÍTULO PRINCIPAL Y SUBTÍTULO */}
      <div>
        <h1 className="font-display italic text-3xl md:text-4xl font-semibold text-[#0d1b2a] mb-1">
          Mis tutorías programadas
        </h1>
        <p className="text-xs md:text-sm text-slate-500">
          Consulta las fechas, horarios y el estado de las tutorías en las que estás inscrito.
        </p>
      </div>

      {/* RECUENTO Y ESTADO DE CONTENIDO */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          {totalProgramadas} {totalProgramadas === 1 ? 'tutoría programada' : 'tutorías programadas'}
        </span>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200/80">
          Cargando tus reservas...
        </div>
      ) : totalProgramadas === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200/80 space-y-2">
          <p className="font-medium text-slate-600">No tienes tutorías programadas para hoy ni próximas fechas.</p>
          <p className="text-[11px] text-slate-400">Puedes consultar horarios disponibles y reservar una nueva asesoría.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* SECCIÓN HOY */}
          {tutoriasHoy.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-300 pb-2">
                HOY
              </h3>
              <div className="space-y-3">
                {tutoriasHoy.map((item) => {
                  const badge = parseFechaBadge(item.fecha);
                  const isVirtual = item.modalidad?.toLowerCase() === 'virtual';
                  const meetUrl = item.enlace_virtual || item.enlaceMeeting;

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white border border-slate-300 rounded-2xl p-4 md:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        {/* BADGE CON FECHA */}
                        <div className="w-14 h-16 rounded-xl bg-[#111a2e] text-white flex flex-col items-center justify-center shrink-0 shadow-sm">
                          <span className="text-[9px] font-bold tracking-wider uppercase text-slate-300">
                            {badge.mes}
                          </span>
                          <span className="text-xl font-bold leading-none my-0.5">{badge.diaNum}</span>
                          <span className="text-[9px] text-slate-400 font-medium">{badge.diaSem}</span>
                        </div>

                        {/* DETALLES DE LA TUTORÍA */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm md:text-base text-slate-800">
                              {getMateriaNombre(item)}
                            </h4>
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-bold rounded-full uppercase">
                              HOY
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 font-medium flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>
                              <i className="fa-regular fa-clock mr-1 text-slate-400"></i>
                              {formatHora(item.hora_inicio)} - {formatHora(item.hora_fin)}
                            </span>
                            <span>
                              Tutor: <strong className="text-slate-700">{getTutorNombre(item)}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* BADGES DE DERECHA */}
                      <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isVirtual ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {item.modalidad || 'Virtual'}
                          </span>
                          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                            {item.estado || 'CONFIRMADA'}
                          </span>
                        </div>

                        {isVirtual ? (
                          meetUrl ? (
                            <a
                              href={meetUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <i className="fa-solid fa-video text-xs"></i> Enlace de reunión disponible
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Enlace de reunión pendiente</span>
                          )
                        ) : (
                          <span className="text-[11px] text-slate-500">
                            {item.lugar || 'Ubicación asignada en campus'}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECCIÓN PRÓXIMAS */}
          {tutoriasProximas.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-300 pb-2">
                PRÓXIMAS
              </h3>
              <div className="space-y-3">
                {tutoriasProximas.map((item) => {
                  const badge = parseFechaBadge(item.fecha);
                  const isVirtual = item.modalidad?.toLowerCase() === 'virtual';
                  const meetUrl = item.enlace_virtual || item.enlaceMeeting;

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white border border-slate-300 rounded-2xl p-4 md:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        {/* BADGE CON FECHA */}
                        <div className="w-14 h-16 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold tracking-wider uppercase text-slate-400">
                            {badge.mes}
                          </span>
                          <span className="text-xl font-bold leading-none my-0.5">{badge.diaNum}</span>
                          <span className="text-[9px] text-slate-500 font-medium">{badge.diaSem}</span>
                        </div>

                        {/* DETALLES DE LA TUTORÍA */}
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm md:text-base text-slate-800">
                            {getMateriaNombre(item)}
                          </h4>
                          <div className="text-xs text-slate-500 font-medium flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>
                              <i className="fa-regular fa-clock mr-1 text-slate-400"></i>
                              {formatHora(item.hora_inicio)} - {formatHora(item.hora_fin)}
                            </span>
                            <span>
                              Tutor: <strong className="text-slate-700">{getTutorNombre(item)}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* BADGES DE DERECHA */}
                      <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isVirtual ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {item.modalidad || 'Presencial'}
                          </span>
                          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                            {item.estado || 'CONFIRMADA'}
                          </span>
                        </div>

                        {isVirtual ? (
                          meetUrl ? (
                            <a
                              href={meetUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <i className="fa-solid fa-video text-xs"></i> Enlace de reunión disponible
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Enlace de reunión disponible pronto</span>
                          )
                        ) : (
                          <span className="text-[11px] text-slate-500">
                            {item.lugar || 'Bloque / Salón por confirmar'}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* NOTA DE PIE DE PÁGINA */}
      <p className="text-[11px] text-slate-400 pt-4">
        Las tutorías finalizadas o canceladas se muestran en tu Historial.
      </p>
    </div>
  );
};
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/axios';
import { analizarError, extraerLista, type TipoFallo } from '../../utils/api';
import type { TutoriaRecibida } from '../../types/tutor';
import { fechaLocalISO } from '../../utils/date';
import { Toast } from '../../components/constelacion/Toast';
import { CloseIcon } from '../../components/constelacion/Icons';
import { TutorRail } from '../../components/tutor/TutorRail';

/** Título del aviso según el tipo de error (los mismos de antes). */
const TITULO_FALLO: Record<TipoFallo, string> = {
  conflicto: 'Este horario se cruza con otro bloque',
  validacion: 'Revisa los datos del horario',
  permiso: 'No tienes permiso para esta acción',
  sin_conexion: 'Sin conexión con el servidor',
  servidor: 'El servidor tuvo un problema',
};

export interface MateriaBackend {
  id: number;
  codigo: string;
  nombre: string;
}

export interface ScheduleSlot {
  id: number | string;
  docente?: number | string | { id?: number | string };
  materia: number | MateriaBackend | string | null;
  periodo?: number;
  fecha: string;
  horaInicio?: string;
  horaFin?: string;
  hora_inicio?: string;
  hora_fin?: string;
  modalidad: 'PRESENCIAL' | 'VIRTUAL' | 'Presencial' | 'Virtual' | string;
  ubicacionOEnlace?: string;
  lugar?: string;
  enlace_virtual?: string;
  cupo_total?: number;
  cupo_ocupado?: number;
  estado: string;
  observaciones?: string;
  estudiante?: string;
  diaSemana?: string;
}

/** Reservas que ocupan cupo: las canceladas o ya atendidas no se muestran en el bloque. */
const ESTADOS_RESERVA_ACTIVA = ['RESERVADA', 'CONFIRMADA'];

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'] as const;
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Función Helper para normalizar siempre la modalidad a mayúsculas (PRESENCIAL / VIRTUAL)
const normalizarModalidad = (mod?: string): 'PRESENCIAL' | 'VIRTUAL' => {
  if (!mod) return 'VIRTUAL';
  return mod.toUpperCase().includes('PRESENCIAL') ? 'PRESENCIAL' : 'VIRTUAL';
};

export const Calendario: React.FC = () => {
  const navigate = useNavigate();
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [materias, setMaterias] = useState<MateriaBackend[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);

  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorTipo, setErrorTipo] = useState<TipoFallo>('validacion');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cargando, setCargando] = useState(true);
  // Quién reservó cada bloque (una sola consulta a /tutorias/recibidas/).
  const [reservas, setReservas] = useState<TutoriaRecibida[]>([]);
  const [sinNombres, setSinNombres] = useState(false);

  // Si falla, el Calendario sigue igual y solo se avisa una vez, de forma discreta.
  const cargarReservas = async (): Promise<TutoriaRecibida[] | null> => {
    try {
      const { data } = await api.get('/tutorias/recibidas/');
      return extraerLista<TutoriaRecibida>(data);
    } catch {
      return null;
    }
  };

  const aplicarReservas = (lista: TutoriaRecibida[] | null) => {
    setReservas(lista ?? []);
    setSinNombres(lista === null);
  };

  // 1. CARGA INICIAL
  useEffect(() => {
    let ignore = false;

    const fetchInitialData = async () => {
      try {
        const [resBloques, resMaterias] = await Promise.all([
          api.get<ScheduleSlot[]>('/disponibilidad/disponibilidad/?incluir_pasados=1&docente=me'),
          api.get<MateriaBackend[]>('/catalogo/materias/'),
        ]);

        if (!ignore) {
          const bloquesNormalizados = (Array.isArray(resBloques.data) ? resBloques.data : []).map((b) => {
            const mod = normalizarModalidad(b.modalidad);
            const ubicacion = mod === 'PRESENCIAL' ? (b.lugar || b.ubicacionOEnlace || '') : (b.enlace_virtual || b.ubicacionOEnlace || '');
            return {
              ...b,
              modalidad: mod,
              horaInicio: b.horaInicio || b.hora_inicio || '',
              horaFin: b.horaFin || b.hora_fin || '',
              lugar: b.lugar || '',
              enlace_virtual: b.enlace_virtual || '',
              ubicacionOEnlace: ubicacion,
            };
          });

          setSlots(bloquesNormalizados);
          setMaterias(Array.isArray(resMaterias.data) ? resMaterias.data : []);
        }
      } catch (err) {
        console.error('Error al cargar la disponibilidad en Calendario:', err);
      } finally {
        if (!ignore) setCargando(false);
      }
    };

    fetchInitialData();
    void cargarReservas().then((lista) => {
      if (!ignore) aplicarReservas(lista);
    });

    return () => {
      ignore = true;
    };
  }, []);

  // 2. FUNCIÓN DE RECARGA
  const refetchData = async () => {
    try {
      const [resBloques, resMaterias] = await Promise.all([
        api.get<ScheduleSlot[]>('/disponibilidad/disponibilidad/?incluir_pasados=1&docente=me'),
        api.get<MateriaBackend[]>('/catalogo/materias/'),
      ]);

      const bloquesNormalizados = (Array.isArray(resBloques.data) ? resBloques.data : []).map((b) => {
        const mod = normalizarModalidad(b.modalidad);
        const ubicacion = mod === 'PRESENCIAL' ? (b.lugar || b.ubicacionOEnlace || '') : (b.enlace_virtual || b.ubicacionOEnlace || '');
        return {
          ...b,
          modalidad: mod,
          horaInicio: b.horaInicio || b.hora_inicio || '',
          horaFin: b.horaFin || b.hora_fin || '',
          lugar: b.lugar || '',
          enlace_virtual: b.enlace_virtual || '',
          ubicacionOEnlace: ubicacion,
        };
      });

      setSlots(bloquesNormalizados);
      setMaterias(Array.isArray(resMaterias.data) ? resMaterias.data : []);
      aplicarReservas(await cargarReservas());
    } catch (err) {
      console.error('Error al recargar la disponibilidad:', err);
    }
  };

  const getWeekRange = (offset = 0) => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday + offset * 7);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { monday, sunday };
  };

  const openDrawer = (slot: ScheduleSlot) => {
    const mod = normalizarModalidad(slot.modalidad);
    const ubicacion = slot.ubicacionOEnlace || (mod === 'PRESENCIAL' ? slot.lugar : slot.enlace_virtual) || '';

    setEditingSlot({
      ...slot,
      modalidad: mod,
      horaInicio: (slot.horaInicio || slot.hora_inicio || '').substring(0, 5),
      horaFin: (slot.horaFin || slot.hora_fin || '').substring(0, 5),
      ubicacionOEnlace: ubicacion,
    });
    setErrorMessage(null);
    setShowConfirmModal(false);
    setTimeout(() => setIsDrawerOpen(true), 10);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setShowConfirmModal(false);
    setTimeout(() => setEditingSlot(null), 300);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showConfirmModal) {
          setShowConfirmModal(false);
        } else if (editingSlot) {
          closeDrawer();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingSlot, showConfirmModal]);

  const getMateriaNombre = (m: number | MateriaBackend | string | null | undefined): string => {
    if (!m) return 'Sin Materia';
    if (typeof m === 'object' && m.nombre) return m.nombre;
    if (typeof m === 'string' && isNaN(Number(m))) return m;
    const encontrada = materias.find((item) => item.id === Number(m));
    return encontrada ? encontrada.nombre : 'Materia';
  };

  const handleConfirmSuspender = async () => {
    if (!editingSlot) return;

    setSaving(true);
    try {
      // El estado del bloque es de solo lectura: suspender es un DELETE. El
      // backend cancela las reservas activas y avisa a cada estudiante.
      await api.delete(`/disponibilidad/${editingSlot.id}/actualizar/`, {
        data: { motivo: 'Horario suspendido por el docente' },
      });

      await refetchData();
      closeDrawer();
      setSuccessMessage('Suspendiste el horario correctamente.');
    } catch (err) {
      const fallo = analizarError(err);
      setErrorTipo(fallo.tipo);
      setErrorMessage(fallo.mensaje);
    } finally {
      setSaving(false);
    }
  };

  const reservasPorBloque = useMemo(() => {
    const mapa = new Map<string, TutoriaRecibida[]>();
    reservas
      .filter(
        (reserva) =>
          reserva.bloque != null &&
          ESTADOS_RESERVA_ACTIVA.includes((reserva.estado || '').toUpperCase()),
      )
      .forEach((reserva) => {
        const clave = String(reserva.bloque);
        mapa.set(clave, [...(mapa.get(clave) ?? []), reserva]);
      });
    return mapa;
  }, [reservas]);

  const { monday, sunday } = getWeekRange(weekOffset);
  const m1 = MESES[monday.getMonth()];
  const m2 = MESES[sunday.getMonth()];
  const weekText =
    m1 === m2
      ? `Semana del ${monday.getDate()} al ${sunday.getDate()} de ${m1}`
      : `Semana del ${monday.getDate()} de ${m1} al ${sunday.getDate()} de ${m2}`;

  const bloquesSemana = slots.filter((s) => {
    const isoDia = s.fecha;
    return (
      isoDia >= fechaLocalISO(monday) && isoDia <= fechaLocalISO(sunday) && s.estado !== 'CANCELADO'
    );
  }).length;


  // El Toast desaparece solo, como en las demás pantallas.
  useEffect(() => {
    if (!successMessage) return;
    const temporizador = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(temporizador);
  }, [successMessage]);

  return (
    <div className="flex min-h-screen bg-mist font-constelacion text-tinta">
      <TutorRail />

      <main className="mx-auto w-full min-w-0 max-w-[1500px] flex-1 px-5 py-6 pb-24 sm:px-7 md:pb-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11.5px] text-muted">Mi trabajo · Tutor</p>
            <h1 className="mt-1 text-[30px] font-medium leading-tight tracking-[-0.02em] text-tinta sm:text-[36px]">
              Mi disponibilidad
            </h1>
            <p className="mt-1 max-w-[620px] text-[13px] leading-relaxed text-muted">
              Revisa los horarios que publicaste. Abre un bloque para modificarlo o suspéndelo si
              ya no puedes atenderlo.
            </p>
          </div>

          <div className="rounded-[22px] bg-white px-4 py-3 text-right">
            <p className="text-[10.5px] text-muted">Bloques esta semana</p>
            <p className="mt-0.5 text-[13.5px] font-medium text-tinta">{cargando ? '—' : bloquesSemana}</p>
          </div>
        </header>

        <section className="rounded-[28px] bg-white p-5 shadow-[0_1px_2px_rgba(28,26,30,0.04)] sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-faint pb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeekOffset((prev) => prev - 1)}
                aria-label="Semana anterior"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-faint text-slate-ink transition-colors hover:bg-mist"
              >
                ‹
              </button>
              <span className="px-1 text-[12.5px] font-medium text-tinta">{weekText}</span>
              <button
                onClick={() => setWeekOffset((prev) => prev + 1)}
                aria-label="Semana siguiente"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-faint text-slate-ink transition-colors hover:bg-mist"
              >
                ›
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-exito" /> Libre (sin reservas)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-tinta" /> Reservada por un estudiante
              </span>
              <span className="hidden sm:inline">Haz clic para ver o editar el detalle</span>
            </div>
            {sinNombres && (
              <p className="w-full text-[11px] text-muted" role="status">
                No pudimos cargar quién reservó cada horario. El calendario sigue disponible.
              </p>
            )}
          </div>

          <div className="overflow-hidden rounded-[22px] border border-faint">
            <div className="grid grid-cols-7 border-b border-faint bg-mist py-2.5 text-center text-[11px] font-semibold text-muted">
              {DIAS_SEMANA.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            {cargando ? (
              <div className="grid min-h-[380px] grid-cols-7 gap-2 bg-white p-2" aria-busy="true">
                {DIAS_SEMANA.map((dia) => (
                  <div key={dia} className="space-y-2">
                    <div className="h-[72px] animate-pulse rounded-2xl bg-mist" />
                    <div className="h-[72px] animate-pulse rounded-2xl bg-mist" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid min-h-[380px] grid-cols-7 divide-x divide-faint bg-white">
                {DIAS_SEMANA.map((dia, index) => {
                  const colDate = new Date(monday);
                  colDate.setDate(monday.getDate() + index);
                  const colDateStr = fechaLocalISO(colDate);

                  const daySlots = slots.filter(
                    (s) => s.fecha === colDateStr && s.estado !== 'CANCELADO'
                  );

                  return (
                    <div key={dia} className="space-y-2 p-2">
                      {daySlots.map((s) => {
                        const nombreMat = getMateriaNombre(s.materia);
                        const isLibre = s.estado === 'DISPONIBLE' || s.estado === 'Libre';
                        const reservasBloque = reservasPorBloque.get(String(s.id)) ?? [];
                        const primerNombre = reservasBloque[0]?.estudiante_nombre?.trim();

                        return (
                          <div
                            key={s.id}
                            onClick={() => openDrawer(s)}
                            className={`cursor-pointer rounded-[14px] border p-3 transition-colors ${
                              isLibre
                                ? 'border-faint bg-white text-tinta hover:border-exito/40 hover:bg-mist'
                                : 'border-tinta bg-tinta text-white hover:bg-carbon'
                            }`}
                          >
                            <div className="mb-1 flex items-center justify-between gap-1">
                              <span className="truncate text-[11.5px] font-semibold">{nombreMat}</span>
                              {!isLibre && (
                                <span className="shrink-0 rounded-full bg-white/15 px-1.5 py-0.5 text-[9px] font-medium">
                                  Reservada
                                </span>
                              )}
                            </div>
                            <div
                              className={`text-[10.5px] ${isLibre ? 'text-muted' : 'text-white/75'}`}
                            >
                              {(s.horaInicio || s.hora_inicio || '').substring(0, 5)} -{' '}
                              {(s.horaFin || s.hora_fin || '').substring(0, 5)}
                            </div>
                            {primerNombre && (
                              <div
                                className={`mt-1 flex min-w-0 items-center gap-1 text-[10.5px] font-medium ${
                                  isLibre ? 'text-slate-ink' : 'text-white'
                                }`}
                                title={reservasBloque
                                  .map((reserva) => reserva.estudiante_nombre || 'Estudiante')
                                  .join(', ')}
                              >
                                <span className="truncate">{primerNombre}</span>
                                {reservasBloque.length > 1 && (
                                  <span className="shrink-0 opacity-80">+{reservasBloque.length - 1}</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* DRAWER LATERAL */}
      {editingSlot && (
        <div
          onClick={closeDrawer}
          className={`fixed inset-0 z-[1000] flex justify-end bg-tinta/40 backdrop-blur-sm transition-opacity duration-300 ${
            isDrawerOpen ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`flex h-full w-full max-w-[420px] transform flex-col justify-between bg-white shadow-constelacion-float transition-transform duration-300 ease-in-out ${
              isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-faint p-5">
              <h2 className="text-[20px] font-medium tracking-[-0.01em] text-tinta">
                Detalle del horario
              </h2>
              <button
                onClick={closeDrawer}
                aria-label="Cerrar detalle"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-mist"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5 text-xs">
              {errorMessage && (
                <div
                  role="alert"
                  className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${
                    errorTipo === 'conflicto'
                      ? 'border-advertencia/45 bg-advertencia/5 text-advertencia'
                      : 'border-peligro/40 bg-peligro/5 text-peligro'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold">{TITULO_FALLO[errorTipo]}</p>
                    <p className="mt-1 text-[11.5px] leading-relaxed opacity-90">{errorMessage}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setErrorMessage(null)}
                    aria-label="Cerrar aviso"
                    className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full opacity-70 transition-opacity hover:opacity-100"
                  >
                    <CloseIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div>
                <span
                  className={`inline-block rounded-full px-3 py-1 text-[10px] font-semibold uppercase ${
                    editingSlot.estado === 'DISPONIBLE' || editingSlot.estado === 'Libre'
                      ? 'bg-exito/10 text-exito'
                      : 'bg-faint text-slate-ink'
                  }`}
                >
                  {editingSlot.estado === 'DISPONIBLE' || editingSlot.estado === 'Libre'
                    ? 'LIBRE (SIN RESERVAS)'
                    : 'RESERVADA'}
                </span>
              </div>

              <div className="space-y-2.5 rounded-[18px] border border-faint bg-mist p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted">Materia</span>
                  <span className="text-right font-semibold text-tinta">
                    {getMateriaNombre(editingSlot.materia)}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted">Fecha</span>
                  <span className="text-right font-semibold text-tinta">{editingSlot.fecha}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted">Horario</span>
                  <span className="text-right font-semibold text-tinta">
                    {editingSlot.horaInicio} – {editingSlot.horaFin}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted">Modalidad</span>
                  <span className="text-right font-semibold text-tinta">
                    {normalizarModalidad(editingSlot.modalidad) === 'VIRTUAL' ? 'Virtual' : 'Presencial'}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted">Cupo</span>
                  <span className="text-right font-semibold text-tinta">
                    {editingSlot.cupo_ocupado ?? 0}/{editingSlot.cupo_total ?? 0}
                  </span>
                </div>
                {(reservasPorBloque.get(String(editingSlot.id)) ?? []).length > 0 ? (
                  <div>
                    <span className="text-muted">Reservado por</span>
                    <ul className="mt-2 space-y-2">
                      {(reservasPorBloque.get(String(editingSlot.id)) ?? []).map((reserva) => (
                        <li key={reserva.id} className="rounded-xl bg-mist px-3 py-2">
                          <p className="font-semibold text-tinta">
                            {reserva.estudiante_nombre || 'Estudiante'}
                          </p>
                          <p className="mt-0.5 text-[10.5px] text-muted">
                            {reserva.tema?.trim() || 'Sin tema'}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  editingSlot.estudiante && (
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-muted">Reservado por</span>
                      <span className="text-right font-semibold text-tinta">
                        {editingSlot.estudiante}
                      </span>
                    </div>
                  )
                )}
              </div>

              <p className="text-[11px] leading-relaxed text-muted">
                La edición de los datos se hace en la vista de modificar disponibilidad. Aquí puedes revisar el bloque o suspenderlo.
              </p>
            </div>

            <div className="shrink-0 space-y-2 border-t border-faint bg-white p-5">
              <button
                type="button"
                onClick={() => {
                  closeDrawer();
                  navigate(`/tutor/mi-disponibilidad/${editingSlot.id}/editar`);
                }}
                className="h-11 w-full cursor-pointer rounded-full bg-violeta-accion text-[12px] font-semibold text-white transition-colors hover:bg-violeta-profundo"
              >
                Modificar disponibilidad
              </button>

              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="h-10 w-full cursor-pointer rounded-full border border-peligro/40 text-[12px] font-semibold text-peligro transition-colors hover:bg-peligro/5"
              >
                Suspender Horario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN */}
      {showConfirmModal && editingSlot && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-tinta/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[28px] bg-white p-6 text-center shadow-constelacion-float">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-peligro/10 text-[22px] font-bold text-peligro">
              ⚠️
            </div>

            <h3 className="mb-2 text-[22px] font-medium tracking-[-0.01em] text-tinta">
              ¿Suspender este horario?
            </h3>

            <p className="mb-6 text-[12px] leading-relaxed text-muted">
              Este horario de <strong className="text-tinta">{getMateriaNombre(editingSlot.materia)}</strong> ({editingSlot.diaSemana || 'Programado'}, {editingSlot.horaInicio}–{editingSlot.horaFin}) dejará de estar visible para los estudiantes. Puedes volver a publicarlo cuando quieras.
            </p>

            <div className="grid grid-cols-2 gap-3 text-[12px] font-semibold">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="h-11 cursor-pointer rounded-full border border-faint text-slate-ink transition-colors hover:bg-mist"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={handleConfirmSuspender}
                className="h-11 cursor-pointer rounded-full bg-peligro text-white transition-opacity hover:opacity-95 disabled:opacity-50"
              >
                {saving ? 'Procesando...' : 'Sí, Suspender'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast mensaje={successMessage} />
    </div>
  );
};

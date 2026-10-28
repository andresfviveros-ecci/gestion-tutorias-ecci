import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader } from '../../components/Loader';
import { useScheduleStore } from '../../store/useScheduleStore';
import { api } from '../../api/axios';
import { fechaLocalISO } from '../../utils/date';

// Interfaz para la respuesta de MateriaSerializer (Django)
export interface MateriaBackend {
  id: number;
  codigo: string;
  nombre: string;
  creditos?: number;
  semestre?: number;
  programa?: number;
  activa: boolean;
}

// Interfaz para la respuesta de PeriodoAcademico (Django)
export interface PeriodoBackend {
  id: number;
  codigo: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  activo: boolean;
}

// Interfaz para BloqueDisponibilidadSerializer (Django)
export interface BloqueDisponibilidadBackend {
  id?: number | string;
  docente?: number | string | { id?: number | string; nombre?: string; email?: string };
  materia?: number | string | MateriaBackend | null;
  materia_nombre?: string;
  periodo?: number | PeriodoBackend | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  modalidad: string;
  lugar?: string;
  enlace_virtual?: string;
  cupo_total?: number;
  cupo_ocupado?: number;
  estado?: string;
  observaciones?: string;
  horaInicio?: string;
  horaFin?: string;
  materiaNombre?: string;
}

interface ScheduleStoreInterface {
  slots?: BloqueDisponibilidadBackend[];
  fetchSlots?: () => Promise<void>;
}

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'] as const;
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

export const MiDisponibilidad: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const scheduleStore = useScheduleStore() as unknown as ScheduleStoreInterface;
  const storeSlots = scheduleStore?.slots || [];
  const fetchSlots = scheduleStore?.fetchSlots;

  // ESTADOS CONECTADOS A LOS MODELOS DE DJANGO
  const [materias, setMaterias] = useState<MateriaBackend[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoBackend[]>([]);
  const [materiaId, setMateriaId] = useState<string | number>('');
  const [periodoId, setPeriodoId] = useState<string | number>('');

  const [fecha, setFecha] = useState(() => fechaLocalISO(new Date()));
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [modalidad, setModalidad] = useState<'VIRTUAL' | 'PRESENCIAL'>('VIRTUAL');
  const [ubicacionOEnlace, setUbicacionOEnlace] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const [localSlots, setLocalSlots] = useState<BloqueDisponibilidadBackend[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // CARGA DE DATOS DESDE LA API REST EN DJANGO
  const cargarCatalogos = useCallback(async () => {
    try {
      // 1. Cargar Materias
      const resMaterias = await api.get<MateriaBackend[]>('/catalogo/materias/').catch(() => null);
      if (resMaterias && resMaterias.data) {
        const rawMat = Array.isArray(resMaterias.data)
          ? resMaterias.data
          : (resMaterias.data as unknown as { results?: MateriaBackend[] }).results || [];
        const activas = rawMat.filter((m) => m.activa !== false);
        setMaterias(activas);
        if (activas.length > 0) {
          setMateriaId((prev) => prev || activas[0].id);
        }
      }

      // 2. Cargar Periodos de forma segura
      try {
        const resPeriodos = await api.get<PeriodoBackend[]>('/catalogo/periodos/');
        if (resPeriodos && resPeriodos.data) {
          const rawPer = Array.isArray(resPeriodos.data)
            ? resPeriodos.data
            : (resPeriodos.data as unknown as { results?: PeriodoBackend[] }).results || [];
          setPeriodos(rawPer);
          const activoPeriodo = rawPer.find((p) => p.activo) || rawPer[0];
          if (activoPeriodo) {
            setPeriodoId((prev) => prev || activoPeriodo.id);
          }
        }
      } catch (pErr) {
        console.warn('Endpoint de periodos no disponible, asignando periodo predeterminado.', pErr);
        setPeriodos([{ id: 1, codigo: '2026-2', activo: true }]);
        setPeriodoId((prev) => prev || 1);
      }

      // 3. Cargar Bloques de Disponibilidad desde la API
      const resBloques = await api.get('/disponibilidad/disponibilidad/').catch(() => null);
      if (resBloques && resBloques.data) {
        const rawBloques = Array.isArray(resBloques.data)
          ? resBloques.data
          : (resBloques.data as { results?: BloqueDisponibilidadBackend[] }).results || [];
        setLocalSlots(rawBloques);
      }

      if (typeof fetchSlots === 'function') {
        await fetchSlots().catch(() => null);
      }
    } catch (err) {
      console.error('Error al conectar con la API de Django:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchSlots]);

  useEffect(() => {
    let isMounted = true;

    const timer = setTimeout(() => {
      if (isMounted) {
        cargarCatalogos();
      }
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [cargarCatalogos]);

  // COMBINAR Y PRIORIZAR BLOQUES OBTENIDOS DE LA BASE DE DATOS
  const slotsActuales = useMemo(() => {
    return localSlots.length > 0 ? localSlots : storeSlots;
  }, [localSlots, storeSlots]);

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

  // OBTENER NOMBRE DE LA MATERIA
  const obtenerNombreMateria = (s: BloqueDisponibilidadBackend): string => {
    if (s.materiaNombre) return s.materiaNombre;
    if (s.materia_nombre) return s.materia_nombre;

    const m = s.materia;
    if (!m) return 'Tutoría Académica';

    if (typeof m === 'string') {
      if (m.includes('—')) return m.split('—')[1].trim();
      if (m.includes(' - ')) return m.split(' - ')[1].trim();
      return m;
    }

    if (typeof m === 'object' && m !== null && 'nombre' in m && m.nombre) {
      return m.nombre;
    }

    const materiaEncontrada = materias.find((mat) => String(mat.id) === String(m));
    return materiaEncontrada ? materiaEncontrada.nombre : 'Tutoría Académica';
  };

  // SUBMIT CONECTADO AL ENDPOINT DE SWAGGER
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!materiaId) {
      setErrorMessage('Debes seleccionar una materia activa.');
      return;
    }

    if (!fecha || !horaInicio || !horaFin || !ubicacionOEnlace.trim()) {
      setErrorMessage('Por favor completa todos los campos requeridos.');
      return;
    }

    if (horaInicio >= horaFin) {
      setErrorMessage('La hora de inicio debe ser anterior a la hora de fin.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        materia: Number(materiaId),
        periodo: periodoId ? Number(periodoId) : 1,
        fecha: fecha,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        modalidad: modalidad,
        lugar: modalidad === 'PRESENCIAL' ? ubicacionOEnlace.trim() : '',
        enlace_virtual: modalidad === 'VIRTUAL' ? ubicacionOEnlace.trim() : '',
        cupo_total: 1,
        observaciones: observaciones || 'Disponibilidad agregada por el docente',
      };

      await api.post('/disponibilidad/disponibilidad/', payload);

      setSuccessMessage('¡Disponibilidad publicada! La tutoría se creó correctamente y ya es visible para los estudiantes.');
      setHoraInicio('');
      setHoraFin('');
      setUbicacionOEnlace('');
      setObservaciones('');

      // Recargar bloques inmediatamente desde el servidor
      await cargarCatalogos();
    } catch (err: unknown) {
      console.error('Error al conectar con la API de Django:', err);
      setErrorMessage('Error al registrar la disponibilidad en el servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  const { monday, sunday } = getWeekRange(weekOffset);
  const m1 = MESES[monday.getMonth()];
  const m2 = MESES[sunday.getMonth()];
  const weekText =
    m1 === m2
      ? `Semana del ${monday.getDate()} al ${sunday.getDate()} de ${m1}`
      : `Semana del ${monday.getDate()} de ${m1} al ${sunday.getDate()} de ${m2}`;

  return (
    <div className="w-full flex flex-col bg-[#f7f5ed] min-h-screen">
      <Loader hidden={!loading} />

      <header className="w-full h-14 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
        <div className="text-[0.82rem] text-slate-500">
          Mi trabajo / <span className="font-semibold text-[#0d1b2a]">Mi disponibilidad</span>
        </div>
        <div className="text-xs font-semibold text-slate-600">Tutor</div>
      </header>

      <main className="px-8 py-6 w-full max-w-[1400px] mx-auto flex-1 flex flex-col justify-start space-y-4">
        <div>
          <h1 className="font-display italic text-3xl font-semibold text-[#0d1b2a] mb-1">
            Publicar disponibilidad
          </h1>
          <p className="text-[0.83rem] text-slate-500">
            Define un horario y quedará visible de inmediato para que los estudiantes reserven, sin que tengas que contactarlos.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* TARJETA DEL FORMULARIO */}
          <div className="lg:col-span-5 bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col max-h-[calc(100vh-200px)]">
            
            {/* 1. ALERTAS FIJAS ARRIBA (FUERA DEL SCROLL) */}
            {successMessage && (
              <div className="mb-3 p-3.5 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-xs leading-relaxed animate-in fade-in duration-200 shrink-0">
                {successMessage}
              </div>
            )}

            {errorMessage && (
              <div className="mb-3 p-3.5 bg-rose-100 border border-rose-300 text-rose-800 rounded-lg text-xs leading-relaxed animate-in fade-in duration-200 shrink-0">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 text-xs">
              
              {/* 2. CAMPOS DEL FORMULARIO CON SCROLL CUANDO SEA NECESARIO */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* DESPLEGABLE DE MATERIAS OBTENIDAS DE LA API */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Materia</label>
                  <select
                    value={materiaId}
                    onChange={(e) => setMateriaId(e.target.value)}
                    required
                    className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a] cursor-pointer"
                  >
                    {materias.length === 0 ? (
                      <option value="">No hay materias registradas o cargando...</option>
                    ) : (
                      materias.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.codigo} — {m.nombre}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* DESPLEGABLE DE PERIODOS SI EXISTEN */}
                {periodos.length > 0 && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">Periodo Académico</label>
                    <select
                      value={periodoId}
                      onChange={(e) => setPeriodoId(e.target.value)}
                      required
                      className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a] cursor-pointer"
                    >
                      {periodos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.codigo} {p.activo ? '(Vigente)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Fecha</label>
                  <input
                    type="date"
                    required
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">Hora inicio</label>
                    <input
                      type="time"
                      required
                      value={horaInicio}
                      onChange={(e) => setHoraInicio(e.target.value)}
                      className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">Hora fin</label>
                    <input
                      type="time"
                      required
                      value={horaFin}
                      onChange={(e) => setHoraFin(e.target.value)}
                      className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Modalidad</label>
                  <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setModalidad('VIRTUAL');
                        setUbicacionOEnlace('');
                      }}
                      className={`h-8 font-semibold rounded-md transition-all cursor-pointer ${
                        modalidad === 'VIRTUAL'
                          ? 'bg-[#047857]/20 text-[#047857] border border-[#047857]/30'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Virtual
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalidad('PRESENCIAL');
                        setUbicacionOEnlace('');
                      }}
                      className={`h-8 font-semibold rounded-md transition-all cursor-pointer ${
                        modalidad === 'PRESENCIAL'
                          ? 'bg-[#0d1b2a]/10 text-[#0d1b2a] border border-[#0d1b2a]/20'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Presencial
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    {modalidad === 'VIRTUAL' ? 'Enlace de la reunión (Google Meet)' : 'Lugar / Aula'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      modalidad === 'VIRTUAL'
                        ? 'https://meet.google.com/...'
                        : 'Ej. Biblioteca, Segundo Piso'
                    }
                    value={ubicacionOEnlace}
                    onChange={(e) => setUbicacionOEnlace(e.target.value)}
                    className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a]"
                  />
                </div>
              </div>

              {/* 3. BOTÓN DE PUBLICAR FIJO ABAJO (FUERA DEL SCROLL) */}
              <div className="pt-3 shrink-0">
                <button
                  type="submit"
                  disabled={submitting || materias.length === 0}
                  className="w-full h-10 bg-[#0d1b2a] hover:bg-[#1e2d4a] text-white font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Publicando...' : 'Publicar'}
                </button>
              </div>

            </form>
          </div>

          {/* MATRIZ SEMANAL DE DISPONIBILIDAD */}
          <div className="lg:col-span-7 bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWeekOffset((prev) => prev - 1)}
                  className="w-6 h-6 border border-slate-300 rounded hover:bg-slate-100 flex items-center justify-center font-bold cursor-pointer"
                >
                  ‹
                </button>
                <span className="font-semibold text-slate-700">{weekText}</span>
                <button
                  type="button"
                  onClick={() => setWeekOffset((prev) => prev + 1)}
                  className="w-6 h-6 border border-slate-300 rounded hover:bg-slate-100 flex items-center justify-center font-bold cursor-pointer"
                >
                  ›
                </button>
              </div>

              <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#047857]" /> Virtual
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0d1b2a]" /> Presencial
                </span>
                <span className="text-[#047857] ml-2">• Visible para estudiantes</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center text-[11px] font-bold text-slate-600 py-2.5">
                {DIAS_SEMANA.map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 divide-x divide-slate-200 min-h-[20rem] bg-white">
                {DIAS_SEMANA.map((dia, index) => {
                  const colDate = new Date(monday);
                  colDate.setDate(monday.getDate() + index);
                  const colDateStr = fechaLocalISO(colDate);

                  const daySlots = slotsActuales.filter((s) => s.fecha === colDateStr && s.estado !== 'CANCELADO');

                  return (
                    <div key={dia} className="p-1 space-y-1.5 overflow-y-auto max-h-[28rem]">
                      {daySlots.map((s, idx) => {
                        const nombreMat = obtenerNombreMateria(s);
                        const hInicio = (s.hora_inicio || s.horaInicio || '').substring(0, 5);
                        const hFin = (s.hora_fin || s.horaFin || '').substring(0, 5);

                        return (
                          <div
                            key={s.id || idx}
                            className={`p-2 rounded text-[10px] text-white shadow-xs ${
                              s.modalidad?.toLowerCase() === 'virtual'
                                ? 'bg-[#047857]'
                                : 'bg-[#0d1b2a]'
                            }`}
                          >
                            <div className="font-bold truncate">{nombreMat}</div>
                            <div>
                              {hInicio} - {hFin}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};
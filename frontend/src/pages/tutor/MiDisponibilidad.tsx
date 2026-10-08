import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader } from '../../components/Loader';
import { useScheduleStore } from '../../store/useScheduleStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

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
  materia?: number | MateriaBackend | null;
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
  // Fallbacks de nombres para la interfaz
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
  const storeSlots = scheduleStore.slots || [];
  const fetchSlots = scheduleStore.fetchSlots;

  // ESTADOS CONECTADOS A LOS MODELOS DE DJANGO
  const [materias, setMaterias] = useState<MateriaBackend[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoBackend[]>([]);
  const [materiaId, setMateriaId] = useState<string | number>('');
  const [periodoId, setPeriodoId] = useState<string | number>('');

  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [modalidad, setModalidad] = useState<'Virtual' | 'Presencial'>('Virtual');
  const [ubicacionOEnlace, setUbicacionOEnlace] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const [localSlots, setLocalSlots] = useState<BloqueDisponibilidadBackend[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // CARGA DE DATOS DESDE LA API REST EN DJANGO
  const cargarCatalogos = useCallback(async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access');
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Cargar Materias desde MateriaView
      let resMaterias = await fetch(`${API_BASE_URL}/catalogo/materias/`, { headers });
      if (!resMaterias.ok) {
        resMaterias = await fetch(`${API_BASE_URL}/materias/`, { headers });
      }

      if (resMaterias.ok) {
        const dataMaterias = (await resMaterias.json()) as MateriaBackend[];
        // Filtrar materias activas
        const activas = dataMaterias.filter((m) => m.activa !== false);
        setMaterias(activas);
        if (activas.length > 0) {
          setMateriaId(activas[0].id);
        }
      }

      // 2. Cargar Periodos Académicos
      const resPeriodos = await fetch(`${API_BASE_URL}/catalogo/periodos/`, { headers });
      if (resPeriodos.ok) {
        const dataPeriodos = (await resPeriodos.json()) as PeriodoBackend[];
        setPeriodos(dataPeriodos);
        const activo = dataPeriodos.find((p) => p.activo) || dataPeriodos[0];
        if (activo) setPeriodoId(activo.id);
      }

      // 3. Cargar Bloques de Disponibilidad
      if (typeof fetchSlots === 'function') {
        await fetchSlots();
      } else {
        const resBloques = await fetch(`${API_BASE_URL}/disponibilidades/`, { headers });
        if (resBloques.ok) {
          const dataBloques = (await resBloques.json()) as BloqueDisponibilidadBackend[];
          setLocalSlots(dataBloques);
        }
      }
    } catch (err) {
      console.error('Error al conectar con la API de Django:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchSlots]);

  useEffect(() => {
    cargarCatalogos();
  }, [cargarCatalogos]);

  // COMBINAR BLOQUES OBTENIDOS
  const slotsActuales = useMemo(() => {
    if (storeSlots.length > 0) return storeSlots;
    return localSlots;
  }, [storeSlots, localSlots]);

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
  const obtenerNombreMateria = (materiaProp?: number | MateriaBackend | null): string => {
    if (!materiaProp) return 'Tutoría Académica';
    if (typeof materiaProp === 'object' && materiaProp.nombre) {
      return materiaProp.nombre;
    }
    const materiaEncontrada = materias.find((m) => m.id === materiaProp);
    return materiaEncontrada ? materiaEncontrada.nombre : 'Tutoría Académica';
  };

  // SUBMIT CONECTADO AL BloqueDisponibilidadSerializer
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
      const token = localStorage.getItem('token') || localStorage.getItem('access');

      const payload = {
        materia: Number(materiaId),
        periodo: periodoId ? Number(periodoId) : 1,
        fecha: fecha,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        modalidad: modalidad,
        lugar: modalidad === 'Presencial' ? ubicacionOEnlace.trim() : '',
        enlace_virtual: modalidad === 'Virtual' ? ubicacionOEnlace.trim() : '',
        cupo_total: 1,
        observaciones: observaciones || 'Disponibilidad agregada por el docente',
      };

      const res = await fetch(`${API_BASE_URL}/disponibilidades/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = (await res.json()) as Record<string, unknown>;
        const msg =
          (errorData.detail as string) ||
          (Array.isArray(errorData.non_field_errors) ? (errorData.non_field_errors[0] as string) : null) ||
          (Array.isArray(errorData.materia) ? (errorData.materia[0] as string) : null) ||
          'Error al registrar el bloque de disponibilidad en la base de datos.';
        throw new Error(msg);
      }

      setSuccessMessage('¡Disponibilidad publicada! La tutoría se creó correctamente y ya es visible para los estudiantes.');
      setHoraInicio('');
      setHoraFin('');
      setUbicacionOEnlace('');
      setObservaciones('');

      // Recargar bloques
      await cargarCatalogos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar con el servidor.';
      setErrorMessage(msg);
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
    <div className="w-full flex flex-col bg-[#f7f5ed] h-screen overflow-hidden">
      <Loader hidden={!loading} />

      <header className="w-full h-14 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
        <div className="text-[0.82rem] text-slate-500">
          Mi trabajo / <span className="font-semibold text-[#0d1b2a]">Mi disponibilidad</span>
        </div>
        <div className="text-xs font-semibold text-slate-600">Tutor</div>
      </header>

      <main className="px-8 py-6 w-full max-w-[1400px] mx-auto flex-1 flex flex-col justify-start space-y-4 overflow-hidden">
        <div>
          <h1 className="font-display italic text-3xl font-semibold text-[#0d1b2a] mb-1">
            Publicar disponibilidad
          </h1>
          <p className="text-[0.83rem] text-slate-500">
            Define un horario y quedará visible de inmediato para que los estudiantes reserven, sin que tengas que contactarlos.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* FORMULARIO DE PUBLICACIÓN */}
          <div className="lg:col-span-5 bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            {successMessage && (
              <div className="mb-4 p-3.5 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-xs leading-relaxed animate-in fade-in duration-200">
                {successMessage}
              </div>
            )}

            {errorMessage && (
              <div className="mb-4 p-3.5 bg-rose-100 border border-rose-300 text-rose-800 rounded-lg text-xs leading-relaxed animate-in fade-in duration-200">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              {/* DESPLEGABLE DE MATERIAS OBTENIDAS DE MATERIAVIEW */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Materia</label>
                <select
                  value={materiaId}
                  onChange={(e) => setMateriaId(e.target.value)}
                  required
                  className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a]"
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
                    className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a]"
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
                      setModalidad('Virtual');
                      setUbicacionOEnlace('');
                    }}
                    className={`h-8 font-semibold rounded-md transition-all cursor-pointer ${
                      modalidad === 'Virtual'
                        ? 'bg-[#1f7a5c]/20 text-[#1f7a5c] border border-[#1f7a5c]/30'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Virtual
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalidad('Presencial');
                      setUbicacionOEnlace('');
                    }}
                    className={`h-8 font-semibold rounded-md transition-all cursor-pointer ${
                      modalidad === 'Presencial'
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
                  {modalidad === 'Virtual' ? 'Enlace de la reunión (Google Meet)' : 'Lugar / Aula'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    modalidad === 'Virtual'
                      ? 'https://meet.google.com/...'
                      : 'Ej. Biblioteca, Segundo Piso'
                  }
                  value={ubicacionOEnlace}
                  onChange={(e) => setUbicacionOEnlace(e.target.value)}
                  className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || materias.length === 0}
                className="w-full h-10 bg-[#0d1b2a] hover:bg-[#1e2d4a] text-white font-semibold rounded-md transition-colors mt-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Publicando...' : 'Publicar'}
              </button>
            </form>
          </div>

          {/* MATRIZ SEMANAL DE DISPONIBILIDAD */}
          <div className="lg:col-span-7 bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWeekOffset((prev) => prev - 1)}
                  className="w-6 h-6 border border-slate-300 rounded hover:bg-slate-100 flex items-center justify-center font-bold cursor-pointer"
                >
                  ‹
                </button>
                <span className="font-semibold text-slate-700">{weekText}</span>
                <button
                  onClick={() => setWeekOffset((prev) => prev + 1)}
                  className="w-6 h-6 border border-slate-300 rounded hover:bg-slate-100 flex items-center justify-center font-bold cursor-pointer"
                >
                  ›
                </button>
              </div>

              <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-700" /> Virtual
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0d1b2a]" /> Presencial
                </span>
                <span className="text-emerald-700 ml-2">• Visible para estudiantes</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center text-[11px] font-bold text-slate-600 py-2.5">
                {DIAS_SEMANA.map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 divide-x divide-slate-200 h-80 bg-white">
                {DIAS_SEMANA.map((dia, index) => {
                  const colDate = new Date(monday);
                  colDate.setDate(monday.getDate() + index);
                  const colDateStr = colDate.toISOString().split('T')[0];

                  const daySlots = slotsActuales.filter((s) => s.fecha === colDateStr);

                  return (
                    <div key={dia} className="p-1 space-y-1.5 overflow-y-auto">
                      {daySlots.map((s, idx) => {
                        const nombreMat = obtenerNombreMateria(s.materia);
                        const hInicio = s.hora_inicio || s.horaInicio || '';
                        const hFin = s.hora_fin || s.horaFin || '';

                        return (
                          <div
                            key={s.id || idx}
                            className={`p-2 rounded text-[10px] text-white ${
                              s.modalidad === 'Virtual' ? 'bg-emerald-700' : 'bg-[#0d1b2a]'
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
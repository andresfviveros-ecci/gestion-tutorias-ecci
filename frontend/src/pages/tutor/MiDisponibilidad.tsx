import React, { useState, useEffect } from 'react';
import { Loader } from '../../components/Loader';
import { useScheduleStore } from '../../store/useScheduleStore';

const MATERIAS_LIST = [
  'Programación I',
  'Bases de Datos',
  'Estructuras de Datos',
  'Desarrollo Web',
  'Cocina Internacional',
  'Contabilidad General',
  'Cálculo Vectorial',
];

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'] as const;
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const MiDisponibilidad: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const { slots, addSlot } = useScheduleStore();

  const [materia, setMateria] = useState(MATERIAS_LIST[0]);
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
  
  // CAMPOS DE HORA INICIALIZADOS VACÍOS (SIN PRESELECCIÓN POR DEFAULT)
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  
  const [modalidad, setModalidad] = useState<'Virtual' | 'Presencial'>('Virtual');
  const [ubicacionOEnlace, setUbicacionOEnlace] = useState('');

  const [weekOffset, setWeekOffset] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

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

  const getDayName = (dateStr: string): typeof DIAS_SEMANA[number] => {
    const days: Array<typeof DIAS_SEMANA[number]> = [
      'Domingo',
      'Lunes',
      'Martes',
      'Miercoles',
      'Jueves',
      'Viernes',
      'Sabado',
    ];
    const date = new Date(dateStr + 'T00:00:00');
    return days[date.getDay()] ?? 'Lunes';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!fecha || !horaInicio || !horaFin || !ubicacionOEnlace.trim()) {
      setErrorMessage('Por favor completa todos los campos requeridos.');
      return;
    }

    if (horaInicio >= horaFin) {
      setErrorMessage('La hora de inicio debe ser anterior a la hora de fin.');
      return;
    }

    const diaSemana = getDayName(fecha);

    const result = addSlot({
      materia,
      fecha,
      diaSemana,
      horaInicio,
      horaFin,
      modalidad,
      ubicacionOEnlace: ubicacionOEnlace.trim(),
      estado: 'Libre',
    });

    if (!result.success) {
      setErrorMessage(result.error || 'No se pudo publicar la disponibilidad.');
      return;
    }

    setSuccessMessage('¡Disponibilidad publicada! La tutoría se creó correctamente y ya es visible para tus estudiantes.');
    setHoraInicio('');
    setHoraFin('');
    setUbicacionOEnlace('');
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
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Materia</label>
                <select
                  value={materia}
                  onChange={(e) => setMateria(e.target.value)}
                  className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a]"
                >
                  {MATERIAS_LIST.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

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
                    className={`h-8 font-semibold rounded-md transition-all ${
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
                    className={`h-8 font-semibold rounded-md transition-all ${
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
                  {modalidad === 'Virtual' ? 'Enlace de la reunión' : 'Lugar / Aula'}
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
                className="w-full h-10 bg-[#0d1b2a] hover:bg-[#1e2d4a] text-white font-semibold rounded-md transition-colors mt-2"
              >
                Publicar
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWeekOffset((prev) => prev - 1)}
                  className="w-6 h-6 border border-slate-300 rounded hover:bg-slate-100 flex items-center justify-center font-bold"
                >
                  ‹
                </button>
                <span className="font-semibold text-slate-700">{weekText}</span>
                <button
                  onClick={() => setWeekOffset((prev) => prev + 1)}
                  className="w-6 h-6 border border-slate-300 rounded hover:bg-slate-100 flex items-center justify-center font-bold"
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

                  const daySlots = slots.filter((s) => s.fecha === colDateStr);

                  return (
                    <div key={dia} className="p-1 space-y-1.5 overflow-y-auto">
                      {daySlots.map((s) => (
                        <div
                          key={s.id}
                          className={`p-2 rounded text-[10px] text-white ${
                            s.modalidad === 'Virtual' ? 'bg-emerald-700' : 'bg-[#0d1b2a]'
                          }`}
                        >
                          <div className="font-bold truncate">{s.materia}</div>
                          <div>
                            {s.horaInicio} - {s.horaFin}
                          </div>
                        </div>
                      ))}
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
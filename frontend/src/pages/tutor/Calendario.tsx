import React, { useState, useEffect } from 'react';
import { Loader } from '../../components/Loader';
import { useScheduleStore, type ScheduleSlot } from '../../store/useScheduleStore';

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

export const Calendario: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const { slots, updateSlot, removeSlot } = useScheduleStore();

  const [weekOffset, setWeekOffset] = useState(0);

  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
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

  const openDrawer = (slot: ScheduleSlot) => {
    setEditingSlot({ ...slot });
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

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;

    setErrorMessage(null);

    if (editingSlot.horaInicio >= editingSlot.horaFin) {
      setErrorMessage('La hora de inicio debe ser anterior a la hora de fin.');
      return;
    }

    const diaSemana = getDayName(editingSlot.fecha);

    const result = updateSlot(editingSlot.id, {
      materia: editingSlot.materia,
      fecha: editingSlot.fecha,
      diaSemana: diaSemana,
      horaInicio: editingSlot.horaInicio,
      horaFin: editingSlot.horaFin,
      modalidad: editingSlot.modalidad,
      ubicacionOEnlace: editingSlot.ubicacionOEnlace,
    });

    if (!result.success) {
      setErrorMessage(result.error || 'Error al actualizar el horario.');
      return;
    }

    closeDrawer();
  };

  const handleConfirmSuspender = () => {
    if (!editingSlot) return;
    removeSlot(editingSlot.id);
    closeDrawer();
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
          Mi trabajo / <span className="font-semibold text-[#0d1b2a]">Calendario</span>
        </div>
        <div className="text-xs font-semibold text-slate-600">Tutor</div>
      </header>

      <main className="px-8 py-6 w-full max-w-[1400px] mx-auto flex-1 flex flex-col justify-start space-y-4 overflow-hidden">
        <div>
          <h1 className="font-display italic text-3xl font-semibold text-[#0d1b2a] mb-1">
            Mi disponibilidad
          </h1>
          <p className="text-[0.83rem] text-slate-500">
            Haz clic en cualquier horario para ver su detalle, modificar sus ajustes o eliminarlo si ya no puedes atenderlo.
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex-1 flex flex-col justify-between overflow-hidden">
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

            <div className="flex items-center gap-6 text-[11px] font-semibold text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-700" /> Libre (sin reservas)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0d1b2a]" /> Reservada por un estudiante
              </span>
              <span className="text-slate-400 font-normal">Haz clic para ver/editar detalles →</span>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden flex-1 flex flex-col">
            <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center text-[11px] font-bold text-slate-600 py-2.5">
              {DIAS_SEMANA.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 divide-x divide-slate-200 flex-1 bg-white overflow-y-auto">
              {DIAS_SEMANA.map((dia, index) => {
                const colDate = new Date(monday);
                colDate.setDate(monday.getDate() + index);
                const colDateStr = colDate.toISOString().split('T')[0];

                const daySlots = slots.filter((s) => s.fecha === colDateStr);

                return (
                  <div key={dia} className="p-2 space-y-2">
                    {daySlots.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => openDrawer(s)}
                        className={`p-3 rounded-lg text-white cursor-pointer hover:opacity-90 transition-all ${
                          s.estado === 'Libre' ? 'bg-emerald-700' : 'bg-[#0d1b2a]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-xs truncate">{s.materia}</span>
                          {s.estado === 'Reservada' && <span className="text-xs">🔒</span>}
                        </div>
                        <div className="text-[10px] opacity-90">
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
      </main>

      {/* DRAWER LATERAL */}
      {editingSlot && (
        <div
          onClick={closeDrawer}
          className={`fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex justify-end transition-opacity duration-300 ${
            isDrawerOpen ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`bg-white w-full max-w-[400px] h-full shadow-2xl flex flex-col justify-between transform transition-transform duration-300 ease-in-out ${
              isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="font-display italic text-2xl font-semibold text-[#0d1b2a]">
                Detalle del horario
              </h2>
              <button
                onClick={closeDrawer}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form id="editSlotForm" onSubmit={handleSaveEdit} className="p-5 space-y-3.5 flex-1 overflow-y-auto text-xs">
              {errorMessage && (
                <div className="p-3 bg-rose-100 border border-rose-300 text-rose-800 rounded-md">
                  {errorMessage}
                </div>
              )}

              <div>
                <span
                  className={`inline-block px-3 py-1 rounded-full font-bold uppercase text-[10px] ${
                    editingSlot.estado === 'Libre'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {editingSlot.estado === 'Libre' ? 'LIBRE (SIN RESERVAS)' : 'RESERVADA'}
                </span>
              </div>

              {editingSlot.estudiante && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reservado por</label>
                  <input
                    type="text"
                    disabled
                    value={editingSlot.estudiante}
                    className="w-full h-9 px-3 bg-slate-100 border border-slate-200 rounded-md text-slate-700 font-semibold"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Materia</label>
                <select
                  value={editingSlot.materia}
                  onChange={(e) =>
                    setEditingSlot({ ...editingSlot, materia: e.target.value })
                  }
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a]"
                >
                  {MATERIAS_LIST.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Fecha</label>
                <input
                  type="date"
                  required
                  value={editingSlot.fecha}
                  onChange={(e) =>
                    setEditingSlot({ ...editingSlot, fecha: e.target.value })
                  }
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hora inicio</label>
                  <input
                    type="time"
                    required
                    value={editingSlot.horaInicio}
                    onChange={(e) =>
                      setEditingSlot({ ...editingSlot, horaInicio: e.target.value })
                    }
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hora fin</label>
                  <input
                    type="time"
                    required
                    value={editingSlot.horaFin}
                    onChange={(e) =>
                      setEditingSlot({ ...editingSlot, horaFin: e.target.value })
                    }
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Modalidad</label>
                <select
                  value={editingSlot.modalidad}
                  onChange={(e) =>
                    setEditingSlot({
                      ...editingSlot,
                      modalidad: e.target.value as 'Virtual' | 'Presencial',
                    })
                  }
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a]"
                >
                  <option value="Virtual">Virtual</option>
                  <option value="Presencial">Presencial</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {editingSlot.modalidad === 'Virtual' ? 'Enlace de reunión' : 'Lugar / Aula'}
                </label>
                <input
                  type="text"
                  required
                  value={editingSlot.ubicacionOEnlace}
                  onChange={(e) =>
                    setEditingSlot({ ...editingSlot, ubicacionOEnlace: e.target.value })
                  }
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a]"
                />
              </div>
            </form>

            <div className="p-5 border-t border-slate-100 bg-white space-y-2 shrink-0">
              <button
                type="submit"
                form="editSlotForm"
                className="w-full h-10 bg-[#0d1b2a] hover:bg-[#1e2d4a] text-white font-semibold text-xs rounded-md transition-colors"
              >
                Guardar cambios
              </button>

              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="w-full h-9 border border-rose-400 text-rose-600 hover:bg-rose-50 rounded-md font-semibold text-xs transition-colors"
              >
                Suspender Horario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN AL SUSPENDER */}
      {showConfirmModal && editingSlot && (
        <div className="fixed inset-0 z-[1100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-600 text-2xl font-bold">
              ⚠️
            </div>

            <h3 className="font-display italic text-2xl font-bold text-[#0d1b2a] mb-2">
              ¿Suspender este horario?
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Este horario de <strong className="text-slate-800">{editingSlot.materia}</strong> (
              {editingSlot.diaSemana}, {editingSlot.horaInicio}–{editingSlot.horaFin}) dejará de estar visible para los estudiantes. Puedes volver a publicarlo cuando quieras.
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="h-10 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmSuspender}
                className="h-10 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors"
              >
                Sí, Suspender
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
import React, { useEffect, useState } from 'react';
import { useTutorStore } from '../store/useTutorStore';

interface ToastState {
  type: 'success' | 'error';
  title: string;
  message: string;
}

export const Tutores: React.FC = () => {
  const { tutores, loading, fetchTutores, addTutor } = useTutorStore();
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const [form, setForm] = useState({
    nombres: '',
    apellidos: '',
    email: '',
    facultad: '',
    materia: '',
    password: '',
  });

  useEffect(() => {
    void fetchTutores();
  }, [fetchTutores]);

  const showToast = (type: 'success' | 'error', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 4500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const result = await addTutor(form);
    if (result.success) {
      showToast('success', '¡Tutor Registrado!', `${form.nombres} ${form.apellidos} guardado correctamente.`);
      setForm({
        nombres: '',
        apellidos: '',
        email: '',
        facultad: '',
        materia: '',
        password: '',
      });
    } else {
      showToast('error', 'Error al registrar', result.error || 'No se pudo guardar el tutor.');
    }
    setSubmitting(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 relative">
      {/* NOTIFICACIÓN MODAL CON BACKDROP BLUR (DIFUMINADO DE FONDO) */}
      {toast && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/40 backdrop-blur-xs flex items-start justify-center pt-10 px-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700/80 p-5 flex items-center gap-4 animate-in zoom-in-95 duration-200">
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                toast.type === 'success'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
              }`}
            >
              <i className={`fa-solid ${toast.type === 'success' ? 'fa-check text-lg animate-bounce' : 'fa-triangle-exclamation text-lg'}`}></i>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-100 tracking-tight">{toast.title}</h4>
              <p className="text-xs text-slate-300 leading-relaxed mt-1">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-white text-sm px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-800">Gestión de Tutores</h1>
        <p className="text-sm text-slate-500">Registra tutores y asígnalos a sus áreas académicas.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3.5 h-fit">
          <h2 className="text-lg font-semibold text-[#111a2e] border-b pb-2">Registrar Nuevo Tutor</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nombres</label>
              <input
                type="text"
                required
                value={form.nombres}
                onChange={(e) => setForm({ ...form, nombres: e.target.value })}
                className="w-full px-3 py-1.5 border rounded-md text-sm outline-none focus:border-[#d9a036]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Apellidos</label>
              <input
                type="text"
                required
                value={form.apellidos}
                onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                className="w-full px-3 py-1.5 border rounded-md text-sm outline-none focus:border-[#d9a036]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Correo Electrónico</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-1.5 border rounded-md text-sm outline-none focus:border-[#d9a036]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Facultad</label>
            <input
              type="text"
              required
              placeholder="Ej. Ingeniería"
              value={form.facultad}
              onChange={(e) => setForm({ ...form, facultad: e.target.value })}
              className="w-full px-3 py-1.5 border rounded-md text-sm outline-none focus:border-[#d9a036]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Materia Asignada</label>
            <input
              type="text"
              required
              placeholder="Ej. Programación I"
              value={form.materia}
              onChange={(e) => setForm({ ...form, materia: e.target.value })}
              className="w-full px-3 py-1.5 border rounded-md text-sm outline-none focus:border-[#d9a036]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-1.5 border rounded-md text-sm outline-none focus:border-[#d9a036]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-[#111a2e] text-white text-sm font-semibold rounded-md hover:bg-[#1e2d4a] transition-colors disabled:opacity-50"
          >
            {submitting ? 'Guardando...' : 'Registrar Tutor'}
          </button>
        </form>

        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-[#111a2e]">Listado de Tutores Activos</h2>
          </div>

          {loading ? (
            <p className="p-6 text-center text-slate-500">Cargando lista de tutores...</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[0.7rem] border-b">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Correo</th>
                  <th className="px-4 py-3">Facultad</th>
                  <th className="px-4 py-3">Materia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tutores.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400 font-medium text-xs">
                      No hay tutores registrados aún.
                    </td>
                  </tr>
                ) : (
                  tutores.map((tut) => (
                    <tr key={tut.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-800">{tut.nombre}</td>
                      <td className="px-4 py-3 text-slate-600">{tut.correo}</td>
                      <td className="px-4 py-3 text-slate-500">{tut.groups[0]?.facultyName || 'Ingeniería'}</td>
                      <td className="px-4 py-3 text-slate-600">{tut.groups[0]?.subjects.join(', ') || 'Tutoría'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
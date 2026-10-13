import React, { useEffect, useState } from 'react';
import { Loader } from '../components/Loader';
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

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [documento, setDocumento] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [errors, setErrors] = useState({
    firstName: false,
    lastName: false,
    documento: false,
    telefono: false,
    email: false,
    password: false,
  });

  // Validar si algún campo obligatorio (*) está vacío
  const isFormInvalid =
    !firstName.trim() ||
    !lastName.trim() ||
    !documento.trim() ||
    !telefono.trim() ||
    !email.trim() ||
    !password.trim();

  useEffect(() => {
    void fetchTutores();
  }, [fetchTutores]);

  const showToast = (type: 'success' | 'error', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 4500);
  };

  const limpiarFormulario = () => {
    setFirstName('');
    setLastName('');
    setDocumento('');
    setTelefono('');
    setEmail('');
    setPassword('');
    setErrors({
      firstName: false,
      lastName: false,
      documento: false,
      telefono: false,
      email: false,
      password: false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isFormInvalid) {
      showToast('error', 'Campos incompletos', 'Por favor completa todos los campos requeridos (*).');
      return;
    }

    setSubmitting(true);
    const result = await addTutor({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      documento: documento.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
      password: password.trim(),
    });

    if (result.success) {
      showToast('success', '¡Tutor Registrado!', `${firstName} ${lastName} guardado correctamente.`);
      limpiarFormulario();
    } else {
      showToast('error', 'Error al registrar', result.error || 'No se pudo guardar el tutor.');
    }
    setSubmitting(false);
  };

  return (
    <div className="w-full flex flex-col bg-[#f7f5ed] min-h-full relative">
      <Loader hidden={!loading} />

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
              <i className={`fa-solid ${toast.type === 'success' ? 'fa-check text-lg' : 'fa-triangle-exclamation text-lg'}`}></i>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-100 tracking-tight">{toast.title}</h4>
              <p className="text-xs text-slate-300 leading-relaxed mt-1">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-white text-sm px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <header className="w-full h-[60px] bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
        <div className="text-[0.82rem] text-slate-500">
          Usuarios / <span className="font-semibold text-[#0d1b2a]">Registrar tutor</span>
        </div>
        <div className="text-xs font-semibold text-slate-600">Coordinador</div>
      </header>

      <main className="p-8 w-full max-w-[1400px] space-y-6">
        <div>
          <h1 className="font-display italic text-3xl font-semibold text-[#0d1b2a] mb-1">Registrar tutor</h1>
          <p className="text-[0.83rem] text-slate-500">Completa los datos del tutor exigidos por el sistema.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          <div className="lg:col-span-5 bg-white rounded-xl p-7 border border-slate-200 shadow-sm">
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombres <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={`w-full h-[40px] px-3.5 text-[0.83rem] bg-white border rounded-md outline-none transition-all ${
                      errors.firstName ? 'border-rose-500 ring-2 ring-rose-500/15' : 'border-slate-200 focus:border-[#0d1b2a]'
                    }`}
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (e.target.value.trim()) setErrors((prev) => ({ ...prev, firstName: false }));
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Apellidos <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={`w-full h-[40px] px-3.5 text-[0.83rem] bg-white border rounded-md outline-none transition-all ${
                      errors.lastName ? 'border-rose-500 ring-2 ring-rose-500/15' : 'border-slate-200 focus:border-[#0d1b2a]'
                    }`}
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      if (e.target.value.trim()) setErrors((prev) => ({ ...prev, lastName: false }));
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Documento <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={`w-full h-[40px] px-3.5 text-[0.83rem] bg-white border rounded-md outline-none transition-all ${
                      errors.documento ? 'border-rose-500 ring-2 ring-rose-500/15' : 'border-slate-200 focus:border-[#0d1b2a]'
                    }`}
                    value={documento}
                    onChange={(e) => {
                      setDocumento(e.target.value);
                      if (e.target.value.trim()) setErrors((prev) => ({ ...prev, documento: false }));
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Teléfono <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={`w-full h-[40px] px-3.5 text-[0.83rem] bg-white border rounded-md outline-none transition-all ${
                      errors.telefono ? 'border-rose-500 ring-2 ring-rose-500/15' : 'border-slate-200 focus:border-[#0d1b2a]'
                    }`}
                    value={telefono}
                    onChange={(e) => {
                      setTelefono(e.target.value);
                      if (e.target.value.trim()) setErrors((prev) => ({ ...prev, telefono: false }));
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correo electrónico <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  className={`w-full h-[40px] px-3.5 text-[0.83rem] bg-white border rounded-md outline-none transition-all ${
                    errors.email ? 'border-rose-500 ring-2 ring-rose-500/15' : 'border-slate-200 focus:border-[#0d1b2a]'
                  }`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (e.target.value.trim()) setErrors((prev) => ({ ...prev, email: false }));
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contraseña <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  className={`w-full h-[40px] px-3.5 text-[0.83rem] bg-white border rounded-md outline-none transition-all ${
                    errors.password ? 'border-rose-500 ring-2 ring-rose-500/15' : 'border-slate-200 focus:border-[#0d1b2a]'
                  }`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (e.target.value.trim()) setErrors((prev) => ({ ...prev, password: false }));
                  }}
                />
              </div>

              <div className="flex gap-3.5 pt-1">
                <button
                  type="submit"
                  disabled={submitting || isFormInvalid}
                  className={`flex-[1.2] h-[40px] bg-[#0d1b2a] text-white font-semibold text-xs rounded-md transition-all ${
                    submitting || isFormInvalid
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-[#1e2d4a] cursor-pointer'
                  }`}
                >
                  {submitting ? 'Guardando...' : 'Registrar tutor'}
                </button>
                <button
                  type="button"
                  onClick={limpiarFormulario}
                  className="flex-[0.8] h-[40px] bg-transparent hover:bg-slate-50 text-[#0d1b2a] border border-slate-200 font-semibold text-xs rounded-md transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white rounded-xl p-7 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[0.88rem] font-bold text-[#0d1b2a] uppercase tracking-wider">
                Tutores registrados
              </h3>
              <span className="text-xs text-slate-500">{tutores.length} registro(s)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[0.7rem] tracking-wider font-bold">
                    <th className="pb-3 px-2">Tutor</th>
                    <th className="pb-3 px-2">Documento</th>
                    <th className="pb-3 px-2">Correo</th>
                    <th className="pb-3 px-2">Teléfono</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {tutores.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 font-medium text-xs">
                        No hay tutores registrados aún.
                      </td>
                    </tr>
                  ) : (
                    tutores.map((tut) => (
                      <tr key={tut.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-2 font-semibold text-[#0d1b2a]">{tut.nombre}</td>
                        <td className="py-3 px-2 font-mono">{tut.documento || '—'}</td>
                        <td className="py-3 px-2">{tut.correo}</td>
                        <td className="py-3 px-2">{tut.telefono || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
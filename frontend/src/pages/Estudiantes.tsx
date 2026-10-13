import React, { useState, useEffect } from 'react';
import { Loader } from '../components/Loader';
import { api } from '../api/axios';

interface StudentData {
  first_name: string;
  last_name: string;
  documento: string;
  email: string;
  telefono: string;
  codigo_institucional: string;
}

interface StudentBackend {
  id?: string | number;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  documento?: string | number;
  telefono?: string;
  codigo_institucional?: string;
}

interface ToastState {
  type: 'success' | 'error';
  title: string;
  message: string;
}

const parseBackendError = (error: unknown): string => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const res = (error as { response?: { data?: Record<string, unknown> | string } }).response;
    if (res && res.data) {
      const data = res.data;
      if (typeof data === 'string') return data;
      if (typeof data === 'object') {
        if (data.detail && typeof data.detail === 'string') return data.detail;
        if (data.email || data.username) return 'El correo electrónico ya se encuentra registrado.';
        if (data.documento) return 'El número de identificación ya se encuentra registrado.';
        
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          const val = data[firstKey];
          const msg = Array.isArray(val) ? val.join(' ') : String(val);
          return `${firstKey.toUpperCase()}: ${msg}`;
        }
      }
    }
  }
  return 'Ocurrió un error al guardar en la base de datos.';
};

export const Estudiantes: React.FC = () => {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [documento, setDocumento] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [codigoInstitucional, setCodigoInstitucional] = useState('');
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

  const triggerToast = (type: 'success' | 'error', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 4500);
  };

  const mapBackendStudents = (data: StudentBackend[]): StudentData[] => {
    return data.map((item) => ({
      first_name: item.first_name || '',
      last_name: item.last_name || '',
      documento: String(item.documento || ''),
      email: item.email || '',
      telefono: item.telefono || '',
      codigo_institucional: item.codigo_institucional || '',
    }));
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get<StudentBackend[]>('/accounts/estudiantes/');
      setStudents(mapBackendStudents(response.data));
    } catch (error) {
      console.error('Error al obtener estudiantes:', error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadStudents = async () => {
      try {
        const response = await api.get<StudentBackend[]>('/accounts/estudiantes/');
        if (isMounted) {
          setStudents(mapBackendStudents(response.data));
        }
      } catch (error) {
        console.error('Error al cargar estudiantes:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadStudents();
    return () => {
      isMounted = false;
    };
  }, []);

  const limpiarFormulario = () => {
    setFirstName('');
    setLastName('');
    setDocumento('');
    setTelefono('');
    setEmail('');
    setCodigoInstitucional('');
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
      triggerToast('error', 'Campos incompletos', 'Por favor completa todos los campos requeridos (*).');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        username: email.trim(),
        email: email.trim(),
        password: password.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        documento: documento.trim(),
        telefono: telefono.trim(),
        codigo_institucional: codigoInstitucional.trim(),
      };

      await api.post('/accounts/estudiantes/', payload);

      triggerToast('success', '¡Estudiante Registrado!', `${firstName} ${lastName} ha sido guardado con éxito.`);
      limpiarFormulario();
      await fetchStudents();
    } catch (error) {
      const errorDetail = parseBackendError(error);
      triggerToast('error', 'No se pudo registrar', errorDetail);
    } finally {
      setSubmitting(false);
    }
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
              className="text-slate-400 hover:text-white text-sm px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <header className="w-full h-[60px] bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
        <div className="text-[0.82rem] text-slate-500">
          Usuarios / <span className="font-semibold text-[#0d1b2a]">Registrar estudiante</span>
        </div>
        <div className="text-xs font-semibold text-slate-600">Coordinador</div>
      </header>

      <main className="p-8 w-full max-w-[1400px] space-y-6">
        <div>
          <h1 className="font-display italic text-3xl font-semibold text-[#0d1b2a] mb-1">Registrar estudiante</h1>
          <p className="text-[0.83rem] text-slate-500">Completa los datos del estudiante exigidos por el sistema.</p>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Código Institucional</label>
                <input
                  type="text"
                  className="w-full h-[40px] px-3.5 text-[0.83rem] bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a]"
                  value={codigoInstitucional}
                  onChange={(e) => setCodigoInstitucional(e.target.value)}
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
                  {submitting ? 'Guardando...' : 'Registrar estudiante'}
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
                Estudiantes registrados
              </h3>
              <span className="text-xs text-slate-500">{students.length} registro(s)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[0.7rem] tracking-wider font-bold">
                    <th className="pb-3 px-2">Estudiante</th>
                    <th className="pb-3 px-2">Documento</th>
                    <th className="pb-3 px-2">Correo</th>
                    <th className="pb-3 px-2">Teléfono</th>
                    <th className="pb-3 px-2">Cód. Inst.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 font-medium text-xs">
                        No hay estudiantes registrados aún.
                      </td>
                    </tr>
                  ) : (
                    students.map((st, i) => (
                      <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-2 font-semibold text-[#0d1b2a]">
                          {st.first_name} {st.last_name}
                        </td>
                        <td className="py-3 px-2 font-mono">{st.documento || '—'}</td>
                        <td className="py-3 px-2">{st.email}</td>
                        <td className="py-3 px-2">{st.telefono}</td>
                        <td className="py-3 px-2">{st.codigo_institucional || '—'}</td>
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
import React, { useState, useEffect } from 'react';
import { Loader } from '../components/Loader';
import { api } from '../api/axios';

interface StudentData {
  nombres: string;
  apellidos: string;
  idNumber: string;
  email: string;
  career: string;
  phone: string;
}

interface StudentBackend {
  id?: string | number;
  fullName?: string;
  nombre?: string;
  nombres?: string;
  apellidos?: string;
  first_name?: string;
  last_name?: string;
  documento?: string | number;
  identificacion?: string | number;
  idNumber?: string;
  email?: string;
  correo?: string;
  career?: string;
  carrera?: string;
  programa?: string;
  phone?: string;
  telefono?: string;
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
        if (data.message && typeof data.message === 'string') return data.message;
        
        // Manejo específico de correos/usuarios duplicados
        if (data.email || data.username) {
          const emailMsg = data.email ? (Array.isArray(data.email) ? data.email.join(' ') : String(data.email)) : '';
          const userMsg = data.username ? (Array.isArray(data.username) ? data.username.join(' ') : String(data.username)) : '';
          const combined = `${emailMsg} ${userMsg}`.toLowerCase();

          if (combined.includes('already exists') || combined.includes('ya existe') || combined.includes('registrado')) {
            return 'El correo electrónico ya se encuentra registrado con otra cuenta.';
          }
          return `Correo: ${emailMsg || userMsg}`;
        }
        if (data.documento || data.identificacion) {
          return 'El número de identificación ya se encuentra registrado.';
        }
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

  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [career, setCareer] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [errors, setErrors] = useState({
    nombres: false,
    apellidos: false,
    idNumber: false,
    email: false,
  });

  const triggerToast = (type: 'success' | 'error', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 4500);
  };

  const mapBackendStudents = (data: StudentBackend[]): StudentData[] => {
    return data.map((item) => {
      const fullNameCombined = `${item.nombres || item.first_name || ''} ${item.apellidos || item.last_name || ''}`.trim();
      const finalName = fullNameCombined || item.fullName || item.nombre || 'Estudiante';

      const docVal = String(
        item.documento || item.identificacion || item.idNumber || item.id || ''
      );

      return {
        nombres: item.nombres || item.first_name || finalName,
        apellidos: item.apellidos || item.last_name || '',
        idNumber: docVal,
        email: item.email || item.correo || '',
        career: item.career || item.carrera || item.programa || 'Ingeniería',
        phone: item.telefono || item.phone || 'N/A',
      };
    });
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
    setNombres('');
    setApellidos('');
    setIdNumber('');
    setCareer('');
    setEmail('');
    setPhone('');
    setErrors({ nombres: false, apellidos: false, idNumber: false, email: false });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors = {
      nombres: !nombres.trim(),
      apellidos: !apellidos.trim(),
      idNumber: !idNumber.trim(),
      email: !email.trim(),
    };

    setErrors(newErrors);

    if (newErrors.nombres || newErrors.apellidos || newErrors.idNumber || newErrors.email) {
      triggerToast('error', 'Campos incompletos', 'Por favor completa todos los campos requeridos (*).');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        username: email.trim(),
        email: email.trim(),
        password: '12345678',
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        first_name: nombres.trim(),
        last_name: apellidos.trim(),
        documento: idNumber.trim(),
        identificacion: idNumber.trim(),
        telefono: phone.trim() || '3000000000',
        carrera: career.trim() || 'Ingeniería',
      };

      await api.post('/accounts/estudiantes/', payload);

      triggerToast('success', '¡Estudiante Registrado!', `${nombres} ${apellidos} ha sido guardado con éxito.`);
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
    <div className="w-full flex flex-col bg-[#f7f5ed] h-screen overflow-hidden relative">
      <Loader hidden={!loading} />

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

      <header className="w-full h-14 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
        <div className="text-[0.82rem] text-slate-500">
          Usuarios / <span className="font-semibold text-[#0d1b2a]">Registrar estudiante</span>
        </div>
        <div className="text-xs font-semibold text-slate-600">Administrador</div>
      </header>

      <main className="px-8 py-6 w-full max-w-[1400px] mx-auto flex-1 flex flex-col justify-start space-y-4 overflow-hidden">
        <div>
          <h1 className="font-display italic text-3xl font-semibold text-[#0d1b2a] mb-1">Registrar estudiante</h1>
          <p className="text-[0.83rem] text-slate-500">Completa los datos para darle acceso a la plataforma.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombres <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nombres}
                    onChange={(e) => {
                      setNombres(e.target.value);
                      if (e.target.value.trim()) setErrors((prev) => ({ ...prev, nombres: false }));
                    }}
                    className={`w-full h-9 px-3 text-xs bg-white border rounded-md outline-none transition-all ${
                      errors.nombres ? 'border-rose-500 ring-2 ring-rose-500/15' : 'border-slate-200 focus:border-[#0d1b2a]'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Apellidos <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={apellidos}
                    onChange={(e) => {
                      setApellidos(e.target.value);
                      if (e.target.value.trim()) setErrors((prev) => ({ ...prev, apellidos: false }));
                    }}
                    className={`w-full h-9 px-3 text-xs bg-white border rounded-md outline-none transition-all ${
                      errors.apellidos ? 'border-rose-500 ring-2 ring-rose-500/15' : 'border-slate-200 focus:border-[#0d1b2a]'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    N.º de identificación <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={idNumber}
                    onChange={(e) => {
                      setIdNumber(e.target.value);
                      if (e.target.value.trim()) setErrors((prev) => ({ ...prev, idNumber: false }));
                    }}
                    className={`w-full h-9 px-3 text-xs bg-white border rounded-md outline-none transition-all ${
                      errors.idNumber ? 'border-rose-500 ring-2 ring-rose-500/15' : 'border-slate-200 focus:border-[#0d1b2a]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Programa / carrera</label>
                  <input
                    type="text"
                    value={career}
                    onChange={(e) => setCareer(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correo institucional <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (e.target.value.trim()) setErrors((prev) => ({ ...prev, email: false }));
                  }}
                  className={`w-full h-9 px-3 text-xs bg-white border rounded-md outline-none transition-all ${
                    errors.email ? 'border-rose-500 ring-2 ring-rose-500/15' : 'border-slate-200 focus:border-[#0d1b2a]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono de contacto</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a]"
                />
              </div>

              <div className="bg-[#fef08a]/80 border border-[#fde047] rounded-lg p-2.5 flex items-center gap-3 my-2">
                <span className="bg-[#ca8a04] text-white text-[0.68rem] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  ESTUDIANTE
                </span>
                <span className="text-xs text-[#854d0e] font-medium">Rol asignado automáticamente</span>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-[1.2] h-9 bg-[#0d1b2a] hover:bg-[#1e2d4a] text-white font-semibold text-xs rounded-md transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Registrar estudiante'}
                </button>
                <button
                  type="button"
                  onClick={limpiarFormulario}
                  className="flex-[0.8] h-9 bg-transparent hover:bg-slate-50 text-[#0d1b2a] border border-slate-200 font-semibold text-xs rounded-md transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[0.88rem] font-bold text-[#0d1b2a] uppercase tracking-wider">
                Estudiantes registrados recientemente
              </h3>
              <span className="text-xs text-slate-500">{students.length} registro(s)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[0.7rem] tracking-wider font-bold">
                    <th className="pb-3 px-2">ESTUDIANTE</th>
                    <th className="pb-3 px-2">IDENTIFICACION</th>
                    <th className="pb-3 px-2">CORREO</th>
                    <th className="pb-3 px-2">ROL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 font-medium text-xs">
                        No hay estudiantes registrados aún.
                      </td>
                    </tr>
                  ) : (
                    students.map((st, i) => (
                      <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-2 font-semibold text-[#0d1b2a]">
                          {st.nombres} {st.apellidos}
                        </td>
                        <td className="py-3 px-2 font-mono">{st.idNumber || '—'}</td>
                        <td className="py-3 px-2">{st.email}</td>
                        <td className="py-3 px-2">
                          <span className="bg-[#fef08a] text-[#854d0e] text-[0.7rem] px-2.5 py-0.5 rounded font-semibold">
                            Estudiante
                          </span>
                        </td>
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
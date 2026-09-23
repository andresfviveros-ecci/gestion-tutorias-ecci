import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { studentSchema, type StudentFormData } from '../schemas/studentSchema';
import { useAuthStore } from '../store/useAuthStore';
import { Loader } from '../components/Loader';

interface ExtendedStudentFormData extends StudentFormData {
  phone?: string;
}

export const Estudiantes: React.FC = () => {
  const { students, addStudent } = useAuthStore();
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1600);
    return () => clearTimeout(timer);
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExtendedStudentFormData>({
    resolver: zodResolver(studentSchema),
  });

  const onSubmit = (data: ExtendedStudentFormData) => {
    addStudent(data);
    setToast(`¡Estudiante ${data.fullName} registrado con éxito!`);
    reset();
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <div className="w-full flex flex-col bg-[#f7f5ed] h-screen overflow-hidden">
      <Loader hidden={!loading} />

      {/* BARRA SUPERIOR BLANCA */}
      <header className="w-full h-14 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
        <div className="text-[0.82rem] text-slate-500">
          Usuarios / <span className="font-semibold text-[#0d1b2a]">Registrar estudiante</span>
        </div>
        <div className="text-xs font-semibold text-slate-600">
          Administrador
        </div>
      </header>

      {/* NOTIFICACIÓN TOAST */}
      {toast && (
        <div className="fixed top-5 right-5 z-[10000] bg-white border-l-4 border-emerald-600 shadow-xl rounded-lg p-4 flex items-center gap-3 animate-bounce">
          <div className="w-7 h-7 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-xs">✓</div>
          <div>
            <strong className="block text-xs text-slate-800">Operación exitosa</strong>
            <p className="text-[11px] text-slate-500">{toast}</p>
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL CON ESPACIOS AMPLIOS EQUILIBRADOS */}
      <main className="px-8 py-6 w-full max-w-[1400px] mx-auto flex-1 flex flex-col justify-start space-y-4 overflow-hidden">
        <div>
          <h1 className="font-display italic text-3xl font-semibold text-[#0d1b2a] mb-1">
            Registrar estudiante
          </h1>
          <p className="text-[0.83rem] text-slate-500">
            Completa los datos del estudiante para darle acceso a la plataforma.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* FORMULARIO DE REGISTRO */}
          <div className="lg:col-span-5 bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              
              {/* NOMBRE COMPLETO */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nombre completo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('fullName')}
                  className={`w-full h-10 px-3.5 text-xs bg-white border rounded-md outline-none transition-all ${
                    errors.fullName
                      ? 'border-rose-500 ring-2 ring-rose-500/15'
                      : 'border-slate-200 focus:border-[#0d1b2a] focus:ring-2 focus:ring-[#0d1b2a]/10'
                  }`}
                />
                {errors.fullName && (
                  <span className="text-[11px] text-rose-500 mt-1 block">
                    {errors.fullName.message}
                  </span>
                )}
              </div>

              {/* IDENTIFICACIÓN Y PROGRAMA / CARRERA */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    N.º de identificación <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('idNumber')}
                    className={`w-full h-10 px-3.5 text-xs bg-white border rounded-md outline-none transition-all ${
                      errors.idNumber
                        ? 'border-rose-500 ring-2 ring-rose-500/15'
                        : 'border-slate-200 focus:border-[#0d1b2a] focus:ring-2 focus:ring-[#0d1b2a]/10'
                    }`}
                  />
                  {errors.idNumber && (
                    <span className="text-[11px] text-rose-500 mt-1 block">
                      {errors.idNumber.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Programa / carrera
                  </label>
                  <input
                    type="text"
                    {...register('career')}
                    className="w-full h-10 px-3.5 text-xs bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a] focus:ring-2 focus:ring-[#0d1b2a]/10 transition-all"
                  />
                </div>
              </div>

              {/* CORREO INSTITUCIONAL */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Correo institucional <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  {...register('email')}
                  className={`w-full h-10 px-3.5 text-xs bg-white border rounded-md outline-none transition-all ${
                    errors.email
                      ? 'border-rose-500 ring-2 ring-rose-500/15'
                      : 'border-slate-200 focus:border-[#0d1b2a] focus:ring-2 focus:ring-[#0d1b2a]/10'
                  }`}
                />
                {errors.email && (
                  <span className="text-[11px] text-rose-500 mt-1 block">
                    {errors.email.message}
                  </span>
                )}
              </div>

              {/* TELÉFONO DE CONTACTO */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Teléfono de contacto
                </label>
                <input
                  type="text"
                  {...register('phone')}
                  className="w-full h-10 px-3.5 text-xs bg-white border border-slate-200 rounded-md outline-none focus:border-[#0d1b2a] focus:ring-2 focus:ring-[#0d1b2a]/10 transition-all"
                />
              </div>

              {/* CAJA AMARILLA DE ROL AUTOMÁTICO */}
              <div className="bg-[#fef08a]/80 border border-[#fde047] rounded-lg p-3 flex items-center gap-3 my-3">
                <span className="bg-[#ca8a04] text-white text-[0.7rem] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  ESTUDIANTE
                </span>
                <span className="text-xs text-[#854d0e] font-medium">
                  Rol asignado automáticamente
                </span>
              </div>

              {/* BOTONES */}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  className="flex-[1.2] h-10 bg-[#0d1b2a] hover:bg-[#1e2d4a] text-white font-semibold text-xs rounded-md transition-colors"
                >
                  Registrar estudiante
                </button>
                <button
                  type="button"
                  onClick={() => reset()}
                  className="flex-[0.8] h-10 bg-transparent hover:bg-slate-50 text-[#0d1b2a] border border-slate-200 font-semibold text-xs rounded-md transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>

          {/* TABLA DE REGISTROS RECIENTES */}
          <div className="lg:col-span-7 bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[0.88rem] font-bold text-[#0d1b2a] uppercase tracking-wider">
                Estudiantes registrados recientemente
              </h3>
              <span className="text-xs text-slate-500">
                {students.length} registro{students.length !== 1 ? 's' : ''}
              </span>
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
                        <td className="py-3 px-2 font-semibold text-[#0d1b2a]">{st.fullName}</td>
                        <td className="py-3 px-2">{st.idNumber}</td>
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
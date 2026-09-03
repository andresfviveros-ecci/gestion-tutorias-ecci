import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { studentSchema, type StudentFormData } from '../schemas/studentSchema';
import { useAuthStore } from '../store/useAuthStore';
import { Loader } from '../components/Loader';

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
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
  });

  const onSubmit = (data: StudentFormData) => {
    addStudent(data);
    setToast(`¡Estudiante ${data.fullName} registrado con éxito!`);
    reset();
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <div className="space-y-6">
      <Loader hidden={!loading} />

      {toast && (
        <div className="fixed top-5 right-5 z-[10000] bg-white border-l-4 border-emerald-600 shadow-xl rounded-lg p-4 flex items-center gap-3 animate-bounce">
          <div className="w-7 h-7 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-xs">✓</div>
          <div>
            <strong className="block text-xs text-slate-800">Operación exitosa</strong>
            <p className="text-[11px] text-slate-500">{toast}</p>
          </div>
        </div>
      )}

      <div>
        <h1 className="font-display italic text-3xl font-semibold text-slate-800 mb-1">Registrar estudiante</h1>
        <p className="text-xs text-slate-500">Completa los datos del estudiante para darle acceso a la plataforma.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                id="fullName"
                placeholder=" "
                {...register('fullName')}
                className="peer w-full h-[52px] pt-5 pb-1 px-3.5 text-sm bg-white border border-slate-300 rounded-md outline-none focus:border-[#0d1b2a] focus:ring-2 focus:ring-[#0d1b2a]/10"
              />
              <label htmlFor="fullName" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none transition-all peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:uppercase peer-focus:text-[#0d1b2a] peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:uppercase">
                Nombre completo *
              </label>
              {errors.fullName && <span className="text-[11px] text-red-500 mt-1 block">{errors.fullName.message}</span>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <input
                  type="text"
                  id="idNumber"
                  placeholder=" "
                  {...register('idNumber')}
                  className="peer w-full h-[52px] pt-5 pb-1 px-3.5 text-sm bg-white border border-slate-300 rounded-md outline-none focus:border-[#0d1b2a] focus:ring-2 focus:ring-[#0d1b2a]/10"
                />
                <label htmlFor="idNumber" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none transition-all peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:uppercase peer-focus:text-[#0d1b2a] peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:uppercase">
                  N.º de identificación *
                </label>
                {errors.idNumber && <span className="text-[11px] text-red-500 mt-1 block">{errors.idNumber.message}</span>}
              </div>

              <div className="relative">
                <input
                  type="text"
                  id="career"
                  placeholder=" "
                  {...register('career')}
                  className="peer w-full h-[52px] pt-5 pb-1 px-3.5 text-sm bg-white border border-slate-300 rounded-md outline-none focus:border-[#0d1b2a] focus:ring-2 focus:ring-[#0d1b2a]/10"
                />
                <label htmlFor="career" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none transition-all peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:uppercase peer-focus:text-[#0d1b2a] peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:uppercase">
                  Programa / carrera
                </label>
              </div>
            </div>

            <div className="relative">
              <input
                type="email"
                id="email"
                placeholder=" "
                {...register('email')}
                className="peer w-full h-[52px] pt-5 pb-1 px-3.5 text-sm bg-white border border-slate-300 rounded-md outline-none focus:border-[#0d1b2a] focus:ring-2 focus:ring-[#0d1b2a]/10"
              />
              <label htmlFor="email" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none transition-all peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:uppercase peer-focus:text-[#0d1b2a] peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:uppercase">
                Correo institucional *
              </label>
              {errors.email && <span className="text-[11px] text-red-500 mt-1 block">{errors.email.message}</span>}
            </div>

            <div className="bg-yellow-100/60 border border-yellow-200 rounded-lg p-3.5 flex items-center gap-3">
              <span className="bg-yellow-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">ESTUDIANTE</span>
              <p className="text-[11px] text-yellow-900 leading-tight">Rol asignado automáticamente al registrar — no editable por el administrador.</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 py-3 bg-[#0d1b2a] text-white text-xs font-semibold rounded-md hover:bg-[#1b2a3a]">
                Registrar estudiante
              </button>
              <button type="button" onClick={() => reset()} className="px-5 py-3 border border-slate-300 text-slate-600 text-xs font-semibold rounded-md hover:bg-slate-50">
                Cancelar
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-slate-700">Estudiantes registrados recientemente</h3>
            <span className="text-xs text-slate-500">{students.length} registros</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold tracking-wider">
                  <th className="pb-2">ESTUDIANTE</th>
                  <th className="pb-2">IDENTIFICACIÓN</th>
                  <th className="pb-2">CORREO</th>
                  <th className="pb-2">ROL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-400">No hay estudiantes registrados aún.</td>
                  </tr>
                ) : (
                  students.map((st, i) => (
                    <tr key={i} className="text-slate-700">
                      <td className="py-2.5 font-semibold">{st.fullName}</td>
                      <td className="py-2.5">{st.idNumber}</td>
                      <td className="py-2.5">{st.email}</td>
                      <td className="py-2.5"><span className="bg-yellow-200 text-yellow-800 text-[10px] px-2 py-0.5 rounded font-semibold">Estudiante</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
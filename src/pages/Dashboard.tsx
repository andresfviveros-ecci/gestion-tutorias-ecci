import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Loader } from '../components/Loader';

export const Dashboard: React.FC = () => {
  const { user, students } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1600);
    return () => clearTimeout(timer);
  }, []);

  const formattedDate = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  return (
    <div className="space-y-6">
      <Loader hidden={!loading} />

      <div className="bg-[#f3ede0] border border-dashed border-[#d6cebe] rounded-lg p-3 px-5 flex justify-between items-center text-xs text-[#5c5243]">
        <p>Vista previa por rol — el menú y el panel cambian según el usuario autenticado:</p>
        <div className="flex gap-1.5 bg-[#e6dfcf] p-1 rounded-full">
          <button className="px-3.5 py-1 rounded-full bg-[#0d1b2a] text-white font-semibold">Administrador</button>
          <button className="px-3.5 py-1 rounded-full text-slate-600">Tutor</button>
          <button className="px-3.5 py-1 rounded-full text-slate-600">Estudiante</button>
        </div>
      </div>

      <div className="bg-[#0d1b2a] text-white rounded-xl p-8 flex justify-between items-end shadow-lg">
        <div>
          <h1 className="font-display italic text-3xl font-semibold mb-1">
            ¡Hola, {user?.name || 'Juan Esteban Soto'}! 👋
          </h1>
          <p className="text-xs text-slate-400">Bienvenid@ de nuevo a Aula Libre. Aquí tienes un resumen de tu panel.</p>
        </div>
        <span className="text-xs text-slate-400">{capitalizedDate}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm">
          <span className="text-[11px] text-slate-500 block mb-2">Tutorías dictadas este mes</span>
          <div className="text-3xl font-bold text-[#0d1b2a] mb-1">0</div>
          <span className="text-[11px] font-medium text-emerald-600">+0% vs. mes anterior</span>
        </div>

        <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm">
          <span className="text-[11px] text-slate-500 block mb-2">Estudiantes activos</span>
          <div className="text-3xl font-bold text-[#0d1b2a] mb-1">{students.length}</div>
          <span className="text-[11px] font-medium text-emerald-600">+{students.length} esta semana</span>
        </div>

        <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm">
          <span className="text-[11px] text-slate-500 block mb-2">Tutores activos</span>
          <div className="text-3xl font-bold text-[#0d1b2a] mb-1">0</div>
          <span className="text-[11px] font-medium text-amber-600">0 con baja disponibilidad</span>
        </div>

        <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm">
          <span className="text-[11px] text-slate-500 block mb-2">Materia más demandada</span>
          <div className="text-3xl font-bold text-[#0d1b2a] mb-1">-</div>
          <span className="text-[11px] font-medium text-amber-600">0% de las reservas</span>
        </div>
      </div>

      <div className="bg-white p-6 border border-slate-200 rounded-xl min-h-[220px]">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Estudiantes registrados recientemente</h3>
        <hr className="border-slate-100 mb-4" />
        {students.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">No hay registros recientes para mostrar.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold tracking-wider">
                <th className="pb-3">ESTUDIANTE</th>
                <th className="pb-3">IDENTIFICACIÓN</th>
                <th className="pb-3">CORREO</th>
                <th className="pb-3">ROL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((st, i) => (
                <tr key={i} className="text-slate-700">
                  <td className="py-3 font-semibold">{st.fullName}</td>
                  <td className="py-3">{st.idNumber}</td>
                  <td className="py-3">{st.email}</td>
                  <td className="py-3">
                    <span className="bg-yellow-200 text-yellow-800 text-[10px] px-2 py-0.5 rounded font-semibold">
                      Estudiante
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
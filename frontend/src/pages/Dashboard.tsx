import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Loader } from '../components/Loader';
import { api } from '../api/axios';

interface DashboardStats {
  estudiantesRegistrados: number;
  tutoresRegistrados: number;
  bloquesDisponibles: number;
  materiasActivas: number;
}

interface StudentItem {
  fullName: string;
  idNumber: string;
  email: string;
}

interface BackendStudent {
  id?: string | number;
  fullName?: string;
  nombre?: string;
  nombres?: string;
  apellidos?: string;
  first_name?: string;
  last_name?: string;
  idNumber?: string;
  documento?: string | number;
  identificacion?: string | number;
  codigo_estudiantil?: string;
  email?: string;
  correo?: string;
}

interface BackendTutor {
  id?: string | number;
  nombre?: string;
  nombres?: string;
  apellidos?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  correo?: string;
}

interface BackendBloque {
  id?: string | number;
  estado?: string;
}

interface BackendMateria {
  id?: string | number;
  activa?: boolean;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [userFullName, setUserFullName] = useState<string>('');

  const [stats, setStats] = useState<DashboardStats>({
    estudiantesRegistrados: 0,
    tutoresRegistrados: 0,
    bloquesDisponibles: 0,
    materiasActivas: 0,
  });

  const [recentStudents, setRecentStudents] = useState<StudentItem[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      try {
        const [studentsRes, tutoresRes, bloquesRes, materiasRes] = await Promise.allSettled([
          api.get<BackendStudent[]>('/accounts/estudiantes/'),
          api.get<BackendTutor[]>('/accounts/tutores/'),
          api.get<BackendBloque[]>('/disponibilidad/disponibilidad/'),
          api.get<BackendMateria[]>('/catalogo/materias/'),
        ]);

        if (!isMounted) return;

        const studentsList =
          studentsRes.status === 'fulfilled' && Array.isArray(studentsRes.value.data)
            ? studentsRes.value.data
            : [];
        const tutoresList =
          tutoresRes.status === 'fulfilled' && Array.isArray(tutoresRes.value.data)
            ? tutoresRes.value.data
            : [];
        const bloquesList =
          bloquesRes.status === 'fulfilled' && Array.isArray(bloquesRes.value.data)
            ? bloquesRes.value.data
            : [];
        const materiasList =
          materiasRes.status === 'fulfilled' && Array.isArray(materiasRes.value.data)
            ? materiasRes.value.data
            : [];

        // 1. Métricas calculadas con los datos que sí existen en la API
        setStats({
          estudiantesRegistrados: studentsList.length,
          tutoresRegistrados: tutoresList.length,
          bloquesDisponibles: bloquesList.filter(
            (b) => (b.estado || '').toUpperCase() === 'DISPONIBLE'
          ).length,
          materiasActivas: materiasList.filter((m) => m.activa !== false).length,
        });

        // 2. Mapeo de estudiantes
        const mappedStudents: StudentItem[] = studentsList.map((st) => {
          const combinedName = `${st.nombres || st.first_name || ''} ${st.apellidos || st.last_name || ''}`.trim();
          const finalName = combinedName || st.fullName || st.nombre || 'Estudiante';
          const docVal = String(st.documento || st.identificacion || st.idNumber || st.codigo_estudiantil || st.id || '—');

          return {
            fullName: finalName,
            idNumber: docVal,
            email: st.email || st.correo || '',
          };
        });

        setRecentStudents(mappedStudents);

        // 3. Nombre real del usuario: se busca por correo en estudiantes y tutores
        const userTarget = String(user?.correo || '').toLowerCase().trim();

        if (userTarget) {
          const studentMatch = studentsList.find(
            (st) => String(st.email || st.correo || '').toLowerCase().trim() === userTarget
          );
          const tutorMatch = tutoresList.find(
            (t) => String(t.email || t.correo || '').toLowerCase().trim() === userTarget
          );

          const matched = studentMatch || tutorMatch;

          if (matched) {
            const nom = String(matched.nombres || matched.first_name || '').trim();
            const ape = String(matched.apellidos || matched.last_name || '').trim();
            const full = `${nom} ${ape}`.trim() || String(matched.nombre || '').trim();
            if (full) setUserFullName(full);
          }
        }
      } catch (error) {
        console.error('Error al obtener información del Dashboard:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const formattedDate = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  const getDisplayName = (): string => {
    if (userFullName) return userFullName;
    if (user?.nombre && !user.nombre.includes('@') && !/\d/.test(user.nombre)) {
      return user.nombre;
    }
    return 'Estudiante';
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto w-full space-y-6">
      <Loader hidden={!loading} />

      {/* VISTA PREVIA POR ROL */}
      <div className="bg-[#f3ede0] border border-dashed border-[#d6cebe] rounded-lg p-3 px-5 flex justify-between items-center text-xs text-[#5c5243]">
        <p>Vista previa por rol — el menú y el panel cambian según el usuario autenticado:</p>
        <div className="flex gap-1.5 bg-[#e6dfcf] p-1 rounded-full">
          <button className="px-3.5 py-1 rounded-full bg-[#0d1b2a] text-white font-semibold">Administrador</button>
          <button className="px-3.5 py-1 rounded-full text-slate-600">Tutor</button>
          <button className="px-3.5 py-1 rounded-full text-slate-600">Estudiante</button>
        </div>
      </div>

      {/* BANNER DE BIENVENIDA CON NOMBRE Y APELLIDOS REALES */}
      <div className="bg-[#0d1b2a] text-white rounded-xl p-8 flex justify-between items-end shadow-lg">
        <div>
          <h1 className="font-display italic text-3xl font-semibold mb-1">
            ¡Hola, {getDisplayName()}! 👋
          </h1>
          <p className="text-xs text-slate-400">Bienvenid@ de nuevo a Aula Libre. Aquí tienes un resumen de tu panel.</p>
        </div>
        <span className="text-xs text-slate-400">{capitalizedDate}</span>
      </div>

      {/* TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm">
          <span className="text-[11px] text-slate-500 block mb-2">Estudiantes registrados</span>
          <div className="text-3xl font-bold text-[#0d1b2a] mb-1">{stats.estudiantesRegistrados}</div>
          <span className="text-[11px] font-medium text-slate-500">En el sistema</span>
        </div>

        <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm">
          <span className="text-[11px] text-slate-500 block mb-2">Tutores registrados</span>
          <div className="text-3xl font-bold text-[#0d1b2a] mb-1">{stats.tutoresRegistrados}</div>
          <span className="text-[11px] font-medium text-slate-500">En el sistema</span>
        </div>

        <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm">
          <span className="text-[11px] text-slate-500 block mb-2">Bloques disponibles</span>
          <div className="text-3xl font-bold text-[#0d1b2a] mb-1">{stats.bloquesDisponibles}</div>
          <span className="text-[11px] font-medium text-emerald-600">Listos para reservar</span>
        </div>

        <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm">
          <span className="text-[11px] text-slate-500 block mb-2">Materias activas</span>
          <div className="text-3xl font-bold text-[#0d1b2a] mb-1">{stats.materiasActivas}</div>
          <span className="text-[11px] font-medium text-slate-500">En el catálogo</span>
        </div>
      </div>

      {/* TABLA DE REGISTROS RECIENTES */}
      <div className="bg-white p-6 border border-slate-200 rounded-xl min-h-[220px] shadow-sm">
        <h3 className="text-sm font-semibold text-[#0d1b2a] mb-4">Estudiantes registrados recientemente</h3>
        <hr className="border-slate-100 mb-4" />
        {recentStudents.length === 0 ? (
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
              {recentStudents.map((st, i) => (
                <tr key={i} className="text-slate-700 hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 font-semibold text-[#0d1b2a]">{st.fullName}</td>
                  <td className="py-3 font-mono text-slate-600">{st.idNumber}</td>
                  <td className="py-3 text-slate-600">{st.email}</td>
                  <td className="py-3">
                    <span className="bg-[#fef08a] text-[#854d0e] text-[10px] px-2.5 py-0.5 rounded font-semibold">
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
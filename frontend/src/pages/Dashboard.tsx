import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Loader } from '../components/Loader';
import { api } from '../api/axios';

interface DashboardStats {
  tutoriasMes: number;
  estudiantesActivos: number;
  tutoresActivos: number;
  materiaMasDemandada: string;
  porcentajeDemandada: string;
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

interface BackendStats {
  tutorias_mes?: number;
  tutoriasMes?: number;
  estudiantes_activos?: number;
  estudiantesActivos?: number;
  totalEstudiantes?: number;
  tutores_activos?: number;
  tutoresActivos?: number;
  totalTutores?: number;
  materia_mas_demandada?: string;
  materiaMasDemandada?: string;
  porcentaje_demandada?: string;
  porcentajeDemandada?: string;
}

interface UserBackendItem {
  id?: string | number;
  username?: string;
  email?: string;
  nombre?: string;
  nombres?: string;
  apellidos?: string;
  first_name?: string;
  last_name?: string;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [userFullName, setUserFullName] = useState<string>('');

  const [stats, setStats] = useState<DashboardStats>({
    tutoriasMes: 0,
    estudiantesActivos: 0,
    tutoresActivos: 0,
    materiaMasDemandada: '-',
    porcentajeDemandada: '0%',
  });

  const [recentStudents, setRecentStudents] = useState<StudentItem[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      try {
        const [statsRes, studentsRes, usersRes] = await Promise.allSettled([
          api.get<BackendStats>('/accounts/dashboard-stats/'),
          api.get<BackendStudent[]>('/accounts/estudiantes/'),
          api.get<UserBackendItem[]>('/accounts/usuarios/'),
        ]);

        if (!isMounted) return;

        // 1. Métricas
        if (statsRes.status === 'fulfilled' && statsRes.value.data) {
          const d = statsRes.value.data;
          setStats({
            tutoriasMes: d.tutoriasMes ?? d.tutorias_mes ?? 0,
            estudiantesActivos: d.estudiantesActivos ?? d.estudiantes_activos ?? d.totalEstudiantes ?? 0,
            tutoresActivos: d.tutoresActivos ?? d.tutores_activos ?? d.totalTutores ?? 0,
            materiaMasDemandada: d.materiaMasDemandada || d.materia_mas_demandada || '-',
            porcentajeDemandada: d.porcentajeDemandada || d.porcentaje_demandada || '0%',
          });
        }

        // 2. Mapeo de estudiantes recientes
        let studentsList: BackendStudent[] = [];
        if (studentsRes.status === 'fulfilled' && Array.isArray(studentsRes.value.data)) {
          studentsList = studentsRes.value.data;
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

          if (statsRes.status !== 'fulfilled') {
            setStats((prev) => ({
              ...prev,
              estudiantesActivos: mappedStudents.length,
            }));
          }
        }

        // 3. Búsqueda inteligente y flexible del nombre real
        const userTarget = String(user?.correo || user?.id || user?.nombre || '').toLowerCase().trim();
        const prefixTarget = userTarget.split('@')[0];
        const alphaTarget = prefixTarget.replace(/[^a-z]/g, '');

        let usersList: UserBackendItem[] = [];
        if (usersRes.status === 'fulfilled' && Array.isArray(usersRes.value.data)) {
          usersList = usersRes.value.data;
        }

        let foundName = '';

        // Intento 1: Coincidencia en la lista de usuarios
        for (const u of usersList) {
          const uEmail = String(u.email || '').toLowerCase().trim();
          const uUsername = String(u.username || '').toLowerCase().trim();
          const nom = String(u.nombres || u.first_name || '').trim();
          const ape = String(u.apellidos || u.last_name || '').trim();
          const full = `${nom} ${ape}`.trim() || String(u.nombre || '').trim();

          if (full) {
            if (uEmail === userTarget || uUsername === userTarget || uEmail.split('@')[0] === prefixTarget) {
              foundName = full;
              break;
            }
            if (alphaTarget.length >= 3 && (uEmail.includes(alphaTarget) || uUsername.includes(alphaTarget))) {
              foundName = full;
              break;
            }
          }
        }

        // Intento 2: Coincidencia inteligente en la lista de estudiantes
        if (!foundName) {
          for (const st of studentsList) {
            const stEmail = String(st.email || st.correo || '').toLowerCase().trim();
            const nom = String(st.nombres || st.first_name || '').trim();
            const ape = String(st.apellidos || st.last_name || '').trim();
            const full = `${nom} ${ape}`.trim() || String(st.fullName || st.nombre || '').trim();

            if (full) {
              const compactFull = full.toLowerCase().replace(/[^a-z]/g, '');
              if (
                stEmail === userTarget ||
                stEmail.split('@')[0] === prefixTarget ||
                (alphaTarget.length >= 3 && compactFull.includes(alphaTarget)) ||
                (alphaTarget.length >= 3 && stEmail.includes(alphaTarget))
              ) {
                foundName = full;
                break;
              }
            }
          }
        }

        if (foundName) {
          setUserFullName(foundName);
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
          <span className="text-[11px] text-slate-500 block mb-2">Tutorías dictadas este mes</span>
          <div className="text-3xl font-bold text-[#0d1b2a] mb-1">{stats.tutoriasMes}</div>
          <span className="text-[11px] font-medium text-emerald-600">+0% vs. mes anterior</span>
        </div>

        <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm">
          <span className="text-[11px] text-slate-500 block mb-2">Estudiantes activos</span>
          <div className="text-3xl font-bold text-[#0d1b2a] mb-1">
            {stats.estudiantesActivos || recentStudents.length}
          </div>
          <span className="text-[11px] font-medium text-emerald-600">
            +{stats.estudiantesActivos || recentStudents.length} esta semana
          </span>
        </div>

        <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm">
          <span className="text-[11px] text-slate-500 block mb-2">Tutores activos</span>
          <div className="text-3xl font-bold text-[#0d1b2a] mb-1">{stats.tutoresActivos}</div>
          <span className="text-[11px] font-medium text-amber-600">0 con baja disponibilidad</span>
        </div>

        <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm">
          <span className="text-[11px] text-slate-500 block mb-2">Materia más demandada</span>
          <div className="text-3xl font-bold text-[#0d1b2a] mb-1">{stats.materiaMasDemandada}</div>
          <span className="text-[11px] font-medium text-amber-600">{stats.porcentajeDemandada} de las reservas</span>
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
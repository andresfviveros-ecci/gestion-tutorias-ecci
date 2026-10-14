import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../api/axios';

export interface TutoriaItem {
  id: number | string;
  fecha: string; // YYYY-MM-DD
  hora_inicio: string; // HH:mm:ss o HH:mm
  hora_fin: string; // HH:mm:ss o HH:mm
  materia?: string | { id?: number; nombre?: string; codigo?: string } | null;
  estudiante_id?: number | string;
  estudiante_nombre?: string;
  estudiante_email?: string;
  estudiante?: { id?: number | string; nombre?: string; email?: string } | null;
  estado?: string;
  modalidad?: string;
  cupo_ocupado?: number;
  cupo_total?: number;
}

// Helper para obtener YYYY-MM-DD local sin desfase UTC
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper para extraer el nombre legible de la materia
const obtenerNombreMateria = (materia: TutoriaItem['materia']): string => {
  if (!materia) return 'Tutoría Académica';
  if (typeof materia === 'string') return materia;
  if (typeof materia === 'object' && materia.nombre) return materia.nombre;
  return 'Tutoría Académica';
};

// Helper para extraer el nombre o correo del estudiante
const obtenerNombreEstudiante = (item: TutoriaItem): string => {
  if (item.estudiante_nombre) return item.estudiante_nombre;
  if (item.estudiante_email) return item.estudiante_email;
  if (item.estudiante && typeof item.estudiante === 'object') {
    return item.estudiante.nombre || item.estudiante.email || 'Estudiante asignado';
  }
  return 'Sin reservar';
};

export const DashboardTutor: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const [tutorias, setTutorias] = useState<TutoriaItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Nombre formateado para el saludo
  const userName = useMemo(() => {
    if (!user) return 'TUTOR';
    if (user.first_name) return user.first_name.split(' ')[0];
    if (user.nombre) return user.nombre.split(' ')[0];
    return 'TUTOR';
  }, [user]);

  // Formato de fecha actual en español
  const currentDateFormatted = useMemo(() => {
    const today = new Date();
    const str = today.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, []);

  // Carga de tutorías desde el Backend
  useEffect(() => {
    const fetchTutorias = async () => {
      setLoading(true);
      try {
        // Consultar el endpoint de disponibilidades/tutorías
        const response = await api.get('/disponibilidad/disponibilidad/');
        
        let data: TutoriaItem[] = [];
        if (Array.isArray(response.data)) {
          data = response.data;
        } else if ((response.data as unknown as { results: TutoriaItem[] })?.results) {
          data = (response.data as unknown as { results: TutoriaItem[] }).results;
        }
        
        setTutorias(data);
      } catch (error) {
        console.error('Error al cargar tutorías para el Dashboard:', error);
        setTutorias([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTutorias();
  }, []);

  // --- CÁLCULO DE MÉTRICAS EN TIEMPO REAL ---

  const todayStr = useMemo(() => formatLocalDate(new Date()), []);

  // 1. Tutorías esta semana y cuántas son hoy
  const { tutoriasSemana, tutoriasHoyCount } = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    let countSemana = 0;
    let countHoy = 0;

    tutorias.forEach((t) => {
      if (!t.fecha || t.estado === 'CANCELADO') return;
      const [year, month, day] = t.fecha.split('-').map(Number);
      const tDate = new Date(year, month - 1, day);

      if (tDate >= monday && tDate <= sunday) {
        countSemana++;
      }
      if (t.fecha === todayStr) {
        countHoy++;
      }
    });

    return { tutoriasSemana: countSemana, tutoriasHoyCount: countHoy };
  }, [tutorias, todayStr]);

  // 2. Horas dictadas este mes
  const horasDictadasMes = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let totalMinutes = 0;

    tutorias.forEach((t) => {
      if (!t.fecha || t.estado === 'CANCELADO') return;
      const [year, month, day] = t.fecha.split('-').map(Number);
      const tDate = new Date(year, month - 1, day);

      if (tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth) {
        if (t.hora_inicio && t.hora_fin) {
          const [h1, m1] = t.hora_inicio.split(':').map(Number);
          const [h2, m2] = t.hora_fin.split(':').map(Number);
          const startMin = h1 * 60 + (m1 || 0);
          const endMin = h2 * 60 + (m2 || 0);
          if (endMin > startMin) {
            totalMinutes += endMin - startMin;
          }
        } else {
          totalMinutes += 60;
        }
      }
    });

    return Math.round((totalMinutes / 60) * 10) / 10;
  }, [tutorias]);

  // 3. Estudiantes atendidos este mes (Conteo único)
  const estudiantesAtendidosCount = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const uniqueStudents = new Set<string>();

    tutorias.forEach((t) => {
      if (!t.fecha || t.estado === 'CANCELADO') return;
      const [year, month, day] = t.fecha.split('-').map(Number);
      const tDate = new Date(year, month - 1, day);

      if (tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth) {
        const identifier =
          t.estudiante_id ||
          t.estudiante_email ||
          t.estudiante_nombre ||
          (t.estudiante ? t.estudiante.id || t.estudiante.email : null);

        if (identifier) {
          uniqueStudents.add(String(identifier));
        }
      }
    });

    return uniqueStudents.size;
  }, [tutorias]);

  // 4. Próxima tutoría de hoy
  const proximaTutoriaHoy = useMemo(() => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const hoyTutorias = tutorias.filter((t) => {
      if (t.fecha !== todayStr || t.estado === 'CANCELADO') return false;
      if (!t.hora_inicio) return true;
      const [h, m] = t.hora_inicio.split(':').map(Number);
      const tMinutes = h * 60 + (m || 0);
      return tMinutes >= currentMinutes;
    });

    hoyTutorias.sort((a, b) => {
      const [h1, m1] = (a.hora_inicio || '00:00').split(':').map(Number);
      const [h2, m2] = (b.hora_inicio || '00:00').split(':').map(Number);
      return h1 * 60 + m1 - (h2 * 60 + m2);
    });

    return hoyTutorias[0] || null;
  }, [tutorias, todayStr]);

  // Lista de próximas tutorías generales
  const proximasTutoriasLista = useMemo(() => {
    return tutorias
      .filter((t) => {
        if (!t.fecha || t.estado === 'CANCELADO') return false;
        return t.fecha >= todayStr;
      })
      .sort((a, b) => {
        const dateA = `${a.fecha}T${a.hora_inicio || '00:00'}`;
        const dateB = `${b.fecha}T${b.hora_inicio || '00:00'}`;
        return dateA.localeCompare(dateB);
      })
      .slice(0, 5);
  }, [tutorias, todayStr]);

  return (
    <div className="p-6 md:p-10 bg-[#f7f5ed] min-h-screen font-body text-slate-800 space-y-6">
      {/* BREADCRUMB */}
      <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
        <div>
          <span>Panel</span> <span className="mx-1">/</span> <span className="text-slate-800">Dashboard</span>
        </div>
        <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[11px] text-slate-600 shadow-sm">
          Tutor
        </span>
      </div>

      {/* BANNER BIENVENIDA */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative bg-[#111a2e] text-white rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center shadow-lg overflow-hidden"
      >
        <div className="z-10">
          <h1 className="font-display italic text-3xl md:text-4xl font-bold tracking-wide mb-2">
            ¡HOLA, {userName.toUpperCase()}! 👋
          </h1>
          <p className="text-xs md:text-sm text-slate-300 font-light">
            Bienvenid@ de nuevo a <strong className="font-semibold text-emerald-400">Aula Libre</strong>. Aquí tienes un resumen de tu panel.
          </p>
        </div>
        <div className="z-10 mt-4 md:mt-0 text-xs md:text-sm font-medium text-slate-300 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/10">
          {currentDateFormatted}
        </div>
      </motion.div>

      {/* TARJETAS ESTADÍSTICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1 */}
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between"
        >
          <span className="text-xs font-semibold text-slate-500 block mb-3">
            Tutorías esta semana
          </span>
          <div>
            <span className="text-3xl font-extrabold text-slate-900 block">
              {loading ? '-' : tutoriasSemana}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium block mt-1">
              {tutoriasHoyCount} hoy
            </span>
          </div>
        </motion.div>

        {/* CARD 2 */}
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between"
        >
          <span className="text-xs font-semibold text-slate-500 block mb-3">
            Horas dictadas este mes
          </span>
          <div>
            <span className="text-3xl font-extrabold text-slate-900 block">
              {loading ? '-' : `${horasDictadasMes}h`}
            </span>
            <span className="text-[11px] text-amber-600 font-medium block mt-1">
              Mes actual
            </span>
          </div>
        </motion.div>

        {/* CARD 3 */}
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between"
        >
          <span className="text-xs font-semibold text-slate-500 block mb-3">
            Estudiantes atendidos
          </span>
          <div>
            <span className="text-3xl font-extrabold text-slate-900 block">
              {loading ? '-' : estudiantesAtendidosCount}
            </span>
            <span className="text-[11px] text-amber-600 font-medium block mt-1">
              Mes actual
            </span>
          </div>
        </motion.div>

        {/* CARD 4 */}
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between"
        >
          <span className="text-xs font-semibold text-slate-500 block mb-3">
            Próxima tutoría
          </span>
          <div>
            <span className="text-base font-bold text-slate-900 block truncate">
              {proximaTutoriaHoy
                ? `${proximaTutoriaHoy.hora_inicio.substring(0, 5)} - ${obtenerNombreMateria(proximaTutoriaHoy.materia)}`
                : '-'}
            </span>
            <span className="text-[11px] text-slate-500 font-medium block mt-1">
              {proximaTutoriaHoy ? 'Hoy' : 'Sin tutorías pendientes hoy'}
            </span>
          </div>
        </motion.div>
      </div>

      {/* TUS PRÓXIMAS TUTORÍAS */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm"
      >
        <h3 className="font-display text-lg font-bold text-slate-800 mb-6">
          Tus próximas tutorías
        </h3>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Cargando tutorías...</div>
        ) : proximasTutoriasLista.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 border-t border-slate-100">
            No tienes tutorías programadas próximamente.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {proximasTutoriasLista.map((item) => {
              const nombreMat = obtenerNombreMateria(item.materia);
              const nombreEst = obtenerNombreEstudiante(item);
              const hInicio = (item.hora_inicio || '').substring(0, 5);
              const hFin = (item.hora_fin || '').substring(0, 5);

              return (
                <div
                  key={item.id}
                  className="py-3.5 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#111a2e]/10 text-[#111a2e] font-bold text-xs flex items-center justify-center">
                      {nombreMat.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800">
                        {nombreMat}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Estudiante: {nombreEst}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-medium text-slate-700 block">
                      {item.fecha}
                    </span>
                    <span className="text-[11px] text-emerald-600 font-semibold">
                      {hInicio} {hFin ? `- ${hFin}` : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};
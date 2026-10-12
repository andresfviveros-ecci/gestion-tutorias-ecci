import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../api/axios';

export interface BloqueBackend {
  id: number | string;
  docente?: number | string | { id?: number | string; nombre?: string; email?: string; first_name?: string; last_name?: string };
  materia?: string | { id?: number | string; nombre?: string; codigo?: string } | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  modalidad: string;
  lugar?: string;
  enlace_virtual?: string;
  estado: string;
  docente_nombre?: string;
}

export interface TutoriaReservada {
  id: number | string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  materia: string;
  tutor_nombre: string;
  modalidad: string;
  lugar_o_enlace?: string;
  estado?: string;
}

export const DashboardEstudiante: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const [disponibilidades, setDisponibilidades] = useState<BloqueBackend[]>([]);
  const [misReservas, setMisReservas] = useState<TutoriaReservada[]>([]);
  const [loading, setLoading] = useState(true);

  const userName = useMemo(() => {
    if (!user) return 'Estudiante';
    if (user.first_name) return user.first_name.split(' ')[0];
    if (user.nombre) return user.nombre.split(' ')[0];
    return 'Estudiante';
  }, [user]);

  const currentDateFormatted = useMemo(() => {
    const today = new Date();
    const str = today.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [resDisponibilidades, resReservas] = await Promise.allSettled([
          api.get<BloqueBackend[]>('/disponibilidades/'),
          api.get<TutoriaReservada[]>('/accounts/tutorias/mis-reservas/'),
        ]);

        if (resDisponibilidades.status === 'fulfilled' && Array.isArray(resDisponibilidades.value.data)) {
          setDisponibilidades(resDisponibilidades.value.data);
        } else {
          setDisponibilidades([]);
        }

        if (resReservas.status === 'fulfilled' && Array.isArray(resReservas.value.data)) {
          setMisReservas(resReservas.value.data);
        } else {
          setMisReservas([]);
        }
      } catch (error) {
        console.error('Error al cargar datos del Dashboard Estudiante:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- CÁLCULO DE MÉTRICAS ---

  // 1. Próxima tutoría
  const proximaTutoria = useMemo(() => {
    if (misReservas.length === 0) return null;
    const now = new Date();
    const sorted = [...misReservas].sort((a, b) => {
      const dateA = new Date(`${a.fecha}T${a.hora_inicio || '00:00'}`);
      const dateB = new Date(`${b.fecha}T${b.hora_inicio || '00:00'}`);
      return dateA.getTime() - dateB.getTime();
    });
    const upcoming = sorted.find((item) => new Date(`${item.fecha}T${item.hora_inicio || '00:00'}`) >= now);
    return upcoming || sorted[0];
  }, [misReservas]);

  // 2. Tutorías tomadas este semestre
  const tutoriasTomadasCount = useMemo(() => misReservas.length, [misReservas]);

  // 3. Materias con tutoría disponible
  const materiasDisponiblesCount = useMemo(() => {
    const uniqueMaterias = new Set<string>();
    disponibilidades.forEach((item) => {
      if (item.estado === 'DISPONIBLE' || item.estado === 'Libre') {
        let matNombre = '';
        if (typeof item.materia === 'string') matNombre = item.materia;
        else if (item.materia?.nombre) matNombre = item.materia.nombre;
        if (matNombre) uniqueMaterias.add(matNombre);
      }
    });
    return uniqueMaterias.size;
  }, [disponibilidades]);

  // 4. Tutores disponibles ahora
  const tutoresDisponiblesCount = useMemo(() => {
    const uniqueTutores = new Set<string>();
    disponibilidades.forEach((item) => {
      if (item.estado === 'DISPONIBLE' || item.estado === 'Libre') {
        let tutorId = '';
        if (typeof item.docente === 'object' && item.docente !== null) {
          tutorId = String(item.docente.id || item.docente.email || item.docente.nombre);
        } else if (item.docente) {
          tutorId = String(item.docente);
        }
        if (tutorId) uniqueTutores.add(tutorId);
      }
    });
    return uniqueTutores.size;
  }, [disponibilidades]);

  return (
    <div className="p-6 md:p-10 bg-[#f7f5ed] min-h-screen font-body text-slate-800 space-y-6">
      {/* BREADCRUMB */}
      <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
        <div>
          <span>Panel</span> <span className="mx-1">/</span> <span className="text-slate-800">Dashboard</span>
        </div>
        <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[11px] text-slate-600 shadow-sm font-medium">
          Estudiante
        </span>
      </div>

      {/* BANNER DE BIENVENIDA */}
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
        {/* CARD 1: PRÓXIMA TUTORÍA */}
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between"
        >
          <span className="text-xs font-semibold text-slate-500 block mb-3">
            Próxima tutoría
          </span>
          <div>
            <span className="text-xl font-bold text-slate-900 block truncate">
              {proximaTutoria
                ? `${proximaTutoria.hora_inicio.substring(0, 5)} - ${proximaTutoria.materia}`
                : '-'}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium block mt-1">
              {proximaTutoria ? `${proximaTutoria.fecha} . ${proximaTutoria.materia}` : 'Sin tutorías reservadas'}
            </span>
          </div>
        </motion.div>

        {/* CARD 2: TUTORÍAS TOMADAS */}
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between"
        >
          <span className="text-xs font-semibold text-slate-500 block mb-3">
            Tutorías tomadas
          </span>
          <div>
            <span className="text-3xl font-extrabold text-slate-900 block">
              {loading ? '-' : tutoriasTomadasCount}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium block mt-1">
              Este semestre
            </span>
          </div>
        </motion.div>

        {/* CARD 3: MATERIAS CON TUTORÍA DISPONIBLE */}
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between"
        >
          <span className="text-xs font-semibold text-slate-500 block mb-3">
            Materias con tutoría disponible
          </span>
          <div>
            <span className="text-3xl font-extrabold text-slate-900 block">
              {loading ? '-' : materiasDisponiblesCount}
            </span>
            <span className="text-[11px] text-amber-600 font-medium block mt-1">
              Actualizado hoy
            </span>
          </div>
        </motion.div>

        {/* CARD 4: TUTORES DISPONIBLES AHORA */}
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between"
        >
          <span className="text-xs font-semibold text-slate-500 block mb-3">
            Tutores disponibles ahora
          </span>
          <div>
            <span className="text-3xl font-extrabold text-slate-900 block">
              {loading ? '-' : tutoresDisponiblesCount}
            </span>
            <span className="text-[11px] text-amber-600 font-medium block mt-1">
              En tus materias
            </span>
          </div>
        </motion.div>
      </div>

      {/* SECCIÓN LISTADO: TUS PRÓXIMAS TUTORÍAS */}
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
          <div className="py-8 text-center text-xs text-slate-400">Cargando tutorías reservadas...</div>
        ) : misReservas.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 border-t border-slate-100">
            Aún no tienes tutorías reservadas.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {misReservas.map((item) => (
              <div
                key={item.id}
                className="py-3.5 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#111a2e]/10 text-[#111a2e] font-bold text-xs flex items-center justify-center">
                    {(item.materia || 'T').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-800">
                      {item.materia}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Tutor: {item.tutor_nombre}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-medium text-slate-700 block">
                    {item.fecha}
                  </span>
                  <span className="text-[11px] text-emerald-600 font-semibold">
                    {item.hora_inicio.substring(0, 5)} - {item.hora_fin.substring(0, 5)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};
import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../api/axios';

export interface BloqueBackend {
  id: number | string;
  docente?: number | string | { id?: number | string; nombre?: string; email?: string; first_name?: string; last_name?: string; username?: string } | null;
  materia?: string | { id?: number | string; nombre?: string; codigo?: string } | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  modalidad: string;
  lugar?: string;
  enlace_virtual?: string;
  estado: string;
  docente_nombre?: string;
  tutorNombre?: string;
}

export interface TutoriaBackend {
  id: number | string;
  bloque?: BloqueBackend | number | string | null;
  tema?: string;
  descripcion?: string;
  estado?: string;
  fecha?: string;
  materia?: string | { id?: number | string; nombre?: string; codigo?: string } | null;
  docente_nombre?: string;
  docente?: { id?: number | string; first_name?: string; last_name?: string; nombre?: string; email?: string; username?: string } | null;
}

interface UserExtended {
  nombre?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
}

interface DetallesTutoria {
  docenteNombre: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  materiaNombre: string;
  materiaCodigo: string;
  modalidad: string;
  lugar: string;
  enlaceVirtual: string;
}

// Extraer docente
const extraerNombreDocenteObj = (d: unknown): string => {
  if (!d) return '';
  if (typeof d === 'string') return d;
  if (typeof d === 'object' && d !== null) {
    const obj = d as { first_name?: string; last_name?: string; nombre?: string; username?: string; email?: string };
    const full = `${obj.first_name || ''} ${obj.last_name || ''}`.trim();
    if (full) return full;
    if (obj.nombre) return obj.nombre;
    if (obj.username) return obj.username;
    if (obj.email) return obj.email;
  }
  return '';
};

const obtenerNombreDocente = (b: BloqueBackend): string => {
  if (b.docente_nombre) return b.docente_nombre;
  if (b.tutorNombre) return b.tutorNombre;
  const desdeDocente = extraerNombreDocenteObj(b.docente);
  if (desdeDocente) return desdeDocente;
  return '';
};

// Extraer información completa de materia
const extraerInfoMateriaCompleta = (target: unknown): { nombre: string; codigo: string } => {
  if (!target) return { nombre: '', codigo: '' };

  if (typeof target === 'string') {
    if (target.includes('—')) {
      const parts = target.split('—');
      return { codigo: parts[0].trim(), nombre: parts[1].trim() };
    }
    if (target.includes(' - ')) {
      const parts = target.split(' - ');
      return { codigo: parts[0].trim(), nombre: parts[1].trim() };
    }
    return { nombre: target.trim(), codigo: '' };
  }

  if (typeof target === 'object' && target !== null) {
    const rec = target as Record<string, unknown>;

    if (rec.materia) {
      const res = extraerInfoMateriaCompleta(rec.materia);
      if (res.nombre || res.codigo) return res;
    }

    const nombre = String(
      rec.nombre || rec.materia_nombre || rec.nombre_materia || rec.title || rec.name || ''
    ).trim();

    const codigo = String(
      rec.codigo || rec.materia_codigo || rec.codigo_materia || rec.code || ''
    ).trim();

    if (nombre || codigo) {
      return { nombre, codigo };
    }
  }

  return { nombre: '', codigo: '' };
};

// Obtener detalles de tutoría agendada
const obtenerDetallesTutoria = (tut: TutoriaBackend, listaBloques: BloqueBackend[]): DetallesTutoria => {
  let bloqueObj: BloqueBackend | null = null;

  if (typeof tut.bloque === 'object' && tut.bloque !== null) {
    bloqueObj = tut.bloque;
  } else if (tut.bloque) {
    bloqueObj = listaBloques.find((b) => String(b.id) === String(tut.bloque)) || null;
  }

  const docenteNombre = tut.docente_nombre 
    || extraerNombreDocenteObj(tut.docente)
    || (bloqueObj ? obtenerNombreDocente(bloqueObj) : '');

  const fecha = tut.fecha || (bloqueObj ? bloqueObj.fecha || '' : '');
  const horaInicio = bloqueObj ? bloqueObj.hora_inicio || '' : '';
  const horaFin = bloqueObj ? bloqueObj.hora_fin || '' : '';

  let matInfo = bloqueObj ? extraerInfoMateriaCompleta(bloqueObj) : { nombre: '', codigo: '' };
  if (!matInfo.nombre) {
    matInfo = extraerInfoMateriaCompleta(tut);
  }

  const modalidad = bloqueObj ? bloqueObj.modalidad || '' : '';
  const lugar = bloqueObj ? bloqueObj.lugar || '' : '';
  const enlaceVirtual = bloqueObj ? bloqueObj.enlace_virtual || '' : '';

  return {
    docenteNombre,
    fecha,
    horaInicio,
    horaFin,
    materiaNombre: matInfo.nombre,
    materiaCodigo: matInfo.codigo,
    modalidad,
    lugar,
    enlaceVirtual,
  };
};

export const DashboardEstudiante: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const [disponibilidades, setDisponibilidades] = useState<BloqueBackend[]>([]);
  const [misReservas, setMisReservas] = useState<TutoriaBackend[]>([]);
  const [loading, setLoading] = useState(true);

  const userName = useMemo(() => {
    const userExt = user as UserExtended | null;
    if (!userExt) return 'Estudiante';
    if (userExt.first_name) return userExt.first_name.split(' ')[0];
    if (userExt.nombre) return userExt.nombre.split(' ')[0];
    if (userExt.username) return userExt.username.split(' ')[0];
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
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [resDisponibilidades, resReservas] = await Promise.allSettled([
          api.get('/disponibilidad/disponibilidad/'),
          api.get('/tutorias/tutorias/'),
        ]);

        if (isMounted) {
          if (resDisponibilidades.status === 'fulfilled' && resDisponibilidades.value.data) {
            const raw = Array.isArray(resDisponibilidades.value.data)
              ? resDisponibilidades.value.data
              : (resDisponibilidades.value.data as { results?: BloqueBackend[] }).results || [];
            setDisponibilidades(raw);
          } else {
            setDisponibilidades([]);
          }

          if (resReservas.status === 'fulfilled' && resReservas.value.data) {
            const raw = Array.isArray(resReservas.value.data)
              ? resReservas.value.data
              : (resReservas.value.data as { results?: TutoriaBackend[] }).results || [];
            setMisReservas(raw);
          } else {
            setMisReservas([]);
          }
        }
      } catch (error) {
        console.error('Error al cargar datos del Dashboard Estudiante:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  const idsBloquesReservados = useMemo(() => {
    const setIds = new Set<string>();
    misReservas.forEach((tut) => {
      if (tut.bloque) {
        if (typeof tut.bloque === 'object' && tut.bloque !== null && tut.bloque.id) {
          setIds.add(String(tut.bloque.id));
        } else if (typeof tut.bloque === 'number' || typeof tut.bloque === 'string') {
          setIds.add(String(tut.bloque));
        }
      }
    });
    return setIds;
  }, [misReservas]);

  const proximaTutoriaDetalle = useMemo(() => {
    if (misReservas.length === 0) return null;

    const todayISO = new Date().toISOString().split('T')[0];

    const futuras = misReservas
      .map((tut) => ({
        tut,
        detalles: obtenerDetallesTutoria(tut, disponibilidades),
      }))
      .filter((item) => {
        const f = item.detalles.fecha || item.tut.fecha || '';
        return !f || f >= todayISO;
      })
      .sort((a, b) => {
        const dateA = `${a.detalles.fecha || '9999-12-31'}T${a.detalles.horaInicio || '00:00'}`;
        const dateB = `${b.detalles.fecha || '9999-12-31'}T${b.detalles.horaInicio || '00:00'}`;
        return dateA.localeCompare(dateB);
      });

    return futuras.length > 0 ? futuras[0] : null;
  }, [misReservas, disponibilidades]);

  const tutoriasTomadasCount = useMemo(() => misReservas.length, [misReservas]);

  const bloquesDisponiblesLibres = useMemo(() => {
    return disponibilidades.filter((b) => {
      const estadoUpper = (b.estado || '').toUpperCase();
      if (estadoUpper === 'RESERVADO' || estadoUpper === 'RESERVADA' || estadoUpper === 'COMPLETO') {
        return false;
      }
      if (idsBloquesReservados.has(String(b.id))) {
        return false;
      }
      return true;
    });
  }, [disponibilidades, idsBloquesReservados]);

  const materiasDisponiblesCount = useMemo(() => {
    const uniqueMaterias = new Set<string>();
    bloquesDisponiblesLibres.forEach((item) => {
      const { nombre } = extraerInfoMateriaCompleta(item);
      if (nombre) uniqueMaterias.add(nombre);
    });
    return uniqueMaterias.size;
  }, [bloquesDisponiblesLibres]);

  const tutoresDisponiblesCount = useMemo(() => {
    const uniqueTutores = new Set<string>();
    bloquesDisponiblesLibres.forEach((item) => {
      const nombre = obtenerNombreDocente(item);
      if (nombre) uniqueTutores.add(nombre);
    });
    return uniqueTutores.size;
  }, [bloquesDisponiblesLibres]);

  return (
    <div className="p-6 md:p-8 bg-[#f8f6f0] min-h-screen font-sans text-slate-800 space-y-6 w-full max-w-7xl mx-auto">
      {/* BREADCRUMB */}
      <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
        <div>
          <span>Panel</span> <span className="mx-1">/</span> <span className="text-slate-800 font-bold">Dashboard</span>
        </div>
        <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[11px] text-slate-600 shadow-xs font-medium">
          Estudiante
        </span>
      </div>

      {/* BANNER DE BIENVENIDA */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative bg-[#0b1329] text-white rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center shadow-md overflow-hidden"
      >
        <div className="z-10">
          <h1 className="font-serif italic text-3xl md:text-4xl font-bold tracking-wide mb-2">
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
          className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
        >
          <span className="text-xs font-semibold text-slate-500 block mb-3">Próxima tutoría</span>
          <div>
            {loading ? (
              <span className="text-sm text-slate-400 font-medium block">Cargando...</span>
            ) : proximaTutoriaDetalle ? (
              <>
                <span className="text-base font-bold text-slate-900 block truncate">
                  {proximaTutoriaDetalle.detalles.materiaNombre
                    ? `${proximaTutoriaDetalle.detalles.materiaCodigo ? `${proximaTutoriaDetalle.detalles.materiaCodigo} — ` : ''}${proximaTutoriaDetalle.detalles.materiaNombre}`
                    : proximaTutoriaDetalle.tut.tema || 'Materia reservada'}
                </span>
                <span className="text-[11px] text-emerald-600 font-medium block mt-1 truncate">
                  {proximaTutoriaDetalle.detalles.fecha} {proximaTutoriaDetalle.detalles.horaInicio ? `(${proximaTutoriaDetalle.detalles.horaInicio})` : ''} {proximaTutoriaDetalle.detalles.docenteNombre ? `• ${proximaTutoriaDetalle.detalles.docenteNombre}` : ''}
                </span>
              </>
            ) : (
              <>
                <span className="text-2xl font-bold text-slate-300 block">-</span>
                <span className="text-[11px] text-slate-400 font-medium block mt-1">Sin tutorías reservadas</span>
              </>
            )}
          </div>
        </motion.div>

        {/* CARD 2: TUTORÍAS TOMADAS */}
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
        >
          <span className="text-xs font-semibold text-slate-500 block mb-3">Tutorías tomadas</span>
          <div>
            <span className="text-3xl font-extrabold text-slate-900 block">{loading ? '-' : tutoriasTomadasCount}</span>
            <span className="text-[11px] text-emerald-600 font-medium block mt-1">Este semestre</span>
          </div>
        </motion.div>

        {/* CARD 3: MATERIAS CON TUTORÍA DISPONIBLE */}
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
        >
          <span className="text-xs font-semibold text-slate-500 block mb-3">Materias con tutoría disponible</span>
          <div>
            <span className="text-3xl font-extrabold text-slate-900 block">{loading ? '-' : materiasDisponiblesCount}</span>
            <span className="text-[11px] text-amber-600 font-medium block mt-1">Actualizado hoy</span>
          </div>
        </motion.div>

        {/* CARD 4: TUTORES DISPONIBLES AHORA */}
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
        >
          <span className="text-xs font-semibold text-slate-500 block mb-3">Tutores disponibles ahora</span>
          <div>
            <span className="text-3xl font-extrabold text-slate-900 block">{loading ? '-' : tutoresDisponiblesCount}</span>
            <span className="text-[11px] text-amber-600 font-medium block mt-1">En tus materias</span>
          </div>
        </motion.div>
      </div>

      {/* SECCIÓN LISTADO: TUS PRÓXIMAS TUTORÍAS */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs"
      >
        <h3 className="font-serif font-bold text-lg text-slate-900 mb-6">Tus próximas tutorías</h3>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400 font-medium">Cargando tutorías reservadas...</div>
        ) : misReservas.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 border-t border-slate-100 font-medium">
            Aún no tienes tutorías reservadas.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {misReservas.map((item) => {
              const detalles = obtenerDetallesTutoria(item, disponibilidades);
              const materiaDisplay = detalles.materiaNombre
                ? `${detalles.materiaCodigo ? `${detalles.materiaCodigo} — ` : ''}${detalles.materiaNombre}`
                : item.tema || 'Materia Asignada';
              const docente = detalles.docenteNombre || 'Docente asignado';

              return (
                <div
                  key={item.id}
                  className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50/80 px-3 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0b1329]/10 text-[#0b1329] font-bold text-xs flex items-center justify-center flex-shrink-0 uppercase">
                      {materiaDisplay.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{materiaDisplay}</h4>
                      <p className="text-[11px] text-slate-500 font-medium">Tutor: {docente}</p>
                      {item.tema && item.tema !== detalles.materiaNombre && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          <span className="font-semibold text-slate-600">Tema:</span> {item.tema}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    {detalles.fecha && (
                      <span className="text-xs font-semibold text-slate-800 block">{detalles.fecha}</span>
                    )}
                    {(detalles.horaInicio || detalles.horaFin) && (
                      <span className="text-[11px] text-emerald-600 font-bold block mt-0.5">
                        {detalles.horaInicio} {detalles.horaInicio && detalles.horaFin ? '-' : ''} {detalles.horaFin}
                      </span>
                    )}
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
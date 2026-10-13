import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  cupo_total?: number;
  cupo_ocupado?: number;
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
}

export const BuscarTutorias: React.FC = () => {
  const [bloques, setBloques] = useState<BloqueBackend[]>([]);
  const [loading, setLoading] = useState(true);
  const [misReservas, setMisReservas] = useState<TutoriaReservada[]>([]);

  // Filtros seleccionados
  const [selectedTutor, setSelectedTutor] = useState<string>('todos');
  const [selectedMateria, setSelectedMateria] = useState<string>('todas');
  const [selectedModalidad, setSelectedModalidad] = useState<string>('todas');

  // Estado del Modal
  const [selectedBloqueForModal, setSelectedBloqueForModal] = useState<BloqueBackend | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [reserving, setReserving] = useState(false);

  // Carga de disponibilidades para refresco después de reservar
  const fetchBloques = async () => {
    try {
      const response = await api.get<BloqueBackend[]>('/disponibilidades/');
      setBloques(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error al recargar horarios disponibles:', error);
      setBloques([]);
    }
  };

  // Carga inicial al montar el componente (sin actualizaciones síncronas de estado)
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const response = await api.get<BloqueBackend[]>('/disponibilidades/');
        if (isMounted) {
          setBloques(Array.isArray(response.data) ? response.data : []);
        }
      } catch (error) {
        console.error('Error al cargar horarios disponibles:', error);
        if (isMounted) setBloques([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Helpers para extraer nombres limpios
  const getTutorName = (b: BloqueBackend): string => {
    if (b.docente_nombre) return b.docente_nombre;
    if (typeof b.docente === 'object' && b.docente !== null) {
      const full = `${b.docente.first_name || ''} ${b.docente.last_name || ''}`.trim();
      return full || b.docente.nombre || b.docente.email || 'Docente Tutor';
    }
    return 'Docente Tutor';
  };

  const getMateriaName = (b: BloqueBackend): string => {
    if (typeof b.materia === 'string') return b.materia;
    if (typeof b.materia === 'object' && b.materia?.nombre) return b.materia.nombre;
    return 'Tutoría General';
  };

  // --- OBTENER OPCIONES DE FILTROS ÚNICAS (SIN DUPLICADOS) ---
  const tutorOptions = useMemo(() => {
    const setNames = new Set<string>();
    bloques.forEach((b) => {
      const name = getTutorName(b);
      if (name) setNames.add(name);
    });
    return Array.from(setNames).sort();
  }, [bloques]);

  const materiaOptions = useMemo(() => {
    const setMaterias = new Set<string>();
    bloques.forEach((b) => {
      const mat = getMateriaName(b);
      if (mat) setMaterias.add(mat);
    });
    return Array.from(setMaterias).sort();
  }, [bloques]);

  // --- FILTRADO DE BLOQUES ---
  const filteredBloques = useMemo(() => {
    return bloques.filter((b) => {
      // Solo mostrar disponibles
      if (b.estado !== 'DISPONIBLE' && b.estado !== 'Libre') return false;

      const tutorName = getTutorName(b);
      const materiaName = getMateriaName(b);

      if (selectedTutor !== 'todos' && tutorName !== selectedTutor) return false;
      if (selectedMateria !== 'todas' && materiaName !== selectedMateria) return false;
      if (selectedModalidad !== 'todas' && b.modalidad.toLowerCase() !== selectedModalidad.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [bloques, selectedTutor, selectedMateria, selectedModalidad]);

  // Manejador para abrir confirmación
  const handleOpenConfirm = (bloque: BloqueBackend) => {
    setSelectedBloqueForModal(bloque);
    setShowConfirmModal(true);
  };

  // Manejador para ejecutar la reserva con el endpoint /tutorias/reservar/
  const handleConfirmReserva = async () => {
    if (!selectedBloqueForModal) return;
    setReserving(true);
    try {
      // Petición POST a la URL real del backend para reservar
      await api.post('/tutorias/reservar/', {
        disponibilidad: selectedBloqueForModal.id,
        bloque: selectedBloqueForModal.id,
        bloque_id: selectedBloqueForModal.id,
      });

      // Agregar a reservas locales del usuario
      const nuevaReserva: TutoriaReservada = {
        id: selectedBloqueForModal.id,
        fecha: selectedBloqueForModal.fecha,
        hora_inicio: selectedBloqueForModal.hora_inicio,
        hora_fin: selectedBloqueForModal.hora_fin,
        materia: getMateriaName(selectedBloqueForModal),
        tutor_nombre: getTutorName(selectedBloqueForModal),
        modalidad: selectedBloqueForModal.modalidad,
      };

      setMisReservas((prev) => [nuevaReserva, ...prev]);
      setShowConfirmModal(false);
      setShowSuccessModal(true);
      await fetchBloques(); // Recargar lista de horarios disponibles
    } catch (error: unknown) {
      console.error('Error al reservar tutoría:', error);
      let errorMsg = 'Ocurrió un error al procesar la reserva. Inténtalo de nuevo.';
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const res = (error as { response?: { data?: Record<string, unknown> | string } }).response;
        if (res?.data) {
          if (typeof res.data === 'string') {
            errorMsg = res.data;
          } else if (typeof res.data === 'object') {
            errorMsg =
              (res.data.detail as string) ||
              (res.data.error as string) ||
              (Array.isArray(res.data.non_field_errors) ? (res.data.non_field_errors[0] as string) : errorMsg);
          }
        }
      }
      alert(errorMsg);
    } finally {
      setReserving(false);
    }
  };

  return (
    <div className="p-6 md:p-10 bg-[#f7f5ed] min-h-screen font-body text-slate-800 space-y-6">
      {/* BREADCRUMB */}
      <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
        <div>
          <span>Tutorías</span> <span className="mx-1">/</span>{' '}
          <span className="text-slate-800">Consultar horarios disponibles</span>
        </div>
        <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[11px] text-slate-600 shadow-sm font-medium">
          Estudiante
        </span>
      </div>

      {/* TÍTULO PRINCIPAL */}
      <div>
        <h1 className="font-display italic text-3xl md:text-4xl font-semibold text-[#0d1b2a] mb-1">
          Consultar horarios disponibles
        </h1>
        <p className="text-xs md:text-sm text-slate-500">
          Elige un horario disponible y resérvalo al instante, sin escribirle al tutor.
        </p>
      </div>

      {/* CONTENEDOR DE FILTROS */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* FILTRO TUTOR */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tutor</label>
            <select
              value={selectedTutor}
              onChange={(e) => setSelectedTutor(e.target.value)}
              className="w-full h-11 px-3.5 text-xs bg-[#f8fafc] border border-slate-300 rounded-xl outline-none focus:border-[#0d1b2a] focus:ring-2 focus:ring-[#0d1b2a]/10 font-medium transition-all"
            >
              <option value="todos">Todos los tutores</option>
              {tutorOptions.map((tut, i) => (
                <option key={i} value={tut}>
                  {tut}
                </option>
              ))}
            </select>
          </div>

          {/* FILTRO MATERIA */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Materia</label>
            <select
              value={selectedMateria}
              onChange={(e) => setSelectedMateria(e.target.value)}
              className="w-full h-11 px-3.5 text-xs bg-[#f8fafc] border border-slate-300 rounded-xl outline-none focus:border-[#0d1b2a] focus:ring-2 focus:ring-[#0d1b2a]/10 font-medium transition-all"
            >
              <option value="todas">Todas las materias</option>
              {materiaOptions.map((mat, i) => (
                <option key={i} value={mat}>
                  {mat}
                </option>
              ))}
            </select>
          </div>

          {/* FILTRO MODALIDAD */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Modalidad</label>
            <select
              value={selectedModalidad}
              onChange={(e) => setSelectedModalidad(e.target.value)}
              className="w-full h-11 px-3.5 text-xs bg-[#f8fafc] border border-slate-300 rounded-xl outline-none focus:border-[#0d1b2a] focus:ring-2 focus:ring-[#0d1b2a]/10 font-medium transition-all"
            >
              <option value="todas">Todas</option>
              <option value="virtual">Virtual</option>
              <option value="presencial">Presencial</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end text-[11px] text-slate-400 font-medium pt-1">
          {filteredBloques.length} horarios disponibles
        </div>
      </div>

      {/* GRILLA DE HORARIOS DISPONIBLES */}
      <div className="space-y-3">
        <h3 className="font-display text-lg font-bold text-slate-800">Horarios disponibles</h3>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200/80">
            Cargando horarios disponibles...
          </div>
        ) : filteredBloques.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200/80">
            No se encontraron horarios disponibles con los filtros seleccionados.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBloques.map((bloque) => {
              const tutorName = getTutorName(bloque);
              const materiaName = getMateriaName(bloque);
              const isVirtual = bloque.modalidad?.toLowerCase() === 'virtual';

              return (
                <motion.div
                  key={bloque.id}
                  whileHover={{ y: -2 }}
                  className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">{tutorName}</h4>
                      <p className="text-xs text-slate-500">Tutor de materia</p>

                      {/* BADGES */}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                          {materiaName}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isVirtual ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {bloque.modalidad}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-700 block">{bloque.fecha}</span>
                      <span className="text-xs font-bold text-slate-900 block mt-0.5">
                        {bloque.hora_inicio.substring(0, 5)} - {bloque.hora_fin.substring(0, 5)}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-1">
                        {isVirtual ? 'Enlace enviado al confirmar' : bloque.lugar || 'Bloque / Salón por definir'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenConfirm(bloque)}
                    className="w-full py-2.5 bg-[#111a2e] hover:bg-[#1b2a3a] text-white font-semibold text-xs rounded-xl shadow transition-colors cursor-pointer"
                  >
                    Reservar
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* MIS PRÓXIMAS TUTORÍAS */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="font-display text-lg font-bold text-slate-800">Mis próximas tutorías</h3>

        {misReservas.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">Aún no tienes tutorías reservadas.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {misReservas.map((item, idx) => (
              <div key={idx} className="py-3 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">{item.materia}</span>
                  <span className="text-slate-500">Tutor: {item.tutor_nombre}</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-slate-700 block">{item.fecha}</span>
                  <span className="text-emerald-600 font-bold">
                    {item.hora_inicio.substring(0, 5)} - {item.hora_fin.substring(0, 5)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- MODAL 1: CONFIRMAR RESERVA --- */}
      <AnimatePresence>
        {showConfirmModal && selectedBloqueForModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-100 font-body text-slate-800"
            >
              <h3 className="font-display text-2xl font-bold text-[#0d1b2a] mb-1">Confirmar reserva</h3>
              <p className="text-xs text-slate-500 mb-6">Revisa los detalles antes de confirmar tu tutoría.</p>

              <div className="bg-[#f8fafc] border border-slate-200/80 rounded-2xl p-4 space-y-3 text-xs mb-6">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Tutor:</span>
                  <span className="font-bold text-slate-800">{getTutorName(selectedBloqueForModal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Materia:</span>
                  <span className="font-bold text-slate-800">{getMateriaName(selectedBloqueForModal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Horario:</span>
                  <span className="font-bold text-slate-800">
                    {selectedBloqueForModal.fecha}, {selectedBloqueForModal.hora_inicio.substring(0, 5)} -{' '}
                    {selectedBloqueForModal.hora_fin.substring(0, 5)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Modalidad:</span>
                  <span className="font-bold text-slate-800">{selectedBloqueForModal.modalidad}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="py-3 px-4 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={reserving}
                  onClick={handleConfirmReserva}
                  className="py-3 px-4 bg-[#111a2e] hover:bg-[#1b2a3a] text-white text-xs font-semibold rounded-xl shadow transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {reserving ? 'Procesando...' : 'Confirmar reserva'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MODAL 2: ÉXITO RESERVA --- */}
      <AnimatePresence>
        {showSuccessModal && selectedBloqueForModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-100 font-body text-slate-800 text-center"
            >
              <h3 className="font-display text-2xl font-bold text-[#0d1b2a] mb-1">¡Tutoría reservada!</h3>
              <p className="text-xs text-slate-500 mb-6">Ya quedó registrada en tus tutorías programadas.</p>

              <div className="bg-[#f0f9ff] border border-sky-200 text-sky-900 rounded-2xl p-4 text-xs mb-6 leading-relaxed flex items-center gap-3 text-left">
                <i className="fa-solid fa-envelope text-lg text-sky-600 shrink-0"></i>
                <span>
                  Enviamos una notificación por correo a <strong>{getTutorName(selectedBloqueForModal)}</strong> y a
                  ti, confirmando los detalles.
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-3.5 bg-[#111a2e] hover:bg-[#1b2a3a] text-white text-xs font-semibold rounded-xl shadow transition-colors cursor-pointer"
              >
                Entendido
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
import React, { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../api/axios';

export interface BloqueBackend {
  id: number | string;
  docente?: number | string | { id?: number | string; nombre?: string; email?: string; first_name?: string; last_name?: string; username?: string } | null;
  materia?: string | { id?: number | string; nombre?: string; codigo?: string } | null;
  fecha?: string;
  hora_inicio?: string;
  hora_fin?: string;
  modalidad?: string;
  lugar?: string;
  enlace_virtual?: string;
  docente_nombre?: string;
  tutorNombre?: string;
  estado?: string;
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

interface ApiErrorResponse {
  response?: {
    data?: {
      detail?: string;
      non_field_errors?: string[];
    };
  };
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

export const BuscarTutorias: React.FC = () => {
  const { user } = useAuthStore();

  const [bloques, setBloques] = useState<BloqueBackend[]>([]);
  const [misTutorias, setMisTutorias] = useState<TutoriaBackend[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filtros
  const [selectedTutor, setSelectedTutor] = useState<string>('todos');
  const [selectedMateria, setSelectedMateria] = useState<string>('todas');
  const [selectedModalidad, setSelectedModalidad] = useState<string>('todas');

  // Estado del Modal de Reserva
  const [selectedBloque, setSelectedBloque] = useState<BloqueBackend | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [temaTutoria, setTemaTutoria] = useState<string>('');
  const [descripcionTutoria, setDescripcionTutoria] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const refrescarDatos = async () => {
    try {
      const resBloques = await api.get('/disponibilidad/disponibilidad/').catch(() => null);
      if (resBloques && resBloques.data) {
        const raw = Array.isArray(resBloques.data)
          ? resBloques.data
          : resBloques.data.results || [];
        setBloques(raw);
      }

      const resTutorias = await api.get('/tutorias/tutorias/').catch(() => null);
      if (resTutorias && resTutorias.data) {
        const raw = Array.isArray(resTutorias.data)
          ? resTutorias.data
          : resTutorias.data.results || [];
        setMisTutorias(raw);
      }
    } catch (err) {
      console.error('Error al refrescar datos:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const cargarDatosIniciales = async () => {
      try {
        const resBloques = await api.get('/disponibilidad/disponibilidad/').catch(() => null);
        if (resBloques && resBloques.data && isMounted) {
          const raw = Array.isArray(resBloques.data)
            ? resBloques.data
            : resBloques.data.results || [];
          setBloques(raw);
        }

        const resTutorias = await api.get('/tutorias/tutorias/').catch(() => null);
        if (resTutorias && resTutorias.data && isMounted) {
          const raw = Array.isArray(resTutorias.data)
            ? resTutorias.data
            : resTutorias.data.results || [];
          setMisTutorias(raw);
        }
      } catch (err) {
        console.error('Error al cargar datos iniciales:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    cargarDatosIniciales();

    return () => {
      isMounted = false;
    };
  }, []);

  const idsBloquesReservados = useMemo(() => {
    const setIds = new Set<string>();
    misTutorias.forEach((tut) => {
      if (tut.bloque) {
        if (typeof tut.bloque === 'object' && tut.bloque !== null && tut.bloque.id) {
          setIds.add(String(tut.bloque.id));
        } else if (typeof tut.bloque === 'number' || typeof tut.bloque === 'string') {
          setIds.add(String(tut.bloque));
        }
      }
    });
    return setIds;
  }, [misTutorias]);

  const listaTutores = useMemo(() => {
    const setNombres = new Set<string>();
    bloques.forEach((b) => {
      const nombre = obtenerNombreDocente(b);
      if (nombre) setNombres.add(nombre);
    });
    return Array.from(setNombres);
  }, [bloques]);

  const listaMaterias = useMemo(() => {
    const setMaterias = new Set<string>();
    bloques.forEach((b) => {
      const { nombre } = extraerInfoMateriaCompleta(b);
      if (nombre) setMaterias.add(nombre);
    });
    return Array.from(setMaterias);
  }, [bloques]);

  const listaModalidades = useMemo(() => {
    const setModalidades = new Set<string>();
    bloques.forEach((b) => {
      if (b.modalidad) {
        const modClean = b.modalidad.trim();
        if (modClean) {
          const formateada = modClean.charAt(0).toUpperCase() + modClean.slice(1).toLowerCase();
          setModalidades.add(formateada);
        }
      }
    });
    return Array.from(setModalidades);
  }, [bloques]);

  const bloquesFiltrados = useMemo(() => {
    return bloques.filter((b) => {
      const estadoUpper = (b.estado || '').toUpperCase();
      if (estadoUpper === 'RESERVADO' || estadoUpper === 'RESERVADA' || estadoUpper === 'COMPLETO') {
        return false;
      }

      if (idsBloquesReservados.has(String(b.id))) {
        return false;
      }

      const docenteNombre = obtenerNombreDocente(b);
      const { nombre: materiaNombre } = extraerInfoMateriaCompleta(b);

      const matchTutor = selectedTutor === 'todos' || docenteNombre === selectedTutor;
      const matchMateria = selectedMateria === 'todas' || materiaNombre === selectedMateria;
      const matchModalidad = selectedModalidad === 'todas' || (b.modalidad && b.modalidad.toLowerCase() === selectedModalidad.toLowerCase());

      return matchTutor && matchMateria && matchModalidad;
    });
  }, [bloques, selectedTutor, selectedMateria, selectedModalidad, idsBloquesReservados]);

  const misTutoriasProximas = useMemo(() => {
    const todayISO = new Date().toISOString().split('T')[0];
    return misTutorias.filter((tut) => {
      const detalles = obtenerDetallesTutoria(tut, bloques);
      const fechaTutoria = detalles.fecha || tut.fecha || '';
      if (!fechaTutoria) return true;
      return fechaTutoria >= todayISO;
    });
  }, [misTutorias, bloques]);

  const handleOpenReservaModal = (bloque: BloqueBackend) => {
    setSelectedBloque(bloque);
    setTemaTutoria('');
    setDescripcionTutoria('');
    setFeedbackMsg(null);
    setModalOpen(true);
  };

  const handleConfirmReserva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBloque) return;

    setSubmitting(true);
    setFeedbackMsg(null);

    const payload = {
      bloque_id: Number(selectedBloque.id),
      tema: temaTutoria.trim(),
      descripcion: descripcionTutoria.trim(),
    };

    try {
      await api.post('/tutorias/tutorias/', payload);

      setFeedbackMsg({
        type: 'success',
        text: '¡Tutoría reservada exitosamente!',
      });

      setTimeout(async () => {
        setModalOpen(false);
        await refrescarDatos();
      }, 1200);
    } catch (err) {
      console.error('Error al reservar tutoría:', err);
      const apiErr = err as ApiErrorResponse;
      const errMsg = apiErr.response?.data?.detail 
        || apiErr.response?.data?.non_field_errors?.[0]
        || 'Ocurrió un error al procesar la reserva.';
      setFeedbackMsg({
        type: 'error',
        text: errMsg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const userExtended = user as UserExtended | null;
  const usuarioNombre = userExtended?.nombre 
    || `${userExtended?.first_name || ''} ${userExtended?.last_name || ''}`.trim() 
    || userExtended?.username 
    || userExtended?.email 
    || '';

  return (
    <div className="w-full min-h-screen bg-[#f8f6f0] text-[#0f172a] font-sans flex flex-col overflow-y-auto">
      {/* HEADER SUPERIOR */}
      <header className="h-14 px-6 sm:px-8 flex items-center justify-between border-b border-slate-200/80 bg-[#f8f6f0] sticky top-0 z-10">
        <div className="text-xs text-slate-500 font-medium">
          Tutorías <span className="mx-1">/</span> <span className="text-slate-800 font-semibold">Consultar horarios disponibles</span>
        </div>

        {usuarioNombre && (
          <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-slate-200 shadow-xs text-xs font-semibold text-slate-700">
            <span>{usuarioNombre}</span>
          </div>
        )}
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <div className="p-6 sm:p-8 w-full max-w-7xl mx-auto space-y-8 flex-1">
        <div>
          <h1 className="font-serif italic text-3xl font-bold text-slate-900 tracking-tight">
            Consultar horarios disponibles
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Elige un horario disponible y resérvalo al instante.
          </p>
        </div>

        {/* TARJETA DE FILTROS */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Tutor
              </label>
              <select
                value={selectedTutor}
                onChange={(e) => setSelectedTutor(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all cursor-pointer"
              >
                <option value="todos">Todos los tutores</option>
                {listaTutores.map((nombre, i) => (
                  <option key={i} value={nombre}>
                    {nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Materia
              </label>
              <select
                value={selectedMateria}
                onChange={(e) => setSelectedMateria(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all cursor-pointer"
              >
                <option value="todas">Todas las materias</option>
                {listaMaterias.map((mat, i) => (
                  <option key={i} value={mat}>
                    {mat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Modalidad
              </label>
              <select
                value={selectedModalidad}
                onChange={(e) => setSelectedModalidad(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all cursor-pointer"
              >
                <option value="todas">Todas</option>
                {listaModalidades.map((mod, i) => (
                  <option key={i} value={mod.toLowerCase()}>
                    {mod}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
            <span className="text-[11px] font-medium text-slate-400">
              {bloquesFiltrados.length} horario{bloquesFiltrados.length === 1 ? '' : 's'} disponible{bloquesFiltrados.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* HORARIOS DISPONIBLES */}
        <section className="space-y-4">
          <h2 className="font-serif font-bold text-lg text-slate-900">
            Horarios disponibles
          </h2>

          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs font-medium">
              Cargando horarios de tutorías...
            </div>
          ) : bloquesFiltrados.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs font-medium">
              No se encontraron horarios disponibles con los filtros seleccionados.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {bloquesFiltrados.map((bloque) => {
                const docNombre = obtenerNombreDocente(bloque);
                const { nombre: materiaNombre, codigo: materiaCodigo } = extraerInfoMateriaCompleta(bloque);
                const esVirtual = bloque.modalidad?.toUpperCase() === 'VIRTUAL';

                return (
                  <div
                    key={bloque.id}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          {docNombre && <h3 className="font-bold text-sm text-slate-900">{docNombre}</h3>}
                        </div>
                        <div className="text-right">
                          {bloque.fecha && <span className="block text-xs font-semibold text-slate-800">{bloque.fecha}</span>}
                          {(bloque.hora_inicio || bloque.hora_fin) && (
                            <span className="block text-xs font-bold text-slate-900 mt-0.5">
                              {bloque.hora_inicio} {bloque.hora_inicio && bloque.hora_fin ? '-' : ''} {bloque.hora_fin}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-4 flex-wrap">
                        {materiaNombre && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100/80 text-amber-900 border border-amber-200/60 uppercase">
                            {materiaCodigo ? `${materiaCodigo} — ` : ''}{materiaNombre}
                          </span>
                        )}
                        {bloque.modalidad && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${esVirtual ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-blue-100 text-blue-800 border border-blue-200'}`}>
                            {bloque.modalidad}
                          </span>
                        )}
                      </div>

                      {esVirtual ? (
                        bloque.enlace_virtual && (
                          <p className="text-[10px] text-slate-500 mt-2 font-medium truncate">
                            {bloque.enlace_virtual}
                          </p>
                        )
                      ) : (
                        bloque.lugar && (
                          <p className="text-[10px] text-slate-500 mt-2 font-medium">
                            {bloque.lugar}
                          </p>
                        )
                      )}
                    </div>

                    <button
                      onClick={() => handleOpenReservaModal(bloque)}
                      className="w-full mt-5 py-2.5 rounded-lg bg-[#0d182e] hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer text-center"
                    >
                      Reservar
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* MIS PRÓXIMAS TUTORÍAS */}
        <section className="space-y-4 pt-4 border-t border-slate-200/80">
          <h2 className="font-serif font-bold text-lg text-slate-900">
            Mis próximas tutorías
          </h2>

          {misTutoriasProximas.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200/90 p-8 text-center text-xs text-slate-400 font-medium">
              Aún no tienes tutorías próximas reservadas.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {misTutoriasProximas.map((tut) => {
                const detalles = obtenerDetallesTutoria(tut, bloques);
                const esVirtual = detalles.modalidad?.toUpperCase() === 'VIRTUAL';

                return (
                  <div
                    key={tut.id}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          {detalles.docenteNombre && (
                            <h3 className="font-bold text-sm text-slate-900">{detalles.docenteNombre}</h3>
                          )}
                        </div>
                        <div className="text-right">
                          {detalles.fecha && (
                            <span className="block text-xs font-semibold text-slate-800">{detalles.fecha}</span>
                          )}
                          {(detalles.horaInicio || detalles.horaFin) && (
                            <span className="block text-xs font-bold text-slate-900 mt-0.5">
                              {detalles.horaInicio} {detalles.horaInicio && detalles.horaFin ? '-' : ''} {detalles.horaFin}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {detalles.materiaNombre && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100/80 text-amber-900 border border-amber-200/60 uppercase">
                            {detalles.materiaCodigo ? `${detalles.materiaCodigo} — ` : ''}{detalles.materiaNombre}
                          </span>
                        )}
                        {detalles.modalidad && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${esVirtual ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-blue-100 text-blue-800 border border-blue-200'}`}>
                            {detalles.modalidad}
                          </span>
                        )}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-emerald-600 text-white shadow-xs">
                          {tut.estado || 'RESERVADA'}
                        </span>
                      </div>

                      {esVirtual ? (
                        detalles.enlaceVirtual && (
                          <p className="text-[10px] text-slate-500 mt-2 font-medium truncate">
                            {detalles.enlaceVirtual}
                          </p>
                        )
                      ) : (
                        detalles.lugar && (
                          <p className="text-[10px] text-slate-500 mt-2 font-medium">
                            {detalles.lugar}
                          </p>
                        )
                      )}

                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-1">
                        {tut.tema && (
                          <p className="text-xs font-bold text-slate-800">
                            <span className="text-slate-400 font-normal">Tema: </span>{tut.tema}
                          </p>
                        )}
                        {tut.descripcion && (
                          <p className="text-[11px] text-slate-600 font-medium">
                            <span className="text-slate-400 font-normal">Descripción: </span>{tut.descripcion}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* MODAL DE CONFIRMACIÓN */}
      {modalOpen && selectedBloque && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <h3 className="font-serif font-bold text-xl text-slate-900 mb-1">
              Confirmar Reserva
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Completa la información sobre tu consulta para agendar la tutoría.
            </p>

            {feedbackMsg && (
              <div
                className={`mb-4 p-3 rounded-lg text-xs font-medium ${
                  feedbackMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {feedbackMsg.text}
              </div>
            )}

            <form onSubmit={handleConfirmReserva} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tema o Asunto
                </label>
                <input
                  type="text"
                  required
                  placeholder="Escribe el tema de tu consulta"
                  value={temaTutoria}
                  onChange={(e) => setTemaTutoria(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descripción adicional (Opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Detalla un poco más tus dudas para el docente..."
                  value={descripcionTutoria}
                  onChange={(e) => setDescripcionTutoria(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-[#0d182e] hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting ? 'Reservando...' : 'Confirmar Reserva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
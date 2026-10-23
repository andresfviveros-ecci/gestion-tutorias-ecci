import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useTutorStore } from '../../store/useTutorStore';
import { api } from '../../api/axios';

interface TutorBackend {
  id?: string | number;
  username?: string;
  first_name?: string;
  last_name?: string;
  nombre?: string;
  nombres?: string;
  apellidos?: string;
  email?: string;
  correo?: string;
  documento?: string;
  telefono?: string;
}

interface TutorStoreInterface {
  tutores?: TutorBackend[];
  fetchTutores?: () => Promise<void>;
}

export interface BloqueBackend {
  id: number | string;
  docente?: number | string | { id?: number | string; nombre?: string; email?: string; first_name?: string; last_name?: string; username?: string } | null;
  docente_nombre?: string;
  docente_email?: string;
  materia?: string | number | { id?: number | string; nombre?: string; codigo?: string } | null;
  materia_nombre?: string;
  fecha?: string;
  hora_inicio?: string;
  hora_fin?: string;
  modalidad?: string;
  lugar?: string;
  enlace_virtual?: string;
  tutorNombre?: string;
  estado?: string;
}

interface TutorFormatted {
  id: string | number;
  name: string;
  email: string;
  area: string;
  desc: string;
  tag: string;
  bg: string;
}

// Obtener la fecha de hoy en formato YYYY-MM-DD
const getTodayISO = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatearFechaLarga = (fechaStr?: string): string => {
  if (!fechaStr) return '';
  const partes = fechaStr.split('-');
  if (partes.length === 3) {
    const year = partes[0];
    const monthIdx = parseInt(partes[1], 10) - 1;
    const day = parseInt(partes[2], 10);
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${meses[monthIdx]} ${day} del ${year}`;
  }
  return fechaStr;
};

const obtenerIniciales = (nombreCompleto: string): string => {
  if (!nombreCompleto) return 'DT';
  const partes = nombreCompleto.trim().split(' ').filter(Boolean);
  if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
  return 'DT';
};

export const StudentHome: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const tutorStore = useTutorStore() as unknown as TutorStoreInterface;
  const tutoresStore = tutorStore.tutores || [];
  const fetchTutores = tutorStore.fetchTutores;

  const [tutoresApi, setTutoresApi] = useState<TutorBackend[]>([]);
  const [bloques, setBloques] = useState<BloqueBackend[]>([]);
  const [loading, setLoading] = useState(true);
  const [typedTitle, setTypedTitle] = useState('');

  const phrases = ['Asesoría Docente.', 'Tutorías Libres.', 'Espacio Estudiantil.'];
  const typewriterRef = useRef({ phraseIdx: 0, charIdx: 0, isDeleting: false });

  const todayISO = getTodayISO();
  const fechaEscritaTexto = formatearFechaLarga(todayISO);

  // Cargar datos
  useEffect(() => {
    let isMounted = true;

    const cargarDatos = async () => {
      try {
        if (typeof fetchTutores === 'function') {
          await fetchTutores().catch(() => null);
        }

        const resTutores = await api.get('/accounts/tutores/').catch(() => null);
        if (resTutores && resTutores.data && isMounted) {
          const rawTutores = Array.isArray(resTutores.data)
            ? resTutores.data
            : (resTutores.data as { results?: TutorBackend[] }).results || [];
          setTutoresApi(rawTutores);
        }

        const resBloques = await api.get('/disponibilidad/disponibilidad/').catch(() => null);
        if (resBloques && resBloques.data && isMounted) {
          const rawBloques = Array.isArray(resBloques.data)
            ? (resBloques.data as BloqueBackend[])
            : (resBloques.data as { results?: BloqueBackend[] }).results || [];
          setBloques(rawBloques);
        }
      } catch (err) {
        console.error('Error al cargar datos en StudentHome:', err);
      } finally {
        if (isMounted) {
          setTimeout(() => {
            if (isMounted) setLoading(false);
          }, 300);
        }
      }
    };

    cargarDatos();

    return () => {
      isMounted = false;
    };
  }, [fetchTutores]);

  // Efecto máquina de escribir
  useEffect(() => {
    const interval = setInterval(() => {
      const state = typewriterRef.current;
      const currentPhrase = phrases[state.phraseIdx];

      if (state.isDeleting) {
        setTypedTitle(currentPhrase.substring(0, state.charIdx - 1));
        state.charIdx--;
      } else {
        setTypedTitle(currentPhrase.substring(0, state.charIdx + 1));
        state.charIdx++;
      }

      if (!state.isDeleting && state.charIdx === currentPhrase.length) {
        setTimeout(() => {
          state.isDeleting = true;
        }, 1800);
      } else if (state.isDeleting && state.charIdx === 0) {
        state.isDeleting = false;
        state.phraseIdx = (state.phraseIdx + 1) % phrases.length;
      }
    }, 80);

    return () => clearInterval(interval);
  }, []);

  const listaTutoresCombinada = useMemo(() => {
    if (tutoresStore && tutoresStore.length > 0) return tutoresStore;
    return tutoresApi;
  }, [tutoresStore, tutoresApi]);

  // Mapa de resolución por ID
  const tutoresMap = useMemo(() => {
    const map = new Map<string, { name: string; email: string }>();
    listaTutoresCombinada.forEach((t) => {
      const nom = `${t.first_name || t.nombres || ''} ${t.last_name || t.apellidos || ''}`.trim();
      const fullName = nom || t.nombre || t.username || 'Docente';
      const email = t.email || t.correo || '';
      if (t.id !== undefined) {
        map.set(String(t.id), { name: fullName, email });
      }
      map.set(fullName, { name: fullName, email });
    });
    return map;
  }, [listaTutoresCombinada]);

  // Función para resolver nombre del docente
  const resolverNombreDocente = (b: BloqueBackend): string => {
    if (b.docente_nombre) return b.docente_nombre;
    if (b.tutorNombre) return b.tutorNombre;
    if (typeof b.docente === 'object' && b.docente !== null) {
      const full = `${b.docente.first_name || ''} ${b.docente.last_name || ''}`.trim();
      if (full) return full;
      if (b.docente.nombre) return b.docente.nombre;
      if (b.docente.username) return b.docente.username;
    }
    if (typeof b.docente === 'number' || typeof b.docente === 'string') {
      const found = tutoresMap.get(String(b.docente));
      if (found) return found.name;
    }
    return '';
  };

  // Función para resolver nombre de la materia
  const resolverNombreMateria = (b: BloqueBackend): string => {
    if (b.materia_nombre) return b.materia_nombre;
    if (typeof b.materia === 'string') {
      return b.materia.includes('—') ? b.materia.split('—')[1].trim() : b.materia;
    }
    if (typeof b.materia === 'object' && b.materia !== null && b.materia.nombre) {
      return b.materia.nombre;
    }
    return 'Tutoría Académica';
  };

  // Formatear datos de tutores para las tarjetas
  const tutoresList = useMemo<TutorFormatted[]>(() => {
    const mapTutores = new Map<string, TutorFormatted>();

    if (listaTutoresCombinada && listaTutoresCombinada.length > 0) {
      listaTutoresCombinada.forEach((t, idx) => {
        const nom = `${t.first_name || t.nombres || ''} ${t.last_name || t.apellidos || ''}`.trim();
        const fullName = nom || t.nombre || t.username || 'Docente';
        const email = t.email || t.correo || `${(t.username || 'docente').toLowerCase()}@ecci.edu.co`;
        const tag = obtenerIniciales(fullName);

        mapTutores.set(fullName, {
          id: t.id ?? idx,
          name: fullName,
          email,
          area: 'Tutoría Académica',
          desc: 'Docente asignado para brindar acompañamiento y asesorías académicas.',
          tag,
          bg: 'bg-indigo-950 border-indigo-500/50 text-indigo-300',
        });
      });
    }

    if (bloques && bloques.length > 0) {
      bloques.forEach((b) => {
        const name = resolverNombreDocente(b);
        if (name && !mapTutores.has(name)) {
          const email = b.docente_email || (typeof b.docente === 'object' && b.docente?.email) || 'docente@ecci.edu.co';
          const materia = resolverNombreMateria(b);
          const tag = obtenerIniciales(name);

          mapTutores.set(name, {
            id: b.id,
            name,
            email,
            area: materia,
            desc: `Atención y acompañamiento académico en ${materia}.`,
            tag,
            bg: 'bg-indigo-950 border-indigo-500/50 text-indigo-300',
          });
        }
      });
    }

    return Array.from(mapTutores.values());
  }, [listaTutoresCombinada, bloques, tutoresMap]);

  // SOLO DISPONIBILIDADES LIBRES DE HOY
  const disponibilidadesLibresHoy = useMemo(() => {
    return bloques.filter((b) => {
      if (!b.fecha) return false;
      const fechaBloque = b.fecha.split('T')[0];
      if (fechaBloque !== todayISO) return false;

      const estadoUpper = (b.estado || '').toUpperCase();
      const esLibre = estadoUpper === 'DISPONIBLE' || estadoUpper === 'LIBRE' || estadoUpper === '';
      return esLibre;
    });
  }, [bloques, todayISO]);

  const handleVerDetalles = () => {
    navigate('/estudiante/dashboard');
  };

  const handleBuscarTutorias = () => {
    navigate('/estudiante/buscar-tutorias');
  };

  const handleVerDisponibilidadTutor = (tutorNombre: string) => {
    navigate('/estudiante/buscar-tutorias', { state: { tutorNombre } });
  };

  return (
    <div className="h-screen w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth bg-[var(--paper)] text-[var(--ink)] selection:bg-emerald-800 selection:text-white relative">
      {/* LOADER PANTALLA COMPLETA */}
      {loading && (
        <div className="loader-overlay" id="loaderOverlay">
          <svg className="loader-logo" viewBox="0 0 340 80">
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="loader-text">
              Aula Libre
            </text>
          </svg>
        </div>
      )}

      {/* NAVBAR */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#0d1b2a]/90 backdrop-blur-md border-b border-slate-700/40 h-16 flex items-center shadow-lg transition-all">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 w-full flex items-center justify-between">
          <a href="#inicio" className="flex items-center gap-2 group">
            <span className="font-display italic text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-sm">
              Aula <span className="not-italic text-[var(--green-light)]">Libre</span>
            </span>
          </a>

          <div className="hidden md:flex items-center gap-6 lg:gap-8 text-xs font-semibold uppercase tracking-wider text-slate-200">
            <a href="#inicio" className="hover:text-[var(--green-light)] transition-colors">
              Inicio
            </a>
            <a href="#docentes" className="hover:text-[var(--green-light)] transition-colors">
              Docentes
            </a>

            <button
              type="button"
              onClick={handleVerDetalles}
              className="group inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors uppercase font-semibold text-xs tracking-wider cursor-pointer bg-transparent border-none p-0 focus:outline-none"
            >
              <span>Ver Detalles</span>
              <i className="fa-solid fa-arrow-right text-[11px] text-emerald-400 group-hover:translate-x-2 transition-transform duration-300 ease-out"></i>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/70 shadow-sm backdrop-blur-sm">
              <div className="w-6 h-6 rounded bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold text-xs flex items-center justify-center font-mono">
                {user?.nombre ? user.nombre.charAt(0).toUpperCase() : (user?.first_name ? user.first_name.charAt(0).toUpperCase() : 'E')}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[11px] sm:text-xs font-semibold text-slate-100 tracking-tight leading-none">
                  {user?.nombre || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Estudiante'}
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-xs bg-emerald-400"></span>
                  <span className="text-[8px] font-mono uppercase font-medium text-slate-400 leading-none">
                    Estudiante
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                logout();
                navigate('/', { replace: true, state: {} });
              }}
              className="px-2.5 sm:px-3.5 py-1.5 rounded-lg border border-slate-700/70 hover:border-rose-500/80 hover:bg-rose-500/10 hover:text-rose-400 text-slate-300 text-xs font-semibold transition-all flex items-center gap-1.5 bg-slate-900/40 cursor-pointer"
            >
              <i className="fa-solid fa-right-from-bracket text-xs"></i>
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </nav>
      </header>

      {/* SECCIÓN 1: INICIO Y DISPONIBILIDAD DE HOY */}
      <section id="inicio" className="snap-start snap-always min-h-screen lg:h-screen w-full pt-24 lg:pt-20 pb-8 bg-[var(--ink)] text-[var(--paper)] relative overflow-hidden flex items-center flex-shrink-0">
        <img
          src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1600&auto=format&fit=crop"
          alt="Campus Universitario"
          className="panel-left-bg"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10 w-full my-auto">
          <div className="lg:col-span-5 space-y-4 lg:space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[var(--green)]/20 border border-[var(--green)]/40 text-[var(--green-light)] text-[11px] font-semibold tracking-wide uppercase">
              Portal Estudiantil
            </div>

            <div className="title-wrapper !min-h-[4rem]">
              <h1 className="typed-title text-[var(--paper)] text-2xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                <span>{typedTitle}</span><span className="cursor">|</span>
              </h1>
            </div>

            <p className="text-slate-300 text-xs sm:text-sm lg:text-base font-light leading-relaxed">
              Monitoreo académico y agendamiento en tiempo real. Gestiona tus tutorías o reserva nuevos horarios de acompañamiento docente.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleVerDetalles}
                className="group px-5 py-2.5 sm:px-6 sm:py-3 rounded-lg bg-[var(--green)] text-white font-semibold text-xs tracking-wider uppercase hover:bg-emerald-600 transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <i className="fa-solid fa-chart-pie text-sm"></i>
                <span>Ver Detalles</span>
                <i className="fa-solid fa-arrow-right text-xs group-hover:translate-x-1 transition-transform duration-200"></i>
              </button>
              <button
                onClick={handleBuscarTutorias}
                className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-200 font-semibold text-xs tracking-wider uppercase transition-all cursor-pointer flex items-center gap-2"
              >
                <i className="fa-solid fa-magnifying-glass text-xs"></i> Buscar Tutorías
              </button>
            </div>
          </div>

          {/* CONSOLA BENTO DINÁMICA: LIBRES DE HOY */}
          <div className="lg:col-span-7">
            <div className="bento-console rounded-xl border border-slate-800 bg-slate-950/90 p-4 sm:p-6 shadow-2xl relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-4 mb-4 sm:mb-5 border-b border-slate-800/80 gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
                  </div>
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-[var(--green-light)] ml-2">
                    DISPONIBILIDAD DE HOY (LIBRES)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] sm:text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800 w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>{fechaEscritaTexto}</span>
                </div>
              </div>

              {disponibilidadesLibresHoy.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-mono">
                  No hay horarios de tutoría libres agendados para el día de hoy.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
                  {disponibilidadesLibresHoy.map((bloque) => {
                    const docNombre = resolverNombreDocente(bloque) || 'Docente Tutor';
                    const materia = resolverNombreMateria(bloque);
                    const hInicio = (bloque.hora_inicio || '').substring(0, 5);
                    const hFin = (bloque.hora_fin || '').substring(0, 5);
                    const esVirtual = (bloque.modalidad || '').toUpperCase() === 'VIRTUAL';

                    return (
                      <div
                        key={bloque.id}
                        onClick={() => handleVerDisponibilidadTutor(docNombre)}
                        className="bento-card group p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-[var(--green-light)] transition-all cursor-pointer relative overflow-hidden"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded border font-bold text-[10px] flex items-center justify-center bg-indigo-950 border-indigo-500/50 text-indigo-300">
                              {obtenerIniciales(docNombre)}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-white group-hover:text-[var(--green-light)] transition-colors truncate max-w-[140px]">
                                {docNombre}
                              </h4>
                              <p className="text-[10px] text-amber-400 font-semibold truncate max-w-[140px]">{materia}</p>
                            </div>
                          </div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${esVirtual ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-blue-950 text-blue-300 border border-blue-800'}`}>
                            {bloque.modalidad || 'Presencial'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px]">
                          <span className="text-slate-300 font-mono font-bold">
                            🕒 {hInicio} - {hFin}
                          </span>
                          <span className="font-mono text-[9px] uppercase font-bold text-emerald-400">
                            ● LIBRE
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>{disponibilidadesLibresHoy.length} Espacio{disponibilidadesLibresHoy.length === 1 ? '' : 's'} Libre{disponibilidadesLibresHoy.length === 1 ? '' : 's'} para hoy</span>
                <button
                  onClick={handleBuscarTutorias}
                  className="text-emerald-400 hover:underline cursor-pointer"
                >
                  Ver todos los horarios →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN 2: DOCENTES DISPONIBLES */}
      <section id="docentes" className="snap-start snap-always min-h-screen lg:h-screen w-full pt-20 pb-8 bg-[var(--paper)] text-[var(--ink)] flex flex-col justify-center flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full my-auto">
          <div className="text-center max-w-2xl mx-auto mb-6">
            <span className="text-[var(--green)] text-xs font-bold uppercase tracking-widest">Docentes Asignados</span>
            <h2 className="font-display italic text-2xl sm:text-3xl font-bold mt-0.5">Tutores disponibles</h2>
            <p className="text-slate-600 text-xs sm:text-sm mt-1">
              Consulta el perfil de los tutores y filtra sus horarios disponibles de atención.
            </p>
          </div>

          {tutoresList.length === 0 ? (
            <div className="bg-white rounded p-8 border border-slate-200 text-center max-w-md mx-auto shadow-sm">
              <p className="text-xs text-slate-500">No hay tutores registrados en este momento.</p>
            </div>
          ) : (
            <div className="flex lg:grid lg:grid-cols-4 gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory pb-4 pt-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
              {tutoresList.map((tutor, idx) => (
                <div
                  key={idx}
                  className="min-w-[260px] sm:min-w-[280px] lg:min-w-0 snap-center bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm hover:border-[var(--green)] transition-all flex flex-col justify-between flex-shrink-0"
                >
                  <div>
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded font-display italic text-lg sm:text-xl font-bold flex items-center justify-center mb-3 ${tutor.bg}`}>
                      {tutor.tag}
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {tutor.area}
                    </span>
                    <h3 className="font-display italic text-base sm:text-lg font-bold text-[var(--ink)] mt-2">{tutor.name}</h3>
                    <p className="text-xs text-emerald-700 font-mono font-medium mt-0.5">{tutor.email}</p>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{tutor.desc}</p>
                  </div>
                  <button
                    onClick={() => handleVerDisponibilidadTutor(tutor.name)}
                    className="w-full mt-4 sm:mt-5 py-2 rounded-lg bg-[var(--ink)] hover:bg-slate-800 text-white text-[11px] sm:text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Ver Disponibilidad</span>
                    <i className="fa-solid fa-arrow-right text-[10px]"></i>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
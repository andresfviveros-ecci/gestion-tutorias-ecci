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
  materia?: string | { id?: number | string; nombre?: string; codigo?: string } | null;
  materia_nombre?: string;
  fecha?: string;
  hora_inicio?: string;
  hora_fin?: string;
  modalidad?: string;
  lugar?: string;
  enlace_virtual?: string;
  tutorNombre?: string;
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

// Diccionario local en Frontend para traducir las IDs de los usuarios/docentes
const DOCENTES_MAP: Record<string | number, { name: string; email: string }> = {
  1: { name: 'Carlos Mendoza', email: 'doc1@ecci.edu.co' },
  2: { name: 'Juan Soto', email: 'kasda@ecci.edu.co' },
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

// Genera iniciales reales (Ej. "Carlos Mendoza" -> "CM", "Juan Soto" -> "JS")
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

  const todayISO = new Date().toISOString().split('T')[0];
  const fechaEscritaTexto = formatearFechaLarga(todayISO);

  // Cargar datos al ingresar
  useEffect(() => {
    let isMounted = true;

    const cargarDatos = async () => {
      try {
        if (typeof fetchTutores === 'function') {
          await fetchTutores().catch(() => null);
        }

        // 1. Intentar consultar tutores
        const resTutores = await api.get('/accounts/tutores/').catch(() => null);

        if (resTutores && resTutores.data && isMounted) {
          const rawTutores = Array.isArray(resTutores.data)
            ? resTutores.data
            : (resTutores.data as { results?: TutorBackend[] }).results || [];
          setTutoresApi(rawTutores);
        }

        // 2. Consultar bloques de disponibilidad
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

  // Formatear datos de tutores resolviendo nombres y correos
  const tutoresList = useMemo<TutorFormatted[]>(() => {
    const mapTutores = new Map<string, TutorFormatted>();

    // 1. Procesar cuentas si se pudieron obtener de /accounts/tutores/
    if (listaTutoresCombinada && listaTutoresCombinada.length > 0) {
      listaTutoresCombinada.forEach((t, idx) => {
        let fullName = `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.nombre || t.username || '';
        let email = t.email || t.correo || '';

        // Si el usuario es 'doc1' o ID 1
        if (!fullName || fullName === 'doc1') {
          const docInfo = DOCENTES_MAP[String(t.id || idx + 1)] || DOCENTES_MAP[1];
          fullName = docInfo.name;
          email = docInfo.email;
        }

        const tag = obtenerIniciales(fullName);

        mapTutores.set(fullName, {
          id: t.id ?? idx,
          name: fullName,
          email: email || `${(t.username || 'docente').toLowerCase()}@ecci.edu.co`,
          area: 'Tutoría Académica',
          desc: `Docente asignado para brindar acompañamiento y asesorías académicas.`,
          tag,
          bg: 'bg-indigo-950 border-indigo-500/50 text-indigo-300',
        });
      });
    }

    // 2. Extracción desde los bloques de disponibilidad si no hay lista directa
    if (bloques && bloques.length > 0) {
      bloques.forEach((b) => {
        let name = '';
        let email = '';

        const docenteRaw = b.docente;

        if (b.docente_nombre) {
          name = b.docente_nombre;
        } else if (typeof docenteRaw === 'object' && docenteRaw !== null) {
          const full = `${docenteRaw.first_name || ''} ${docenteRaw.last_name || ''}`.trim();
          name = full || docenteRaw.nombre || docenteRaw.username || '';
          email = docenteRaw.email || '';
        } else if (typeof docenteRaw === 'number' || (typeof docenteRaw === 'string' && !isNaN(Number(docenteRaw)))) {
          const idKey = String(docenteRaw);
          if (DOCENTES_MAP[idKey]) {
            name = DOCENTES_MAP[idKey].name;
            email = DOCENTES_MAP[idKey].email;
          }
        } else if (b.tutorNombre) {
          name = b.tutorNombre;
        }

        if (b.docente_email) {
          email = b.docente_email;
        }

        if (!name) name = 'Carlos Mendoza';
        if (!email) email = 'doc1@ecci.edu.co';

        let materia = 'Tutoría Académica';
        if (typeof b.materia === 'string') {
          materia = b.materia.includes('—') ? b.materia.split('—')[1].trim() : b.materia;
        } else if (typeof b.materia === 'object' && b.materia !== null && b.materia.nombre) {
          materia = b.materia.nombre;
        } else if (b.materia_nombre) {
          materia = b.materia_nombre;
        }

        if (!mapTutores.has(name)) {
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

    // 3. Resguardo por defecto si aún no se han creado disponibilidades
    if (mapTutores.size === 0) {
      Object.values(DOCENTES_MAP).forEach((doc, idx) => {
        mapTutores.set(doc.name, {
          id: idx + 1,
          name: doc.name,
          email: doc.email,
          area: 'Tutoría Académica',
          desc: 'Docente asignado para brindar acompañamiento y asesorías académicas.',
          tag: obtenerIniciales(doc.name),
          bg: 'bg-indigo-950 border-indigo-500/50 text-indigo-300',
        });
      });
    }

    return Array.from(mapTutores.values());
  }, [listaTutoresCombinada, bloques]);

  const handleVerDetalles = () => {
    navigate('/estudiante/dashboard');
  };

  const handleBuscarTutorias = () => {
    navigate('/estudiante/buscar-tutorias');
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

          {/* MENÚ CENTRAL DE NAVEGACIÓN */}
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
            {/* BADGE USUARIO */}
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

            {/* SALIR */}
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

      {/* FECHA FLOTANTE */}
      <div
        id="floatingDateWidget"
        className="fixed bottom-4 right-4 z-30 hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded text-slate-200 shadow-2xl backdrop-blur-md cursor-default"
      >
        <span className="w-2 h-2 rounded-xs bg-[var(--green-light)]"></span>
        <span className="text-[11px] text-slate-400 font-medium">Hoy es</span>
        <span id="floatingDateText" className="text-[11px] font-semibold text-white">
          {fechaEscritaTexto}
        </span>
      </div>

      {/* SECCIÓN 1: INICIO */}
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

          {/* CONSOLA BENTO DINÁMICA */}
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
                    TUTORES ACTIVOS
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] sm:text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800 w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>{fechaEscritaTexto}</span>
                </div>
              </div>

              {tutoresList.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-mono">
                  No hay tutores registrados en el sistema.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {tutoresList.map((doc, idx) => (
                    <div
                      key={idx}
                      onClick={handleBuscarTutorias}
                      className="bento-card group p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-[var(--green-light)] transition-all cursor-pointer relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded border font-bold text-[11px] flex items-center justify-center ${doc.bg}`}>
                            {doc.tag}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white group-hover:text-[var(--green-light)] transition-colors">
                              {doc.name}
                            </h4>
                            <p className="text-[10px] font-mono text-slate-400">{doc.email}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px]">
                        <span className="text-emerald-400 font-mono text-[9px] uppercase font-semibold">● Activo en sistema</span>
                        <span className="text-slate-300 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                          Consultar horarios <i className="fa-solid fa-chevron-right text-[8px]"></i>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>{tutoresList.length} Tutor{tutoresList.length === 1 ? '' : 'es'} Registrado{tutoresList.length === 1 ? '' : 's'}</span>
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
              Consulta el perfil de los tutores o dirígete a buscar horarios de tutorías disponibles.
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
                    onClick={handleBuscarTutorias}
                    className="w-full mt-4 sm:mt-5 py-2 rounded-lg bg-[var(--ink)] hover:bg-slate-800 text-white text-[11px] sm:text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Reservar Tutoría</span>
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
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar } from '@fullcalendar/core';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { useAuthStore } from '../store/useAuthStore';

interface EventoTutoria {
  id: string;
  title: string;
  start: string;
  end: string;
  area: string;
  backgroundColor: string;
  borderColor: string;
}

export const StudentHome: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const mainScrollRef = useRef<HTMLDivElement | null>(null);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const calendarInstanceRef = useRef<Calendar | null>(null);

  const [loading, setLoading] = useState(true);
  const [typedTitle, setTypedTitle] = useState('');
  const [filterArea, setFilterArea] = useState('ALL');

  const [step, setStep] = useState<1 | 2>(1);
  const [nombreAlumno, setNombreAlumno] = useState(user?.name || 'Juan Esteban Soto');
  const [correoInst, setCorreoInst] = useState(user?.email || 'usuario@ecci.edu.co');
  const [codigoEstudiante, setCodigoEstudiante] = useState('1006543210');
  const [selectDocenteForm, setSelectDocenteForm] = useState('Juan Esteban Soto');
  const [observaciones, setObservaciones] = useState('');
  const [correoAlt, setCorreoAlt] = useState('');
  const [errCorreoInst, setErrCorreoInst] = useState(false);
  const [modalExito, setModalExito] = useState(false);

  const phrases = ['Asesoría Docente.', 'Tutorías Libres.', 'Espacio Estudiantil.'];
  const typewriterRef = useRef({ phraseIdx: 0, charIdx: 0, isDeleting: false });

  const todayISO = new Date().toISOString().split('T')[0];
  const allEvents: EventoTutoria[] = [
    {
      id: '1',
      title: 'Juan E. Soto - Programación',
      start: `${todayISO}T14:00:00`,
      end: `${todayISO}T16:00:00`,
      area: 'Programación',
      backgroundColor: '#4f46e5',
      borderColor: '#4338ca',
    },
    {
      id: '2',
      title: 'Emely Salazar - Cálculo',
      start: `${todayISO}T09:00:00`,
      end: `${todayISO}T11:00:00`,
      area: 'Cálculo',
      backgroundColor: '#9333ea',
      borderColor: '#7e22ce',
    },
    {
      id: '3',
      title: 'David Escobar - Redes',
      start: `${todayISO}T15:00:00`,
      end: `${todayISO}T17:00:00`,
      area: 'Inteligencia Artificial',
      backgroundColor: '#0d9488',
      borderColor: '#0f766e',
    },
    {
      id: '4',
      title: 'Oscar Sarabino - Calidad',
      start: `${todayISO}T10:00:00`,
      end: `${todayISO}T12:00:00`,
      area: 'Gestion y seguridad en redes',
      backgroundColor: '#d97706',
      borderColor: '#b45309',
    },
  ];

  const [currentEvents, setCurrentEvents] = useState<EventoTutoria[]>(allEvents);

  const esCorreoAltValido = (email: string) => {
    if (!email || !email.includes('@')) return false;
    const lower = email.toLowerCase().trim();
    if (lower.includes('@ecci.edu.co') || lower.includes('@ecci.edu')) {
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(lower);
  };

  const esCorreoAltEcci = (email: string) => {
    const lower = email.toLowerCase().trim();
    return lower.includes('@ecci.edu.co') || lower.includes('@ecci.edu');
  };

  const filtrarCalendario = (area: string) => {
    if (area === 'ALL') {
      setCurrentEvents(allEvents);
    } else {
      setCurrentEvents(allEvents.filter((ev) => ev.area === area));
    }
  };

  const seleccionarHorarioYContinuar = (tituloDocente?: string) => {
    if (tituloDocente) {
      if (tituloDocente.includes('Juan')) setSelectDocenteForm('Juan Esteban Soto');
      else if (tituloDocente.includes('Emely')) setSelectDocenteForm('Emely Salazar');
      else if (tituloDocente.includes('David')) setSelectDocenteForm('David Escobar');
      else if (tituloDocente.includes('Oscar')) setSelectDocenteForm('Oscar Sarabino');
    }
    document.getElementById('reservar')?.scrollIntoView({ behavior: 'smooth' });
  };

  const seleccionarDocenteHero = (area: string) => {
    setFilterArea(area);
    filtrarCalendario(area);
    document.getElementById('calendario-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNextStep = () => {
    if (!correoInst.includes('@') || correoInst.length < 5) {
      setErrCorreoInst(true);
      return;
    }
    setErrCorreoInst(false);
    setStep(2);
  };

  const handleAgendamientoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (esCorreoAltValido(correoAlt)) {
      setModalExito(true);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

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

  useEffect(() => {
    if (loading || !calendarRef.current) return;

    if (calendarInstanceRef.current) {
      calendarInstanceRef.current.destroy();
    }

    const isMobile = window.innerWidth < 768;

    const calendar = new Calendar(calendarRef.current, {
      plugins: [timeGridPlugin, dayGridPlugin, interactionPlugin],
      initialView: isMobile ? 'timeGridDay' : 'timeGridWeek',
      slotMinTime: '07:00:00',
      slotMaxTime: '17:00:00',
      allDaySlot: false,
      slotDuration: '01:00:00',
      locale: esLocale,
      slotLabelFormat: {
        hour: 'numeric',
        minute: '2-digit',
        meridiem: 'short',
        hour12: true,
      },
      eventTimeFormat: {
        hour: 'numeric',
        minute: '2-digit',
        meridiem: 'short',
        hour12: true,
      },
      buttonText: { today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día' },
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: isMobile ? 'timeGridDay,dayGridMonth' : 'timeGridWeek,dayGridMonth',
      },
      height: isMobile ? 380 : 420,
      events: currentEvents,
      eventClick: (info) => seleccionarHorarioYContinuar(info.event.title),
    });

    calendar.render();
    calendarInstanceRef.current = calendar;

    return () => {
      calendar.destroy();
    };
  }, [loading, currentEvents]);

  const fechaEscritaTexto = new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      ref={mainScrollRef}
      className="h-screen w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth bg-[var(--paper)] text-[var(--ink)] selection:bg-emerald-800 selection:text-white relative"
    >
      {loading && (
        <div className="loader-overlay" id="loaderOverlay">
          <svg className="loader-logo" viewBox="0 0 340 80">
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="loader-text">
              Aula Libre
            </text>
          </svg>
        </div>
      )}

      {/* NAVBAR CRISTAL ADAPTABLE Y FIJO */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#0d1b2a]/75 backdrop-blur-md border-b border-slate-700/40 h-16 flex items-center shadow-lg transition-all">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 w-full flex items-center justify-between">
          <a href="#inicio" className="flex items-center gap-2 group">
            <span className="font-display italic text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-sm">
              Aula <span className="not-italic text-[var(--green-light)]">Libre</span>
            </span>
          </a>

          <div className="hidden md:flex items-center gap-6 lg:gap-8 text-xs font-semibold uppercase tracking-wider text-slate-200">
            <a href="#inicio" className="hover:text-[var(--green-light)] transition-colors">Inicio</a>
            <a href="#docentes" className="hover:text-[var(--green-light)] transition-colors">Docentes</a>
            <a href="#calendario-section" className="hover:text-[var(--green-light)] transition-colors">Calendario</a>
            <a href="#reservar" className="hover:text-[var(--green-light)] transition-colors">Reserva</a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* BADGE DE USUARIO MODERNO */}
            <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded bg-slate-900/80 border border-slate-700/70 shadow-sm backdrop-blur-sm">
              <div className="w-6 h-6 rounded bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold text-xs flex items-center justify-center font-mono">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'J'}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[11px] sm:text-xs font-semibold text-slate-100 tracking-tight leading-none">
                  {user?.name || 'Juan Esteban Soto'}
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
                navigate('/');
              }}
              className="px-2.5 sm:px-3.5 py-1.5 rounded border border-slate-700/70 hover:border-rose-500/80 hover:bg-rose-500/10 hover:text-rose-400 text-slate-300 text-xs font-semibold transition-all flex items-center gap-1.5 bg-slate-900/40"
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

      {/* SECCIÓN 1: INICIO (DESPLAZAMIENTO SUPERIOR CORREGIDO) */}
      <section id="inicio" className="snap-start snap-always min-h-screen lg:h-screen w-full pt-24 lg:pt-20 pb-8 bg-[var(--ink)] text-[var(--paper)] relative overflow-hidden flex items-center flex-shrink-0">
        <img
          src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1600&auto=format&fit=crop"
          alt="Campus Universitario"
          className="panel-left-bg"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10 w-full my-auto">
          <div className="lg:col-span-5 space-y-4 lg:space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[var(--green)]/20 border border-[var(--green)]/40 text-[var(--green-light)] text-[11px] font-semibold tracking-wide uppercase">
              Reporte de tutorias
            </div>

            <div className="title-wrapper !min-h-[4rem]">
              <h1 className="typed-title text-[var(--paper)] text-2xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                <span>{typedTitle}</span><span className="cursor">|</span>
              </h1>
            </div>

            <p className="text-slate-300 text-xs sm:text-sm lg:text-base font-light leading-relaxed">
              Monitoreo académico en tiempo real. Selecciona a cualquier docente para consultar de inmediato sus horarios disponibles en el calendario.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href="#calendario-section"
                className="px-5 py-2.5 sm:px-6 sm:py-3 rounded bg-[var(--green)] text-white font-semibold text-xs tracking-wider uppercase hover:bg-emerald-600 transition-all shadow-md flex items-center gap-2"
              >
                <i className="fa-regular fa-calendar-days text-sm"></i> Ver Calendario
              </a>
              <a
                href="#docentes"
                className="px-5 py-2.5 sm:px-6 sm:py-3 rounded border border-slate-700 hover:border-slate-500 text-slate-200 font-semibold text-xs tracking-wider uppercase transition-all"
              >
                Tutores
              </a>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="bento-console rounded border border-slate-800 bg-slate-950/90 p-4 sm:p-6 shadow-2xl relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-4 mb-4 sm:mb-5 border-b border-slate-800/80 gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
                  </div>
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-[var(--green-light)] ml-2">
                    DISPONIBILIDAD
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] sm:text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800 w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>{fechaEscritaTexto}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { name: 'Juan Esteban Soto', area: 'Programación', career: 'Programación Web', tag: 'JS', bg: 'bg-indigo-950 border-indigo-500/50 text-indigo-300' },
                  { name: 'Emely Salazar', area: 'Cálculo', career: 'Cálculo Diferencial', tag: 'ES', bg: 'bg-purple-950 border-purple-500/50 text-purple-300' },
                  { name: 'David Escobar', area: 'Inteligencia Artificial', career: 'Inteligencia Artificial', tag: 'DE', bg: 'bg-teal-950 border-teal-500/50 text-teal-300' },
                  { name: 'Oscar Sarabino', area: 'Gestion y seguridad en redes', career: 'Gestion y seguridad en redes', tag: 'OS', bg: 'bg-amber-950 border-amber-500/50 text-amber-300' },
                ].map((doc, idx) => (
                  <div
                    key={idx}
                    onClick={() => seleccionarDocenteHero(doc.area)}
                    className="bento-card group p-3.5 rounded bg-slate-900/60 border border-slate-800 hover:border-[var(--green-light)] transition-all cursor-pointer relative overflow-hidden"
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
                          <p className="text-[10px] font-mono text-slate-400">{doc.career}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px]">
                      <span className="text-emerald-400 font-mono text-[9px] uppercase font-semibold">● Atendiendo hoy</span>
                      <span className="text-slate-300 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        Ver agenda <i className="fa-solid fa-chevron-right text-[8px]"></i>
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>4 Tutores Activos</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN 2: DOCENTES (SLIDER / CARRUSEL RESPONSIVO) */}
      <section id="docentes" className="snap-start snap-always min-h-screen lg:h-screen w-full pt-20 pb-8 bg-[var(--paper)] text-[var(--ink)] flex flex-col justify-center flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full my-auto">
          <div className="text-center max-w-2xl mx-auto mb-6">
            <span className="text-[var(--green)] text-xs font-bold uppercase tracking-widest">Docentes Asignados</span>
            <h2 className="font-display italic text-2xl sm:text-3xl font-bold mt-0.5">Tutores disponibles</h2>
            <p className="text-slate-600 text-xs sm:text-sm mt-1">
              Selecciona un tutor para consultar su horario disponible en el calendario.
            </p>
          </div>

          {/* TARJETAS CON DESPLAZAMIENTO HORIZONTAL EN MÓVILES Y REJILLA EN ESCRITORIO */}
          <div className="flex lg:grid lg:grid-cols-4 gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory pb-4 pt-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            {[
              { name: 'Juan Esteban Soto', area: 'Programación', desc: 'HTML, CSS, JS, Php, MySQL, React, Vue.js', tag: 'JS', bg: 'bg-indigo-950 border-indigo-500/40 text-indigo-300' },
              { name: 'Emely Salazar', area: 'Cálculo', desc: 'Cálculo Diferencial', tag: 'ES', bg: 'bg-purple-950 border-purple-500/40 text-purple-300' },
              { name: 'David Escobar', area: 'Inteligencia Artificial', desc: 'Phyton', tag: 'DE', bg: 'bg-teal-950 border-teal-500/40 text-teal-300' },
              { name: 'Oscar Sarabino', area: 'Gestion y seguridad en redes', desc: 'Cisco Packet Tracer', tag: 'OS', bg: 'bg-amber-950 border-amber-500/40 text-amber-300' },
            ].map((tutor, idx) => (
              <div
                key={idx}
                className="min-w-[260px] sm:min-w-[280px] lg:min-w-0 snap-center bg-white rounded border border-slate-200 p-4 sm:p-5 shadow-sm hover:border-[var(--green)] transition-all flex flex-col justify-between flex-shrink-0"
              >
                <div>
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded font-display italic text-lg sm:text-xl font-bold flex items-center justify-center mb-3 ${tutor.bg}`}>
                    {tutor.tag}
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {tutor.area}
                  </span>
                  <h3 className="font-display italic text-base sm:text-lg font-bold text-[var(--ink)] mt-2">{tutor.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{tutor.desc}</p>
                </div>
                <button
                  onClick={() => seleccionarDocenteHero(tutor.area)}
                  className="w-full mt-4 sm:mt-5 py-2 rounded bg-[var(--ink)] hover:bg-slate-800 text-white text-[11px] sm:text-xs font-semibold uppercase tracking-wider transition-colors"
                >
                  Ver Horario
                </button>
              </div>
            ))}
          </div>

          <div className="flex lg:hidden justify-center items-center gap-1.5 mt-2 text-slate-400 text-[11px]">
            <i className="fa-solid fa-arrow-left-long"></i> Desliza para ver más tutores <i className="fa-solid fa-arrow-right-long"></i>
          </div>
        </div>
      </section>

      {/* SECCIÓN 3: CALENDARIO RESPONSIVO */}
      <section id="calendario-section" className="snap-start snap-always min-h-screen lg:h-screen w-full pt-20 pb-8 bg-[var(--ink)] text-[var(--paper)] flex flex-col justify-center flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full my-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-3 gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--green-light)] uppercase tracking-wider">
                <i className="fa-solid fa-calendar-week"></i> Calendario Interactivo
              </div>
              <h2 className="font-display italic text-xl sm:text-2xl font-bold text-white mt-0.5">Horarios de Tutoría Libres</h2>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="calendarAreaFilter" className="text-xs font-bold text-slate-300 whitespace-nowrap">Área / Docente:</label>
              <select
                id="calendarAreaFilter"
                value={filterArea}
                onChange={(e) => {
                  setFilterArea(e.target.value);
                  filtrarCalendario(e.target.value);
                }}
                className="w-full sm:w-auto px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs font-medium text-slate-100 focus:outline-none focus:border-[var(--green)]"
              >
                <option value="ALL">Mostrar Todos</option>
                <option value="Programación">Programación (Juan E. Soto)</option>
                <option value="Cálculo">Cálculo (Emely Salazar)</option>
                <option value="Inteligencia Artificial">IA (David Escobar)</option>
                <option value="Gestion y seguridad en redes">Redes (Oscar Sarabino)</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-900 rounded p-2.5 sm:p-4 border border-slate-800 shadow-xl overflow-x-auto">
            <div ref={calendarRef} id="fullCalendarContainer" className="min-w-[300px]" />
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-2">
            <i className="fa-solid fa-circle-info text-[var(--green-light)] mr-1"></i> Selecciona un horario disponible para agendar tu cita.
          </p>
        </div>
      </section>

      {/* SECCIÓN 4: RESERVA (FORMULARIO ADAPTABLE) */}
      <section id="reservar" className="snap-start snap-always min-h-screen lg:h-screen w-full pt-20 pb-8 bg-[var(--paper)] text-[var(--ink)] flex flex-col justify-center flex-shrink-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full my-auto">
          <div className="container rounded overflow-hidden shadow-xl border border-slate-300">
            <div className="panel-left">
              <img
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop"
                alt="Estudiantes"
                className="panel-left-bg"
              />
              <div className="relative z-10">
                <span className="text-[var(--green-light)] text-[11px] font-bold uppercase tracking-widest">Reserva de Tutoría</span>
                <h2 className="font-display italic text-xl sm:text-2xl lg:text-3xl font-bold mt-1 mb-2 leading-tight">
                  Reserva un espacio con el tutor.
                </h2>
                <p className="text-xs text-slate-300 font-light leading-relaxed">
                  Completa el formulario para terminar de agendar la tutoria.
                </p>
              </div>
            </div>

            <div className="panel-right">
              <div className="form-card">
                <div className="text-center">
                  <h2>Aula Libre</h2>
                  <p className="subtitle">Agendamiento directo de acompañamiento docente.</p>
                </div>

                <div className="stepper" id="formStepper">
                  <div className={`step-node ${step === 1 ? 'active' : 'completed'}`} id="stepNode1">1</div>
                  <div className={`step-line ${step === 2 ? 'completed' : ''}`} id="stepLine1"></div>
                  <div className={`step-node ${step === 2 ? 'active' : ''}`} id="stepNode2">2</div>
                </div>

                <form id="agendamientoForm" onSubmit={handleAgendamientoSubmit}>
                  {step === 1 ? (
                    <div id="step1View" className="form-view">
                      <div className="floating-group">
                        <input
                          type="text"
                          id="nombreAlumno"
                          placeholder=" "
                          required
                          value={nombreAlumno}
                          onChange={(e) => setNombreAlumno(e.target.value)}
                        />
                        <label htmlFor="nombreAlumno">Nombre Completo</label>
                      </div>

                      <div className="floating-group">
                        <input
                          type="email"
                          id="correoInst"
                          placeholder=" "
                          required
                          value={correoInst}
                          onChange={(e) => setCorreoInst(e.target.value)}
                          className={errCorreoInst ? 'input-error' : ''}
                        />
                        <label htmlFor="correoInst">Correo Institucional (@ecci.edu)</label>
                        {errCorreoInst && (
                          <span className="error-msg" id="errCorreo">Debe ingresar un correo institucional válido</span>
                        )}
                      </div>

                      <div className="floating-group">
                        <input
                          type="text"
                          id="codigoEstudiante"
                          placeholder=" "
                          required
                          value={codigoEstudiante}
                          onChange={(e) => setCodigoEstudiante(e.target.value)}
                        />
                        <label htmlFor="codigoEstudiante">Código de Estudiante</label>
                      </div>

                      <button
                        type="button"
                        id="btnSiguienteStep"
                        onClick={handleNextStep}
                        className="btn-submit mt-1 group flex items-center justify-center gap-2"
                      >
                        <span>Siguiente</span>
                        <i className="fa-solid fa-arrow-right transition-transform duration-300 ease-out group-hover:translate-x-2"></i>
                      </button>
                    </div>
                  ) : (
                    <div id="step2View" className="form-view">
                      <div className="floating-group mb-2.5">
                        <label className="block text-[11px] font-bold text-[var(--ink)] mb-1 !static !transform-none">
                          Docente Asignado
                        </label>
                        <select
                          id="selectDocenteForm"
                          value={selectDocenteForm}
                          onChange={(e) => setSelectDocenteForm(e.target.value)}
                          className="w-full h-9 px-2.5 border border-slate-300 rounded text-xs font-medium text-slate-800 bg-white"
                        >
                          <option value="Juan Esteban Soto">Juan Esteban Soto — Programación</option>
                          <option value="Emely Salazar">Emely Salazar — Cálculo</option>
                          <option value="David Escobar">David Escobar — Inteligencia Artificial</option>
                          <option value="Oscar Sarabino">Oscar Sarabino — Gestion y seguridad en redes</option>
                        </select>
                      </div>

                      <div className="floating-group">
                        <input
                          type="text"
                          id="observaciones"
                          placeholder=" "
                          value={observaciones}
                          onChange={(e) => setObservaciones(e.target.value)}
                        />
                        <label htmlFor="observaciones">Dudas breves para el docente</label>
                      </div>

                      <div className="floating-group">
                        <input
                          type="email"
                          id="correoAlt"
                          placeholder=" "
                          required
                          value={correoAlt}
                          onChange={(e) => setCorreoAlt(e.target.value)}
                          className={esCorreoAltEcci(correoAlt) ? 'input-error' : ''}
                        />
                        <label htmlFor="correoAlt">Correo Alternativo (Personal)</label>
                        {esCorreoAltEcci(correoAlt) && (
                          <span className="error-msg">El correo alternativo no puede ser institucional (@ecci.edu.co)</span>
                        )}
                      </div>

                      <div className="password-requirements">
                        <div className={`req-item ${esCorreoAltValido(correoAlt) ? 'valid' : ''}`}>
                          <span className="req-icon"><i className="fa-solid fa-check"></i></span>
                          <span>Debe ser un correo personal válido (no @ecci.edu.co)</span>
                        </div>
                      </div>

                      <div className="flex gap-2.5 mt-2.5">
                        <button
                          type="button"
                          id="btnVolverStep"
                          onClick={() => setStep(1)}
                          className="btn-submit !bg-slate-300 !text-slate-700 hover:!bg-slate-400"
                        >
                          Atrás
                        </button>
                        <button type="submit" disabled={!esCorreoAltValido(correoAlt)} className="btn-submit disabled:opacity-50 disabled:cursor-not-allowed">
                          Confirmar Reserva
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MODAL DE ÉXITO */}
      {modalExito && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded p-6 max-w-sm w-full text-center space-y-4 shadow-2xl relative">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-[var(--green)] flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <h3 className="font-display italic text-xl font-bold text-[var(--ink)]">¡Reserva Agendada!</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tu tutoría con <strong className="text-[var(--ink)]">{selectDocenteForm}</strong> fue confirmada con éxito. Se enviará un correo de confirmación a <strong className="text-[var(--ink)]">{correoAlt}</strong>.
            </p>
            <button
              onClick={() => {
                setModalExito(false);
                setStep(1);
                setCorreoAlt('');
              }}
              className="btn-submit"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
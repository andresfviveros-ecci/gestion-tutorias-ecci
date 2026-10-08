import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar } from '@fullcalendar/core';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { useAuthStore } from '../store/useAuthStore';
import { useScheduleStore } from '../store/useScheduleStore';
import { useTutorStore } from '../store/useTutorStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Interfaz flexible para que TypeScript reconozca tanto la nomenclatura de React como la de Django
export interface ExtendedScheduleSlot {
  id: string | number;
  tutorNombre?: string;
  tutorEmail?: string;
  materia?: string;
  fecha?: string;
  horaInicio?: string;
  horaFin?: string;
  hora_inicio?: string;
  hora_fin?: string;
  estado?: 'Libre' | 'Reservada' | 'DISPONIBLE' | 'RESERVADO' | 'COMPLETO' | string;
  modalidad?: 'Virtual' | 'Presencial' | string;
  lugar?: string;
  enlace_virtual?: string;
  enlaceMeeting?: string;
  cupo_total?: number;
  cupo_ocupado?: number;
  estudianteNombre?: string;
  estudianteCorreo?: string;
  docente?: number | string | { id?: number | string; nombre?: string; first_name?: string; last_name?: string; email?: string };
  materiaObj?: { id?: number | string; nombre?: string; codigo?: string };
  periodo?: number | string;
}

interface EventoTutoria {
  id: string;
  title: string;
  start: string;
  end: string;
  area: string;
  backgroundColor: string;
  borderColor: string;
}

interface UserType {
  nombre?: string;
  email?: string;
  correo?: string;
  codigo?: string;
}

interface ScheduleStoreInterface {
  slots?: ExtendedScheduleSlot[];
  fetchSlots?: () => Promise<void>;
  reserveSlot?: (id: string, name: string) => Promise<void>;
  addSlot?: (slot: unknown) => void;
}

interface TutorStoreInterface {
  tutores?: Array<{
    id?: string | number;
    nombre: string;
    correo: string;
    groups: Array<{ facultyName?: string; subjects: string[] }>;
  }>;
  fetchTutores?: () => Promise<void>;
}

// FORMATO DE FECHA LEGIBLE (Ej: "Septiembre 23 del 2026")
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

export const StudentHome: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const authUser = user as unknown as UserType | null;

  // Acceso tipado a los stores para evitar errores ts(2339)
  const scheduleStore = useScheduleStore() as unknown as ScheduleStoreInterface;
  const slots = scheduleStore.slots || [];
  const fetchSlots = scheduleStore.fetchSlots;
  const reserveSlot = scheduleStore.reserveSlot;

  const tutorStore = useTutorStore() as unknown as TutorStoreInterface;
  const tutores = tutorStore.tutores || [];
  const fetchTutores = tutorStore.fetchTutores;

  const mainScrollRef = useRef<HTMLDivElement | null>(null);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const calendarInstanceRef = useRef<Calendar | null>(null);

  const [loading, setLoading] = useState(true);
  const [typedTitle, setTypedTitle] = useState('');
  const [filterArea, setFilterArea] = useState('ALL');

  const [step, setStep] = useState<1 | 2>(1);

  // CAMPOS DE REGISTRO
  const [nombreAlumno, setNombreAlumno] = useState<string>(() => authUser?.nombre || '');
  const [correoInst, setCorreoInst] = useState<string>(() => authUser?.email || authUser?.correo || '');
  const [codigoEstudiante, setCodigoEstudiante] = useState<string>(() => authUser?.codigo || '');
  const [selectDocenteForm, setSelectDocenteForm] = useState('');
  const [modalidadReserva, setModalidadReserva] = useState<'Virtual' | 'Presencial'>('Virtual');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [correoAlt, setCorreoAlt] = useState('');
  const [errCorreoInst, setErrCorreoInst] = useState(false);
  const [modalExito, setModalExito] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // SINCRONIZAR DATOS DE USUARIO ASÍNCRONOS
  const [prevAuthUser, setPrevAuthUser] = useState(authUser);
  if (authUser !== prevAuthUser) {
    setPrevAuthUser(authUser);
    if (authUser?.nombre && !nombreAlumno) setNombreAlumno(authUser.nombre);
    if ((authUser?.email || authUser?.correo) && !correoInst) setCorreoInst(authUser.email || authUser.correo || '');
    if (authUser?.codigo && !codigoEstudiante) setCodigoEstudiante(authUser.codigo);
  }

  // MODAL DE DETALLES DEL EVENTO
  const [modalDetalle, setModalDetalle] = useState<ExtendedScheduleSlot | null>(null);

  // CAMPOS DE FECHA Y HORARIO
  const todayISO = new Date().toISOString().split('T')[0];
  const [fechaReserva, setFechaReserva] = useState(todayISO);
  const [horaInicioReserva, setHoraInicioReserva] = useState('14:00');
  const [horaFinReserva, setHoraFinReserva] = useState('16:00');
  const [horarioError, setHorarioError] = useState<string | null>(null);

  const phrases = ['Asesoría Docente.', 'Tutorías Libres.', 'Espacio Estudiantil.'];
  const typewriterRef = useRef({ phraseIdx: 0, charIdx: 0, isDeleting: false });

  // CONVERSIÓN DE SLOTS
  const typedSlots = useMemo(() => slots as unknown as ExtendedScheduleSlot[], [slots]);

  // CARGAR DATOS DESDE EL BACKEND
  useEffect(() => {
    let isMounted = true;
    const cargarDatos = async () => {
      try {
        if (typeof fetchTutores === 'function') await fetchTutores();
        if (typeof fetchSlots === 'function') await fetchSlots();
      } catch (err) {
        console.error('Error al cargar datos desde el backend:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    cargarDatos();
    return () => {
      isMounted = false;
    };
  }, [fetchTutores, fetchSlots]);

  // RESETEAR FORMULARIO
  const resetFormulario = () => {
    setNombreAlumno(authUser?.nombre || '');
    setCorreoInst(authUser?.email || authUser?.correo || '');
    setCodigoEstudiante(authUser?.codigo || '');
    setObservaciones('');
    setCorreoAlt('');
    setModalidadReserva('Virtual');
    setStep(1);
    setSelectedSlotId(null);
    setHorarioError(null);
  };

  // TUTORES DISPONIBLES
  const tutoresList = useMemo(() => {
    return tutores.map((t) => {
      const mainSubject = t.groups[0]?.subjects[0] || 'Tutoría';
      const mainFaculty = t.groups[0]?.facultyName || 'Facultad';
      const allSubjects = t.groups.flatMap((g) => g.subjects).join(', ');
      const initials = t.nombre
        ? t.nombre.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
        : 'PT';

      return {
        id: t.id,
        name: t.nombre,
        email: t.correo,
        area: mainSubject,
        career: mainFaculty,
        desc: allSubjects ? `Atención y acompañamiento en ${allSubjects}` : 'Atención y acompañamiento académico',
        tag: initials || 'PT',
        bg: 'bg-indigo-950 border-indigo-500/50 text-indigo-300',
      };
    });
  }, [tutores]);

  // DOCENTE SELECCIONADO DERIVADO
  const docenteSeleccionado = selectDocenteForm || (tutoresList[0]?.name ?? '');

  // MATERIAS ÚNICAS DESDE EL BACKEND
  const materiasUnicas = useMemo(() => {
    const set = new Set<string>();
    tutores.forEach((t) => {
      t.groups.forEach((g) => {
        g.subjects.forEach((sub) => set.add(sub));
      });
    });
    typedSlots.forEach((s) => {
      if (s.materia) set.add(s.materia);
    });
    return Array.from(set);
  }, [tutores, typedSlots]);

  // EVENTOS DEL CALENDARIO
  const baseEvents: EventoTutoria[] = useMemo(() => {
    if (!typedSlots || typedSlots.length === 0) return [];

    return typedSlots.map((s) => {
      const isFree = s.estado === 'DISPONIBLE' || s.estado === 'Libre';
      const horaInicioStr = s.horaInicio || s.hora_inicio || '08:00';
      const horaFinStr = s.horaFin || s.hora_fin || '09:00';

      return {
        id: String(s.id),
        title: `${s.tutorNombre || 'Docente'} - ${s.materia || 'Tutoría'}${
          s.estado === 'Reservada' || s.estado === 'RESERVADO' ? ' (Reservada)' : ''
        }`,
        start: `${s.fecha}T${horaInicioStr}:00`,
        end: `${s.fecha}T${horaFinStr}:00`,
        area: s.materia || '',
        backgroundColor: isFree ? '#047857' : '#0d1b2a',
        borderColor: isFree ? '#065f46' : '#1e2d4a',
      };
    });
  }, [typedSlots]);

  // FILTRAR EVENTOS
  const currentEvents = useMemo(() => {
    if (filterArea === 'ALL') return baseEvents;
    return baseEvents.filter((ev) => ev.area === filterArea);
  }, [baseEvents, filterArea]);

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

  const seleccionarDocenteHero = (area: string) => {
    setFilterArea(area);
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

  const timeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // SUBMIT DE RESERVA
  const handleAgendamientoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHorarioError(null);

    if (!esCorreoAltValido(correoAlt)) return;

    const startMin = timeToMinutes(horaInicioReserva);
    const endMin = timeToMinutes(horaFinReserva);

    if (endMin <= startMin) {
      setHorarioError('La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }

    const duracionMinutos = endMin - startMin;
    if (duracionMinutos > 120) {
      setHorarioError('La tutoría no puede durar más de 2 horas (120 minutos).');
      return;
    }

    let targetBloqueId: string | number | null = selectedSlotId;

    if (!targetBloqueId) {
      const bloqueCoincidente = typedSlots.find((s) => {
        const nombreDocente = s.tutorNombre || (typeof s.docente === 'object' ? s.docente?.nombre : '');
        const emailDocente = s.tutorEmail || (typeof s.docente === 'object' ? s.docente?.email : '');
        const coincideDocente =
          nombreDocente === docenteSeleccionado ||
          (emailDocente && emailDocente.toLowerCase() === docenteSeleccionado.toLowerCase());

        const coincideFecha = s.fecha === fechaReserva;
        const esLibre = s.estado === 'DISPONIBLE' || s.estado === 'Libre';

        return coincideDocente && coincideFecha && esLibre;
      });

      if (bloqueCoincidente) {
        targetBloqueId = bloqueCoincidente.id;
      }
    }

    if (!targetBloqueId) {
      setHorarioError(
        `No se encontró un bloque de disponibilidad libre para ${docenteSeleccionado} en la fecha ${formatearFechaLarga(fechaReserva)}. Por favor selecciona un horario disponible en el calendario.`
      );
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access');

      const res = await fetch(`${API_BASE_URL}/tutorias/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          bloque_id: Number(targetBloqueId),
          tema: observaciones ? `Consulta: ${observaciones.substring(0, 40)}` : 'Asesoría Académica',
          descripcion: observaciones || 'Reserva agendada desde el portal Aula Libre',
        }),
      });

      if (!res.ok) {
        const errorData = (await res.json()) as Record<string, unknown>;
        const msg =
          (errorData.detail as string) ||
          (Array.isArray(errorData.non_field_errors) ? (errorData.non_field_errors[0] as string) : null) ||
          (Array.isArray(errorData.bloque_id) ? (errorData.bloque_id[0] as string) : null) ||
          'Error al procesar la reserva en el servidor.';
        throw new Error(msg);
      }

      if (typeof reserveSlot === 'function') {
        await reserveSlot(String(targetBloqueId), nombreAlumno);
      }

      if (typeof fetchSlots === 'function') {
        await fetchSlots();
      }

      setModalExito(true);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Ocurrió un error al conectar con el servidor.';
      setHorarioError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // MÁQUINA DE ESCRIBIR
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

  // CALENDARIO
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
      slotMaxTime: '18:00:00',
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
      eventClick: (info) => {
        const slotObj = typedSlots.find((s) => String(s.id) === info.event.id);
        if (slotObj) {
          setModalDetalle(slotObj);
        }
      },
    });

    calendar.render();
    calendarInstanceRef.current = calendar;

    return () => {
      calendar.destroy();
    };
  }, [loading, currentEvents, typedSlots]);

  const fechaEscritaTexto = formatearFechaLarga(todayISO);

  const tieneEnlaceValido = Boolean(
    modalDetalle?.enlaceMeeting && modalDetalle.enlaceMeeting.trim().length > 0
  );

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

      {/* NAVBAR */}
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
            <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded bg-slate-900/80 border border-slate-700/70 shadow-sm backdrop-blur-sm">
              <div className="w-6 h-6 rounded bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold text-xs flex items-center justify-center font-mono">
                {user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'E'}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[11px] sm:text-xs font-semibold text-slate-100 tracking-tight leading-none">
                  {user?.nombre || 'Estudiante'}
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
              className="px-2.5 sm:px-3.5 py-1.5 rounded border border-slate-700/70 hover:border-rose-500/80 hover:bg-rose-500/10 hover:text-rose-400 text-slate-300 text-xs font-semibold transition-all flex items-center gap-1.5 bg-slate-900/40 cursor-pointer"
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

          {/* CONSOLA BENTO DINÁMICA */}
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

              {tutoresList.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-mono">
                  No hay tutores registrados en el sistema.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {tutoresList.map((doc, idx) => (
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
                        <span className="text-emerald-400 font-mono text-[9px] uppercase font-semibold">● Activo en sistema</span>
                        <span className="text-slate-300 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                          Ver agenda <i className="fa-solid fa-chevron-right text-[8px]"></i>
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
              Selecciona un tutor para consultar su horario disponible en el calendario.
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
                    className="w-full mt-4 sm:mt-5 py-2 rounded bg-[var(--ink)] hover:bg-slate-800 text-white text-[11px] sm:text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Ver Horario
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SECCIÓN 3: CALENDARIO */}
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
                onChange={(e) => setFilterArea(e.target.value)}
                className="w-full sm:w-auto px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs font-medium text-slate-100 focus:outline-none focus:border-[var(--green)]"
              >
                <option value="ALL">Mostrar Todos</option>
                {materiasUnicas.map((materia) => (
                  <option key={materia} value={materia}>
                    {materia}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-slate-900 rounded p-2.5 sm:p-4 border border-slate-800 shadow-xl overflow-x-auto">
            <div ref={calendarRef} id="fullCalendarContainer" className="min-w-[300px]" />
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-2">
            <i className="fa-solid fa-circle-info text-[var(--green-light)] mr-1"></i> Haz clic en cualquier tutoría del calendario para ver sus detalles.
          </p>
        </div>
      </section>

      {/* SECCIÓN 4: RESERVA */}
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
                  Completa el formulario definiendo el docente, la modalidad, la fecha y el horario (máximo 2 horas).
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
                        <label htmlFor="correoInst">Correo Institucional (@ecci.edu.co)</label>
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
                        className="btn-submit mt-1 group flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Siguiente</span>
                        <i className="fa-solid fa-arrow-right transition-transform duration-300 ease-out group-hover:translate-x-2"></i>
                      </button>
                    </div>
                  ) : (
                    <div id="step2View" className="form-view space-y-3">
                      {horarioError && (
                        <div className="p-3 bg-rose-100 border border-rose-300 text-rose-800 rounded text-xs leading-tight">
                          {horarioError}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* SELECCIÓN DE DOCENTE */}
                        <div className="floating-group !mb-1">
                          <label className="block text-[11px] font-bold text-[var(--ink)] mb-1 !static !transform-none">
                            Docente Asignado
                          </label>
                          <select
                            id="selectDocenteForm"
                            value={docenteSeleccionado}
                            onChange={(e) => setSelectDocenteForm(e.target.value)}
                            className="w-full h-9 px-2.5 border border-slate-300 rounded text-xs font-medium text-slate-800 bg-white"
                          >
                            {tutoresList.length === 0 ? (
                              <option value="">No hay docentes disponibles</option>
                            ) : (
                              tutoresList.map((t) => (
                                <option key={t.email || t.name} value={t.name}>
                                  {t.name} — {t.area}
                                </option>
                              ))
                            )}
                          </select>
                        </div>

                        {/* SELECCIÓN DE MODALIDAD */}
                        <div className="floating-group !mb-1">
                          <label className="block text-[11px] font-bold text-[var(--ink)] mb-1 !static !transform-none">
                            Modalidad de la Tutoría
                          </label>
                          <select
                            id="modalidadReserva"
                            value={modalidadReserva}
                            onChange={(e) => setModalidadReserva(e.target.value as 'Virtual' | 'Presencial')}
                            className="w-full h-9 px-2.5 border border-slate-300 rounded text-xs font-medium text-slate-800 bg-white"
                          >
                            <option value="Virtual">Virtual</option>
                            <option value="Presencial">Presencial</option>
                          </select>
                        </div>
                      </div>

                      {/* CAMPOS DE FECHA Y HORARIO */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Fecha</label>
                          <input
                            type="date"
                            required
                            value={fechaReserva}
                            onChange={(e) => setFechaReserva(e.target.value)}
                            className="w-full h-8 px-2 border border-slate-300 rounded text-xs text-slate-800 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Hora Inicio</label>
                          <input
                            type="time"
                            required
                            value={horaInicioReserva}
                            onChange={(e) => setHoraInicioReserva(e.target.value)}
                            className="w-full h-8 px-2 border border-slate-300 rounded text-xs text-slate-800 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Hora Fin (Máx 2h)</label>
                          <input
                            type="time"
                            required
                            value={horaFinReserva}
                            onChange={(e) => setHoraFinReserva(e.target.value)}
                            className="w-full h-8 px-2 border border-slate-300 rounded text-xs text-slate-800 bg-white"
                          />
                        </div>
                      </div>

                      <div className="floating-group !mb-1">
                        <input
                          type="text"
                          id="observaciones"
                          placeholder=" "
                          value={observaciones}
                          onChange={(e) => setObservaciones(e.target.value)}
                        />
                        <label htmlFor="observaciones">Dudas breves para el docente</label>
                      </div>

                      <div className="floating-group !mb-1">
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

                      <div className="password-requirements !mt-1">
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
                          className="btn-submit !bg-slate-300 !text-slate-700 hover:!bg-slate-400 cursor-pointer"
                        >
                          Atrás
                        </button>
                        <button
                          type="submit"
                          disabled={!esCorreoAltValido(correoAlt) || tutoresList.length === 0 || submitting}
                          className="btn-submit disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {submitting ? 'Procesando...' : 'Confirmar Reserva'}
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

      {/* MODAL ESTILO GOOGLE CALENDAR */}
      {modalDetalle && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full text-slate-800 relative overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            
            {/* BOTÓN CERRAR SUPERIOR */}
            <div className="flex justify-between items-center px-6 pt-5 pb-2">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  modalDetalle.estado === 'Reservada' || modalDetalle.estado === 'RESERVADO' || modalDetalle.estado === 'COMPLETO'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {modalDetalle.estado}
              </span>

              <button
                onClick={() => setModalDetalle(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                title="Cerrar"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="px-6 pb-6 space-y-4">
              
              {/* TÍTULO DEL EVENTO Y FECHA */}
              <div className="flex items-start gap-4">
                <div
                  className={`w-3.5 h-3.5 rounded-sm mt-1.5 flex-shrink-0 ${
                    modalDetalle.estado === 'Reservada' || modalDetalle.estado === 'RESERVADO' ? 'bg-amber-500' : 'bg-emerald-600'
                  }`}
                />
                <div>
                  <h3 className="text-xl font-normal text-slate-900 leading-tight">
                    {modalDetalle.materia}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 font-medium">
                    {formatearFechaLarga(modalDetalle.fecha)} • {modalDetalle.horaInicio || modalDetalle.hora_inicio} – {modalDetalle.horaFin || modalDetalle.hora_fin}
                  </p>
                </div>
              </div>

              {/* BOTÓN UNIRSE A GOOGLE MEET */}
              {tieneEnlaceValido && (
                <div className="pl-7 pt-1">
                  <a
                    href={modalDetalle.enlaceMeeting}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a73e8] hover:bg-blue-700 text-white text-xs font-semibold rounded-full shadow-sm transition-all"
                  >
                    <i className="fa-solid fa-video text-sm"></i>
                    <span>Unirse con Google Meet</span>
                  </a>
                </div>
              )}

              {/* FILA DE MODALIDAD / UBICACIÓN */}
              <div className="flex items-center gap-4 pl-1">
                <div className="w-6 text-center text-slate-500 text-sm">
                  <i className={`fa-solid ${modalDetalle.modalidad === 'Presencial' ? 'fa-location-dot' : 'fa-laptop'}`}></i>
                </div>
                <span className="text-xs text-slate-700">
                  {modalDetalle.modalidad === 'Presencial'
                    ? modalDetalle.lugar
                      ? `Presencial (${modalDetalle.lugar})`
                      : 'Presencial (Pendiente de ubicación por el tutor)'
                    : tieneEnlaceValido
                    ? 'Virtual (Google Meet)'
                    : 'Virtual (Pendiente de enlace por el tutor)'}
                </span>
              </div>

              {/* CREADOR / SOLICITANTE DE LA CITA */}
              {modalDetalle.estudianteNombre && (
                <div className="flex items-start gap-4 pl-1">
                  <div className="w-6 text-center text-slate-500 text-sm mt-0.5">
                    <i className="fa-regular fa-user"></i>
                  </div>
                  <div>
                    <p className="text-xs text-slate-900 font-medium">
                      {modalDetalle.estudianteNombre}
                      <span className="text-slate-500 font-normal ml-1">(Estudiante)</span>
                    </p>
                    {modalDetalle.estudianteCorreo && (
                      <p className="text-[11px] text-slate-500 font-mono">
                        {modalDetalle.estudianteCorreo}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TUTOR ASIGNADO */}
              <div className="flex items-start gap-4 pl-1">
                <div className="w-6 text-center text-slate-500 text-sm mt-0.5">
                  <i className="fa-solid fa-user-tie"></i>
                </div>
                <div>
                  <p className="text-xs text-slate-900 font-medium">
                    {modalDetalle.tutorNombre || (typeof modalDetalle.docente === 'object' ? modalDetalle.docente?.nombre : 'Docente')}
                    <span className="text-slate-500 font-normal ml-1">(Tutor asignado)</span>
                  </p>
                  {modalDetalle.tutorEmail && (
                    <p className="text-[11px] text-slate-500 font-mono">
                      {modalDetalle.tutorEmail}
                    </p>
                  )}
                </div>
              </div>

              {/* ACCIONES DEL FOOTER */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                {(modalDetalle.estado === 'Libre' || modalDetalle.estado === 'DISPONIBLE') && (
                  <button
                    onClick={() => {
                      setSelectedSlotId(String(modalDetalle.id));
                      setFechaReserva(modalDetalle.fecha || todayISO);
                      setHoraInicioReserva(modalDetalle.horaInicio || modalDetalle.hora_inicio || '14:00');
                      setHoraFinReserva(modalDetalle.horaFin || modalDetalle.hora_fin || '16:00');
                      if (modalDetalle.tutorNombre) setSelectDocenteForm(modalDetalle.tutorNombre);
                      setModalDetalle(null);
                      document.getElementById('reservar')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-4 py-2 rounded-lg bg-[#1a73e8] hover:bg-blue-700 text-white text-xs font-medium transition-all shadow-xs cursor-pointer"
                  >
                    Reservar este espacio
                  </button>
                )}
                <button
                  onClick={() => setModalDetalle(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-all cursor-pointer"
                >
                  Cerrar
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ÉXITO DE RESERVA */}
      {modalExito && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl relative">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-[var(--green)] flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <h3 className="font-display italic text-xl font-bold text-[var(--ink)]">¡Reserva Agendada!</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tu tutoría con <strong className="text-[var(--ink)]">{docenteSeleccionado}</strong> fue confirmada con éxito para el <strong className="text-[var(--ink)]">{formatearFechaLarga(fechaReserva)}</strong> de <strong className="text-[var(--ink)]">{horaInicioReserva} a {horaFinReserva}</strong>. Se envió la confirmación a <strong className="text-[var(--ink)]">{correoAlt}</strong>.
            </p>
            <button
              onClick={() => {
                setModalExito(false);
                resetFormulario();
              }}
              className="btn-submit cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
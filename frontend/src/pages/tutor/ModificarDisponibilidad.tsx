import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { TutorRail } from '../../components/tutor/TutorRail';
import { StudentRail } from '../../components/estudiante/StudentRail';
import { useAuthStore } from '../../store/useAuthStore';
import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  LayersIcon,
} from '../../components/constelacion/Icons';
import { Modal } from '../../components/constelacion/Modal';
import { api } from '../../api/axios';
import { extraerLista, mensajeError } from '../../utils/api';
import { hoyLocalISO } from '../../utils/date';
import {
  diaSemana,
  diasDeLaSemanaDe,
  duracionLegible,
  fechaConAnio,
  hora12,
  horaActual,
  horaCorta,
} from '../../utils/fechas';
import { modalidadLegible } from '../../utils/panel';

interface BloqueBackend {
  id: number;
  docente: number;
  materia: number | { id?: number; nombre?: string };
  periodo: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  modalidad: string;
  lugar?: string | null;
  enlace_virtual?: string | null;
  cupo_total: number;
  cupo_ocupado: number;
  estado: string;
  observaciones?: string | null;
  materia_nombre?: string;
}

interface MateriaBackend {
  id: number;
  nombre: string;
  activa?: boolean;
}

interface AsignacionDocenteMateria {
  id: number;
  materia: number | string;
  materia_nombre?: string;
  periodo: number | string;
}

/** Lo mínimo de /tutores/solicitudes/ para saber qué materias tiene aprobadas el estudiante. */
interface SolicitudAprobada {
  materia: number | string;
  materia_nombre?: string;
  periodo: number | string;
  estado?: string;
}

/**
 * Rail y pantalla de regreso según quién edita: el docente vuelve a su
 * Calendario y el estudiante tutor a Mis horarios (RF-01).
 */
const navegacionPorRol = (esEstudiante: boolean) =>
  esEstudiante
    ? { Rail: StudentRail, volverA: '/estudiante/mis-horarios', textoVolver: 'Volver a mis horarios' }
    : { Rail: TutorRail, volverA: '/tutor/calendario', textoVolver: 'Volver al calendario' };

const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;

const inputClass =
  'h-[46px] w-full rounded-[14px] border border-faint bg-white px-3.5 text-[12.8px] text-tinta outline-none transition-colors placeholder:text-pebble focus:border-violeta focus:ring-2 focus:ring-violeta/15 disabled:cursor-not-allowed disabled:border-faint disabled:bg-mist disabled:text-muted';

const minutosEntre = (inicio: string, fin: string): number => {
  if (!inicio || !fin) return 0;
  const [h1, m1] = inicio.split(':').map(Number);
  const [h2, m2] = fin.split(':').map(Number);
  if ([h1, m1, h2, m2].some((valor) => Number.isNaN(valor))) return 0;
  return Math.max(h2 * 60 + m2 - (h1 * 60 + m1), 0);
};

const minutosDelDia = (hora: string): number => {
  const [horas, minutos] = hora.split(':').map(Number);
  if (Number.isNaN(horas) || Number.isNaN(minutos)) return 0;
  return horas * 60 + minutos;
};

const idDeMateria = (materia: BloqueBackend['materia']): number | '' => {
  if (typeof materia === 'number') return materia;
  if (materia && typeof materia === 'object' && typeof materia.id === 'number') return materia.id;
  return '';
};

interface FieldProps {
  label: string;
  htmlFor: string;
  children: ReactNode;
}

const Field = ({ label, htmlFor, children }: FieldProps) => (
  <div>
    <label htmlFor={htmlFor} className="block text-[11.9px] font-semibold text-tinta">
      {label}
    </label>
    <div className="mt-1.5">{children}</div>
  </div>
);

interface AlertaProps {
  tono: 'error' | 'exito';
  titulo: string;
  detalle: string;
}

const Alerta = ({ tono, titulo, detalle }: AlertaProps) => {
  const esError = tono === 'error';

  return (
    <div
      role="alert"
      className={`mt-5 rounded-2xl border px-4 py-3 ${
        esError
          ? 'border-peligro/45 bg-[#FDF1EF] text-peligro'
          : 'border-exito/45 bg-[#EAF4EE] text-exito'
      }`}
    >
      <p className="text-[12.7px] font-bold">{titulo}</p>
      <p className="mt-1 text-[11.6px] leading-relaxed opacity-90">{detalle}</p>
    </div>
  );
};

interface InfoRowProps {
  icon: ReactNode;
  titulo: string;
  detalle: string;
}

const InfoRow = ({ icon, titulo, detalle }: InfoRowProps) => (
  <div className="flex items-start gap-3">
    <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[13px] bg-mist text-slate-ink">
      {icon}
    </span>
    <div className="min-w-0">
      <p className="text-[12.8px] font-semibold text-tinta">{titulo}</p>
      <p className="mt-0.5 text-[10.7px] leading-relaxed text-muted">{detalle}</p>
    </div>
  </div>
);

/**
 * Edición de un bloque de disponibilidad ya publicado (GT-200).
 * Reutiliza el contrato de `/disponibilidad/<id>/actualizar/` con PATCH.
 */
export const ModificarDisponibilidad = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const esEstudiante = useAuthStore((state) => state.user?.role) === 'estudiante';
  const { Rail, volverA, textoVolver } = navegacionPorRol(esEstudiante);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [noEncontrado, setNoEncontrado] = useState(false);

  const [bloque, setBloque] = useState<BloqueBackend | null>(null);
  const [materias, setMaterias] = useState<MateriaBackend[]>([]);
  const [bloquesDocente, setBloquesDocente] = useState<BloqueBackend[]>([]);
  // Si no se pudo consultar qué materias tiene habilitadas, solo se conserva la actual.
  const [sinCatalogo, setSinCatalogo] = useState(false);

  const [materiaId, setMateriaId] = useState<number | ''>('');
  const [fecha, setFecha] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [modalidad, setModalidad] = useState<'VIRTUAL' | 'PRESENCIAL'>('VIRTUAL');
  const [ubicacionOEnlace, setUbicacionOEnlace] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const [error, setError] = useState<{ titulo: string; detalle: string } | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  // GT-176 / OBS-008: con reservas activas hay que suspender y publicar de nuevo.
  const [confirmarSuspension, setConfirmarSuspension] = useState(false);
  const [suspendiendo, setSuspendiendo] = useState(false);
  const [motivoSuspension, setMotivoSuspension] = useState('');

  useEffect(() => {
    let activo = true;

    const cargar = async () => {
      try {
        const { data } = await api.get<BloqueBackend>(`/disponibilidad/${id}/actualizar/`);
        if (!activo) return;

        setBloque(data);
        setMateriaId(idDeMateria(data.materia));
        setFecha(data.fecha);
        setHoraInicio(horaCorta(data.hora_inicio));
        setHoraFin(horaCorta(data.hora_fin));
        const esPresencial = (data.modalidad || '').toUpperCase() === 'PRESENCIAL';
        setModalidad(esPresencial ? 'PRESENCIAL' : 'VIRTUAL');
        setUbicacionOEnlace(esPresencial ? (data.lugar ?? '') : (data.enlace_virtual ?? ''));
        setObservaciones(data.observaciones || '');

        const [resAsignaciones, resSolicitudes, resBloques] = await Promise.allSettled([
          // Solo las materias habilitadas en el periodo del bloque: las
          // asignadas al docente o aprobadas al estudiante tutor. El backend
          // rechaza el PATCH si se cambia a una materia fuera de ese conjunto.
          api.get('/catalogo/docentes-materias/?docente=me'),
          api.get('/tutores/solicitudes/?estudiante=me&estado=APROBADA'),
          api.get('/disponibilidad/disponibilidad/?docente=me&incluir_pasados=1'),
        ]);

        if (!activo) return;

        if (resAsignaciones.status === 'fulfilled' || resSolicitudes.status === 'fulfilled') {
          const delPeriodo = (periodo: number | string) => String(periodo) === String(data.periodo);
          const asignadas: MateriaBackend[] = [];
          const agregar = (materia: number | string, nombre?: string) => {
            const idMateria = Number(materia);
            if (!asignadas.some((item) => item.id === idMateria)) {
              asignadas.push({ id: idMateria, nombre: nombre || `Materia ${materia}` });
            }
          };

          if (resAsignaciones.status === 'fulfilled') {
            extraerLista<AsignacionDocenteMateria>(resAsignaciones.value.data)
              .filter((asignacion) => delPeriodo(asignacion.periodo))
              .forEach((asignacion) => agregar(asignacion.materia, asignacion.materia_nombre));
          }

          if (resSolicitudes.status === 'fulfilled') {
            extraerLista<SolicitudAprobada>(resSolicitudes.value.data)
              .filter(
                (solicitud) =>
                  (solicitud.estado || '').toUpperCase() === 'APROBADA' && delPeriodo(solicitud.periodo),
              )
              .forEach((solicitud) => agregar(solicitud.materia, solicitud.materia_nombre));
          }

          // La materia actual se conserva aunque ya no esté asignada: el
          // backend permite mantenerla al editar y el selector no queda vacío.
          const actual = idDeMateria(data.materia);
          if (actual !== '' && !asignadas.some((materia) => materia.id === actual)) {
            asignadas.unshift({
              id: actual,
              nombre: data.materia_nombre || 'Materia actual',
            });
          }

          setMaterias(asignadas);
        } else {
          const actual = idDeMateria(data.materia);
          if (actual !== '') {
            setMaterias([{ id: actual, nombre: data.materia_nombre || 'Materia actual' }]);
          }
          setSinCatalogo(true);
        }

        if (resBloques.status === 'fulfilled') {
          setBloquesDocente(extraerLista<BloqueBackend>(resBloques.value.data));
        }
      } catch (err) {
        if (!activo) return;
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setNoEncontrado(true);
        } else {
          setError({
            titulo: 'No pudimos cargar el horario',
            detalle: mensajeError(err),
          });
        }
      } finally {
        if (activo) setCargando(false);
      }
    };

    void cargar();

    return () => {
      activo = false;
    };
  }, [id]);

  const diasSemana = useMemo(() => diasDeLaSemanaDe(fecha || hoyLocalISO()), [fecha]);

  const materiaNombre = useMemo(() => {
    const encontrada = materias.find((materia) => String(materia.id) === String(materiaId));
    if (encontrada) return encontrada.nombre;
    if (bloque && typeof bloque.materia === 'object' && bloque.materia?.nombre) {
      return bloque.materia.nombre;
    }
    return bloque?.materia_nombre ?? 'Área por definir';
  }, [bloque, materias, materiaId]);

  const minutos = minutosEntre(horaInicio, horaFin);

  const preview = useMemo(() => {
    const inicioMin = minutosDelDia(horaInicio);
    const inicioBarra = Math.min(Math.max((inicioMin / 1440) * 100, 0), 94);
    const anchoBarra = Math.min(Math.max((minutos / 1440) * 100, 4), 100 - inicioBarra);

    return {
      fechaTexto: fecha ? fechaConAnio(fecha) : 'Selecciona una fecha',
      horaTexto:
        horaInicio && horaFin
          ? `${hora12(horaInicio)} – ${hora12(horaFin)}${minutos ? ` · ${duracionLegible(minutos)}` : ''}`
          : 'Selecciona la hora',
      materiaTexto: `${materiaNombre} · ${modalidadLegible(modalidad)}`,
      inicioBarra,
      anchoBarra,
    };
  }, [fecha, horaInicio, horaFin, minutos, materiaNombre, modalidad]);

  const estadoBloque = (bloque?.estado || '').toUpperCase();
  const reservados = bloque?.cupo_ocupado ?? 0;

  // Decisión B (GT-272 / GT-176): con reservas activas el backend no permite
  // cambiar fecha, hora, materia ni modalidad. Solo lugar/enlace y nota.
  const bloqueadoPorReservas = reservados > 0;

  const estadoTexto =
    estadoBloque === 'DISPONIBLE'
      ? 'Disponibilidad publicada'
      : estadoBloque === 'COMPLETO'
        ? 'Cupo completo'
        : 'No disponible';
  const codigoBloque = `DISP-${String(id ?? '').padStart(3, '0')}`;

  const seleccionarDia = (iso: string) => {
    setFecha(iso);
    setExito(null);
    setError(null);
  };

  const limpiarAvisos = () => {
    setExito(null);
    setError(null);
  };

  const cambiarModalidad = (valor: 'VIRTUAL' | 'PRESENCIAL') => {
    setModalidad(valor);
    setUbicacionOEnlace('');
    limpiarAvisos();
  };

  const describirError = (err: unknown): { titulo: string; detalle: string } => {
    if (axios.isAxiosError(err) && err.response?.status === 400) {
      const texto = JSON.stringify(err.response.data ?? {});
      // El backend tiene la última palabra (código bloque_con_reservas).
      if (/bloque_con_reservas/i.test(texto)) {
        return {
          titulo: 'Este horario tiene reservas activas',
          detalle:
            'No se puede cambiar la fecha, la hora, la materia ni la modalidad. Suspende el horario y publica uno nuevo.',
        };
      }
      if (/conflicto/i.test(texto)) {
        const choque = bloquesDocente.find(
          (item) =>
            String(item.id) !== String(id) &&
            item.fecha === fecha &&
            (item.estado || '').toUpperCase() !== 'CANCELADO' &&
            horaCorta(item.hora_inicio) < horaFin &&
            horaCorta(item.hora_fin) > horaInicio,
        );

        return {
          titulo: 'No se puede actualizar la disponibilidad',
          detalle: choque
            ? `El ${diaSemana(choque.fecha).toLowerCase()} ya existe un bloque ocupado de ${hora12(
                horaCorta(choque.hora_inicio),
              )} a ${hora12(horaCorta(choque.hora_fin))}. Cambia el horario para evitar el cruce.`
            : 'El horario se cruza con otro bloque ocupado. Cambia el horario para evitar el cruce.',
        };
      }
    }

    return {
      titulo: 'No se pudo actualizar la disponibilidad',
      detalle: mensajeError(err),
    };
  };

  const ejecutarGuardado = async () => {
    setExito(null);
    setError(null);
    setGuardando(true);

    try {
      const { data } = await api.patch<BloqueBackend>(`/disponibilidad/${id}/actualizar/`, {
        materia: Number(materiaId),
        fecha,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        modalidad,
        lugar: modalidad === 'PRESENCIAL' ? ubicacionOEnlace.trim() : null,
        enlace_virtual: modalidad === 'VIRTUAL' ? ubicacionOEnlace.trim() : null,
        observaciones: observaciones.trim() || null,
      });

      setBloque(data);
      if (esEstudiante) {
        navigate(volverA, { state: { toast: 'Guardaste los cambios del horario.' } });
        return;
      }
      setExito('Los cambios se guardaron correctamente y el horario publicado quedó actualizado.');
    } catch (err) {
      setError(describirError(err));
    } finally {
      setGuardando(false);
    }
  };

  const suspenderHorario = async () => {
    setSuspendiendo(true);
    setError(null);

    try {
      // Mismo flujo del Calendario: DELETE con motivo. El backend cancela las
      // reservas activas y avisa por correo a cada estudiante.
      await api.delete(`/disponibilidad/${id}/actualizar/`, {
        data: { motivo: motivoSuspension.trim() || 'Horario suspendido por el docente' },
      });

      setConfirmarSuspension(false);
      navigate(volverA);
    } catch (err) {
      setConfirmarSuspension(false);
      setError({
        titulo: 'No se pudo suspender el horario',
        detalle: mensajeError(err),
      });
    } finally {
      setSuspendiendo(false);
    }
  };

  const guardar = (event: FormEvent) => {
    event.preventDefault();
    setExito(null);
    setError(null);

    if (!materiaId) {
      setError({
        titulo: 'Revisa los datos del horario',
        detalle: 'Selecciona el área de tutoría.',
      });
      return;
    }

    if (!fecha || !horaInicio || !horaFin) {
      setError({
        titulo: 'Revisa los datos del horario',
        detalle: 'Completa la fecha y las horas de inicio y finalización.',
      });
      return;
    }

    if (fecha < hoyLocalISO()) {
      setError({
        titulo: 'Revisa los datos del horario',
        detalle: 'No puedes mover un horario a una fecha anterior a hoy.',
      });
      return;
    }

    if (fecha === hoyLocalISO() && horaInicio <= horaActual()) {
      setError({
        titulo: 'Revisa los datos del horario',
        detalle: 'La hora de inicio ya pasó. Elige una hora posterior a la actual.',
      });
      return;
    }

    if (horaInicio >= horaFin) {
      setError({
        titulo: 'Revisa los datos del horario',
        detalle: 'La hora de inicio debe ser anterior a la hora de finalización.',
      });
      return;
    }

    if (!ubicacionOEnlace.trim()) {
      setError({
        titulo: 'Revisa los datos del horario',
        detalle:
          modalidad === 'VIRTUAL'
            ? 'Agrega el enlace de la reunión para la modalidad virtual.'
            : 'Agrega el lugar o aula para la modalidad presencial.',
      });
      return;
    }

    void ejecutarGuardado();
  };

  if (noEncontrado) {
    return (
      <div className="flex min-h-screen bg-mist font-constelacion text-tinta">
        <Rail />
        <main className="min-w-0 flex-1 p-5 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[640px] rounded-[32px] bg-white p-8 text-center">
            <h1 className="text-[22px] font-semibold text-tinta">No encontramos este horario</h1>
            <p className="mt-2 text-[12.5px] text-muted">
              El bloque no existe o no pertenece a tu cuenta.
            </p>
            <Link
              to={volverA}
              className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-violeta-accion px-6 text-[12.5px] font-semibold text-white transition-colors hover:bg-violeta-profundo"
            >
              {textoVolver}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-mist font-constelacion text-tinta">
      <Rail />

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1600px] px-5 py-6 pb-24 sm:px-7 md:pb-6 lg:px-8">
          <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11.5px] text-muted">Mi trabajo · {esEstudiante ? 'Estudiante tutor' : 'Tutor'}</p>
              <h1 className="mt-1 text-[30px] font-medium leading-tight tracking-[-0.02em] text-tinta sm:text-[36px]">
                Modificar disponibilidad
              </h1>
              <p className="mt-1 max-w-[620px] text-[13px] leading-relaxed text-muted">
                Edita un horario que ya publicaste. El sistema verificará que el nuevo bloque no se
                cruce con una tutoría u otra actividad ocupada.
              </p>
            </div>

            <div className="rounded-[22px] bg-white px-4 py-3 text-right">
              <p className="text-[10.5px] text-muted">Estado del bloque</p>
              <p className="mt-0.5 text-[13.5px] font-medium text-tinta">{estadoTexto}</p>
            </div>
          </header>

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-[32px] bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[18px] font-medium text-tinta">Editar horario</h2>
                  <p className="mt-1 text-[11.5px] text-muted">
                    Actualiza los datos de tu disponibilidad.
                  </p>
                </div>
                <span className="rounded-full bg-mist px-3 py-1.5 text-[11px] text-muted">
                  {codigoBloque}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3 border-b border-faint pb-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-mist text-slate-ink">
                  <CalendarIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.9px] font-semibold text-tinta">
                    Bloque de disponibilidad seleccionado
                  </p>
                  <p className="text-[10.7px] text-muted">
                    Horario publicado y visible para estudiantes
                  </p>
                </div>
                <span
                  className={`hidden rounded-full px-3 py-1.5 text-[10.7px] font-semibold sm:inline-flex ${
                    estadoBloque === 'DISPONIBLE' || estadoBloque === 'COMPLETO'
                      ? 'bg-salvia/45 text-exito'
                      : 'bg-mist text-muted'
                  }`}
                >
                  {estadoBloque === 'DISPONIBLE' || estadoBloque === 'COMPLETO'
                    ? 'Publicado'
                    : 'No publicado'}
                </span>
              </div>

              {!cargando && reservados > 0 && (
                <div
                  role="status"
                  className="mt-5 rounded-2xl border border-advertencia/30 bg-advertencia/5 px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[12.3px] font-semibold text-advertencia">
                        Este horario tiene {reservados}{' '}
                        {reservados === 1 ? 'reserva' : 'reservas'}
                      </p>
                      <p className="mt-1 text-[11.4px] leading-relaxed text-advertencia/90">
                        Para cambiar la fecha, la hora, la materia o la modalidad, suspéndelo y
                        publica uno nuevo. Aquí solo puedes actualizar el lugar o enlace y las
                        observaciones.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMotivoSuspension('');
                        setConfirmarSuspension(true);
                      }}
                      className="h-9 shrink-0 rounded-full border border-peligro/40 bg-white px-4 text-[11.5px] font-semibold text-peligro transition-colors hover:bg-peligro/5"
                    >
                      Suspender horario
                    </button>
                  </div>
                </div>
              )}

              {cargando ? (
                <div className="mt-5 space-y-3">
                  <div className="h-10 w-64 animate-pulse rounded-full bg-mist" />
                  <div className="h-[280px] animate-pulse rounded-2xl bg-mist" />
                </div>
              ) : (
                <form onSubmit={guardar} className="mt-5">
                  <label className="block text-[11.9px] font-semibold text-tinta">
                    Día disponible
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {diasSemana.map((dia, indice) => {
                      const iso = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(
                        dia.getDate(),
                      ).padStart(2, '0')}`;
                      const activo = iso === fecha;
                      const pasado = iso < hoyLocalISO();
                      const fijo = pasado || bloqueadoPorReservas;

                      return (
                        <button
                          key={iso}
                          type="button"
                          onClick={() => seleccionarDia(iso)}
                          disabled={fijo}
                          aria-pressed={activo}
                          aria-label={
                            bloqueadoPorReservas
                              ? `${DIAS_CORTOS[indice]} ${dia.getDate()} (bloqueado por reservas)`
                              : pasado
                                ? `${DIAS_CORTOS[indice]} ${dia.getDate()} (fecha pasada)`
                                : `Seleccionar ${DIAS_CORTOS[indice]} ${dia.getDate()}`
                          }
                          className={`h-10 w-12 rounded-[13px] text-[11px] font-medium transition-colors ${
                            pasado
                              ? 'cursor-not-allowed border border-faint bg-white text-pebble'
                              : activo
                                ? `bg-tinta text-white ${bloqueadoPorReservas ? 'cursor-not-allowed' : ''}`
                                : bloqueadoPorReservas
                                  ? 'cursor-not-allowed border border-faint bg-white text-pebble'
                                  : 'border border-faint bg-white text-slate-ink hover:bg-mist'
                          }`}
                        >
                          {DIAS_CORTOS[indice]}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-5 flex items-center gap-2">
                    <span className="h-[18px] w-[3px] rounded-full bg-violeta-accion" />
                    <p className="text-[12.9px] font-semibold text-tinta">Fecha y horario</p>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Fecha de inicio" htmlFor="fecha-inicio">
                      <input
                        id="fecha-inicio"
                        type="date"
                        required
                        min={hoyLocalISO()}
                        value={fecha}
                        disabled={bloqueadoPorReservas}
                        onChange={(event) => {
                          setFecha(event.target.value);
                          limpiarAvisos();
                        }}
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Frecuencia" htmlFor="frecuencia">
                      <select
                        id="frecuencia"
                        disabled
                        value="UNICA"
                        className={`${inputClass} cursor-not-allowed bg-mist text-muted`}
                      >
                        <option value="UNICA">Única (bloque individual)</option>
                      </select>
                    </Field>

                    <Field label="Hora de inicio" htmlFor="hora-inicio">
                      <input
                        id="hora-inicio"
                        type="time"
                        required
                        value={horaInicio}
                        disabled={bloqueadoPorReservas}
                        onChange={(event) => {
                          setHoraInicio(event.target.value);
                          limpiarAvisos();
                        }}
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Hora de finalización" htmlFor="hora-fin">
                      <input
                        id="hora-fin"
                        type="time"
                        required
                        value={horaFin}
                        disabled={bloqueadoPorReservas}
                        onChange={(event) => {
                          setHoraFin(event.target.value);
                          limpiarAvisos();
                        }}
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Área de tutoría" htmlFor="area-tutoria">
                      <select
                        id="area-tutoria"
                        required
                        value={materiaId}
                        disabled={bloqueadoPorReservas || sinCatalogo}
                        aria-describedby={sinCatalogo ? 'area-tutoria-nota' : undefined}
                        onChange={(event) => {
                          setMateriaId(Number(event.target.value));
                          limpiarAvisos();
                        }}
                        className={`${inputClass} cursor-pointer disabled:cursor-not-allowed`}
                      >
                        {materias.length === 0 ? (
                          <option value="">No tienes materias asignadas en este periodo</option>
                        ) : (
                          materias.map((materia) => (
                            <option key={materia.id} value={materia.id}>
                              {materia.nombre}
                            </option>
                          ))
                        )}
                      </select>
                      {sinCatalogo && (
                        <p id="area-tutoria-nota" className="mt-1.5 text-[10.7px] leading-relaxed text-muted">
                          No pudimos consultar tus materias habilitadas. Se conserva la materia actual.
                        </p>
                      )}
                    </Field>

                    <Field label="Modalidad" htmlFor="modalidad">
                      <select
                        id="modalidad"
                        value={modalidad}
                        disabled={bloqueadoPorReservas}
                        onChange={(event) =>
                          cambiarModalidad(event.target.value as 'VIRTUAL' | 'PRESENCIAL')
                        }
                        className={`${inputClass} cursor-pointer disabled:cursor-not-allowed`}
                      >
                        <option value="VIRTUAL">Virtual</option>
                        <option value="PRESENCIAL">Presencial</option>
                      </select>
                    </Field>

                    <div className="sm:col-span-2">
                      <Field
                        label={modalidad === 'VIRTUAL' ? 'Enlace de la reunión' : 'Lugar / Aula'}
                        htmlFor="ubicacion-enlace"
                      >
                        <input
                          id="ubicacion-enlace"
                          type={modalidad === 'VIRTUAL' ? 'url' : 'text'}
                          required
                          placeholder={
                            modalidad === 'VIRTUAL'
                              ? 'https://meet.google.com/...'
                              : 'Bloque C, aula 302'
                          }
                          value={ubicacionOEnlace}
                          onChange={(event) => {
                            setUbicacionOEnlace(event.target.value);
                            limpiarAvisos();
                          }}
                          className={inputClass}
                        />
                      </Field>
                    </div>

                    <div className="sm:col-span-2">
                      <Field label="Nota para estudiantes (opcional)" htmlFor="observaciones">
                        <textarea
                          id="observaciones"
                          rows={3}
                          placeholder="Disponible para resolver dudas y hacer ejercicios prácticos."
                          value={observaciones}
                          onChange={(event) => {
                            setObservaciones(event.target.value);
                            limpiarAvisos();
                          }}
                          className={`${inputClass} h-auto resize-none py-3`}
                        />
                      </Field>
                    </div>
                  </div>

                  {error && <Alerta tono="error" titulo={error.titulo} detalle={error.detalle} />}
                  {exito && (
                    <Alerta tono="exito" titulo="Disponibilidad actualizada" detalle={exito} />
                  )}

                  <div className="mt-5 flex flex-col gap-3 border-t border-faint pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[10.7px] text-muted">
                      {bloqueadoPorReservas
                        ? 'Con reservas activas solo se guardan el lugar o enlace y las observaciones.'
                        : 'Los cambios se validan antes de actualizarse.'}
                    </p>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => navigate(volverA)}
                        className="h-11 rounded-full bg-mist px-5 text-[12.9px] font-semibold text-tinta transition-colors hover:bg-faint"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={guardando || materias.length === 0}
                        className="h-11 rounded-full bg-violeta-accion px-6 text-[12.8px] font-semibold text-white shadow-constelacion-violet transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {guardando ? 'Guardando...' : 'Guardar cambios'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </section>

            <aside className="space-y-5">
              <section className="rounded-[32px] bg-white p-5 sm:p-6">
                <h2 className="text-[18px] font-medium text-tinta">Validación de horario</h2>
                <p className="mt-1 text-[11.7px] text-muted">Qué revisa el sistema al guardar</p>

                <div className="mt-4 space-y-3">
                  <InfoRow
                    icon={<CheckIcon className="h-5 w-5" />}
                    titulo="Sin cruces"
                    detalle="La disponibilidad se actualiza y los estudiantes ven el horario modificado."
                  />
                  <div className="border-t border-faint" />
                  <InfoRow
                    icon={<ClockIcon className="h-5 w-5" />}
                    titulo="Con un bloque ocupado"
                    detalle="El sistema rechaza la edición y muestra una alerta. El horario anterior se conserva."
                  />
                  <div className="border-t border-faint" />
                  <InfoRow
                    icon={<CalendarIcon className="h-5 w-5" />}
                    titulo="Con reservas activas"
                    detalle="No se puede cambiar la fecha, la hora, la materia ni la modalidad. Suspende el horario y publica uno nuevo."
                  />
                </div>
              </section>

              <section className="rounded-[32px] bg-white p-5 sm:p-6">
                <h2 className="text-[18px] font-medium text-tinta">Vista previa</h2>
                <p className="mt-1 text-[11.6px] text-muted">
                  Resumen de los datos que estás editando.
                </p>

                <div className="mt-4 rounded-[18px] bg-mist p-4">
                  <p className="text-[9.8px] text-muted">Día seleccionado</p>
                  <p className="mt-1 text-[12.9px] font-semibold text-tinta">
                    {preview.fechaTexto}
                  </p>
                  <p className="mt-1 text-[10.7px] text-muted">{preview.horaTexto}</p>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#e3e6e8]">
                    <div
                      className="h-full rounded-full bg-terracota transition-all"
                      style={{
                        marginLeft: `${preview.inicioBarra}%`,
                        width: `${preview.anchoBarra}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-start gap-3">
                  <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[13px] bg-mist text-slate-ink">
                    <LayersIcon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12.9px] font-semibold text-tinta">
                      {preview.materiaTexto}
                    </p>
                    <p className="text-[10.7px] text-muted">
                      Área y modalidad de la tutoría.
                    </p>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </main>

      {confirmarSuspension && (
        <Modal
          onCerrar={() => setConfirmarSuspension(false)}
          tituloId="suspender-horario"
          eyebrow="GT-176 · Horario con reservas"
          eyebrowClassName="text-peligro"
          titulo="Suspender este horario"
          ancho="md"
          cerrable={!suspendiendo}
        >
          <div className="px-6 pb-6 pt-4 sm:px-7">
            <p className="text-[12.4px] leading-relaxed text-muted">
              Se cancelarán las {reservados} {reservados === 1 ? 'reserva activa' : 'reservas activas'}{' '}
              y se avisará por correo a cada estudiante. Después podrás publicar un horario nuevo con
              la fecha o la hora que necesites.
            </p>

            <label
              htmlFor="motivo-suspension"
              className="mt-4 block text-[11.9px] font-semibold text-tinta"
            >
              Motivo (opcional)
            </label>
            <textarea
              id="motivo-suspension"
              rows={3}
              value={motivoSuspension}
              onChange={(event) => setMotivoSuspension(event.target.value)}
              placeholder="Ej.: Incapacidad médica, cambio de horario académico..."
              className="mt-1.5 w-full resize-none rounded-[14px] border border-faint bg-white px-3.5 py-3 text-[12.8px] text-tinta outline-none transition-colors placeholder:text-pebble focus:border-violeta focus:ring-2 focus:ring-violeta/15"
            />

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmarSuspension(false)}
                disabled={suspendiendo}
                className="h-11 rounded-full bg-mist px-5 text-[12.9px] font-semibold text-tinta transition-colors hover:bg-faint disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void suspenderHorario()}
                disabled={suspendiendo}
                className="h-11 rounded-full bg-peligro px-6 text-[12.8px] font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {suspendiendo ? 'Suspendiendo...' : 'Sí, suspender horario'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ModificarDisponibilidad;

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import axios from 'axios';
import { Loader } from '../../components/Loader';
import { TutorRail } from '../../components/tutor/TutorRail';
import { CalendarIcon, CheckIcon, ClockIcon, LayersIcon } from '../../components/constelacion/Icons';
import { api } from '../../api/axios';
import { extraerLista, mensajeError } from '../../utils/api';
import { fechaLocalISO, hoyLocalISO } from '../../utils/date';
import {
  diasDeLaSemanaDe,
  duracionLegible,
  fechaConAnio,
  hora12,
  horaActual,
} from '../../utils/fechas';

// Interfaz para la respuesta de MateriaSerializer (Django)
export interface MateriaBackend {
  id: number;
  codigo: string;
  nombre: string;
  creditos?: number;
  semestre?: number;
  programa?: number;
  activa: boolean;
}

// Interfaz para la respuesta de PeriodoAcademico (Django)
export interface PeriodoBackend {
  id: number;
  codigo: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  activo: boolean;
}

const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;

const inputClass =
  'h-[46px] w-full rounded-[14px] border border-faint bg-white px-3.5 text-[12.8px] text-tinta outline-none transition-colors placeholder:text-pebble focus:border-violeta focus:ring-2 focus:ring-violeta/15';

const minutosEntre = (inicio: string, fin: string): number => {
  if (!inicio || !fin) return 0;
  const [h1, m1] = inicio.split(':').map(Number);
  const [h2, m2] = fin.split(':').map(Number);
  if ([h1, m1, h2, m2].some((valor) => Number.isNaN(valor))) return 0;
  return Math.max(h2 * 60 + m2 - (h1 * 60 + m1), 0);
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

export const MiDisponibilidad = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [materias, setMaterias] = useState<MateriaBackend[]>([]);
  const [, setPeriodos] = useState<PeriodoBackend[]>([]);
  const [materiaId, setMateriaId] = useState<string | number>('');
  const [periodoId, setPeriodoId] = useState<string | number>('');

  const [fecha, setFecha] = useState(() => fechaLocalISO(new Date()));
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [modalidad, setModalidad] = useState<'VIRTUAL' | 'PRESENCIAL'>('VIRTUAL');
  const [ubicacionOEnlace, setUbicacionOEnlace] = useState('');
  const [cupo, setCupo] = useState(1);
  const [observaciones, setObservaciones] = useState('');

  const [exito, setExito] = useState<string | null>(null);
  const [error, setError] = useState<{ titulo: string; detalle: string } | null>(null);

  useEffect(() => {
    let ignore = false;

    const cargarCatalogos = async () => {
      const [resMaterias, resPeriodos] = await Promise.allSettled([
        api.get('/catalogo/materias/'),
        api.get('/catalogo/periodos/'),
      ]);

      if (ignore) return;

      if (resMaterias.status === 'fulfilled') {
        const activas = extraerLista<MateriaBackend>(resMaterias.value.data).filter(
          (materia) => materia.activa !== false,
        );
        setMaterias(activas);
        if (activas.length > 0) {
          setMateriaId((previo) => previo || activas[0].id);
        }
      }

      if (resPeriodos.status === 'fulfilled') {
        const lista = extraerLista<PeriodoBackend>(resPeriodos.value.data);
        setPeriodos(lista);
        const activo = lista.find((periodo) => periodo.activo) || lista[0];
        if (activo) {
          setPeriodoId((previo) => previo || activo.id);
        }
      }

      if (resMaterias.status === 'rejected' && resPeriodos.status === 'rejected') {
        setError({
          titulo: 'No pudimos cargar el formulario',
          detalle: 'Revisa tu conexión e intenta de nuevo.',
        });
      }

      setLoading(false);
    };

    void cargarCatalogos();

    return () => {
      ignore = true;
    };
  }, []);

  const diasSemana = useMemo(() => diasDeLaSemanaDe(fecha || hoyLocalISO()), [fecha]);

  const preview = useMemo(() => {
    const materia = materias.find((item) => String(item.id) === String(materiaId));
    const minutos = minutosEntre(horaInicio, horaFin);
    const modalidadTexto = modalidad === 'VIRTUAL' ? 'Virtual' : 'Presencial';

    return {
      fechaTexto: fecha ? fechaConAnio(fecha) : 'Selecciona una fecha',
      horaTexto:
        horaInicio && horaFin
          ? `${hora12(horaInicio)} – ${hora12(horaFin)}${
              minutos ? ` · ${duracionLegible(minutos)}` : ''
            }`
          : 'Selecciona la hora',
      materiaTexto: materia
        ? `${materia.nombre} · ${modalidadTexto}`
        : `Área por definir · ${modalidadTexto}`,
      barra: minutos ? Math.min(Math.max((minutos / 240) * 100, 10), 100) : 0,
    };
  }, [fecha, horaInicio, horaFin, materias, materiaId, modalidad]);

  const seleccionarDia = (iso: string) => {
    setFecha(iso);
    setExito(null);
    setError(null);
  };

  const cambiarModalidad = (valor: 'VIRTUAL' | 'PRESENCIAL') => {
    setModalidad(valor);
    setUbicacionOEnlace('');
  };

  const limpiar = () => {
    setHoraInicio('');
    setHoraFin('');
    setUbicacionOEnlace('');
    setCupo(1);
    setObservaciones('');
    setExito(null);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
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

    if (!periodoId) {
      setError({
        titulo: 'No hay un periodo académico activo',
        detalle: 'Pide a coordinación que active el periodo antes de publicar.',
      });
      return;
    }

    if (!fecha || !horaInicio || !horaFin || !ubicacionOEnlace.trim()) {
      setError({
        titulo: 'Revisa los datos del horario',
        detalle: 'Completa la fecha, las horas y el lugar o enlace.',
      });
      return;
    }

    if (fecha < hoyLocalISO()) {
      setError({
        titulo: 'Revisa los datos del horario',
        detalle: 'No puedes publicar disponibilidad en una fecha anterior a hoy.',
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
        detalle: 'La hora de inicio debe ser anterior a la hora de fin.',
      });
      return;
    }

    if (!Number.isFinite(cupo) || cupo < 1) {
      setError({
        titulo: 'Revisa los datos del horario',
        detalle: 'El cupo debe ser un número mayor o igual a 1.',
      });
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        materia: Number(materiaId),
        periodo: Number(periodoId),
        fecha,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        modalidad,
        lugar: modalidad === 'PRESENCIAL' ? ubicacionOEnlace.trim() : '',
        enlace_virtual: modalidad === 'VIRTUAL' ? ubicacionOEnlace.trim() : '',
        cupo_total: cupo,
        observaciones: observaciones.trim() || null,
      };

      await api.post('/disponibilidad/disponibilidad/', payload);
      setExito('El horario se guardó correctamente y ya está visible para los estudiantes.');
    } catch (err) {
      const detalle = mensajeError(err);
      const esConflicto =
        axios.isAxiosError(err) && err.response?.status === 400 && /conflicto/i.test(detalle);

      setError(
        esConflicto
          ? {
              titulo: 'No se puede publicar este horario',
              detalle:
                'El horario seleccionado se cruza con una tutoría u otro espacio registrado. Ajusta el día o la hora e inténtalo de nuevo.',
            }
          : { titulo: 'No pudimos publicar el horario', detalle },
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-mist font-constelacion text-tinta">
      <Loader hidden={!loading} />
      <TutorRail />

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1600px] px-5 py-6 pb-24 sm:px-7 md:pb-6 lg:px-8">
          <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11.5px] text-muted">Mi trabajo · Tutor</p>
              <h1 className="mt-1 text-[30px] font-medium leading-tight tracking-[-0.02em] text-tinta sm:text-[36px]">
                Publicar disponibilidad
              </h1>
              <p className="mt-1 max-w-[600px] text-[13px] leading-relaxed text-muted">
                Define tus horarios disponibles para que los estudiantes puedan reservar tutorías
                sin contactarte directamente.
              </p>
            </div>

            <div className="rounded-[22px] bg-white px-4 py-3 text-right">
              <p className="text-[10.5px] text-muted">Estado del bloque</p>
              <p className="mt-0.5 text-[13.5px] font-medium text-tinta">Nuevo horario</p>
            </div>
          </header>

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_530px]">
            {/* ------------------------- Formulario ------------------------- */}
            <section className="rounded-[32px] bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[18px] font-medium text-tinta">Nuevo horario disponible</h2>
                  <p className="mt-1 text-[11.5px] text-muted">
                    Completa los datos para publicar tu disponibilidad.
                  </p>
                </div>
                <span className="rounded-full bg-mist px-3 py-1.5 text-[11px] text-muted">
                  Nuevo bloque
                </span>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3 border-b border-faint pb-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-mist text-slate-ink">
                  <CalendarIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.9px] font-semibold text-tinta">
                    Estás creando un nuevo bloque
                  </p>
                  <p className="text-[10.7px] text-muted">
                    Se mostrará a los estudiantes después de publicarlo.
                  </p>
                </div>
                <span className="hidden rounded-full bg-mist px-3 py-1.5 text-[10.7px] text-muted sm:inline-flex">
                  Sin publicar
                </span>
              </div>

              <form onSubmit={handleSubmit} className="mt-5">
                <label className="block text-[11.9px] font-semibold text-tinta">
                  Día disponible
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {diasSemana.map((dia, indice) => {
                    const iso = fechaLocalISO(dia);
                    const activo = iso === fecha;
                    const pasado = iso < hoyLocalISO();

                    return (
                      <button
                        key={iso}
                        type="button"
                        onClick={() => seleccionarDia(iso)}
                        disabled={pasado}
                        aria-pressed={activo}
                        aria-label={
                          pasado
                            ? `${DIAS_CORTOS[indice]} ${dia.getDate()} (fecha pasada)`
                            : `Seleccionar ${DIAS_CORTOS[indice]} ${dia.getDate()}`
                        }
                        className={`h-10 w-12 rounded-[13px] text-[11px] font-medium transition-colors ${
                          pasado
                            ? 'cursor-not-allowed border border-faint bg-white text-pebble'
                            : activo
                              ? 'bg-tinta text-white'
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
                  <Field label="Fecha de la tutoría" htmlFor="fecha-tutoria">
                    <input
                      id="fecha-tutoria"
                      type="date"
                      required
                      min={hoyLocalISO()}
                      value={fecha}
                      onChange={(event) => {
                        setFecha(event.target.value);
                        setExito(null);
                        setError(null);
                      }}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Cupo" htmlFor="cupo">
                    <input
                      id="cupo"
                      type="number"
                      required
                      min={1}
                      step={1}
                      value={cupo}
                      onChange={(event) => {
                        setCupo(Number(event.target.value));
                        setExito(null);
                        setError(null);
                      }}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Hora de inicio" htmlFor="hora-inicio">
                    <input
                      id="hora-inicio"
                      type="time"
                      required
                      value={horaInicio}
                      onChange={(event) => {
                        setHoraInicio(event.target.value);
                        setExito(null);
                        setError(null);
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
                      onChange={(event) => {
                        setHoraFin(event.target.value);
                        setExito(null);
                        setError(null);
                      }}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Área de tutoría" htmlFor="area-tutoria">
                    <select
                      id="area-tutoria"
                      required
                      value={materiaId}
                      onChange={(event) => {
                        setMateriaId(event.target.value);
                        setExito(null);
                        setError(null);
                      }}
                      className={`${inputClass} cursor-pointer`}
                    >
                      {materias.length === 0 ? (
                        <option value="">No hay materias registradas</option>
                      ) : (
                        materias.map((materia) => (
                          <option key={materia.id} value={materia.id}>
                            {materia.nombre}
                          </option>
                        ))
                      )}
                    </select>
                  </Field>

                  <Field label="Modalidad" htmlFor="modalidad">
                    <select
                      id="modalidad"
                      value={modalidad}
                      onChange={(event) =>
                        cambiarModalidad(event.target.value as 'VIRTUAL' | 'PRESENCIAL')
                      }
                      className={`${inputClass} cursor-pointer`}
                    >
                      <option value="VIRTUAL">Virtual</option>
                      <option value="PRESENCIAL">Presencial</option>
                    </select>
                  </Field>

                  <div className="sm:col-span-2">
                    <Field
                      label={
                        modalidad === 'VIRTUAL'
                          ? 'Enlace de la reunión'
                          : 'Lugar / Aula'
                      }
                      htmlFor="ubicacion-enlace"
                    >
                      <input
                        id="ubicacion-enlace"
                        type="text"
                        required
                        placeholder={
                          modalidad === 'VIRTUAL'
                            ? 'https://meet.google.com/...'
                            : 'Ej. Biblioteca, Segundo Piso'
                        }
                        value={ubicacionOEnlace}
                        onChange={(event) => {
                          setUbicacionOEnlace(event.target.value);
                          setExito(null);
                          setError(null);
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
                        onChange={(event) => setObservaciones(event.target.value)}
                        className={`${inputClass} h-auto resize-none py-3`}
                      />
                    </Field>
                  </div>
                </div>

                {error && <Alerta tono="error" titulo={error.titulo} detalle={error.detalle} />}
                {exito && (
                  <Alerta tono="exito" titulo="Disponibilidad publicada" detalle={exito} />
                )}

                <div className="mt-5 flex flex-col gap-3 border-t border-faint pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[10.7px] text-muted">
                    El horario se valida antes de publicarse.
                  </p>

                  <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={limpiar}
                      className="h-11 rounded-full bg-mist px-5 text-[12.9px] font-semibold text-tinta transition-colors hover:bg-faint"
                    >
                      Limpiar
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || materias.length === 0 || !periodoId}
                      className="h-11 rounded-full bg-violeta-accion px-6 text-[12.8px] font-semibold text-white shadow-constelacion-violet transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? 'Publicando...' : 'Publicar disponibilidad'}
                    </button>
                  </div>
                </div>
              </form>
            </section>

            {/* --------------------------- Aside --------------------------- */}
            <aside className="space-y-5">
              <section className="rounded-[32px] bg-white p-5 sm:p-6">
                <h2 className="text-[18px] font-medium text-tinta">Antes de publicar</h2>
                <p className="mt-1 text-[11.7px] text-muted">Qué revisa el sistema</p>

                <div className="mt-4 space-y-3">
                  <InfoRow
                    icon={<CheckIcon className="h-5 w-5" />}
                    titulo="Horario válido"
                    detalle="La disponibilidad se guarda y queda visible para que los estudiantes puedan reservar."
                  />
                  <div className="border-t border-faint" />
                  <InfoRow
                    icon={<ClockIcon className="h-5 w-5" />}
                    titulo="Conflicto de horario"
                    detalle="El sistema no publica el bloque y te muestra una alerta para que ajustes el horario."
                  />
                </div>
              </section>

              <section className="rounded-[32px] bg-white p-5 sm:p-6">
                <h2 className="text-[18px] font-medium text-tinta">Vista previa</h2>
                <p className="mt-1 text-[11.6px] text-muted">
                  Así verán los estudiantes tu disponibilidad.
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
                      style={{ width: `${preview.barra}%` }}
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
    </div>
  );
};

export default MiDisponibilidad;

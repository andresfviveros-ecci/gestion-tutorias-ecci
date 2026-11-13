import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { api } from '../api/axios';
import { AdminRail } from '../components/admin/AdminRail';
import { Toast } from '../components/constelacion/Toast';
import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  LayersIcon,
  ListIcon,
  UserIcon,
} from '../components/constelacion/Icons';
import { useAuthStore } from '../store/useAuthStore';
import { erroresPorCampo, mensajeError } from '../utils/api';

/** Los 12 parámetros de GET/PATCH /catalogo/configuracion/ (las notas llegan como texto decimal). */
interface Configuracion {
  cupos_semanales_tutor: number;
  horas_anticipacion_reservar: number;
  horas_anticipacion_cancelar: number;
  /** RF-02: nota desde la que una materia cursada cuenta como aprobada. */
  nota_aprobatoria: number | string;
  nota_minima: number | string;
  semestre_minimo_tutor: number;
  diferencia_semestres: number;
  peso_corte1: number;
  peso_corte2: number;
  peso_corte3: number;
  calificacion_minima: number;
  calificacion_maxima: number;
}

interface Original {
  limite: number;
  reservar: number;
  cancelar: number;
  aprobatoria: number;
  notaMinima: number;
  semestreMinimo: number;
  diferencia: number;
  peso1: number;
  peso2: number;
  peso3: number;
  calificacionMinima: number;
  calificacionMaxima: number;
}

const aNumero = (valor: unknown, porDefecto: number): number => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : porDefecto;
};

/** Valores de la pantalla a partir de la respuesta (con los mismos respaldos del backend). */
const desdeApi = (config: Configuracion): Original => ({
  limite: config.cupos_semanales_tutor,
  reservar: config.horas_anticipacion_reservar,
  cancelar: config.horas_anticipacion_cancelar,
  aprobatoria: Number(config.nota_aprobatoria) || 3,
  notaMinima: aNumero(config.nota_minima, 4),
  semestreMinimo: aNumero(config.semestre_minimo_tutor, 3),
  diferencia: aNumero(config.diferencia_semestres, 2),
  peso1: aNumero(config.peso_corte1, 30),
  peso2: aNumero(config.peso_corte2, 30),
  peso3: aNumero(config.peso_corte3, 40),
  calificacionMinima: aNumero(config.calificacion_minima, 1),
  calificacionMaxima: aNumero(config.calificacion_maxima, 10),
});

/** Escala de la calificación del tutor que acepta el backend. */
const CALIFICACION_MIN = 1;
const CALIFICACION_MAX = 10;

const acotar = (valor: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, valor));

const horaMenos = (horas: number): { dia: string; hora: string } => {
  const total = 15 * 60 - horas * 60;
  const dias = Math.floor(horas / 24);
  const normalizado = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hora = `${String(Math.floor(normalizado / 60)).padStart(2, '0')}:${String(
    normalizado % 60,
  ).padStart(2, '0')}`;

  if (horas === 0) return { dia: 'el mismo día', hora: '15:00' };
  if (dias === 0) return { dia: 'el mismo día', hora };
  if (dias === 1) return { dia: 'el día anterior', hora };
  return { dia: `hace ${dias} días`, hora };
};

const ejemploReserva = (horas: number): string => {
  if (horas === 0) {
    return 'para una tutoría el jue 19 · 15:00, se puede reservar hasta el inicio';
  }
  const { dia, hora } = horaMenos(horas);
  return `para una tutoría el jue 19 · 15:00, se puede reservar hasta ${dia} · ${hora}`;
};

const ejemploCancelacion = (horas: number): string => {
  if (horas === 0) {
    return 'la misma tutoría se puede cancelar hasta el inicio';
  }
  const { dia, hora } = horaMenos(horas);
  return `la misma tutoría se puede cancelar hasta ${dia} · ${hora}`;
};

const InfoIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M8 7.2v4M8 4.8v.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const ResumenPill = ({
  valor,
  etiqueta,
  detalle,
  clase,
}: {
  valor: string;
  etiqueta: string;
  detalle: string;
  clase: string;
}) => (
  <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2">
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${clase}`}
    >
      {valor}
    </span>
    <div className="min-w-0">
      <p className="text-[10.5px] font-semibold leading-none text-tinta">{etiqueta}</p>
      <p className="mt-0.5 text-[9.5px] text-muted">{detalle}</p>
    </div>
  </div>
);

interface StepperProps {
  valor: number;
  onChange: (valor: number) => void;
  min: number;
  max: number;
  unidad: string;
  vacio?: string;
  ancho?: string;
  ariaLabel: string;
}

const Stepper = ({
  valor,
  onChange,
  min,
  max,
  unidad,
  vacio,
  ancho = 'min-w-[82px]',
  ariaLabel,
}: StepperProps) => {
  const vacioVisible = valor === 0 && Boolean(vacio);

  return (
    <div className="inline-flex h-12 items-center gap-1 rounded-full bg-mist px-1.5">
      <button
        type="button"
        onClick={() => onChange(acotar(valor - 1, min, max))}
        disabled={valor <= min}
        aria-label={`Disminuir ${ariaLabel}`}
        className="flex h-9 w-9 items-center justify-center rounded-full text-[18px] font-medium text-slate-ink transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        −
      </button>
      <span className={`${ancho} text-center text-[16px] font-semibold leading-none text-tinta`}>
        {vacioVisible ? (
          <span className="text-[12px] font-medium text-muted">{vacio}</span>
        ) : (
          <>
            {valor}
            <span className="ml-1 text-[11px] font-medium text-muted">{unidad}</span>
          </>
        )}
      </span>
      <button
        type="button"
        onClick={() => onChange(acotar(valor + 1, min, max))}
        disabled={valor >= max}
        aria-label={`Aumentar ${ariaLabel}`}
        className="flex h-9 w-9 items-center justify-center rounded-full text-[18px] font-medium text-slate-ink transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
};

interface CampoNumeroProps {
  id: string;
  etiqueta: string;
  valor: number;
  onChange: (valor: number) => void;
  min: number;
  max: number;
  step?: number;
  /** Error del backend o aviso de la validación local, debajo del campo. */
  mensaje?: string;
  ayuda?: string;
}

/** Campo numérico con el mismo estilo de la nota aprobatoria y su error asociado. */
const CampoNumero = ({
  id,
  etiqueta,
  valor,
  onChange,
  min,
  max,
  step = 1,
  mensaje,
  ayuda,
}: CampoNumeroProps) => {
  const idMensaje = `${id}-mensaje`;
  const idAyuda = `${id}-ayuda`;
  const describe = [mensaje ? idMensaje : '', ayuda ? idAyuda : ''].filter(Boolean).join(' ');

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-[11px] font-medium text-slate-ink">
        {etiqueta}
      </label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={valor}
        onChange={(event) => onChange(acotar(Number(event.target.value), min, max))}
        aria-invalid={Boolean(mensaje)}
        aria-describedby={describe || undefined}
        className={`mt-2 block h-12 w-32 rounded-full border bg-mist px-4 text-center text-[16px] font-semibold text-tinta outline-none transition-colors focus:border-violeta-accion ${
          mensaje ? 'border-peligro' : 'border-faint'
        }`}
      />
      {ayuda && (
        <p id={idAyuda} className="mt-1.5 max-w-[220px] text-[10px] leading-relaxed text-muted">
          {ayuda}
        </p>
      )}
      {mensaje && (
        <p id={idMensaje} role="alert" className="mt-1.5 max-w-[260px] text-[10.5px] leading-relaxed text-peligro">
          {mensaje}
        </p>
      )}
    </div>
  );
};

interface OpcionRapida {
  valor: number;
  texto: string;
}

const ValoresRapidos = ({
  opciones,
  valor,
  onChange,
}: {
  opciones: OpcionRapida[];
  valor: number;
  onChange: (valor: number) => void;
}) => (
  <div className="flex flex-wrap gap-2">
    {opciones.map((opcion) => {
      const activo = valor === opcion.valor;
      return (
        <button
          key={opcion.valor}
          type="button"
          onClick={() => onChange(opcion.valor)}
          aria-pressed={activo}
          className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
            activo
              ? 'border-violeta bg-violeta/5 text-violeta-accion'
              : 'border-faint text-slate-ink hover:bg-mist'
          }`}
        >
          {opcion.texto}
        </button>
      );
    })}
  </div>
);

interface PlazoProps {
  titulo: string;
  descripcion: string;
  valor: number;
  onChange: (valor: number) => void;
  ejemplo: (horas: number) => string;
}

const Plazo = ({ titulo, descripcion, valor, onChange, ejemplo }: PlazoProps) => (
  <div>
    <p className="text-[12px] font-semibold text-tinta">{titulo}</p>
    <p className="mt-0.5 text-[10.5px] text-muted">{descripcion}</p>

    <div className="mt-3 flex flex-wrap items-end gap-4">
      <Stepper
        valor={valor}
        onChange={onChange}
        min={0}
        max={168}
        unidad="h"
        vacio="Sin límite"
        ancho="min-w-[112px]"
        ariaLabel={titulo}
      />
      <div>
        <p className="text-[10.5px] text-muted">Valores frecuentes</p>
        <div className="mt-2">
          <ValoresRapidos
            opciones={[
              { valor: 0, texto: 'Sin límite' },
              ...[1, 2, 6, 12, 24, 48].map((horas) => ({ valor: horas, texto: `${horas}h` })),
            ]}
            valor={valor}
            onChange={onChange}
          />
        </div>
      </div>
    </div>

    <p className="mt-3 text-[10.5px] leading-relaxed text-muted">
      Ejemplo: {ejemplo(valor)}.
    </p>
  </div>
);

interface VistaPreviaProps {
  limite: number;
  reservar: number;
  cancelar: number;
  simulacion: number;
  onSimulacion: (horas: number) => void;
}

const VistaPrevia = ({
  limite,
  reservar,
  cancelar,
  simulacion,
  onSimulacion,
}: VistaPreviaProps) => {
  const reservaAbierta = simulacion >= reservar;
  const cancelacionAbierta = simulacion >= cancelar;
  const usados = Math.max(limite - 1, 0);
  const disponibles = Math.max(limite - usados, 0);
  const porcentaje = limite > 0 ? Math.min(100, Math.round((usados / limite) * 100)) : 0;

  const textoReserva =
    reservar === 0
      ? 'Reserva disponible hasta el inicio.'
      : reservaAbierta
        ? `Reserva disponible: faltan más de ${reservar} h.`
        : `Reserva cerrada: solo se puede reservar hasta ${reservar} h antes del inicio.`;

  const textoCancelacion =
    cancelar === 0
      ? 'Cancelación disponible hasta el inicio.'
      : cancelacionAbierta
        ? 'Cancelación disponible.'
        : `Cancelación cerrada: solo se puede cancelar hasta ${cancelar} h antes del inicio.`;

  const textoTutor =
    disponibles === 0
      ? `Alcanzó el tope de ${limite} cupos esta semana.`
      : `Puede publicar ${disponibles} ${
          disponibles === 1 ? 'cupo' : 'cupos'
        } más esta semana.`;

  return (
    <aside className="rounded-[28px] bg-white p-5 sm:p-6">
      <h2 className="text-[15px] font-semibold text-tinta">Así lo verán estudiantes y tutores</h2>
      <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
        Vista previa con tus valores actuales, aun sin guardar.
      </p>

      <div className="mt-4">
        <p className="text-[10.5px] font-medium text-slate-ink">Simular: la tutoría empieza en</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[1, 3, 13, 30].map((horas) => {
            const activo = simulacion === horas;
            return (
              <button
                key={horas}
                type="button"
                onClick={() => onSimulacion(horas)}
                aria-pressed={activo}
                className={`rounded-full border px-3 py-1.5 text-[10.5px] font-medium transition-colors ${
                  activo
                    ? 'border-tinta bg-tinta text-white'
                    : 'border-faint text-slate-ink hover:bg-mist'
                }`}
              >
                {horas} h
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="rounded-2xl bg-mist p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9.5px] text-muted">Estudiante · Reservar</span>
            <span className="text-[9.5px] text-muted">Panel de horarios</span>
          </div>
          <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-white p-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-terracota text-[10px] font-semibold text-white">
              15:00
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11.5px] font-semibold text-tinta">Laura Gómez</p>
              <p className="truncate text-[9.5px] text-muted">Repaso de Cálculo · Virtual</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1.5 text-[9.5px] font-semibold ${
                reservaAbierta ? 'bg-tinta text-white' : 'bg-mist text-muted'
              }`}
            >
              Reservar
            </span>
          </div>
          <p
            className={`mt-2 flex items-start gap-1.5 text-[9.5px] leading-relaxed ${
              reservaAbierta ? 'text-exito' : 'text-peligro'
            }`}
          >
            <InfoIcon className="mt-0.5 h-3 w-3 shrink-0" />
            {textoReserva}
          </p>
        </div>

        <div className="rounded-2xl bg-mist p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9.5px] text-muted">Estudiante · Cancelar</span>
            <span className="text-[9.5px] text-muted">Mis próximas tutorías</span>
          </div>
          <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-white p-2.5">
            <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-salvia/50 text-[8px] font-semibold leading-none text-exito">
              <span>JUE</span>
              <span className="mt-0.5 text-[11px]">19</span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11.5px] font-semibold text-tinta">Repaso para el parcial</p>
              <p className="truncate text-[9.5px] text-muted">13:00 – 15:00 · Virtual</p>
            </div>
            <span
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[9.5px] font-semibold ${
                cancelacionAbierta
                  ? 'border-faint text-slate-ink'
                  : 'border-transparent bg-mist text-muted'
              }`}
            >
              Cancelar
            </span>
          </div>
          <p
            className={`mt-2 flex items-start gap-1.5 text-[9.5px] leading-relaxed ${
              cancelacionAbierta ? 'text-exito' : 'text-advertencia'
            }`}
          >
            <InfoIcon className="mt-0.5 h-3 w-3 shrink-0" />
            {textoCancelacion}
          </p>
        </div>

        <div className="rounded-2xl bg-mist p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9.5px] text-muted">Tutor · Publicar</span>
            <span className="text-[9.5px] text-muted">Gestión de disponibilidad</span>
          </div>
          <div className="mt-2 rounded-xl bg-white p-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-[11.5px] font-semibold text-tinta">Laura Gómez</p>
              <span className="text-[9.5px] text-muted">esta semana</span>
            </div>
            <p className="mt-0.5 text-[9.5px] text-muted">
              {usados} de {limite} cupos
            </p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-mist">
              <div
                className="h-full rounded-full bg-violeta-accion transition-[width]"
                style={{ width: `${porcentaje}%` }}
              />
            </div>
            <div className="mt-2.5 flex justify-end">
              <span
                className={`rounded-full px-3 py-1.5 text-[9.5px] font-semibold ${
                  disponibles > 0 ? 'bg-tinta text-white' : 'bg-mist text-muted'
                }`}
              >
                Publicar disponibilidad
              </span>
            </div>
          </div>
          <p
            className={`mt-2 flex items-start gap-1.5 text-[9.5px] leading-relaxed ${
              disponibles > 0 ? 'text-exito' : 'text-peligro'
            }`}
          >
            <InfoIcon className="mt-0.5 h-3 w-3 shrink-0" />
            {textoTutor}
          </p>
        </div>
      </div>
    </aside>
  );
};

/**
 * Configuración general de tutorías (GT-254).
 *
 * Una sola pantalla para coordinación y administración: el tope semanal por
 * tutor y los plazos de anticipación para reservar y cancelar. Guarda contra
 * `PATCH /catalogo/configuracion/`; el backend ya aplica estas reglas.
 */
export const ConfiguracionGeneral = () => {
  const user = useAuthStore((state) => state.user);
  const etiquetaRol = user?.grupos?.includes('Administrador') ? 'Administrador' : 'Coordinación';

  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [limite, setLimite] = useState(10);
  const [reservar, setReservar] = useState(2);
  const [cancelar, setCancelar] = useState(1);
  const [aprobatoria, setAprobatoria] = useState(3);
  const [notaMinima, setNotaMinima] = useState(4);
  const [semestreMinimo, setSemestreMinimo] = useState(3);
  const [diferencia, setDiferencia] = useState(2);
  const [peso1, setPeso1] = useState(30);
  const [peso2, setPeso2] = useState(30);
  const [peso3, setPeso3] = useState(40);
  const [calificacionMinima, setCalificacionMinima] = useState(1);
  const [calificacionMaxima, setCalificacionMaxima] = useState(10);
  const [simulacion, setSimulacion] = useState(3);
  const [original, setOriginal] = useState<Original | null>(null);
  // Errores por campo del último guardado fallido, con los valores que los produjeron.
  const [erroresGuardado, setErroresGuardado] = useState<{
    firma: string;
    campos: Record<string, string>;
  } | null>(null);

  const aplicarValores = useCallback((valores: Original) => {
    setLimite(valores.limite);
    setReservar(valores.reservar);
    setCancelar(valores.cancelar);
    setAprobatoria(valores.aprobatoria);
    setNotaMinima(valores.notaMinima);
    setSemestreMinimo(valores.semestreMinimo);
    setDiferencia(valores.diferencia);
    setPeso1(valores.peso1);
    setPeso2(valores.peso2);
    setPeso3(valores.peso3);
    setCalificacionMinima(valores.calificacionMinima);
    setCalificacionMaxima(valores.calificacionMaxima);
  }, []);

  const consultar = useCallback(async (): Promise<{
    config: Configuracion | null;
    error: string | null;
  }> => {
    try {
      const { data } = await api.get<Configuracion>('/catalogo/configuracion/');
      return { config: data, error: null };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        return {
          config: null,
          error: 'Tu cuenta no tiene permisos para ver la configuración general.',
        };
      }
      return { config: null, error: mensajeError(error) };
    }
  }, []);

  const aplicar = useCallback(
    (datos: { config: Configuracion | null; error: string | null }) => {
      if (datos.config) {
        const cargado = desdeApi(datos.config);
        aplicarValores(cargado);
        setOriginal(cargado);
      }
      setErrorCarga(datos.error);
      setCargando(false);
    },
    [aplicarValores],
  );

  useEffect(() => {
    let activo = true;

    const ejecutar = async () => {
      const datos = await consultar();
      if (!activo) return;
      aplicar(datos);
    };

    void ejecutar();

    return () => {
      activo = false;
    };
  }, [aplicar, consultar]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const actual: Original = {
    limite,
    reservar,
    cancelar,
    aprobatoria,
    notaMinima,
    semestreMinimo,
    diferencia,
    peso1,
    peso2,
    peso3,
    calificacionMinima,
    calificacionMaxima,
  };
  const firmaActual = JSON.stringify(actual);
  const sucio = original !== null && firmaActual !== JSON.stringify(original);

  const sumaPesos = peso1 + peso2 + peso3;

  // Las mismas reglas que valida el backend, para avisar antes de guardar (no bloquean).
  const avisos: Record<string, string> = {};
  if (sumaPesos !== 100) {
    avisos.peso_corte3 = `Los pesos suman ${sumaPesos}. Deben sumar 100.`;
  }
  if (aprobatoria > notaMinima) {
    avisos.nota_aprobatoria = 'No puede ser mayor que la nota mínima para ser tutor.';
  }
  if (calificacionMaxima <= calificacionMinima) {
    avisos.calificacion_maxima = 'La calificación máxima debe ser mayor que la mínima.';
  }

  // El error del backend se muestra mientras los valores sean los que se enviaron.
  const erroresVigentes =
    erroresGuardado && erroresGuardado.firma === firmaActual ? erroresGuardado.campos : {};
  const mensajeDe = (campo: string): string | undefined => erroresVigentes[campo] ?? avisos[campo];

  const guardar = async () => {
    setGuardando(true);
    setErrorGuardado(null);
    setErroresGuardado(null);

    try {
      // Se envían los 12 parámetros: el backend valida las reglas cruzadas con todos.
      const { data } = await api.patch<Configuracion>('/catalogo/configuracion/', {
        cupos_semanales_tutor: limite,
        horas_anticipacion_reservar: reservar,
        horas_anticipacion_cancelar: cancelar,
        nota_aprobatoria: aprobatoria,
        nota_minima: notaMinima,
        semestre_minimo_tutor: semestreMinimo,
        diferencia_semestres: diferencia,
        peso_corte1: peso1,
        peso_corte2: peso2,
        peso_corte3: peso3,
        calificacion_minima: calificacionMinima,
        calificacion_maxima: calificacionMaxima,
      });

      const guardado = desdeApi(data);
      aplicarValores(guardado);
      setOriginal(guardado);
      setToast('Configuración guardada. Los cambios ya aplican a toda la plataforma.');
    } catch (error) {
      setErrorGuardado(mensajeError(error));
      setErroresGuardado({ firma: firmaActual, campos: erroresPorCampo(error) });
    } finally {
      setGuardando(false);
    }
  };

  const descartar = () => {
    if (!original) return;
    aplicarValores(original);
    setErrorGuardado(null);
    setErroresGuardado(null);
  };

  const reintentar = () => {
    setCargando(true);
    setErrorCarga(null);
    void (async () => {
      aplicar(await consultar());
    })();
  };

  const estadoGuardado = guardando
    ? 'Guardando cambios…'
    : errorGuardado
      ? errorGuardado
      : sucio && Object.keys(avisos).length > 0
        ? 'Tienes cambios sin guardar. Revisa los campos marcados en rojo.'
        : sucio
        ? 'Tienes cambios sin guardar.'
        : 'Todo guardado. Los valores actuales ya están aplicados.';

  const colorEstado = errorGuardado ? 'bg-peligro' : sucio ? 'bg-advertencia' : 'bg-exito';

  return (
    <div className="flex min-h-screen bg-mist font-constelacion text-tinta">
      <AdminRail />

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1240px] px-5 py-6 pb-28 sm:px-7 md:pb-6 lg:px-8">
          <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11.5px] text-muted">Configuración · {etiquetaRol}</p>
              <h1 className="mt-1 text-[30px] font-medium leading-tight tracking-[-0.02em] text-tinta sm:text-[36px]">
                Configuración general
              </h1>
              <p className="mt-1 max-w-[640px] text-[13px] leading-relaxed text-muted">
                Topes de trabajo y plazos que aplican a toda la plataforma. Los cambios se reflejan
                al instante en las pantallas de estudiantes y tutores.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <ResumenPill
                valor={cargando ? '—' : String(limite)}
                etiqueta="Tope semanal"
                detalle="cupos por semana"
                clase="bg-arena/50 text-tinta"
              />
              <ResumenPill
                valor={cargando ? '—' : reservar === 0 ? '∞' : `${reservar}h`}
                etiqueta="Reservar"
                detalle={reservar === 0 ? 'sin límite' : 'horas antes del inicio'}
                clase="bg-salvia/50 text-exito"
              />
              <ResumenPill
                valor={cargando ? '—' : cancelar === 0 ? '∞' : `${cancelar}h`}
                etiqueta="Cancelar"
                detalle={cancelar === 0 ? 'sin límite' : 'horas antes del inicio'}
                clase="bg-tinta text-white"
              />
            </div>
          </header>

          {errorCarga && (
            <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-peligro/20 bg-white px-5 py-4 text-[12px] text-peligro sm:flex-row sm:items-center sm:justify-between">
              <span>{errorCarga}</span>
              <button
                type="button"
                onClick={reintentar}
                className="self-start rounded-full bg-peligro px-4 py-2 text-[11px] font-medium text-white transition-opacity hover:opacity-90"
              >
                Reintentar
              </button>
            </div>
          )}

          {cargando ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-4">
                <div className="h-[290px] animate-pulse rounded-[28px] bg-white" />
                <div className="h-[360px] animate-pulse rounded-[28px] bg-white" />
              </div>
              <div className="h-[520px] animate-pulse rounded-[28px] bg-white" />
            </div>
          ) : (
            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-4">
                <section className="rounded-[28px] bg-white p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-arena/40 text-cacao">
                      <CalendarIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-[16px] font-semibold text-tinta">
                        Límite semanal por tutor
                      </h2>
                      <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">
                        Evita la sobrecarga: ningún tutor podrá publicar más disponibilidad que este
                        tope en una misma semana.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="text-[10.5px] leading-relaxed text-muted">
                      El tope se mide en cupos disponibles por semana: cada cupo que un tutor publica
                      en sus bloques cuenta para el límite.
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap items-end gap-4">
                    <div>
                      <p className="text-[11px] font-medium text-slate-ink">Máximo por tutor</p>
                      <div className="mt-2">
                        <Stepper
                          valor={limite}
                          onChange={(valor) => setLimite(acotar(valor, 1, 99))}
                          min={1}
                          max={99}
                          unidad="cupos"
                          ancho="min-w-[128px]"
                          ariaLabel="Máximo por tutor"
                        />
                      </div>
                    </div>

                    <div>
                      <p className="text-[10.5px] text-muted">Valores frecuentes</p>
                      <div className="mt-2">
                        <ValoresRapidos
                          opciones={[5, 10, 15, 20].map((valor) => ({
                            valor,
                            texto: String(valor),
                          }))}
                          valor={limite}
                          onChange={setLimite}
                        />
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-[10.5px] leading-relaxed text-muted">
                    Cada tutor podrá publicar hasta{' '}
                    <strong className="font-semibold text-tinta">
                      {limite} cupos
                    </strong>{' '}
                    por semana. El tope aplica a las futuras publicaciones; lo ya publicado no se
                    modifica.
                  </p>

                  <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-violeta/5 px-4 py-3 text-violeta-accion">
                    <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    <p className="text-[10.5px] leading-relaxed">
                      El tope se valida al publicar o editar un bloque de disponibilidad.
                    </p>
                  </div>
                </section>

                <section className="rounded-[28px] bg-white p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violeta/10 text-violeta-accion">
                      <CheckIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-[16px] font-semibold text-tinta">
                        Aprobación de materias
                      </h2>
                      <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">
                        Desde qué nota una materia cursada cuenta como aprobada. Se usa en la
                        postulación como tutor y en las materias cursadas.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-end gap-4">
                    <CampoNumero
                      id="nota-aprobatoria"
                      etiqueta="Nota aprobatoria"
                      valor={aprobatoria}
                      onChange={setAprobatoria}
                      min={0}
                      max={5}
                      step={0.1}
                      mensaje={mensajeDe('nota_aprobatoria')}
                    />

                    <div>
                      <p className="text-[10.5px] text-muted">Valores frecuentes</p>
                      <div className="mt-2">
                        <ValoresRapidos
                          opciones={[3, 3.5, 4].map((valor) => ({
                            valor,
                            texto: valor.toFixed(1).replace('.', ','),
                          }))}
                          valor={aprobatoria}
                          onChange={setAprobatoria}
                        />
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-[10.5px] leading-relaxed text-muted">
                    Una materia con nota final igual o superior a{' '}
                    <strong className="font-semibold text-tinta">
                      {aprobatoria.toFixed(1).replace('.', ',')}
                    </strong>{' '}
                    cuenta como aprobada para la postulación como tutor.
                  </p>
                </section>

                <section className="rounded-[28px] bg-white p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-salvia/40 text-exito">
                      <ClockIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-[16px] font-semibold text-tinta">
                        Plazos de anticipación
                      </h2>
                      <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">
                        Tiempo mínimo antes del inicio de la tutoría para reservar o cancelar. Fuera
                        de plazo, los botones se bloquean y explican el motivo.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-5">
                    <Plazo
                      titulo="Reservar"
                      descripcion="Los estudiantes pueden reservar hasta este tiempo antes del inicio."
                      valor={reservar}
                      onChange={setReservar}
                      ejemplo={ejemploReserva}
                    />

                    <div className="border-t border-faint" />

                    <Plazo
                      titulo="Cancelar"
                      descripcion="Los estudiantes pueden cancelar hasta este tiempo antes del inicio. El tutor puede cancelar hasta la hora de inicio."
                      valor={cancelar}
                      onChange={setCancelar}
                      ejemplo={ejemploCancelacion}
                    />
                  </div>

                  <p className="mt-5 text-[10.5px] leading-relaxed text-muted">
                    Al cancelar se libera el cupo y se envía un correo a la otra persona.
                  </p>
                </section>

                <section className="rounded-[28px] bg-white p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-terracota/15 text-terracota">
                      <UserIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-[16px] font-semibold text-tinta">
                        Requisitos para ser tutor
                      </h2>
                      <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">
                        Lo que debe cumplir un estudiante para postularse como tutor de una materia y
                        a quién puede atender.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-x-6 gap-y-4">
                    <CampoNumero
                      id="nota-minima"
                      etiqueta="Nota mínima en la materia"
                      valor={notaMinima}
                      onChange={setNotaMinima}
                      min={0}
                      max={5}
                      step={0.1}
                      ayuda="Debe ser igual o mayor que la nota aprobatoria."
                      mensaje={mensajeDe('nota_minima')}
                    />
                    <CampoNumero
                      id="semestre-minimo"
                      etiqueta="Semestre mínimo"
                      valor={semestreMinimo}
                      onChange={setSemestreMinimo}
                      min={1}
                      max={20}
                      ayuda="Desde qué semestre puede postularse."
                      mensaje={mensajeDe('semestre_minimo_tutor')}
                    />
                    <CampoNumero
                      id="diferencia-semestres"
                      etiqueta="Diferencia de semestres"
                      valor={diferencia}
                      onChange={setDiferencia}
                      min={0}
                      max={20}
                      ayuda="Cuántos semestres por delante debe ir el tutor estudiante."
                      mensaje={mensajeDe('diferencia_semestres')}
                    />
                  </div>

                  <p className="mt-4 text-[10.5px] leading-relaxed text-muted">
                    Un estudiante desde el semestre{' '}
                    <strong className="font-semibold text-tinta">{semestreMinimo}</strong> con{' '}
                    <strong className="font-semibold text-tinta">
                      {notaMinima.toFixed(1).replace('.', ',')}
                    </strong>{' '}
                    o más en la materia puede postularse, y atiende a estudiantes que vayan al menos{' '}
                    <strong className="font-semibold text-tinta">
                      {diferencia} {diferencia === 1 ? 'semestre' : 'semestres'}
                    </strong>{' '}
                    detrás.
                  </p>
                </section>

                <section className="rounded-[28px] bg-white p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violeta/10 text-violeta-accion">
                      <LayersIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-[16px] font-semibold text-tinta">Nota final</h2>
                      <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">
                        Cuánto pesa cada corte en la nota final de una materia cursada. Los tres pesos
                        deben sumar 100.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-x-6 gap-y-4">
                    <CampoNumero
                      id="peso-corte1"
                      etiqueta="Corte 1 (%)"
                      valor={peso1}
                      onChange={setPeso1}
                      min={0}
                      max={100}
                      mensaje={mensajeDe('peso_corte1')}
                    />
                    <CampoNumero
                      id="peso-corte2"
                      etiqueta="Corte 2 (%)"
                      valor={peso2}
                      onChange={setPeso2}
                      min={0}
                      max={100}
                      mensaje={mensajeDe('peso_corte2')}
                    />
                    <CampoNumero
                      id="peso-corte3"
                      etiqueta="Corte 3 (%)"
                      valor={peso3}
                      onChange={setPeso3}
                      min={0}
                      max={100}
                      mensaje={mensajeDe('peso_corte3')}
                    />
                  </div>

                  <p
                    aria-live="polite"
                    className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                      sumaPesos === 100 ? 'bg-exito/10 text-exito' : 'bg-peligro/10 text-peligro'
                    }`}
                  >
                    Suma: {sumaPesos} de 100
                  </p>
                </section>

                <section className="rounded-[28px] bg-white p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-salvia/40 text-exito">
                      <ListIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-[16px] font-semibold text-tinta">
                        Calificación del tutor
                      </h2>
                      <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">
                        Escala con la que los estudiantes califican la tutoría al terminarla.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-x-6 gap-y-4">
                    <CampoNumero
                      id="calificacion-minima"
                      etiqueta="Mínima"
                      valor={calificacionMinima}
                      onChange={setCalificacionMinima}
                      min={CALIFICACION_MIN}
                      max={CALIFICACION_MAX}
                      mensaje={mensajeDe('calificacion_minima')}
                    />
                    <CampoNumero
                      id="calificacion-maxima"
                      etiqueta="Máxima"
                      valor={calificacionMaxima}
                      onChange={setCalificacionMaxima}
                      min={CALIFICACION_MIN}
                      max={CALIFICACION_MAX}
                      mensaje={mensajeDe('calificacion_maxima')}
                    />
                  </div>

                  <p className="mt-4 text-[10.5px] leading-relaxed text-muted">
                    Los estudiantes califican de{' '}
                    <strong className="font-semibold text-tinta">{calificacionMinima}</strong> a{' '}
                    <strong className="font-semibold text-tinta">{calificacionMaxima}</strong>. La
                    escala admitida va de {CALIFICACION_MIN} a {CALIFICACION_MAX}.
                  </p>
                </section>
              </div>

              <VistaPrevia
                limite={limite}
                reservar={reservar}
                cancelar={cancelar}
                simulacion={simulacion}
                onSimulacion={setSimulacion}
              />
            </div>
          )}

          {!cargando && (
            <div className="sticky bottom-20 z-20 mt-5 flex flex-col gap-3 rounded-[22px] bg-tinta px-4 py-3 text-white shadow-constelacion-float sm:flex-row sm:items-center sm:justify-between md:bottom-4">
              <div className="flex items-center gap-2.5 text-[11px] leading-relaxed">
                <span className={`h-2 w-2 shrink-0 rounded-full ${colorEstado}`} />
                <span>{estadoGuardado}</span>
              </div>

              <div className="flex gap-2 sm:shrink-0">
                <button
                  type="button"
                  onClick={descartar}
                  disabled={!sucio || guardando}
                  className="h-10 flex-1 rounded-full border border-white/20 px-5 text-[11.5px] font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
                >
                  Descartar
                </button>
                <button
                  type="button"
                  onClick={guardar}
                  disabled={!sucio || guardando}
                  className="h-10 flex-1 rounded-full bg-violeta-accion px-5 text-[11.5px] font-semibold text-white shadow-constelacion-violet transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                >
                  {guardando ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Toast mensaje={toast} />
    </div>
  );
};

export default ConfiguracionGeneral;

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminRail } from '../components/admin/AdminRail';
import { Loader } from '../components/Loader';
import { StatCard } from '../components/constelacion/StatCard';
import { ArrowIcon, CalendarIcon } from '../components/constelacion/Icons';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../api/axios';
import { mensajeError } from '../utils/api';

/** Respuesta de GET /api/accounts/dashboard-stats/. */
interface IndicadoresPanel {
  tutorias_mes: number;
  estudiantes_activos: number;
  tutores_activos: number;
  materia_mas_demandada: string | null;
  porcentaje_demandada: string;
}

interface AccesoRapido {
  titulo: string;
  detalle: string;
  ruta: string;
}

const ACCESOS: AccesoRapido[] = [
  {
    titulo: 'Materias cursadas',
    detalle: 'Registra y corrige las notas de los estudiantes.',
    ruta: '/materias-cursadas',
  },
  {
    titulo: 'Reportes',
    detalle: 'Cumplimiento y evaluación de los tutores por periodo.',
    ruta: '/reportes',
  },
  {
    titulo: 'Configuración',
    detalle: 'Periodo activo, nota aprobatoria y reglas generales.',
    ruta: '/configuracion',
  },
  {
    titulo: 'Asignación de materias',
    detalle: 'Asigna las materias que dicta cada tutor en el periodo.',
    ruta: '/asignacion-materias',
  },
  {
    titulo: 'Materias',
    detalle: 'Crea, edita y desactiva materias del catálogo.',
    ruta: '/materias',
  },
  {
    titulo: 'Estudiantes',
    detalle: 'Consulta y registra estudiantes.',
    ruta: '/estudiantes',
  },
  {
    titulo: 'Tutores',
    detalle: 'Consulta y registra tutores.',
    ruta: '/tutores',
  },
];

const fechaLarga = (fecha: Date): string => {
  const texto = fecha.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

/**
 * GT-174 (HU-003): panel del coordinador.
 *
 * Los indicadores salen de una sola llamada a /accounts/dashboard-stats/; el
 * backend los calcula y el frontend solo los muestra.
 */
export const Dashboard = () => {
  const user = useAuthStore((state) => state.user);

  const [cargando, setCargando] = useState(true);
  const [indicadores, setIndicadores] = useState<IndicadoresPanel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;

    const cargar = async () => {
      setCargando(true);
      setError(null);
      try {
        const { data } = await api.get<IndicadoresPanel>('/accounts/dashboard-stats/');
        if (!activo) return;
        setIndicadores(data);
      } catch (err) {
        if (!activo) return;
        setIndicadores(null);
        setError(mensajeError(err));
      } finally {
        if (activo) setCargando(false);
      }
    };

    void cargar();

    return () => {
      activo = false;
    };
  }, [intento]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);

  // El nombre llega en la sesión (login → /accounts/me/); no se descargan listas para resolverlo.
  const nombre = useMemo(() => {
    const completo = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();
    const candidato = user?.nombre?.trim() || completo;
    return candidato && !candidato.includes('@') ? candidato : 'Coordinador';
  }, [user]);

  const hoy = useMemo(() => fechaLarga(new Date()), []);

  const valor = (numero: number | undefined) =>
    cargando || indicadores == null ? '—' : (numero ?? 0);

  const materia = indicadores?.materia_mas_demandada ?? null;

  return (
    <div className="flex min-h-screen bg-mist font-constelacion text-tinta">
      <AdminRail />
      <Loader hidden={!cargando} />

      <main className="mx-auto w-full min-w-0 max-w-[1500px] flex-1 px-5 py-6 pb-24 sm:px-7 md:pb-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11.5px] text-muted">Panel · Coordinación</p>
            <h1 className="mt-1 break-words text-[30px] font-medium leading-tight tracking-[-0.02em] text-tinta sm:text-[36px]">
              ¡Hola, {nombre}!
            </h1>
            <p className="mt-1 max-w-[640px] text-[13px] leading-relaxed text-muted">
              Bienvenid@ de nuevo a Aula Libre. Aquí tienes el resumen de las tutorías y los atajos a
              tus tareas de coordinación.
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-faint bg-white px-3 py-1.5 text-[11px] font-medium text-slate-ink">
            <CalendarIcon className="h-3.5 w-3.5" />
            {hoy}
          </span>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-peligro/30 bg-peligro/5 px-4 py-3 text-peligro"
          >
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold">No pudimos cargar los indicadores</p>
              <p className="mt-1 text-[11.5px] leading-relaxed opacity-90">{error}</p>
            </div>
            <button
              type="button"
              onClick={reintentar}
              className="h-9 rounded-full border border-peligro/40 bg-white px-4 text-[12px] font-semibold text-peligro transition-colors hover:bg-peligro/5"
            >
              Reintentar
            </button>
          </div>
        )}

        <section aria-label="Indicadores" className="mb-5 rounded-[32px] bg-white p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              etiqueta="Tutorías del mes"
              valor={valor(indicadores?.tutorias_mes)}
              detalle="Sin contar las canceladas"
            />
            <StatCard
              etiqueta="Estudiantes activos"
              valor={valor(indicadores?.estudiantes_activos)}
              detalle="Con cuenta activa"
            />
            <StatCard
              etiqueta="Tutores activos"
              valor={valor(indicadores?.tutores_activos)}
              detalle="Docentes con cuenta activa"
            />
            <StatCard
              etiqueta="Materia más demandada"
              valor={
                cargando || indicadores == null ? (
                  '—'
                ) : (
                  <span className="block break-words text-[18px] leading-tight">
                    {materia ?? 'Sin datos'}
                  </span>
                )
              }
              detalle={
                materia && indicadores
                  ? `${indicadores.porcentaje_demandada} de las tutorías del mes`
                  : 'Aún no hay tutorías este mes'
              }
            />
          </div>
        </section>

        <section aria-labelledby="accesos-titulo" className="rounded-[32px] bg-white p-5 sm:p-6">
          <h2 id="accesos-titulo" className="text-[15px] font-semibold text-tinta">
            Accesos rápidos
          </h2>
          <p className="mt-1 text-[12px] text-muted">Las tareas más frecuentes de la coordinación.</p>

          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {ACCESOS.map((acceso) => (
              <li key={acceso.ruta}>
                <Link
                  to={acceso.ruta}
                  className="group flex h-full items-start justify-between gap-3 rounded-2xl border border-faint px-4 py-3.5 transition-colors hover:border-violeta-accion/40 hover:bg-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violeta-accion"
                >
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-tinta">{acceso.titulo}</span>
                    <span className="mt-0.5 block text-[11.5px] leading-relaxed text-muted">
                      {acceso.detalle}
                    </span>
                  </span>
                  <ArrowIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-violeta-accion" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;

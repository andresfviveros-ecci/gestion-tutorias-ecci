import { useEffect, useMemo, useState } from 'react';
import { AdminRail } from '../components/admin/AdminRail';
import { Loader } from '../components/Loader';
import { EmptyState } from '../components/constelacion/EmptyState';
import { SearchIcon } from '../components/constelacion/Icons';
import { api } from '../api/axios';
import { extraerLista, mensajeError } from '../utils/api';

interface PeriodoAPI {
  id: number;
  codigo: string;
  activo: boolean;
}

interface ReporteTutorAPI {
  id: number;
  nombre: string;
  tipo: 'Docente' | 'Estudiante' | string;
  tutorias: number;
  completadas: number;
  no_asistio: number;
  canceladas_por_tutor: number;
  evaluaciones: number;
  promedio_calificacion: number | null;
}

type FiltroTipo = 'todos' | 'Docente' | 'Estudiante';

const inputClass =
  'h-10 w-full rounded-xl border border-faint bg-white px-3.5 text-[12px] text-tinta outline-none transition-colors placeholder:text-pebble focus:border-violeta-accion';

const normalizar = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const formatearPromedio = (valor: number | null): string =>
  valor == null ? 'Sin evaluaciones' : valor.toFixed(1);

const fondoPromedio = (valor: number | null): string => {
  if (valor == null) return 'bg-mist text-muted';
  if (valor >= 4.5) return 'bg-exito/10 text-exito';
  if (valor >= 3.5) return 'bg-advertencia/10 text-advertencia';
  return 'bg-peligro/10 text-peligro';
};

const escaparCSV = (valor: string | number | null): string => {
  const texto = valor == null ? '' : String(valor);
  return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
};

/**
 * RF-09 / GT-56: cumplimiento y evaluación de los tutores.
 *
 * El backend entrega la lista ordenada del mejor al peor calificado y calcula
 * el promedio; el frontend solo filtra y muestra. Un promedio en null significa
 * que el tutor todavía no tiene evaluaciones.
 */
export const ReporteTutores = () => {
  const [cargando, setCargando] = useState(true);
  const [periodos, setPeriodos] = useState<PeriodoAPI[]>([]);
  const [periodoId, setPeriodoId] = useState('');
  const [reportes, setReportes] = useState<ReporteTutorAPI[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState<FiltroTipo>('todos');

  useEffect(() => {
    let activo = true;

    const cargarPeriodos = async () => {
      try {
        const { data } = await api.get('/catalogo/periodos/');
        if (!activo) return;
        const lista = extraerLista<PeriodoAPI>(data);
        setPeriodos(lista);
        const activoPeriodo = lista.find((periodo) => periodo.activo) ?? lista[0];
        setPeriodoId(activoPeriodo ? String(activoPeriodo.id) : '');
        if (!activoPeriodo) {
          setError('No hay periodos académicos. Crea uno antes de consultar el reporte.');
          setCargando(false);
        }
      } catch (err) {
        if (!activo) return;
        setError(mensajeError(err));
        setCargando(false);
      }
    };

    void cargarPeriodos();

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    if (!periodoId) return;

    let activo = true;

    const cargarReporte = async () => {
      setCargando(true);
      setError(null);

      try {
        const { data } = await api.get('/reportes/tutores/', {
          params: { periodo: periodoId },
        });
        if (!activo) return;
        setReportes(extraerLista<ReporteTutorAPI>(data));
      } catch (err) {
        if (!activo) return;
        setReportes([]);
        setError(mensajeError(err));
      } finally {
        if (activo) setCargando(false);
      }
    };

    void cargarReporte();

    return () => {
      activo = false;
    };
  }, [periodoId]);

  const filtrados = useMemo(() => {
    const consulta = normalizar(busqueda);

    return reportes.filter((reporte) => {
      const coincideBusqueda = !consulta || normalizar(reporte.nombre).includes(consulta);
      const coincideTipo = tipo === 'todos' || reporte.tipo === tipo;
      return coincideBusqueda && coincideTipo;
    });
  }, [reportes, busqueda, tipo]);

  const resumen = useMemo(() => {
    const conEvaluacion = reportes.filter(
      (reporte) => reporte.promedio_calificacion != null,
    );
    const promedio =
      conEvaluacion.length === 0
        ? null
        : conEvaluacion.reduce(
            (suma, reporte) => suma + Number(reporte.promedio_calificacion),
            0,
          ) / conEvaluacion.length;

    return {
      tutores: reportes.length,
      evaluaciones: reportes.reduce((suma, reporte) => suma + reporte.evaluaciones, 0),
      completadas: reportes.reduce((suma, reporte) => suma + reporte.completadas, 0),
      promedio,
    };
  }, [reportes]);

  const exportarCSV = () => {
    const encabezados = [
      'Tutor',
      'Tipo',
      'Tutorías',
      'Completadas',
      'No asistió',
      'Canceladas por el tutor',
      'Evaluaciones',
      'Promedio',
    ];

    const filas = filtrados.map((reporte) => [
      reporte.nombre,
      reporte.tipo,
      reporte.tutorias,
      reporte.completadas,
      reporte.no_asistio,
      reporte.canceladas_por_tutor,
      reporte.evaluaciones,
      reporte.promedio_calificacion == null ? '' : reporte.promedio_calificacion.toFixed(1),
    ]);

    const contenido = [encabezados, ...filas]
      .map((fila) => fila.map(escaparCSV).join(','))
      .join('\r\n');

    const periodo = periodos.find((item) => String(item.id) === periodoId);
    const blob = new Blob([`\uFEFF${contenido}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `reporte-tutores-${periodo?.codigo || periodoId}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen bg-mist font-constelacion text-tinta">
      <AdminRail />
      <Loader hidden={!cargando} />

      <main className="mx-auto w-full min-w-0 max-w-[1500px] flex-1 px-5 py-6 pb-24 sm:px-7 md:pb-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11.5px] text-muted">Reportes · Coordinación</p>
            <h1 className="mt-1 text-[30px] font-medium leading-tight tracking-[-0.02em] text-tinta sm:text-[36px]">
              Cumplimiento de tutores
            </h1>
            <p className="mt-1 max-w-[640px] text-[13px] leading-relaxed text-muted">
              Tutorías atendidas, inasistencias y calificación promedio por tutor. La lista llega
              ordenada del mejor al peor calificado.
            </p>
          </div>

          <button
            type="button"
            onClick={exportarCSV}
            disabled={filtrados.length === 0}
            className="h-11 rounded-full border border-faint bg-white px-5 text-[12.5px] font-semibold text-tinta transition-colors hover:bg-mist disabled:cursor-not-allowed disabled:opacity-50"
          >
            Exportar CSV
          </button>
        </header>

        <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-[22px] bg-white px-5 py-4">
            <p className="text-[10.5px] text-muted">Tutores en el periodo</p>
            <p className="mt-1 text-[24px] font-semibold leading-none text-tinta">{resumen.tutores}</p>
          </div>
          <div className="rounded-[22px] bg-white px-5 py-4">
            <p className="text-[10.5px] text-muted">Tutorías completadas</p>
            <p className="mt-1 text-[24px] font-semibold leading-none text-tinta">
              {resumen.completadas}
            </p>
          </div>
          <div className="rounded-[22px] bg-white px-5 py-4">
            <p className="text-[10.5px] text-muted">Evaluaciones</p>
            <p className="mt-1 text-[24px] font-semibold leading-none text-tinta">
              {resumen.evaluaciones}
            </p>
          </div>
          <div className="rounded-[22px] bg-white px-5 py-4">
            <p className="text-[10.5px] text-muted">Promedio general</p>
            <p className="mt-1 text-[24px] font-semibold leading-none text-tinta">
              {resumen.promedio == null ? '—' : resumen.promedio.toFixed(1)}
            </p>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-2xl border border-peligro/30 bg-peligro/5 px-4 py-3 text-peligro"
          >
            <p className="text-[12.5px] font-semibold">No pudimos cargar el reporte</p>
            <p className="mt-1 text-[11.5px] leading-relaxed opacity-90">{error}</p>
          </div>
        )}

        <section className="rounded-[32px] bg-white p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium text-slate-ink">Buscar tutor</span>
              <span className="relative block">
                <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pebble" />
                <input
                  type="search"
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  placeholder="Nombre del tutor"
                  className={`${inputClass} pl-10`}
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium text-slate-ink">Tipo</span>
              <select
                value={tipo}
                onChange={(event) => setTipo(event.target.value as FiltroTipo)}
                className={inputClass}
              >
                <option value="todos">Todos</option>
                <option value="Docente">Docentes</option>
                <option value="Estudiante">Estudiantes</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium text-slate-ink">Periodo</span>
              <select
                value={periodoId}
                onChange={(event) => setPeriodoId(event.target.value)}
                className={inputClass}
              >
                {periodos.map((periodo) => (
                  <option key={periodo.id} value={periodo.id}>
                    {periodo.codigo}
                    {periodo.activo ? ' · activo' : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 flex items-center justify-between px-1 text-[10.5px] text-muted">
            <span>
              {filtrados.length} {filtrados.length === 1 ? 'tutor' : 'tutores'}
            </span>
            <span>Promedio en escala de configuración</span>
          </div>

          {filtrados.length === 0 ? (
            <EmptyState
              titulo="No hay datos para este filtro"
              detalle="Prueba con otro periodo, tipo o nombre de tutor."
            />
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-[12px]">
                <thead>
                  <tr className="border-b border-faint text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                    <th className="px-3 pb-3">Tutor</th>
                    <th className="px-3 pb-3">Tipo</th>
                    <th className="px-3 pb-3 text-center">Tutorías</th>
                    <th className="px-3 pb-3 text-center">Completadas</th>
                    <th className="px-3 pb-3 text-center">No asistió</th>
                    <th className="px-3 pb-3 text-center">Canceladas</th>
                    <th className="px-3 pb-3 text-center">Evaluaciones</th>
                    <th className="px-3 pb-3 text-center">Promedio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-faint">
                  {filtrados.map((reporte) => (
                    <tr key={`${reporte.tipo}-${reporte.id}`} className="hover:bg-mist/60">
                      <td className="px-3 py-3 font-semibold text-tinta">{reporte.nombre}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                            reporte.tipo === 'Estudiante'
                              ? 'bg-violet-wash/30 text-violeta-tinta'
                              : 'bg-mist text-slate-ink'
                          }`}
                        >
                          {reporte.tipo}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-slate-ink">{reporte.tutorias}</td>
                      <td className="px-3 py-3 text-center font-semibold text-exito">
                        {reporte.completadas}
                      </td>
                      <td className="px-3 py-3 text-center text-slate-ink">{reporte.no_asistio}</td>
                      <td className="px-3 py-3 text-center text-slate-ink">
                        {reporte.canceladas_por_tutor}
                      </td>
                      <td className="px-3 py-3 text-center text-slate-ink">
                        {reporte.evaluaciones}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-flex min-w-[58px] justify-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${fondoPromedio(
                            reporte.promedio_calificacion,
                          )}`}
                        >
                          {formatearPromedio(reporte.promedio_calificacion)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default ReporteTutores;

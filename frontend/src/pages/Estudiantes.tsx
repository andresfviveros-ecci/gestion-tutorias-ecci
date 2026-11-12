import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminRail } from '../components/admin/AdminRail';
import { FormularioUsuario, type DatosUsuario } from '../components/admin/FormularioUsuario';
import { claseEstado, claseInput, coincide, normalizar } from '../components/admin/usuarios';
import { Loader } from '../components/Loader';
import { EmptyState } from '../components/constelacion/EmptyState';
import { SearchIcon } from '../components/constelacion/Icons';
import { Modal } from '../components/constelacion/Modal';
import { Toast } from '../components/constelacion/Toast';
import { api } from '../api/axios';
import { extraerLista, mensajeError } from '../utils/api';

interface EstudianteAPI {
  id?: number;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  documento?: string | number;
  telefono?: string;
  codigo_institucional?: string | null;
  /** RF-02: semestre que cursa. Sin este dato la postulación falla. */
  semestre?: number | null;
  is_active?: boolean;
}

interface Estudiante {
  clave: string;
  nombre: string;
  username: string;
  email: string;
  documento: string;
  telefono: string;
  codigoInstitucional: string;
  semestre: number | null;
  activo: boolean | null;
}

/** '' = todos, 'sin' = sin semestre registrado, '1'..'10' = ese semestre. */
type FiltroSemestre = string;

const SEMESTRES = Array.from({ length: 10 }, (_, i) => i + 1);

const mapear = (lista: EstudianteAPI[]): Estudiante[] =>
  lista.map((item, indice) => ({
    clave: String(item.id ?? `${item.username ?? ''}-${indice}`),
    nombre: `${item.first_name ?? ''} ${item.last_name ?? ''}`.trim() || item.username || 'Estudiante',
    username: item.username ?? '',
    email: item.email ?? '',
    documento: item.documento == null ? '' : String(item.documento),
    telefono: item.telefono ?? '',
    codigoInstitucional: item.codigo_institucional ?? '',
    semestre: item.semestre ?? null,
    activo: typeof item.is_active === 'boolean' ? item.is_active : null,
  }));

/**
 * GT-180 (HU-004): estudiantes registrados y alta de nuevos estudiantes.
 * Usa GET/POST /accounts/estudiantes/ con el mismo payload de siempre.
 */
export const Estudiantes = () => {
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  const [busqueda, setBusqueda] = useState('');
  const [semestreFiltro, setSemestreFiltro] = useState<FiltroSemestre>('');

  const [modalAbierto, setModalAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    const cargar = async () => {
      setCargando(true);
      setError(null);
      try {
        const { data } = await api.get('/accounts/estudiantes/');
        if (!activo) return;
        setEstudiantes(mapear(extraerLista<EstudianteAPI>(data)));
      } catch (err) {
        if (!activo) return;
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

  useEffect(() => {
    if (!toast) return;
    const temporizador = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(temporizador);
  }, [toast]);

  const recargar = useCallback(() => setIntento((n) => n + 1), []);

  const abrirModal = () => {
    setErrorForm(null);
    setModalAbierto(true);
  };

  const cerrarModal = useCallback(() => setModalAbierto(false), []);

  const registrar = async (datos: DatosUsuario) => {
    setEnviando(true);
    setErrorForm(null);
    try {
      await api.post('/accounts/estudiantes/', datos);
      setModalAbierto(false);
      setToast(`${datos.first_name} ${datos.last_name} quedó registrado.`);
      recargar();
    } catch (err) {
      setErrorForm(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  const filtrados = useMemo(() => {
    const consulta = normalizar(busqueda);
    return estudiantes.filter((estudiante) => {
      const coincideTexto = coincide(
        consulta,
        estudiante.nombre,
        estudiante.email,
        estudiante.documento,
        estudiante.username,
      );
      const coincideSemestre =
        semestreFiltro === '' ||
        (semestreFiltro === 'sin'
          ? estudiante.semestre == null
          : estudiante.semestre === Number(semestreFiltro));
      return coincideTexto && coincideSemestre;
    });
  }, [estudiantes, busqueda, semestreFiltro]);

  return (
    <div className="flex min-h-screen bg-mist font-constelacion text-tinta">
      <AdminRail />
      <Loader hidden={!cargando} />

      <main className="mx-auto w-full min-w-0 max-w-[1500px] flex-1 px-5 py-6 pb-24 sm:px-7 md:pb-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11.5px] text-muted">Usuarios · Coordinación</p>
            <h1 className="mt-1 text-[30px] font-medium leading-tight tracking-[-0.02em] text-tinta sm:text-[36px]">
              Estudiantes
            </h1>
            <p className="mt-1 max-w-[640px] text-[13px] leading-relaxed text-muted">
              Consulta los estudiantes registrados y da de alta nuevos. El semestre es obligatorio
              para que puedan postularse como tutores.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirModal}
            className="h-11 rounded-full bg-violeta-accion px-5 text-[12.5px] font-semibold text-white transition-colors hover:bg-violeta-profundo"
          >
            Registrar estudiante
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-peligro/30 bg-peligro/5 px-4 py-3 text-peligro"
          >
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold">No pudimos cargar los estudiantes</p>
              <p className="mt-1 text-[11.5px] leading-relaxed opacity-90">{error}</p>
            </div>
            <button
              type="button"
              onClick={recargar}
              className="h-9 rounded-full border border-peligro/40 bg-white px-4 text-[12px] font-semibold text-peligro transition-colors hover:bg-peligro/5"
            >
              Reintentar
            </button>
          </div>
        )}

        <section className="rounded-[32px] bg-white p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium text-slate-ink">Buscar</span>
              <span className="relative block">
                <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pebble" />
                <input
                  type="search"
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  placeholder="Nombre, correo o documento"
                  className={`${claseInput} pl-10`}
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium text-slate-ink">Semestre</span>
              <select
                value={semestreFiltro}
                onChange={(event) => setSemestreFiltro(event.target.value)}
                className={claseInput}
              >
                <option value="">Todos</option>
                <option value="sin">Sin registrar</option>
                {SEMESTRES.map((valor) => (
                  <option key={valor} value={valor}>
                    {valor}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 flex items-center justify-between px-1 text-[10.5px] text-muted">
            <span>
              {filtrados.length} {filtrados.length === 1 ? 'estudiante' : 'estudiantes'}
            </span>
            <span>{estudiantes.length} en total</span>
          </div>

          {filtrados.length === 0 ? (
            !cargando && (
              <EmptyState
                titulo={estudiantes.length === 0 ? 'Aún no hay estudiantes' : 'No encontramos estudiantes'}
                detalle={
                  estudiantes.length === 0
                    ? 'Registra el primer estudiante con el botón de arriba.'
                    : 'Prueba con otro texto o cambia el semestre.'
                }
              />
            )
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-[12px]">
                <thead>
                  <tr className="border-b border-faint text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                    <th className="px-3 pb-3">Estudiante</th>
                    <th className="px-3 pb-3">Correo</th>
                    <th className="px-3 pb-3">Código institucional</th>
                    <th className="px-3 pb-3">Semestre</th>
                    <th className="px-3 pb-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-faint">
                  {filtrados.map((estudiante) => {
                    const estado = claseEstado(estudiante.activo);
                    return (
                      <tr key={estudiante.clave} className="hover:bg-mist/60">
                        <td className="px-3 py-3">
                          <p className="font-semibold text-tinta">{estudiante.nombre}</p>
                          <p className="mt-0.5 text-[10.5px] text-muted">
                            {[estudiante.username, estudiante.documento, estudiante.telefono]
                              .filter(Boolean)
                              .join(' · ') || '—'}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-ink">{estudiante.email || '—'}</td>
                        <td className="px-3 py-3 font-mono text-[11px] text-slate-ink">
                          {estudiante.codigoInstitucional || '—'}
                        </td>
                        <td className="px-3 py-3">
                          {estudiante.semestre == null ? (
                            <span className="whitespace-nowrap rounded-full bg-advertencia/10 px-2.5 py-1 text-[10px] font-semibold text-advertencia">
                              Sin registrar
                            </span>
                          ) : (
                            <span className="font-semibold text-slate-ink">{estudiante.semestre}</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span className={estado.clase}>{estado.texto}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {modalAbierto && (
        <Modal
          onCerrar={cerrarModal}
          tituloId="estudiante-form"
          eyebrow="GT-180 · Registrar estudiante"
          titulo="Nuevo estudiante"
          ancho="lg"
          cerrable={!enviando}
        >
          <FormularioUsuario
            rol="estudiante"
            enviando={enviando}
            error={errorForm}
            onGuardar={registrar}
            onCancelar={cerrarModal}
          />
        </Modal>
      )}

      <Toast mensaje={toast} />
    </div>
  );
};

export default Estudiantes;

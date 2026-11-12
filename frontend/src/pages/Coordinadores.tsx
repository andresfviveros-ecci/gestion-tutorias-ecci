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

interface CoordinadorAPI {
  id?: number;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  documento?: string | number;
  telefono?: string;
  is_active?: boolean;
}

interface Coordinador {
  clave: string;
  nombre: string;
  username: string;
  email: string;
  documento: string;
  telefono: string;
  activo: boolean | null;
}

const mapear = (lista: CoordinadorAPI[]): Coordinador[] =>
  lista.map((item, indice) => ({
    clave: String(item.id ?? `${item.username ?? ''}-${indice}`),
    nombre: `${item.first_name ?? ''} ${item.last_name ?? ''}`.trim() || item.username || 'Coordinador',
    username: item.username ?? '',
    email: item.email ?? '',
    documento: item.documento == null ? '' : String(item.documento),
    telefono: item.telefono ?? '',
    activo: typeof item.is_active === 'boolean' ? item.is_active : null,
  }));

/**
 * GT-178 (HU-006): coordinadores registrados y alta de nuevos.
 * Solo el grupo Administrador llega aquí (ver `modulos.ts` y la guarda de App).
 */
export const Coordinadores = () => {
  const [coordinadores, setCoordinadores] = useState<Coordinador[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  const [busqueda, setBusqueda] = useState('');

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
        const { data } = await api.get('/accounts/coordinadores/');
        if (!activo) return;
        setCoordinadores(mapear(extraerLista<CoordinadorAPI>(data)));
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
      await api.post('/accounts/coordinadores/', datos);
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
    return coordinadores.filter((coordinador) =>
      coincide(
        consulta,
        coordinador.nombre,
        coordinador.email,
        coordinador.documento,
        coordinador.username,
      ),
    );
  }, [coordinadores, busqueda]);

  return (
    <div className="flex min-h-screen bg-mist font-constelacion text-tinta">
      <AdminRail />
      <Loader hidden={!cargando} />

      <main className="mx-auto w-full min-w-0 max-w-[1500px] flex-1 px-5 py-6 pb-24 sm:px-7 md:pb-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11.5px] text-muted">Usuarios · Administración</p>
            <h1 className="mt-1 text-[30px] font-medium leading-tight tracking-[-0.02em] text-tinta sm:text-[36px]">
              Coordinadores
            </h1>
            <p className="mt-1 max-w-[640px] text-[13px] leading-relaxed text-muted">
              Cuentas de coordinación académica. Solo el administrador puede registrar nuevos
              coordinadores.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirModal}
            className="h-11 rounded-full bg-violeta-accion px-5 text-[12.5px] font-semibold text-white transition-colors hover:bg-violeta-profundo"
          >
            Registrar coordinador
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-peligro/30 bg-peligro/5 px-4 py-3 text-peligro"
          >
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold">No pudimos cargar los coordinadores</p>
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
          <label className="block sm:max-w-[420px]">
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

          <div className="mt-5 flex items-center justify-between px-1 text-[10.5px] text-muted">
            <span>
              {filtrados.length} {filtrados.length === 1 ? 'coordinador' : 'coordinadores'}
            </span>
            <span>{coordinadores.length} en total</span>
          </div>

          {filtrados.length === 0 ? (
            !cargando && (
              <EmptyState
                titulo={
                  coordinadores.length === 0 ? 'Aún no hay coordinadores' : 'No encontramos coordinadores'
                }
                detalle={
                  coordinadores.length === 0
                    ? 'Registra el primer coordinador con el botón de arriba.'
                    : 'Prueba con otro nombre, correo o documento.'
                }
              />
            )
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[12px]">
                <thead>
                  <tr className="border-b border-faint text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                    <th className="px-3 pb-3">Coordinador</th>
                    <th className="px-3 pb-3">Correo</th>
                    <th className="px-3 pb-3">Documento</th>
                    <th className="px-3 pb-3">Teléfono</th>
                    <th className="px-3 pb-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-faint">
                  {filtrados.map((coordinador) => {
                    const estado = claseEstado(coordinador.activo);
                    return (
                      <tr key={coordinador.clave} className="hover:bg-mist/60">
                        <td className="px-3 py-3">
                          <p className="font-semibold text-tinta">{coordinador.nombre}</p>
                          <p className="mt-0.5 text-[10.5px] text-muted">{coordinador.username || '—'}</p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-ink">{coordinador.email || '—'}</td>
                        <td className="px-3 py-3 font-mono text-[11px] text-slate-ink">
                          {coordinador.documento || '—'}
                        </td>
                        <td className="px-3 py-3 text-slate-ink">{coordinador.telefono || '—'}</td>
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
          tituloId="coordinador-form"
          eyebrow="GT-178 · Registrar coordinador"
          titulo="Nuevo coordinador"
          ancho="lg"
          cerrable={!enviando}
        >
          <FormularioUsuario
            rol="coordinador"
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

export default Coordinadores;

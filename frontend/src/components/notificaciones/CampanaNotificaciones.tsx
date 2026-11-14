import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { api } from '../../api/axios';
import { EmptyState } from '../constelacion/EmptyState';
import { SegmentedFilter } from '../constelacion/Filters';
import type { OpcionSegmento } from '../constelacion/Filters';
import { BellIcon } from '../constelacion/Icons';
import { Modal } from '../constelacion/Modal';
import { RailItem } from '../constelacion/Rail';
import { SkeletonFilas } from '../constelacion/Skeleton';
import { useAuthStore } from '../../store/useAuthStore';
import { useNotificaciones } from '../../store/useNotificaciones';
import { normalizarRol, type UserRole } from '../../navigation/modulos';
import { mensajeError } from '../../utils/api';
import { haceCuanto } from '../../utils/fechas';

/** Lo que devuelve GET /api/notificaciones/ en cada elemento de `results`. */
interface Notificacion {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  tutoria: number | null;
  leida: boolean;
  fecha: string;
}

/** La lista siempre viene paginada de a 20 (PR #96). */
interface PaginaNotificaciones {
  count: number;
  next: string | null;
  results: Notificacion[];
}

type Filtro = 'todas' | 'sin-leer';

const FILTROS: OpcionSegmento<Filtro>[] = [
  { valor: 'todas', texto: 'Todas' },
  { valor: 'sin-leer', texto: 'Sin leer' },
];

/** A dónde lleva una notificación con tutoría, según quién la abre. */
const DESTINO_TUTORIA: Record<UserRole, string> = {
  estudiante: '/estudiante/mis-reservas',
  tutor: '/tutor/dashboard',
  admin: '/dashboard',
};

/** Avisos sin tutoría que tienen una pantalla propia (postulaciones a tutor). */
const DESTINO_POR_TIPO: Partial<Record<string, Partial<Record<UserRole, string>>>> = {
  SOLICITUD_TUTOR: { tutor: '/tutor/solicitudes', admin: '/solicitudes' },
  HABILITACION: { estudiante: '/estudiante/postularme-tutor' },
};

/**
 * El estudiante tutor recibe avisos de sus reservas y de las tutorías que da
 * en sus horarios. Si la tutoría no es suya como estudiante (la API responde
 * 404), es una que él atiende y va a Mis tutorías como tutor.
 */
const destinoParaEstudiante = async (tutoriaId: number): Promise<string> => {
  try {
    await api.get(`/tutorias/tutorias/${tutoriaId}/`);
    return '/estudiante/mis-reservas';
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return '/estudiante/mis-tutorias-tutor';
    }
    return '/estudiante/mis-reservas';
  }
};

const paramsDe = (filtro: Filtro, pagina: number) =>
  filtro === 'sin-leer' ? { leida: false, page: pagina } : { page: pagina };

const textoConteo = (noLeidas: number | null): string => {
  if (!noLeidas) return 'Notificaciones';
  return `Notificaciones, ${noLeidas} sin leer`;
};

/**
 * Campana de notificaciones dentro de la aplicación, la misma en los tres
 * rails. El contador sale del estado compartido (una consulta cada 60 s) y la
 * lista se abre en el Modal de Constelación. Si el backend no tiene el
 * endpoint (404), la campana no se muestra.
 */
export const CampanaNotificaciones = () => {
  const navigate = useNavigate();
  const rol = normalizarRol(useAuthStore((state) => state.user?.role));
  const { noLeidas, disponible, refrescar, suscribir, desuscribir } = useNotificaciones();

  const [abierta, setAbierta] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [items, setItems] = useState<Notificacion[]>([]);
  const [siguiente, setSiguiente] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marcandoTodas, setMarcandoTodas] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  // Al cerrar, el foco vuelve a la campana que abrió el panel.
  const origenFoco = useRef<HTMLElement | null>(null);

  useEffect(() => {
    suscribir();
    return () => desuscribir();
  }, [suscribir, desuscribir]);

  const cargar = useCallback(async (filtroActual: Filtro) => {
    setCargando(true);
    setError(null);
    try {
      const { data } = await api.get<PaginaNotificaciones>('/notificaciones/', {
        params: paramsDe(filtroActual, 1),
      });
      setItems(data.results ?? []);
      setSiguiente(data.next ?? null);
      setPagina(1);
    } catch (err) {
      setItems([]);
      setSiguiente(null);
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }, []);

  const abrir = () => {
    origenFoco.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setAbierta(true);
    setFiltro('todas');
    void cargar('todas');
    void refrescar();
  };

  const cerrar = useCallback(() => {
    setAbierta(false);
    window.setTimeout(() => origenFoco.current?.focus(), 0);
  }, []);

  // Al abrir, el foco pasa al panel para que el teclado empiece dentro del diálogo.
  useEffect(() => {
    if (!abierta) return;
    const id = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('button')?.focus();
    }, 50);
    return () => window.clearTimeout(id);
  }, [abierta]);

  const cambiarFiltro = (valor: Filtro) => {
    setFiltro(valor);
    void cargar(valor);
  };

  const verMas = async () => {
    if (!siguiente) return;
    setCargandoMas(true);
    try {
      // Se pide la página siguiente con los mismos filtros (no la URL absoluta de `next`).
      const { data } = await api.get<PaginaNotificaciones>('/notificaciones/', {
        params: paramsDe(filtro, pagina + 1),
      });
      setItems((previas) => [...previas, ...(data.results ?? [])]);
      setSiguiente(data.next ?? null);
      setPagina(pagina + 1);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargandoMas(false);
    }
  };

  const abrirNotificacion = async (notificacion: Notificacion) => {
    if (!notificacion.leida) {
      // Cambio optimista: se marca enseguida y se revierte si el backend falla.
      setItems((previas) =>
        previas.map((item) => (item.id === notificacion.id ? { ...item, leida: true } : item)),
      );
      try {
        await api.patch(`/notificaciones/${notificacion.id}/`, { leida: true });
        void refrescar();
      } catch (err) {
        setItems((previas) =>
          previas.map((item) => (item.id === notificacion.id ? { ...item, leida: false } : item)),
        );
        setError(mensajeError(err));
        return;
      }
    }

    if (notificacion.tutoria != null) {
      const destino =
        rol === 'estudiante'
          ? await destinoParaEstudiante(notificacion.tutoria)
          : DESTINO_TUTORIA[rol];
      setAbierta(false);
      navigate(destino);
      return;
    }

    // Postulaciones a tutor: llevan a su pantalla; el resto solo se marca como leído.
    const destinoTipo = DESTINO_POR_TIPO[notificacion.tipo]?.[rol];
    if (destinoTipo) {
      setAbierta(false);
      navigate(destinoTipo);
    }
  };

  const marcarTodas = async () => {
    setMarcandoTodas(true);
    setError(null);
    try {
      await api.post('/notificaciones/marcar-todas/');
      setItems((previas) =>
        filtro === 'sin-leer' ? [] : previas.map((item) => ({ ...item, leida: true })),
      );
      if (filtro === 'sin-leer') setSiguiente(null);
      await refrescar();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setMarcandoTodas(false);
    }
  };

  if (!disponible) return null;

  return (
    <>
      <RailItem
        onClick={abrir}
        label="Notificaciones"
        ariaLabel={textoConteo(noLeidas)}
        insignia={noLeidas ?? 0}
      >
        <BellIcon className="h-5 w-5" />
      </RailItem>

      {/* Portal: el panel no depende de dónde esté la campana (el rail de
          escritorio se oculta en celular y se llevaría el panel con él). */}
      {abierta &&
        createPortal(
        <Modal
          onCerrar={cerrar}
          tituloId="panel-notificaciones"
          eyebrow={noLeidas ? `${noLeidas} sin leer` : 'Al día'}
          titulo="Notificaciones"
          ancho="md"
        >
          <div ref={panelRef} className="px-6 pb-6 pt-4 sm:px-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SegmentedFilter opciones={FILTROS} valor={filtro} onChange={cambiarFiltro} />
              <button
                type="button"
                onClick={() => void marcarTodas()}
                disabled={!noLeidas || marcandoTodas}
                className="rounded-full px-3 py-2 text-[11.5px] font-semibold text-violeta-accion transition-colors hover:bg-violeta/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {marcandoTodas ? 'Marcando…' : 'Marcar todas como leídas'}
              </button>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-2xl border border-peligro/40 bg-peligro/5 px-4 py-3 text-[11.6px] leading-relaxed text-peligro"
              >
                {error}
              </p>
            )}

            <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1">
              {cargando ? (
                <SkeletonFilas filas={4} alto="h-[68px]" />
              ) : items.length === 0 ? (
                !error && (
                  <EmptyState
                    titulo={filtro === 'sin-leer' ? 'No tienes notificaciones sin leer' : 'Aún no tienes notificaciones'}
                    detalle="Aquí verás las reservas, cancelaciones y cambios de tus tutorías."
                  />
                )
              ) : (
                <ul className="space-y-2">
                  {items.map((notificacion) => (
                    <li key={notificacion.id}>
                      <button
                        type="button"
                        onClick={() => void abrirNotificacion(notificacion)}
                        className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors hover:bg-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violeta-accion ${
                          notificacion.leida ? 'border-faint bg-white' : 'border-violeta/20 bg-violeta/5'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                            notificacion.leida ? 'bg-transparent' : 'bg-violeta-accion'
                          }`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-3">
                            <span className="text-[12.5px] font-semibold text-tinta">
                              {notificacion.titulo}
                              {!notificacion.leida && <span className="sr-only"> (sin leer)</span>}
                            </span>
                            <span className="shrink-0 text-[10.5px] text-muted">
                              {haceCuanto(notificacion.fecha)}
                            </span>
                          </span>
                          <span className="mt-0.5 block text-[11.5px] leading-relaxed text-slate-ink">
                            {notificacion.mensaje}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {siguiente && !cargando && (
                <div className="mt-3 flex justify-center">
                  <button
                    type="button"
                    onClick={() => void verMas()}
                    disabled={cargandoMas}
                    className="h-10 rounded-full border border-faint px-5 text-[11.5px] font-semibold text-slate-ink transition-colors hover:bg-mist disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {cargandoMas ? 'Cargando…' : 'Ver más'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </Modal>,
          document.body,
        )}
    </>
  );
};

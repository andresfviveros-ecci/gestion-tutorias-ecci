import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminRail } from '../components/admin/AdminRail';
import { ConfirmarEstadoModal } from '../components/admin/ConfirmarEstadoModal';
import { EditarUsuarioModal } from '../components/admin/EditarUsuarioModal';
import { FiltrosUsuarios, type ValoresFiltros } from '../components/admin/FiltrosUsuarios';
import {
  loadUsersList,
  saveUserEditInBackend,
  toggleUserActiveInBackend,
  type UserAccount,
} from '../components/admin/gestionUsuarios';
import { TablaUsuarios } from '../components/admin/TablaUsuarios';
import { coincide, normalizar } from '../components/admin/usuarios';
import { Loader } from '../components/Loader';
import { EmptyState } from '../components/constelacion/EmptyState';
import { CloseIcon } from '../components/constelacion/Icons';
import { Toast } from '../components/constelacion/Toast';

const FILTROS_INICIALES: ValoresFiltros = { usuario: '', correo: '', rol: '', estado: 'todos' };

/**
 * GT-177 (HU-007): todos los usuarios del sistema. Se puede buscar, filtrar,
 * editar y activar/desactivar; los cambios son optimistas y se revierten si
 * el PUT falla. El backend no devuelve tutores inactivos (`solo_activos`).
 */
export const GestionarUsuarios = () => {
  const [cargando, setCargando] = useState(true);
  const [usuarios, setUsuarios] = useState<UserAccount[]>([]);
  const [filtros, setFiltros] = useState<ValoresFiltros>(FILTROS_INICIALES);

  const [editando, setEditando] = useState<UserAccount | null>(null);
  const [porDesactivar, setPorDesactivar] = useState<UserAccount | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    loadUsersList()
      .then((data) => {
        if (activo) setUsuarios(data);
      })
      .catch((err) => {
        console.error('Error al cargar usuarios iniciales:', err);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const temporizador = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(temporizador);
  }, [toast]);

  const recargar = async () => {
    try {
      const data = await loadUsersList();
      if (data && data.length > 0) setUsuarios(data);
    } catch (err) {
      console.warn('Error al recargar usuarios:', err);
    }
  };

  const reemplazar = (id: string, cambio: (usuario: UserAccount) => UserAccount) =>
    setUsuarios((prev) => prev.map((u) => (u.id === id ? cambio(u) : u)));

  const roles = useMemo(
    () => Array.from(new Set(usuarios.map((u) => u.rol.trim()).filter(Boolean))),
    [usuarios],
  );

  const filtrados = useMemo(() => {
    const usuario = normalizar(filtros.usuario);
    const correo = normalizar(filtros.correo);
    return usuarios.filter(
      (u) =>
        coincide(usuario, u.nombre, u.username) &&
        coincide(correo, u.correo) &&
        (filtros.rol === '' || u.rol === filtros.rol) &&
        (filtros.estado === 'todos' || (filtros.estado === 'activos' ? u.activo : !u.activo)),
    );
  }, [usuarios, filtros]);

  const hayFiltros =
    filtros.usuario !== '' || filtros.correo !== '' || filtros.rol !== '' || filtros.estado !== 'todos';

  // Activar va directo; desactivar pide confirmación.
  const cambiarEstado = async (usuario: UserAccount) => {
    if (usuario.activo) {
      setPorDesactivar(usuario);
      return;
    }

    setError(null);
    reemplazar(usuario.id, (u) => ({ ...u, activo: true }));
    setCargando(true);
    const resultado = await toggleUserActiveInBackend(usuario, true);
    setCargando(false);

    if (resultado.ok) {
      setToast(`${usuario.nombre} se reactivó correctamente.`);
      void recargar();
    } else {
      reemplazar(usuario.id, (u) => ({ ...u, activo: false }));
      setError(`No se pudo activar a ${usuario.nombre}. ${resultado.error}`);
    }
  };

  const confirmarDesactivacion = async () => {
    if (!porDesactivar) return;
    const objetivo = porDesactivar;
    setPorDesactivar(null);

    setError(null);
    reemplazar(objetivo.id, (u) => ({ ...u, activo: false }));
    setCargando(true);
    const resultado = await toggleUserActiveInBackend(objetivo, false);
    setCargando(false);

    if (resultado.ok) {
      setToast(`${objetivo.nombre} quedó desactivado.`);
      void recargar();
    } else {
      reemplazar(objetivo.id, (u) => ({ ...u, activo: true }));
      setError(`No se pudo desactivar a ${objetivo.nombre}. ${resultado.error}`);
    }
  };

  const guardarEdicion = async (objetivo: UserAccount) => {
    const anterior = usuarios.find((u) => u.id === objetivo.id);
    setEditando(null);

    setError(null);
    reemplazar(objetivo.id, () => objetivo);
    setCargando(true);
    const resultado = await saveUserEditInBackend(objetivo);
    setCargando(false);

    if (resultado.ok) {
      setToast(`Información de ${objetivo.nombre} actualizada.`);
      void recargar();
    } else {
      if (anterior) reemplazar(objetivo.id, () => anterior);
      setError(`No se pudo actualizar a ${objetivo.nombre}. ${resultado.error}`);
    }
  };

  const cerrarEdicion = useCallback(() => setEditando(null), []);
  const cancelarDesactivacion = useCallback(() => setPorDesactivar(null), []);

  return (
    <div className="flex min-h-screen bg-mist font-constelacion text-tinta">
      <AdminRail />
      <Loader hidden={!cargando} />

      <main className="mx-auto w-full min-w-0 max-w-[1500px] flex-1 px-5 py-6 pb-24 sm:px-7 md:pb-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11.5px] text-muted">Usuarios · Coordinación</p>
            <h1 className="mt-1 text-[30px] font-medium leading-tight tracking-[-0.02em] text-tinta sm:text-[36px]">
              Gestionar usuarios
            </h1>
            <p className="mt-1 max-w-[640px] text-[13px] leading-relaxed text-muted">
              Estudiantes, tutores y coordinadores en un solo lugar. Edita sus datos y activa o
              desactiva su acceso.
            </p>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-peligro/30 bg-peligro/5 px-4 py-3 text-peligro"
          >
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold">No pudimos guardar el cambio</p>
              <p className="mt-1 break-words text-[11.5px] leading-relaxed opacity-90">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              aria-label="Cerrar aviso"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-peligro/10"
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <section className="rounded-[32px] bg-white p-5 sm:p-6">
          <FiltrosUsuarios valores={filtros} roles={roles} onChange={setFiltros} />

          <div className="mt-5 flex items-center justify-between px-1 text-[10.5px] text-muted">
            <span>
              {filtrados.length} {filtrados.length === 1 ? 'usuario' : 'usuarios'}
            </span>
            {hayFiltros ? (
              <button
                type="button"
                onClick={() => setFiltros(FILTROS_INICIALES)}
                className="font-semibold text-violeta-accion hover:underline"
              >
                Limpiar filtros
              </button>
            ) : (
              <span>{usuarios.length} en total</span>
            )}
          </div>

          {filtrados.length === 0 ? (
            !cargando && (
              <EmptyState
                titulo={usuarios.length === 0 ? 'Aún no hay usuarios' : 'No hay usuarios que coincidan'}
                detalle={
                  usuarios.length === 0
                    ? 'Registra estudiantes, tutores o coordinadores desde sus pantallas.'
                    : 'Prueba con otro nombre, correo, rol o estado.'
                }
              />
            )
          ) : (
            <TablaUsuarios
              usuarios={filtrados}
              onCambiarEstado={(usuario) => void cambiarEstado(usuario)}
              onEditar={setEditando}
            />
          )}
        </section>
      </main>

      {editando && (
        <EditarUsuarioModal
          usuario={editando}
          onCerrar={cerrarEdicion}
          onGuardar={(usuario) => void guardarEdicion(usuario)}
        />
      )}

      {porDesactivar && (
        <ConfirmarEstadoModal
          usuario={porDesactivar}
          onCancelar={cancelarDesactivacion}
          onConfirmar={() => void confirmarDesactivacion()}
        />
      )}

      <Toast mensaje={toast} />
    </div>
  );
};

export default GestionarUsuarios;

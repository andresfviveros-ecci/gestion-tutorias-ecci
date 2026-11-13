import { useEffect, useRef, type MouseEvent } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Modal } from '../constelacion/Modal';
import { LogoutIcon } from '../constelacion/Rail';
import { useAuthStore } from '../../store/useAuthStore';
import { useTransicionSesion } from '../../store/useTransicionSesion';

const iniciales = (nombre: string): string => {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return 'AL';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
};

const NOMBRE_ROL = { admin: 'Coordinación', tutor: 'Docente', estudiante: 'Estudiante' } as const;

const ContenidoConfirmacion = () => {
  const user = useAuthStore((state) => state.user);
  const cancelar = useTransicionSesion((state) => state.cancelarCierre);
  const confirmar = useTransicionSesion((state) => state.confirmarCierre);
  const cancelarRef = useRef<HTMLButtonElement>(null);

  // El foco va a «Cancelar»: un Enter distraído no cierra la sesión.
  useEffect(() => {
    cancelarRef.current?.focus();
  }, []);

  const alConfirmar = (event: MouseEvent<HTMLButtonElement>) => {
    const caja = event.currentTarget.getBoundingClientRect();
    confirmar({ x: caja.left + caja.width / 2, y: caja.top + caja.height / 2 });
  };

  const nombre = user?.nombre || 'Tu cuenta';
  const rol = user?.grupos?.includes('Administrador') ? 'Administración' : NOMBRE_ROL[user?.role ?? 'estudiante'];

  return (
    <Modal
      onCerrar={cancelar}
      tituloId="confirmar-cierre-sesion"
      eyebrow="Cerrar sesión"
      eyebrowClassName="text-peligro"
      titulo="¿Seguro que quieres salir?"
      ancho="md"
    >
      <div className="px-6 pb-6 pt-3 sm:px-7">
        <p className="text-[12.5px] leading-relaxed text-muted">
          Se cerrará tu sesión en este equipo y el acceso quedará revocado en el servidor. Para volver
          tendrás que ingresar otra vez con tu correo institucional.
        </p>

        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-mist px-3.5 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-carbon text-[12px] font-semibold text-white">
            {iniciales(nombre)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-tinta">{nombre}</span>
            <span className="block truncate text-[11.5px] text-muted">
              {rol}
              {user?.correo ? ` · ${user.correo}` : ''}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[10.5px] font-semibold text-exito">
            <span className="h-1.5 w-1.5 rounded-full bg-exito" aria-hidden="true" />
            Activa
          </span>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelarRef}
            type="button"
            onClick={cancelar}
            className="h-11 rounded-full border border-faint bg-white px-5 text-[12.5px] font-semibold text-tinta transition-colors hover:bg-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violeta-accion"
          >
            Seguir en Aula Libre
          </button>
          <button
            type="button"
            onClick={alConfirmar}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-peligro px-6 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-peligro"
          >
            <LogoutIcon />
            Sí, cerrar sesión
          </button>
        </div>
      </div>
    </Modal>
  );
};

/** Confirmación de cierre de sesión, compartida por los tres roles. Se monta una vez en App. */
export const ConfirmarCierreSesion = () => {
  const abierto = useTransicionSesion((state) => state.confirmandoCierre);
  return <AnimatePresence>{abierto && <ContenidoConfirmacion />}</AnimatePresence>;
};

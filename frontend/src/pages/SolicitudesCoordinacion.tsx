import { AdminRail } from '../components/admin/AdminRail';
import { ContenidoSolicitudes } from '../components/tutor/solicitudes/ContenidoSolicitudes';

/**
 * RF-03: la coordinación revisa las solicitudes de tutor de las materias que
 * se quedaron sin docente en el periodo. Misma pantalla que la del docente.
 */
export const SolicitudesCoordinacion = () => (
  <div className="flex min-h-screen bg-mist font-constelacion text-tinta">
    <AdminRail />
    <ContenidoSolicitudes variante="coordinacion" />
  </div>
);

export default SolicitudesCoordinacion;

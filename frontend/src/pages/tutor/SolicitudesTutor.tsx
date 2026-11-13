import { TutorRail } from '../../components/tutor/TutorRail';
import { ContenidoSolicitudes } from '../../components/tutor/solicitudes/ContenidoSolicitudes';

/** Panel del docente con las solicitudes de tutor de sus materias (GT-242). */
export const SolicitudesTutor = () => (
  <div className="flex min-h-screen bg-mist font-constelacion text-tinta">
    <TutorRail />
    <ContenidoSolicitudes variante="tutor" />
  </div>
);

export default SolicitudesTutor;

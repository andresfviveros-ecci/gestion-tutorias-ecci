import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore, type UserRole } from './store/useAuthStore';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Estudiantes } from './pages/Estudiantes';
import { Tutores } from './pages/Tutores';
import { AsignacionMaterias } from './pages/AsignacionMaterias';
import { GestionMaterias } from './pages/GestionMaterias';
import { GestionNotas } from './pages/GestionNotas';
import { Coordinadores } from './pages/Coordinadores';
import { GestionarUsuarios } from './pages/GestionarUsuarios';
import { ConfiguracionGeneral } from './pages/ConfiguracionGeneral';
import { ReporteTutores } from './pages/ReporteTutores';
import { SolicitudesCoordinacion } from './pages/SolicitudesCoordinacion';
import { PeriodosProgramas } from './pages/PeriodosProgramas';
import { TutorPanel } from './pages/tutor/TutorPanel';
import { SolicitudesTutor } from './pages/tutor/SolicitudesTutor';
import { MiDisponibilidad } from './pages/tutor/MiDisponibilidad';
import { ModificarDisponibilidad } from './pages/tutor/ModificarDisponibilidad';
import { Calendario } from './pages/tutor/Calendario';
import { StudentPanel } from './pages/estudiante/StudentPanel';
import { BuscarTutorias } from './pages/estudiante/BuscarTutorias';
import { MisReservas } from './pages/estudiante/MisReservas';
import { MisTutoriasTutor } from './pages/estudiante/MisTutoriasTutor';
import { MisHorariosTutor } from './pages/estudiante/MisHorariosTutor';
import { PostulateComoTutor } from './pages/estudiante/PostulateComoTutor';
import { MODULOS, normalizarRol, RUTA_INICIO } from './navigation/modulos';
import { ArrowIcon } from './components/constelacion/Icons';
import { api } from './api/axios';
import { ConfirmarCierreSesion } from './components/sesion/ConfirmarCierreSesion';
import { PantallaSesion } from './components/sesion/PantallaSesion';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  /**
   * RF-01: la ruta es del estudiante habilitado como tutor (solicitud aprobada
   * en el periodo activo). Un estudiante sin habilitar ve el 403.
   */
  soloEstudianteTutor?: boolean;
}

const NOMBRE_ROL: Record<UserRole, string> = {
  admin: 'Coordinación / Administración',
  tutor: 'Docente / Tutor',
  estudiante: 'Estudiante',
};

/** 403: la ruta pertenece a otro rol o exige un grupo que la sesión no tiene. */
const AccessDeniedView: React.FC<{ role: UserRole; mensaje?: string }> = ({ role, mensaje }) => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-mist px-5 py-10 font-constelacion text-tinta">
      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[520px] rounded-[32px] bg-white p-7 shadow-constelacion-card sm:p-9"
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-peligro/10 px-3 py-1.5 text-[11px] font-semibold text-peligro">
          <span className="h-1.5 w-1.5 rounded-full bg-peligro" aria-hidden="true" />
          Acceso restringido · 403
        </span>

        <h1 className="mt-5 text-[30px] font-medium leading-tight tracking-[-0.02em] sm:text-[34px]">
          Acceso denegado
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          {mensaje ??
            'Intentaste entrar a una sección asignada a otro perfil. Tu sesión está activa como:'}
        </p>

        <p className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-mist px-4 py-2.5 text-[12px]">
          <span className="text-muted">Tu rol</span>
          <span className="font-semibold text-tinta">{NOMBRE_ROL[role]}</span>
        </p>

        <button
          type="button"
          onClick={() => navigate(RUTA_INICIO[role])}
          className="mt-7 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-violeta-accion px-5 text-[12.5px] font-semibold text-white transition-colors hover:bg-violeta-profundo focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violeta-accion"
        >
          Volver a mi panel
          <ArrowIcon className="h-4 w-4" />
        </button>
      </motion.main>
    </div>
  );
};

/**
 * Consulta una sola vez por sesión si el estudiante puede publicar horarios
 * (`puede_publicar` de /accounts/me/). null mientras llega la respuesta.
 */
const usePuedePublicar = (activo: boolean): boolean | null => {
  const [puede, setPuede] = useState<boolean | null>(null);

  useEffect(() => {
    if (!activo) return;
    let vigente = true;
    api
      .get('/accounts/me/')
      .then(({ data }) => {
        if (vigente) setPuede(Boolean(data?.puede_publicar));
      })
      .catch(() => {
        if (vigente) setPuede(false);
      });
    return () => {
      vigente = false;
    };
  }, [activo]);

  return activo ? puede : true;
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  soloEstudianteTutor = false,
}) => {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const rolActual = user ? normalizarRol(user.role || user.rol) : null;
  const puedePublicar = usePuedePublicar(soloEstudianteTutor && rolActual === 'estudiante');

  const [hasHydrated, setHasHydrated] = useState(() => useAuthStore.persist.hasHydrated());

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      return;
    }

    const unsubFinish = useAuthStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });

    return () => unsubFinish();
  }, []);

  if (!hasHydrated) {
    return null;
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  const userRole = normalizarRol(user.role || user.rol);
  const isAllowed = allowedRoles.map((r) => r.toLowerCase()).includes(userRole);
  // Los módulos que exigen un grupo (Coordinadores → Administrador) se cuidan también aquí.
  const modulo = MODULOS.find((m) => m.ruta === location.pathname);
  const faltaGrupo = Boolean(modulo?.grupos && !modulo.grupos.some((g) => user.grupos?.includes(g)));

  if (!isAllowed || faltaGrupo) {
    return <AccessDeniedView role={userRole} />;
  }

  if (puedePublicar === null) {
    return <div className="min-h-screen bg-mist" aria-busy="true" />;
  }

  if (!puedePublicar) {
    return (
      <AccessDeniedView
        role={userRole}
        mensaje="Esta sección es solo para estudiantes habilitados como tutores. Puedes postularte desde «Postúlate como tutor». Tu sesión está activa como:"
      />
    );
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta Pública */}
        <Route path="/" element={<Login />} />

        {/* Rutas de Estudiante */}
        <Route path="/inicio" element={<Navigate to="/estudiante/dashboard" replace />} />
        <Route path="/estudiante" element={<Navigate to="/estudiante/dashboard" replace />} />
        
        <Route
          path="/estudiante/dashboard"
          element={
            <ProtectedRoute allowedRoles={['estudiante']}>
              <StudentPanel />
            </ProtectedRoute>
          }
        />
        <Route
          path="/estudiante/buscar-tutorias"
          element={
            <ProtectedRoute allowedRoles={['estudiante']}>
              <BuscarTutorias />
            </ProtectedRoute>
          }
        />
        <Route
          path="/estudiante/postularme-tutor"
          element={
            <ProtectedRoute allowedRoles={['estudiante']}>
              <PostulateComoTutor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/estudiante/mis-reservas"
          element={
            <ProtectedRoute allowedRoles={['estudiante']}>
              <MisReservas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/estudiante/mis-tutorias-tutor"
          element={
            <ProtectedRoute allowedRoles={['estudiante']} soloEstudianteTutor>
              <MisTutoriasTutor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/estudiante/mis-horarios"
          element={
            <ProtectedRoute allowedRoles={['estudiante']} soloEstudianteTutor>
              <MisHorariosTutor />
            </ProtectedRoute>
          }
        />
        {/* Alias legado: antes mostraba el mismo componente con el layout viejo. */}
        <Route
          path="/estudiante/historial"
          element={
            <ProtectedRoute allowedRoles={['estudiante']}>
              <MisReservas />
            </ProtectedRoute>
          }
        />

        {/* Rutas de Administrador / Coordinador */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/estudiantes"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Estudiantes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tutores"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Tutores />
            </ProtectedRoute>
          }
        />
        <Route
          path="/asignacion-materias"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AsignacionMaterias />
            </ProtectedRoute>
          }
        />
        <Route
          path="/materias"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <GestionMaterias />
            </ProtectedRoute>
          }
        />
        <Route
          path="/materias-cursadas"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <GestionNotas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coordinadores"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Coordinadores />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gestionar-usuarios"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <GestionarUsuarios />
            </ProtectedRoute>
          }
        />
        <Route
          path="/configuracion"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ConfiguracionGeneral />
            </ProtectedRoute>
          }
        />
        <Route
          path="/solicitudes"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <SolicitudesCoordinacion />
            </ProtectedRoute>
          }
        />
        <Route
          path="/periodos"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <PeriodosProgramas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reportes"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ReporteTutores />
            </ProtectedRoute>
          }
        />

        {/* Rutas de Tutor / Docente */}
        <Route
          path="/tutor/dashboard"
          element={
            <ProtectedRoute allowedRoles={['tutor']}>
              <TutorPanel />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tutor/solicitudes"
          element={
            <ProtectedRoute allowedRoles={['tutor']}>
              <SolicitudesTutor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tutor/mi-disponibilidad"
          element={
            <ProtectedRoute allowedRoles={['tutor', 'estudiante']} soloEstudianteTutor>
              <MiDisponibilidad />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tutor/mi-disponibilidad/:id/editar"
          element={
            <ProtectedRoute allowedRoles={['tutor', 'estudiante']} soloEstudianteTutor>
              <ModificarDisponibilidad />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tutor/calendario"
          element={
            <ProtectedRoute allowedRoles={['tutor']}>
              <Calendario />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Confirmación de cierre y cortina animada de entrada/salida, para los tres roles. */}
      <ConfirmarCierreSesion />
      <PantallaSesion />
    </BrowserRouter>
  );
};

export default App;
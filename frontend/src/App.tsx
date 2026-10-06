import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { useAuthStore, type UserRole } from './store/useAuthStore';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Estudiantes } from './pages/Estudiantes';
import { Tutores } from './pages/Tutores';
import { Coordinadores } from './pages/Coordinadores';
import { GestionarUsuarios } from './pages/GestionarUsuarios';
import { MiDisponibilidad } from './pages/tutor/MiDisponibilidad';
import { Calendario } from './pages/tutor/Calendario';
import { StudentHome } from './pages/StudentHome';
import { Layout } from './components/Layout';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

// Variantes de animación para Framer Motion
const cardContainerVariants: Variants = {
  hidden: { opacity: 0, scale: 0.92, y: 30 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

const AccessDeniedView: React.FC<{ role: UserRole }> = ({ role }) => {
  const navigate = useNavigate();

  const handleRedirect = () => {
    if (role === 'admin') navigate('/dashboard');
    else if (role === 'tutor') navigate('/tutor/mi-disponibilidad');
    else navigate('/inicio');
  };

  const roleFormatted =
    role === 'admin' ? 'Coordinador / Admin' : role === 'tutor' ? 'Docente / Tutor' : 'Estudiante';

  return (
    <div className="relative min-h-screen w-full bg-[#f7f5ed] flex items-center justify-center p-4 md:p-8 overflow-hidden font-body">
      {/* Fondo decorativo con mallas y orbes animados */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-12 left-12 w-96 h-96 bg-[#1f7a5c]/15 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{
          scale: [1.1, 1, 1.1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1,
        }}
        className="absolute bottom-12 right-12 w-[30rem] h-[30rem] bg-[#0d1b2a]/10 rounded-full blur-3xl pointer-events-none"
      />

      {/* Rejilla de puntos sutíl */}
      <div className="absolute inset-0 bg-[radial-gradient(#0d1b2a_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

      {/* Tarjeta principal estilo 21st.dev / Glassmorphism */}
      <motion.div
        variants={cardContainerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-4xl bg-white/80 backdrop-blur-xl border border-[#0d1b2a]/10 rounded-3xl shadow-[0_20px_50px_rgba(13,27,42,0.08)] overflow-hidden grid grid-cols-1 md:grid-cols-12"
      >
        {/* Columna Izquierda - Arte Visual e Imagen */}
        <div className="relative md:col-span-5 bg-[#0d1b2a] text-[#f7f5ed] p-8 flex flex-col justify-between overflow-hidden min-h-[260px] md:min-h-full">
          <img
            src="https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=1000&auto=format&fit=crop"
            alt="Biblioteca y Estudio"
            className="absolute inset-0 w-full h-full object-cover opacity-25 grayscale mix-blend-luminosity pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d1b2a] via-[#0d1b2a]/60 to-transparent pointer-events-none" />

          {/* Logo o Marca superior */}
          <div className="relative z-10 flex items-center gap-2">
            <span className="font-display italic text-2xl font-semibold tracking-wide">Aula Libre</span>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-[#1f7a5c] text-white">
              Sistema
            </span>
          </div>

          {/* Icono Flotante de candado en 3D/Glass con Framer Motion */}
          <div className="relative z-10 my-auto py-6 flex flex-col items-center">
            <motion.div
              animate={{ y: [-6, 6, -6] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="relative w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl flex items-center justify-center"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#1f7a5c]/40 to-transparent rounded-2xl pointer-events-none" />
              <svg
                className="w-10 h-10 text-[#f7f5ed]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </motion.div>
          </div>

          {/* Pie informativo */}
          <div className="relative z-10 text-xs text-slate-300 font-medium">
            Módulo restringido por políticas de seguridad institucional.
          </div>
        </div>

        {/* Columna Derecha - Contenido y Acciones */}
        <div className="md:col-span-7 p-8 md:p-12 flex flex-col justify-center bg-white/50">
          {/* Badge de Estado */}
          <motion.div variants={itemVariants} className="mb-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-700 text-xs font-semibold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              Acceso Restringido 403
            </span>
          </motion.div>

          {/* Título */}
          <motion.h2
            variants={itemVariants}
            className="font-display italic text-3xl md:text-4xl font-semibold text-[#0d1b2a] mb-4"
          >
            Zona no autorizada
          </motion.h2>

          {/* Descripción con Badge de Rol */}
          <motion.p variants={itemVariants} className="text-sm text-slate-600 leading-relaxed mb-6">
            Has intentado ingresar a una dirección asignada a un perfil distinto. Tu cuenta se encuentra
            autenticada activamente como:
          </motion.p>

          <motion.div variants={itemVariants} className="mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0d1b2a]/5 border border-[#0d1b2a]/10 text-[#0d1b2a]">
              <span className="text-xs font-medium text-slate-500">Tu Rol:</span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#1f7a5c]">
                {roleFormatted}
              </span>
            </div>
          </motion.div>

          {/* Botón de Acción Principal con Framer Motion */}
          <motion.div variants={itemVariants}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRedirect}
              className="w-full py-3.5 px-6 bg-[#0d1b2a] hover:bg-[#1b2a3a] text-white text-xs font-semibold rounded-xl shadow-lg shadow-[#0d1b2a]/15 transition-all flex items-center justify-center gap-3 group"
            >
              <span>Volver a mi Panel Principal</span>
              <svg
                className="w-4 h-4 transform group-hover:translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

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

  // 1. Redirigir al Login si no hay usuario en sesión guardando la ruta intentada
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // 2. Si el rol del usuario no está permitido para esta ruta, renderizar la vista animada de Acceso Denegado
  if (!allowedRoles.includes(user.role)) {
    return <AccessDeniedView role={user.role} />;
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
        <Route
          path="/inicio"
          element={
            <ProtectedRoute allowedRoles={['estudiante']}>
              <StudentHome />
            </ProtectedRoute>
          }
        />

        {/* Rutas del Administrador / Coordinador */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/estudiantes"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <Estudiantes />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tutores"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <Tutores />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/coordinadores"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <Coordinadores />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/gestionar-usuarios"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <GestionarUsuarios />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Rutas de Tutor / Docente */}
        <Route
          path="/tutor/mi-disponibilidad"
          element={
            <ProtectedRoute allowedRoles={['tutor', 'admin']}>
              <Layout>
                <MiDisponibilidad />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tutor/calendario"
          element={
            <ProtectedRoute allowedRoles={['tutor', 'admin']}>
              <Layout>
                <Calendario />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
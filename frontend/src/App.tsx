import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

const ProtectedRoute = ({
  children,
  allowedRole,
}: {
  children: React.ReactNode;
  allowedRole: UserRole;
}) => {
  const user = useAuthStore((state) => state.user);
  const [hasHydrated, setHasHydrated] = useState(() =>
    useAuthStore.persist.hasHydrated()
  );

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
    return <Navigate to="/" replace />;
  }

  if (user.role !== allowedRole) {
    if (user.role === 'admin') return <Navigate to="/dashboard" replace />;
    if (user.role === 'tutor') return <Navigate to="/tutor/mi-disponibilidad" replace />;
    return <Navigate to="/inicio" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/inicio"
          element={
            <ProtectedRoute allowedRole="estudiante">
              <StudentHome />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRole="admin">
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/estudiantes"
          element={
            <ProtectedRoute allowedRole="admin">
              <Layout>
                <Estudiantes />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tutores"
          element={
            <ProtectedRoute allowedRole="admin">
              <Layout>
                <Tutores />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/coordinadores"
          element={
            <ProtectedRoute allowedRole="admin">
              <Layout>
                <Coordinadores />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/gestionar-usuarios"
          element={
            <ProtectedRoute allowedRole="admin">
              <Layout>
                <GestionarUsuarios />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/tutor/mi-disponibilidad"
          element={
            <ProtectedRoute allowedRole="tutor">
              <Layout>
                <MiDisponibilidad />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tutor/calendario"
          element={
            <ProtectedRoute allowedRole="tutor">
              <Layout>
                <Calendario />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
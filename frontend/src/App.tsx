import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Estudiantes } from './pages/Estudiantes';
import { Tutores } from './pages/Tutores';
import { Coordinadores } from './pages/Coordinadores';
import { GestionarUsuarios } from './pages/GestionarUsuarios';
import { StudentHome } from './pages/StudentHome';
import { Layout } from './components/Layout';

const ProtectedRoute = ({
  children,
  allowedRole,
}: {
  children: React.ReactNode;
  allowedRole: 'admin' | 'estudiante';
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
    return <Navigate to={user.role === 'admin' ? '/dashboard' : '/inicio'} replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        {/* RUTAS DEL ESTUDIANTE */}
        <Route
          path="/inicio"
          element={
            <ProtectedRoute allowedRole="estudiante">
              <StudentHome />
            </ProtectedRoute>
          }
        />

        {/* RUTAS DEL ADMINISTRADOR */}
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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
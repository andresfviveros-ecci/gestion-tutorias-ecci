import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, type UserRole } from '../store/useAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

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

  // 1. Si el usuario no ha iniciado sesión, redirigir al Login guardando la URL intentada
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // 2. Si el rol del usuario no tiene acceso a esta vista, reorientarlo según su rol real
  if (!allowedRoles.includes(user.role)) {
    if (user.role === 'admin') {
      return <Navigate to="/dashboard" replace />;
    }
    if (user.role === 'tutor') {
      return <Navigate to="/tutor/mi-disponibilidad" replace />;
    }
    return <Navigate to="/inicio" replace />;
  }

  return <>{children}</>;
};
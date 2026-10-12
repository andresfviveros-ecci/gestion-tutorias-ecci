import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, type UserRole } from '../store/useAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

const normalizeRole = (role?: string): UserRole => {
  const r = String(role || '').toLowerCase();
  if (r.includes('admin') || r.includes('coordinador')) return 'admin';
  if (r.includes('tutor') || r.includes('docente')) return 'tutor';
  return 'estudiante';
};

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

  const userRole = normalizeRole(user.role || (user as unknown as { rol?: string }).rol);
  const isAllowed = allowedRoles.map((r) => r.toLowerCase()).includes(userRole);

  // 2. Si el rol del usuario no tiene acceso a esta vista, reorientarlo según su rol real
  if (!isAllowed) {
    if (userRole === 'admin') {
      return <Navigate to="/dashboard" replace />;
    }
    if (userRole === 'tutor') {
      return <Navigate to="/tutor/mi-disponibilidad" replace />;
    }
    return <Navigate to="/inicio" replace />;
  }

  return <>{children}</>;
};
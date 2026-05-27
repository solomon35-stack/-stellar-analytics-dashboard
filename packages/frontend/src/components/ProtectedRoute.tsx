/**
 * ProtectedRoute Component
 * 
 * Route guard that checks if user is authenticated before rendering the protected component.
 * Redirects to login page if not authenticated.
 */

import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

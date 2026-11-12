import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

/**
 * AdminRoute Guard
 * Restricts route access to authenticated users with role === 'ADMIN'.
 * Handles session loading and redirects unauthenticated or non-admin users.
 */
export default function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  // Show loading indicator while session is being verified
  if (loading) {
    return <div className="loading-state">Verifying administrative access...</div>;
  }

  // Redirect unauthenticated visitors to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Restrict access for authenticated non-administrators
  if (!isAdmin) {
    return <Navigate to="/forum" replace />;
  }

  return children;
}

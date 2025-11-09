import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth as useAuthContext } from '@/contexts/AuthContext';
import { ROUTES } from '@/types/routes';

/**
 * Re-export useAuth from context for convenience
 */
export { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to require authentication for a page
 * Redirects to login if not authenticated
 */
export function useRequireAuth() {
  const { isAuthenticated, loading } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate(ROUTES.LOGIN, { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  return { isAuthenticated, loading };
}

/**
 * Hook to require admin role for a page
 * Redirects to home if not admin
 */
export function useRequireAdmin() {
  const { isAdmin, loading } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate(ROUTES.HOME, { replace: true });
    }
  }, [isAdmin, loading, navigate]);

  return { isAdmin, loading };
}

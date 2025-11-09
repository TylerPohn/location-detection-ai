// Main Application Component
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/config/queryClient';
import { NotificationProvider } from '@/context/NotificationContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/Layout/AppLayout';
import { ProtectedRoute } from '@/components/Auth/ProtectedRoute';
import { AdminRoute } from '@/components/Auth/AdminRoute';
import { HomePage } from '@/pages/HomePage';
import { UploadPage } from '@/pages/UploadPage';
import { ResultsPage } from '@/pages/ResultsPage';
import { LoginPage } from '@/pages/LoginPage';
import { RoleSelectionPage } from '@/pages/RoleSelectionPage';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { ROUTES } from '@/types/routes';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <BrowserRouter>
          <AuthProvider>
            <AppLayout>
              <Routes>
                <Route path={ROUTES.HOME} element={<HomePage />} />
                <Route path={ROUTES.LOGIN} element={<LoginPage />} />
                <Route
                  path={ROUTES.ROLE_SELECTION}
                  element={
                    <ProtectedRoute>
                      <RoleSelectionPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.UPLOAD}
                  element={
                    <ProtectedRoute>
                      <UploadPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.RESULTS}
                  element={
                    <ProtectedRoute>
                      <ResultsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.ADMIN}
                  element={
                    <AdminRoute>
                      <AdminDashboard />
                    </AdminRoute>
                  }
                />
              </Routes>
            </AppLayout>
            <ReactQueryDevtools initialIsOpen={false} />
          </AuthProvider>
        </BrowserRouter>
      </NotificationProvider>
    </QueryClientProvider>
  );
}

export default App;

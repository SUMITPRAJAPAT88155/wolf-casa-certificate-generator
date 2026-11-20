import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/layouts/DashboardLayout';
import SealManagementPage from '@/pages/SealManagementPage';
import LoginPage from '@/pages/LoginPage';
import VerifyPage from '@/pages/VerifyPage';
import DashboardPage from '@/pages/DashboardPage';
import CreateCertificatePage from '@/pages/CreateCertificatePage';
import BulkGeneratorPage from '@/pages/BulkGeneratorPage';
import RecordsPage from '@/pages/RecordsPage';
import SettingsPage from '@/pages/SettingsPage';
import { Loader2 } from 'lucide-react';

function Protected({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-neutral-600 animate-spin" />
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-neutral-600 animate-spin" />
      </div>
    );
  }
  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/verify/:certificateId"
            element={<VerifyPage />}
          />
          <Route
            path="/verify"
            element={<VerifyPage />}
          />
          <Route
            path="/login"
            element={
              <PublicOnly>
                <LoginPage />
              </PublicOnly>
            }
          />
          <Route
            path="/"
            element={
              <Protected>
                <DashboardLayout>
                  <DashboardPage />
                </DashboardLayout>
              </Protected>
            }
          />
          <Route
            path="/create"
            element={
              <Protected>
                <DashboardLayout>
                  <CreateCertificatePage />
                </DashboardLayout>
              </Protected>
            }
          />
          <Route
            path="/bulk"
            element={
              <Protected>
                <DashboardLayout>
                  <BulkGeneratorPage />
                </DashboardLayout>
              </Protected>
            }
          />
          <Route
            path="/records"
            element={
              <Protected>
                <DashboardLayout>
                  <RecordsPage />
                </DashboardLayout>
              </Protected>
            }
          />
          <Route
            path="/seals"
            element={
              <Protected>
                <DashboardLayout>
                  <SealManagementPage />
                </DashboardLayout>
              </Protected>
            }
          />
          <Route
            path="/settings"
            element={
              <Protected>
                <DashboardLayout>
                  <SettingsPage />
                </DashboardLayout>
              </Protected>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

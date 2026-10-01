import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/hooks/useTheme';
import { SlimsLayout } from '@/components/layout/SlimsLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { CirculationDesk } from '@/pages/circulation/CirculationDesk';
import { QuickReturn } from '@/pages/circulation/QuickReturn';
import { OverduesPage } from '@/pages/circulation/OverduesPage';
import { FinesPage } from '@/pages/circulation/FinesPage';
import { CatalogListPage } from '@/pages/catalog/CatalogListPage';
import { ItemsListPage } from '@/pages/catalog/ItemsListPage';
import { MembersListPage } from '@/pages/members/MembersListPage';
import { OpacPage } from '@/pages/opac/OpacPage';
import { VisitorKiosk } from '@/pages/visitor/VisitorKiosk';
import { SetupWizard } from '@/pages/setup/SetupWizard';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-[#0b0c10]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-zinc-400 font-medium">Memuat Sesi LibreM...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const RootRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return user ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/login" replace />;
};

export const App: React.FC = () => {
  // Disable right-click context menu globally for a native app feel
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="h-screen w-screen flex flex-col bg-[#0b0c10] text-zinc-100 overflow-hidden font-sans select-none">
          {/* App Workspace Body */}
          <div className="flex-1 overflow-hidden relative flex flex-col">
            <BrowserRouter>
              <Routes>
                {/* Public Portals */}
                <Route path="/" element={<RootRedirect />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/opac" element={<OpacPage />} />
                <Route path="/visitor-kiosk" element={<VisitorKiosk />} />
                <Route path="/setup" element={<SetupWizard />} />

                {/* SLiMS Protected Administration Shell */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <SlimsLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="circulation" element={<CirculationDesk />} />
                  <Route path="circulation/quick-return" element={<QuickReturn />} />
                  <Route path="circulation/overdues" element={<OverduesPage />} />
                  <Route path="circulation/fines" element={<FinesPage />} />
                  <Route path="catalog" element={<CatalogListPage />} />
                  <Route path="catalog/items" element={<ItemsListPage />} />
                  <Route path="members" element={<MembersListPage />} />
                </Route>

                {/* 404 Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </div>
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;

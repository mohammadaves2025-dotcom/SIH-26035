import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/useAuthStore.js';
import { useThemeStore } from './store/useThemeStore.js';
import { useNotificationStore } from './store/useNotificationStore.js';

import TopGovtBar from './components/layout/TopGovtBar.jsx';
import Header from './components/layout/Header.jsx';
import Sidebar from './components/layout/Sidebar.jsx';
import Footer from './components/layout/Footer.jsx';
import ToastContainer from './components/common/ToastContainer.jsx';

import LoginPage from './pages/auth/LoginPage.jsx';
import DashboardPage from './pages/dashboard/DashboardPage.jsx';
import TestSessionsPage from './pages/testSessions/TestSessionsPage.jsx';
import NewTestSessionPage from './pages/testSessions/NewTestSessionPage.jsx';
import TestSessionDetailPage from './pages/testSessions/TestSessionDetailPage.jsx';
import OfflineSessionPage from './pages/testSessions/OfflineSessionPage.jsx';
import InstrumentModelsPage from './pages/instrumentModels/InstrumentModelsPage.jsx';
import InstrumentModelDetailPage from './pages/instrumentModels/InstrumentModelDetailPage.jsx';
import ManufacturersPage from './pages/manufacturers/ManufacturersPage.jsx';
import LaboratoriesPage from './pages/laboratories/LaboratoriesPage.jsx';
import TestTypesPage from './pages/testTypes/TestTypesPage.jsx';
import RuleConfigsPage from './pages/ruleConfigs/RuleConfigsPage.jsx';
import ReportsPage from './pages/reports/ReportsPage.jsx';
import AuditLogPage from './pages/auditLog/AuditLogPage.jsx';
import ExportPage from './pages/export/ExportPage.jsx';
import VerifyPage from './pages/verify/VerifyPage.jsx';
import SystemLogsPage from './pages/systemLogs/SystemLogsPage.jsx';
import UsersPage from './pages/users/UsersPage.jsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RoleGuard({ allowedRoles, children }) {
  const { user } = useAuthStore();
  const addToast = useNotificationStore((s) => s.addToast);
  useEffect(() => {
    if (user?.role && user.role !== 'admin' && allowedRoles && !allowedRoles.includes(user.role)) {
      addToast({ type: 'error', message: 'You do not have permission to access this page.' });
    }
  }, [user?.role, allowedRoles, addToast]);
  if (!user || !user.role) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== 'admin' && allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function ProtectedLayout({ isMobileOpen, setIsMobileOpen }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-layout">
      <Sidebar
        isMobileOpen={isMobileOpen}
        onCloseMobileMenu={() => setIsMobileOpen(false)}
      />
      <main id="main-content" className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

function VerifyLayout({ isMobileOpen, setIsMobileOpen, children }) {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return (
      <div className="app-layout">
        <Sidebar
          isMobileOpen={isMobileOpen}
          onCloseMobileMenu={() => setIsMobileOpen(false)}
        />
        <main id="main-content" className="app-main">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="app-layout" style={{ paddingTop: 'calc(var(--topbar-height) + var(--header-height))' }}>
      <main id="main-content" className="app-main" style={{ marginLeft: 0, padding: '20px 16px' }}>
        {children}
      </main>
    </div>
  );
}

export default function App() {
  const { fontSizeStep, highContrast } = useThemeStore();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', String(fontSizeStep));
    if (highContrast) {
      document.documentElement.setAttribute('data-theme', 'high-contrast');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [fontSizeStep, highContrast]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <TopGovtBar />
        <Header
          isMobileOpen={isMobileOpen}
          onToggleMobileMenu={() => setIsMobileOpen((prev) => !prev)}
        />
        <ToastContainer />

        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/verify"
            element={
              <VerifyLayout isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen}>
                <VerifyPage />
              </VerifyLayout>
            }
          />
          <Route
            path="/verify/:reportNumberOrHash"
            element={
              <VerifyLayout isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen}>
                <VerifyPage />
              </VerifyLayout>
            }
          />

          <Route
            element={
              <ProtectedLayout
                isMobileOpen={isMobileOpen}
                setIsMobileOpen={setIsMobileOpen}
              />
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/test-sessions" element={<TestSessionsPage />} />
            <Route
              path="/test-sessions/new"
              element={
                <RoleGuard allowedRoles={['admin', 'lab_technician', 'lab_admin']}>
                  <NewTestSessionPage />
                </RoleGuard>
              }
            />
            <Route
              path="/test-sessions/offline/:clientId"
              element={
                <RoleGuard allowedRoles={['admin', 'lab_technician', 'lab_admin']}>
                  <OfflineSessionPage />
                </RoleGuard>
              }
            />
            <Route path="/test-sessions/:id" element={<TestSessionDetailPage />} />
            <Route path="/instrument-models" element={<InstrumentModelsPage />} />
            <Route path="/instrument-models/:id" element={<InstrumentModelDetailPage />} />
            <Route
              path="/manufacturers"
              element={
                <RoleGuard allowedRoles={['admin', 'reviewer', 'lab_admin', 'doca_officer']}>
                  <ManufacturersPage />
                </RoleGuard>
              }
            />
            <Route
              path="/laboratories"
              element={
                <RoleGuard allowedRoles={['admin', 'lab_admin', 'doca_officer']}>
                  <LaboratoriesPage />
                </RoleGuard>
              }
            />
            <Route path="/test-types" element={<TestTypesPage />} />
            <Route
              path="/rule-configs"
              element={
                <RoleGuard
                  allowedRoles={[
                    'admin',
                    'metrology_expert',
                    'lab_admin',
                    'doca_officer',
                    'reviewer',
                    'auditor',
                  ]}
                >
                  <RuleConfigsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/reports"
              element={
                <RoleGuard
                  allowedRoles={[
                    'admin',
                    'reviewer',
                    'lab_admin',
                    'doca_officer',
                    'manufacturer',
                    'auditor',
                  ]}
                >
                  <ReportsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/audit-log"
              element={
                <RoleGuard allowedRoles={['admin', 'reviewer', 'lab_admin', 'doca_officer', 'auditor']}>
                  <AuditLogPage />
                </RoleGuard>
              }
            />
            <Route
              path="/export"
              element={
                <RoleGuard allowedRoles={['admin', 'lab_admin', 'doca_officer', 'auditor']}>
                  <ExportPage />
                </RoleGuard>
              }
            />
            <Route
              path="/users"
              element={
                <RoleGuard allowedRoles={['admin', 'lab_admin']}>
                  <UsersPage />
                </RoleGuard>
              }
            />
            <Route
              path="/system-logs"
              element={
                <RoleGuard allowedRoles={['admin', 'lab_admin', 'auditor']}>
                  <SystemLogsPage />
                </RoleGuard>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>

        <Footer />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

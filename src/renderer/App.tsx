import { Navigate, useLocation } from 'react-router-dom';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useAuthStore } from './stores/authStore';
import LoginPage from './pages/LoginPage';
import UserManagementPage from './pages/UserManagementPage';
import MainLayout from './layouts/MainLayout';
import MonitorPage from './pages/MonitorPage';
import RecipePage from './pages/RecipePage';
import ManualPage from './pages/ManualPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import AuditLogPage from './pages/AuditLogPage';
import type { UserRole } from '@shared/types';
import { ThemeProvider, useThemeContext } from './contexts/ThemeContext';

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: UserRole }) {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole) {
    const { checkPermission } = useAuthStore.getState();
    if (!checkPermission(requiredRole)) {
      return (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <h2>权限不足</h2>
          <p>您没有权限访问此页面</p>
        </div>
      );
    }
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/monitor" replace />} />
        <Route path="monitor" element={<MonitorPage />} />
        <Route path="recipe" element={<RecipePage />} />
        <Route path="manual" element={<ManualPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route
          path="users"
          element={
            <ProtectedRoute requiredRole="admin">
              <UserManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="audit"
          element={
            <ProtectedRoute requiredRole="admin">
              <AuditLogPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}

function AppContent() {
  const { antdAlgorithm, themeMode } = useThemeContext();
  const isDark = themeMode === 'dark';
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: antdAlgorithm,
        token: {
          colorPrimary: '#177ddc',
          colorBgBase: isDark ? '#141414' : '#f5f5f5',
          colorBgContainer: isDark ? '#1f1f1f' : '#ffffff',
          colorBgElevated: isDark ? '#262626' : '#ffffff',
          colorBorderSecondary: isDark ? '#303030' : '#f0f0f0',
          borderRadius: 4,
        },
      }}
    >
      <AntdApp>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </AntdApp>
    </ConfigProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
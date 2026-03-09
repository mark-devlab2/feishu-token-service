import React from 'react';
import {
  Navigate,
  Outlet,
  createBrowserRouter,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { Spin } from '@arco-design/web-react';
import { ADMIN_BRAND } from '@config';
import { AppShell } from '@ui';
import { authCenterRoutes, authCenterMenu } from '@auth-center';
import { DashboardPage } from './pages/dashboard-page';
import { LoginPage } from './pages/login-page';
import { AuthProvider, useAuth } from './lib/auth-context';

function ProtectedLayout() {
  const { admin, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size={40} tip="正在加载后台状态..." />
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <AppShell
      brand={ADMIN_BRAND}
      currentPath={location.pathname}
      menus={[
        {
          key: 'dashboard',
          label: '总览',
          path: '/dashboard',
          icon: 'dashboard',
          mobileVisible: true,
          order: 0,
        },
        authCenterMenu,
      ]}
      userLabel={admin.username}
      onLogout={async () => {
        await logout();
        navigate('/login', { replace: true });
      }}
    >
      <Outlet />
    </AppShell>
  );
}

function LoginRoute() {
  const { admin, loading } = useAuth();
  if (loading) {
    return null;
  }
  if (admin) {
    return <Navigate to="/dashboard" replace />;
  }
  return <LoginPage />;
}

function RootLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'login', element: <LoginRoute /> },
      {
        element: <ProtectedLayout />,
        children: [
          { path: 'dashboard', element: <DashboardPage /> },
          ...authCenterRoutes,
          { path: '*', element: <Navigate to="/dashboard" replace /> },
        ],
      },
    ],
  },
]);

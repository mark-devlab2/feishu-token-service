import React, { Suspense, lazy } from 'react';
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
import { useAuth } from './lib/auth-context';

const DashboardPage = lazy(() =>
  import('./pages/dashboard-page').then((module) => ({
    default: module.DashboardPage,
  })),
);

const LoginPage = lazy(() =>
  import('./pages/login-page').then((module) => ({
    default: module.LoginPage,
  })),
);

function RouteLoader({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
          <Spin size={32} tip="页面加载中..." />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

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
      onNavigate={(path) => navigate(path)}
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
  return (
    <RouteLoader>
      <LoginPage />
    </RouteLoader>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'login', element: <LoginRoute /> },
      {
        element: <ProtectedLayout />,
        children: [
          {
            path: 'dashboard',
            element: (
              <RouteLoader>
                <DashboardPage />
              </RouteLoader>
            ),
          },
          ...authCenterRoutes,
          { path: '*', element: <Navigate to="/dashboard" replace /> },
        ],
      },
    ],
  },
]);

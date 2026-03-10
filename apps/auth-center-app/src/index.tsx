import React, { Suspense, lazy } from 'react';
import { Navigate } from 'react-router-dom';
import { authCenterMenu } from './meta';

const AuthCenterDashboardPage = lazy(() =>
  import('./pages/dashboard-page').then((module) => ({
    default: module.AuthCenterDashboardPage,
  })),
);

const AuthCenterUserDetailPage = lazy(() =>
  import('./pages/user-detail-page').then((module) => ({
    default: module.AuthCenterUserDetailPage,
  })),
);

export { authCenterMenu };

function AuthCenterRouteLoader({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

export const authCenterRoutes = [
  {
    path: 'auth-center',
    element: (
      <AuthCenterRouteLoader>
        <AuthCenterDashboardPage />
      </AuthCenterRouteLoader>
    ),
  },
  {
    path: 'auth-center/users/:userId',
    element: (
      <AuthCenterRouteLoader>
        <AuthCenterUserDetailPage />
      </AuthCenterRouteLoader>
    ),
  },
  {
    path: 'auth-center/*',
    element: <Navigate to="/auth-center" replace />,
  },
];

import React from 'react';
import { Navigate } from 'react-router-dom';
import { authCenterMenu } from './meta';
import { AuthCenterDashboardPage } from './pages/dashboard-page';
import { AuthCenterUserDetailPage } from './pages/user-detail-page';

export { authCenterMenu };

export const authCenterRoutes = [
  {
    path: 'auth-center',
    element: <AuthCenterDashboardPage />,
  },
  {
    path: 'auth-center/users/:userId',
    element: <AuthCenterUserDetailPage />,
  },
  {
    path: 'auth-center/*',
    element: <Navigate to="/auth-center" replace />,
  },
];

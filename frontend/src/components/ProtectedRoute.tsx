import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const { isAuthenticated, role } = useAuth();

  // 認証されていない場合、管理者用ログインページへリダイレクト
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // 必要な権限がある場合、権限チェック
  if (requiredRole && role !== requiredRole) {
    // 権限が足りない場合、トップページへリダイレクト
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

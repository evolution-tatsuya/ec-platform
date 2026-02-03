import React, { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, Admin, AuthContextType } from '../types';
import { UserRole } from '../types';
import { authAPI } from '../lib/api';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | Admin | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [, setIsLoading] = useState(true);

  // 初期化：セッションをチェック
  useEffect(() => {
    const checkSession = async () => {
      try {
        // タイムアウト付きでセッションチェック（5秒）
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session check timeout')), 5000)
        );
        const sessionPromise = authAPI.getSession();

        const response = await Promise.race([sessionPromise, timeoutPromise]) as any;

        if (response.success && response.user) {
          const authenticatedUser = {
            id: response.user.id,
            email: response.user.email,
            name: response.user.name,
            createdAt: new Date(response.user.createdAt),
            updatedAt: new Date(response.user.updatedAt),
          };

          setUser(authenticatedUser);
          setRole(response.user.isAdmin ? UserRole.ADMIN : UserRole.USER);
          setIsAuthenticated(true);
        }
      } catch (error) {
        // セッションがない場合、またはタイムアウト時はログアウト状態
        console.log('No active session or timeout:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const response = await authAPI.login({ email, password });

      if (!response.success || !response.user) {
        throw new Error(response.message || 'ログインに失敗しました');
      }

      const authenticatedUser = {
        id: response.user.id,
        email: response.user.email,
        name: response.user.name,
        createdAt: new Date(response.user.createdAt),
        updatedAt: new Date(response.user.updatedAt),
      };

      setUser(authenticatedUser);
      setRole(response.user.isAdmin ? UserRole.ADMIN : UserRole.USER);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // エラーが発生してもローカル状態はクリア
      setUser(null);
      setRole(null);
      setIsAuthenticated(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string
  ): Promise<void> => {
    try {
      const response = await authAPI.register({ email, password, name });

      if (!response.success || !response.user) {
        throw new Error(response.message || '会員登録に失敗しました');
      }

      const authenticatedUser = {
        id: response.user.id,
        email: response.user.email,
        name: response.user.name,
        createdAt: new Date(response.user.createdAt),
        updatedAt: new Date(response.user.updatedAt),
      };

      setUser(authenticatedUser);
      setRole(response.user.isAdmin ? UserRole.ADMIN : UserRole.USER);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    role,
    isAuthenticated,
    login,
    logout,
    register,
  };

  // ローディング表示を削除 - 受付ページなど認証不要ページのため
  // 認証が必要なページは個別にProtectedRouteでチェック

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

import React, { createContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, Admin, AuthContextType } from '../types';
import { UserRole } from '../types';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// モックユーザーデータ
const MOCK_USERS = [
  {
    id: 'user-1',
    email: 'demo@example.com',
    password: 'demo123',
    name: 'デモユーザー',
    role: UserRole.USER,
  },
  {
    id: 'admin-1',
    email: 'admin@example.com',
    password: 'admin123',
    name: '管理者',
    role: UserRole.ADMIN,
  },
];

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | Admin | null>(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [role, setRole] = useState<UserRole | null>(() => {
    const storedRole = localStorage.getItem('role');
    return storedRole ? (storedRole as UserRole) : null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('user');
  });

  const login = async (email: string, password: string): Promise<void> => {
    // モックログイン処理
    const foundUser = MOCK_USERS.find(
      (u) => u.email === email && u.password === password
    );

    if (!foundUser) {
      throw new Error('メールアドレスまたはパスワードが正しくありません');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, role: userRole, ...userData } = foundUser;
    const now = new Date();

    const authenticatedUser =
      userRole === UserRole.ADMIN
        ? ({
            ...userData,
            createdAt: now,
            updatedAt: now,
          } as Admin)
        : ({
            ...userData,
            createdAt: now,
            updatedAt: now,
          } as User);

    setUser(authenticatedUser);
    setRole(userRole);
    setIsAuthenticated(true);

    // ローカルストレージに保存
    localStorage.setItem('user', JSON.stringify(authenticatedUser));
    localStorage.setItem('role', userRole);
  };

  const logout = async (): Promise<void> => {
    setUser(null);
    setRole(null);
    setIsAuthenticated(false);

    // ローカルストレージから削除
    localStorage.removeItem('user');
    localStorage.removeItem('role');
  };

  const register = async (
    email: string,
    _password: string,
    name: string
  ): Promise<void> => {
    // モック会員登録処理
    const now = new Date();
    const newUser: User = {
      id: `user-${Date.now()}`,
      email,
      name,
      createdAt: now,
      updatedAt: now,
    };

    setUser(newUser);
    setRole(UserRole.USER);
    setIsAuthenticated(true);

    // ローカルストレージに保存
    localStorage.setItem('user', JSON.stringify(newUser));
    localStorage.setItem('role', UserRole.USER);
  };

  const value: AuthContextType = {
    user,
    role,
    isAuthenticated,
    login,
    logout,
    register,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

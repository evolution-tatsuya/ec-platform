// ========================================
// ユーザー（自分）情報API
// 管理者・会員共通（ログイン中ユーザーの情報取得・更新・パスワード変更）
// ========================================

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8432';

export interface MeResponse {
  success: boolean;
  user: {
    id: string;
    email: string;
    name: string | null;
    defaultAddress?: string | null;
    defaultPostalCode?: string | null;
    defaultPhone?: string | null;
    isAdmin: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  defaultAddress?: string;
  defaultPostalCode?: string;
  defaultPhone?: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** ログイン中ユーザー情報取得 */
export const getMe = async (): Promise<MeResponse['user']> => {
  const res = await axios.get<MeResponse>(`${API_BASE_URL}/api/users/me`, {
    withCredentials: true,
  });
  return res.data.user;
};

/** プロフィール（名前・メール）更新 */
export const updateProfile = async (
  data: UpdateProfileRequest
): Promise<MeResponse['user']> => {
  const res = await axios.put<MeResponse>(`${API_BASE_URL}/api/users/me`, data, {
    withCredentials: true,
  });
  return res.data.user;
};

/** パスワード変更 */
export const updatePassword = async (data: UpdatePasswordRequest): Promise<void> => {
  await axios.put(`${API_BASE_URL}/api/users/me/password`, data, {
    withCredentials: true,
  });
};

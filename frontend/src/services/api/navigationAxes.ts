// ========================================
// ナビゲーション軸API（管理者向け）
// スライス8-B: フロントエンド統合
// ========================================

import axios from 'axios';
import type {
  CategoryNavigationAxis,
  CategoryType,
  CreateNavigationAxisRequest,
  UpdateNavigationAxisRequest,
  UpdateAxisOrderRequest,
  NavigationAxisResponse,
  NavigationAxesListResponse,
  DeleteNavigationAxisResponse,
} from '../../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8432';

// ========================================
// 1. GET /api/admin/navigation-axes
// 全軸取得
// ========================================

/**
 * 全ナビゲーション軸取得（管理者）
 */
export const getNavigationAxes = async (): Promise<CategoryNavigationAxis[]> => {
  try {
    const response = await axios.get<NavigationAxesListResponse>(
      `${API_URL}/api/admin/navigation-axes`,
      {
        withCredentials: true,
      }
    );

    return response.data.axes;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.error || 'ナビゲーション軸の取得に失敗しました');
    }
    throw error;
  }
};

// ========================================
// 2. GET /api/admin/navigation-axes/:category
// カテゴリー別軸取得
// ========================================

/**
 * カテゴリー別ナビゲーション軸取得（管理者）
 */
export const getNavigationAxesByCategory = async (
  category: CategoryType
): Promise<CategoryNavigationAxis[]> => {
  try {
    const response = await axios.get<NavigationAxesListResponse>(
      `${API_URL}/api/admin/navigation-axes/${category}`,
      {
        withCredentials: true,
      }
    );

    return response.data.axes;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        error.response.data.error || 'カテゴリー別ナビゲーション軸の取得に失敗しました'
      );
    }
    throw error;
  }
};

// ========================================
// 3. POST /api/admin/navigation-axes
// 軸追加
// ========================================

/**
 * ナビゲーション軸追加（管理者）
 */
export const createNavigationAxis = async (
  data: CreateNavigationAxisRequest
): Promise<CategoryNavigationAxis> => {
  try {
    const response = await axios.post<NavigationAxisResponse>(
      `${API_URL}/api/admin/navigation-axes`,
      data,
      {
        withCredentials: true,
      }
    );

    return response.data.axis;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.error || 'ナビゲーション軸の追加に失敗しました');
    }
    throw error;
  }
};

// ========================================
// 4. PUT /api/admin/navigation-axes/:id
// 軸更新
// ========================================

/**
 * ナビゲーション軸更新（管理者）
 */
export const updateNavigationAxis = async (
  id: string,
  data: UpdateNavigationAxisRequest
): Promise<CategoryNavigationAxis> => {
  try {
    const response = await axios.put<NavigationAxisResponse>(
      `${API_URL}/api/admin/navigation-axes/${id}`,
      data,
      {
        withCredentials: true,
      }
    );

    return response.data.axis;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.error || 'ナビゲーション軸の更新に失敗しました');
    }
    throw error;
  }
};

// ========================================
// 5. DELETE /api/admin/navigation-axes/:id
// 軸削除
// ========================================

/**
 * ナビゲーション軸削除（管理者）
 */
export const deleteNavigationAxis = async (id: string): Promise<void> => {
  try {
    await axios.delete<DeleteNavigationAxisResponse>(
      `${API_URL}/api/admin/navigation-axes/${id}`,
      {
        withCredentials: true,
      }
    );
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.error || 'ナビゲーション軸の削除に失敗しました');
    }
    throw error;
  }
};

// ========================================
// 6. PUT /api/admin/navigation-axes/:id/order
// 軸順序更新
// ========================================

/**
 * ナビゲーション軸順序更新（管理者）
 */
export const updateNavigationAxisOrder = async (
  id: string,
  data: UpdateAxisOrderRequest
): Promise<CategoryNavigationAxis> => {
  try {
    const response = await axios.put<NavigationAxisResponse>(
      `${API_URL}/api/admin/navigation-axes/${id}/order`,
      data,
      {
        withCredentials: true,
      }
    );

    return response.data.axis;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        error.response.data.error || 'ナビゲーション軸順序の更新に失敗しました'
      );
    }
    throw error;
  }
};

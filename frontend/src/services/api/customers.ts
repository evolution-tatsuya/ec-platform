// ========================================
// 顧客管理API（管理者向け）
// ========================================

import axios from 'axios';
import type {
  CustomerWithStats,
  CustomerDetail,
  UpdateCustomerTagsRequest,
} from '../../types';

// 環境変数からAPIベースURLを取得
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8432';

/** tags が JSON文字列の場合に安全に配列へパースする（失敗時は空配列） */
const safeParseTags = (value: string): string[] => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// ========================================
// 型定義
// ========================================

/**
 * 顧客一覧取得のクエリパラメータ
 */
export interface CustomerFilterParams {
  search?: string;
  hasOrders?: 'true' | 'false';
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'name' | 'email';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 顧客一覧取得のレスポンス
 */
interface GetCustomersResponse {
  customers: CustomerWithStats[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ========================================
// API関数
// ========================================

/**
 * 顧客一覧取得（管理者）
 * 検索・絞り込み条件に基づいて顧客リストを取得
 */
export const getAdminCustomers = async (
  filters?: CustomerFilterParams
): Promise<CustomerWithStats[]> => {
  try {
    const response = await axios.get<GetCustomersResponse>(
      `${API_BASE_URL}/api/admin/customers`,
      {
        params: filters,
        withCredentials: true,
      }
    );
    // バックエンドのフィールド名（createdAt/orderCount/totalPurchase）を
    // フロントの型（registeredAt/totalOrders/totalSpent）へ変換し、
    // undefined/null によるクラッシュを防ぐため安全なデフォルトを補う
    return (response.data.customers || []).map((c: any) => ({
      ...c,
      registeredAt: c.registeredAt ?? c.createdAt ?? new Date().toISOString(),
      totalOrders: c.totalOrders ?? c.orderCount ?? c._count?.orders ?? 0,
      totalSpent: c.totalSpent ?? c.totalPurchase ?? 0,
      tags: Array.isArray(c.tags)
        ? c.tags
        : typeof c.tags === 'string'
          ? safeParseTags(c.tags)
          : [],
    }));
  } catch (error: any) {
    console.error('顧客一覧取得エラー:', error);
    throw new Error(error.response?.data?.message || '顧客一覧の取得に失敗しました');
  }
};

/**
 * 顧客詳細取得（管理者）
 * 基本情報、購入履歴、統計情報を含む詳細データを取得
 */
export const getAdminCustomerById = async (id: string): Promise<CustomerDetail> => {
  try {
    const response = await axios.get<CustomerDetail>(
      `${API_BASE_URL}/api/admin/customers/${id}`,
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error: any) {
    console.error('顧客詳細取得エラー:', error);
    throw new Error(error.response?.data?.message || '顧客詳細の取得に失敗しました');
  }
};

/**
 * 顧客タグ更新（管理者）
 * VIP、リピーター等のタグを更新
 */
export const updateCustomerTags = async (
  id: string,
  data: UpdateCustomerTagsRequest
): Promise<CustomerDetail> => {
  try {
    const response = await axios.put<{ customer: CustomerDetail }>(
      `${API_BASE_URL}/api/admin/customers/${id}/tags`,
      data,
      {
        withCredentials: true,
      }
    );
    return response.data.customer;
  } catch (error: any) {
    console.error('顧客タグ更新エラー:', error);
    throw new Error(error.response?.data?.message || '顧客タグの更新に失敗しました');
  }
};

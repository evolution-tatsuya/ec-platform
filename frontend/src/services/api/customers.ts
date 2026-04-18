// ========================================
// 顧客管理API（管理者向け）
// ========================================

import type {
  CustomerWithStats,
  CustomerDetail,
  UpdateCustomerTagsRequest,
} from '../../types';

// ========================================
// API関数
// ========================================

/**
 * 顧客一覧取得（管理者）
 * 検索・絞り込み条件に基づいて顧客リストを取得
 * @API_INTEGRATION
 */
export const getAdminCustomers = async (): Promise<CustomerWithStats[]> => {
  throw new Error('API not implemented');
};

/**
 * 顧客詳細取得（管理者）
 * 基本情報、購入履歴、統計情報を含む詳細データを取得
 * @API_INTEGRATION
 */
export const getAdminCustomerById = async (_id: string): Promise<CustomerDetail> => {
  throw new Error('API not implemented');
};

/**
 * 顧客タグ更新（管理者）
 * VIP、リピーター等のタグを更新
 * @API_INTEGRATION
 */
export const updateCustomerTags = async (
  _id: string,
  _data: UpdateCustomerTagsRequest
): Promise<CustomerDetail> => {
  throw new Error('API not implemented');
};

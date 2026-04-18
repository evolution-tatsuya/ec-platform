// ========================================
// 商品管理API（管理者向け）
// ========================================

import type { Product, InventoryLog } from '../../types';

// ========================================
// 型定義
// ========================================

/**
 * 商品作成リクエストの型
 */
export interface CreateProductRequest {
  name: string;
  price: number;
  description?: string;
  productType: string;
  categoryType: string;
  images?: string[];
  externalUrl?: string;
  preparationDays?: number;
  allowWeekendDelivery?: boolean;
  attributes?: Record<string, string>;
  tags?: string[];
  initialStock?: number;
}

/**
 * 商品更新リクエストの型
 */
export interface UpdateProductRequest {
  name?: string;
  price?: number;
  description?: string;
  isActive?: boolean;
  images?: string[];
  externalUrl?: string;
  preparationDays?: number;
  allowWeekendDelivery?: boolean;
  attributes?: Record<string, string>;
  tags?: string[];
}

/**
 * 在庫調整リクエストの型
 */
export interface CreateInventoryLogRequest {
  productId: string;
  quantity: number;
  type: 'purchase' | 'adjustment';
  reason: string;
}

/**
 * 商品絞り込みパラメータの型
 */
export interface ProductFilterParams {
  categoryType?: string;
  productType?: string;
  isActive?: boolean;
  search?: string;
  tags?: string[];
  stockStatus?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
}

// ========================================
// API関数
// ========================================

/**
 * 商品一覧取得（管理者）
 * @API_INTEGRATION
 */
export const getAdminProducts = async (
  _filters?: ProductFilterParams
): Promise<Product[]> => {
  throw new Error('API not implemented');
};

/**
 * 商品詳細取得（管理者）
 * @API_INTEGRATION
 */
export const getAdminProductById = async (_id: string): Promise<Product> => {
  throw new Error('API not implemented');
};

/**
 * 商品追加（管理者）
 * @API_INTEGRATION
 */
export const createAdminProduct = async (
  _data: CreateProductRequest
): Promise<Product> => {
  throw new Error('API not implemented');
};

/**
 * 商品更新（管理者）
 * @API_INTEGRATION
 */
export const updateAdminProduct = async (
  _id: string,
  _data: UpdateProductRequest
): Promise<Product> => {
  throw new Error('API not implemented');
};

/**
 * 商品削除（管理者）
 * @API_INTEGRATION
 */
export const deleteAdminProduct = async (_id: string): Promise<void> => {
  throw new Error('API not implemented');
};

/**
 * 商品一括公開（管理者）
 * @API_INTEGRATION
 */
export const bulkPublishProducts = async (_ids: string[]): Promise<void> => {
  throw new Error('API not implemented');
};

/**
 * 商品一括非公開（管理者）
 * @API_INTEGRATION
 */
export const bulkUnpublishProducts = async (_ids: string[]): Promise<void> => {
  throw new Error('API not implemented');
};

/**
 * 商品一括削除（管理者）
 * @API_INTEGRATION
 */
export const bulkDeleteProducts = async (_ids: string[]): Promise<void> => {
  throw new Error('API not implemented');
};

/**
 * 在庫ログ一覧取得（管理者）
 * @API_INTEGRATION
 */
export const getAdminInventoryLogs = async (
  _productId?: string
): Promise<InventoryLog[]> => {
  throw new Error('API not implemented');
};

/**
 * 在庫調整（管理者）
 * @API_INTEGRATION
 */
export const createAdminInventoryLog = async (
  _data: CreateInventoryLogRequest
): Promise<InventoryLog> => {
  throw new Error('API not implemented');
};

/**
 * 商品の現在在庫数を取得（管理者）
 * @API_INTEGRATION
 */
export const getProductCurrentStock = async (
  _productId: string
): Promise<number> => {
  throw new Error('API not implemented');
};

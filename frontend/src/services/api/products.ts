// ========================================
// 商品管理API（管理者向け）
// ========================================

import axios from 'axios';
import type { Product, InventoryLog } from '../../types';

// 環境変数からAPIベースURLを取得
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8432';

// ========================================
// 型定義
// ========================================

/**
 * 商品作成リクエストの型
 */
export interface CreateProductRequest {
  name: string;
  price: number;
  salePrice?: number | null;
  description?: string;
  productType: string;
  billingType?: string; // サブスク商品の課金周期（monthly/yearly/onetime）
  // サブスクプランの上限・料金ページ表示
  maxParts?: number | null;
  maxImageMB?: number | null;
  maxUsers?: number | null;
  planFeatures?: string[];
  planFeatureKeys?: string[];
  unitLabel?: string;
  planTagline?: string;
  isPopular?: boolean;
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
  salePrice?: number | null;
  description?: string;
  isActive?: boolean;
  images?: string[];
  // 残す既存画像を現在の並び順で指定（並べ替え・削除に対応）
  existingImages?: { id: string; order: number }[];
  productType?: string;
  billingType?: string; // サブスク商品の課金周期（monthly/yearly/onetime）
  // サブスクプランの上限・料金ページ表示
  maxParts?: number | null;
  maxImageMB?: number | null;
  maxUsers?: number | null;
  planFeatures?: string[];
  planFeatureKeys?: string[];
  unitLabel?: string;
  planTagline?: string;
  isPopular?: boolean;
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
  filters?: ProductFilterParams
): Promise<Product[]> => {
  try {
    const params: Record<string, string> = {};

    if (filters?.categoryType) params.categoryType = filters.categoryType;
    if (filters?.productType) params.productType = filters.productType;
    if (filters?.isActive !== undefined) params.isActive = String(filters.isActive);
    if (filters?.search) params.search = filters.search;
    if (filters?.stockStatus) params.stockStatus = filters.stockStatus;
    if (filters?.tags && filters.tags.length > 0) params.tags = filters.tags.join(',');

    // 十分な件数を取得（デフォルト100件）
    params.limit = '100';

    const response = await axios.get(`${API_BASE_URL}/api/admin/products`, {
      params,
      withCredentials: true,
    });

    return response.data.products || [];
  } catch (error) {
    console.error('商品一覧取得エラー:', error);
    throw error;
  }
};

/**
 * 商品詳細取得（管理者）
 * @API_INTEGRATION
 */
export const getAdminProductById = async (id: string): Promise<Product> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/admin/products/${id}`, {
      withCredentials: true,
    });

    return response.data.product;
  } catch (error) {
    console.error('商品詳細取得エラー:', error);
    throw error;
  }
};

/**
 * 商品追加（管理者）
 * @API_INTEGRATION
 */
export const createAdminProduct = async (
  data: CreateProductRequest
): Promise<Product> => {
  try {
    const formData = new FormData();

    // 必須項目
    formData.append('name', data.name);
    formData.append('price', String(data.price));
    formData.append('productType', data.productType);
    if (data.billingType) formData.append('billingType', data.billingType);
    // サブスクプランの上限・料金ページ表示
    if (data.maxParts !== undefined) formData.append('maxParts', data.maxParts === null ? '' : String(data.maxParts));
    if (data.maxImageMB !== undefined) formData.append('maxImageMB', data.maxImageMB === null ? '' : String(data.maxImageMB));
    if (data.maxUsers !== undefined) formData.append('maxUsers', data.maxUsers === null ? '' : String(data.maxUsers));
    if (data.planFeatures !== undefined) formData.append('planFeatures', JSON.stringify(data.planFeatures));
    if (data.planFeatureKeys !== undefined) formData.append('planFeatureKeys', JSON.stringify(data.planFeatureKeys));
    if (data.unitLabel !== undefined) formData.append('unitLabel', data.unitLabel);
    if (data.planTagline !== undefined) formData.append('planTagline', data.planTagline);
    if (data.isPopular !== undefined) formData.append('isPopular', String(data.isPopular));
    formData.append('categoryType', data.categoryType);

    // オプション項目
    if (data.salePrice !== undefined && data.salePrice !== null) {
      formData.append('salePrice', String(data.salePrice));
    }
    if (data.description) formData.append('description', data.description);
    if (data.externalUrl) formData.append('externalUrl', data.externalUrl);
    if (data.preparationDays !== undefined) formData.append('preparationDays', String(data.preparationDays));
    if (data.allowWeekendDelivery !== undefined) formData.append('allowWeekendDelivery', String(data.allowWeekendDelivery));
    if (data.initialStock !== undefined) formData.append('initialStock', String(data.initialStock));

    // 属性とタグはJSON文字列として送信
    if (data.attributes) formData.append('attributes', JSON.stringify(data.attributes));
    if (data.tags && data.tags.length > 0) formData.append('tags', JSON.stringify(data.tags));

    // 画像は既にFormDataに含まれている想定（外部から渡される）
    if (data.images && data.images.length > 0) {
      data.images.forEach((image) => {
        formData.append('images', image);
      });
    }

    const response = await axios.post(`${API_BASE_URL}/api/admin/products`, formData, {
      withCredentials: true,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.product;
  } catch (error) {
    console.error('商品追加エラー:', error);
    throw error;
  }
};

/**
 * 商品更新（管理者）
 * @API_INTEGRATION
 */
export const updateAdminProduct = async (
  id: string,
  data: UpdateProductRequest
): Promise<Product> => {
  try {
    const formData = new FormData();

    // 更新項目のみ追加
    if (data.name !== undefined) formData.append('name', data.name);
    if (data.price !== undefined) formData.append('price', String(data.price));
    // セール価格: 数値なら設定、null/空文字なら解除（空文字で送信）
    if (data.salePrice !== undefined) {
      formData.append('salePrice', data.salePrice === null ? '' : String(data.salePrice));
    }
    if (data.description !== undefined) formData.append('description', data.description);
    if (data.isActive !== undefined) formData.append('isActive', String(data.isActive));
    if (data.productType !== undefined) formData.append('productType', data.productType);
    if (data.billingType !== undefined) formData.append('billingType', data.billingType);
    // サブスクプランの上限・料金ページ表示
    if (data.maxParts !== undefined) formData.append('maxParts', data.maxParts === null ? '' : String(data.maxParts));
    if (data.maxImageMB !== undefined) formData.append('maxImageMB', data.maxImageMB === null ? '' : String(data.maxImageMB));
    if (data.maxUsers !== undefined) formData.append('maxUsers', data.maxUsers === null ? '' : String(data.maxUsers));
    if (data.planFeatures !== undefined) formData.append('planFeatures', JSON.stringify(data.planFeatures));
    if (data.planFeatureKeys !== undefined) formData.append('planFeatureKeys', JSON.stringify(data.planFeatureKeys));
    if (data.unitLabel !== undefined) formData.append('unitLabel', data.unitLabel);
    if (data.planTagline !== undefined) formData.append('planTagline', data.planTagline);
    if (data.isPopular !== undefined) formData.append('isPopular', String(data.isPopular));
    if (data.externalUrl !== undefined) formData.append('externalUrl', data.externalUrl);
    if (data.preparationDays !== undefined) formData.append('preparationDays', String(data.preparationDays));
    if (data.allowWeekendDelivery !== undefined) formData.append('allowWeekendDelivery', String(data.allowWeekendDelivery));

    // 属性とタグ
    if (data.attributes !== undefined) formData.append('attributes', JSON.stringify(data.attributes));
    if (data.tags !== undefined) formData.append('tags', JSON.stringify(data.tags));

    // 残す既存画像（並べ替え・削除）。undefinedでない場合は必ず送る（空配列=全削除）。
    if (data.existingImages !== undefined) {
      formData.append('existingImages', JSON.stringify(data.existingImages));
    }

    // 新規画像
    if (data.images && data.images.length > 0) {
      data.images.forEach((image) => {
        formData.append('images', image);
      });
    }

    const response = await axios.put(`${API_BASE_URL}/api/admin/products/${id}`, formData, {
      withCredentials: true,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.product;
  } catch (error) {
    console.error('商品更新エラー:', error);
    throw error;
  }
};

/**
 * 商品削除（管理者）
 * @API_INTEGRATION
 */
export const deleteAdminProduct = async (id: string): Promise<void> => {
  try {
    await axios.delete(`${API_BASE_URL}/api/admin/products/${id}`, {
      withCredentials: true,
    });
  } catch (error) {
    console.error('商品削除エラー:', error);
    throw error;
  }
};

/**
 * 商品一括公開（管理者）
 * @API_INTEGRATION
 */
export const bulkPublishProducts = async (ids: string[]): Promise<void> => {
  try {
    // 各商品を個別に更新（一括エンドポイントがないため）
    await Promise.all(
      ids.map((id) =>
        axios.put(
          `${API_BASE_URL}/api/admin/products/${id}`,
          { isActive: true },
          { withCredentials: true }
        )
      )
    );
  } catch (error) {
    console.error('商品一括公開エラー:', error);
    throw error;
  }
};

/**
 * 商品一括非公開（管理者）
 * @API_INTEGRATION
 */
export const bulkUnpublishProducts = async (ids: string[]): Promise<void> => {
  try {
    // 各商品を個別に更新（一括エンドポイントがないため）
    await Promise.all(
      ids.map((id) =>
        axios.put(
          `${API_BASE_URL}/api/admin/products/${id}`,
          { isActive: false },
          { withCredentials: true }
        )
      )
    );
  } catch (error) {
    console.error('商品一括非公開エラー:', error);
    throw error;
  }
};

/**
 * 商品一括削除（管理者）
 * @API_INTEGRATION
 */
export const bulkDeleteProducts = async (ids: string[]): Promise<void> => {
  try {
    // 各商品を個別に削除（一括エンドポイントがないため）
    await Promise.all(
      ids.map((id) => axios.delete(`${API_BASE_URL}/api/admin/products/${id}`, { withCredentials: true }))
    );
  } catch (error) {
    console.error('商品一括削除エラー:', error);
    throw error;
  }
};

/**
 * 在庫ログ一覧取得（管理者）
 * @API_INTEGRATION
 */
export const getAdminInventoryLogs = async (
  productId?: string
): Promise<InventoryLog[]> => {
  try {
    if (productId) {
      // 特定商品の在庫ログ取得
      const response = await axios.get(
        `${API_BASE_URL}/api/admin/inventory-logs/${productId}`,
        { withCredentials: true }
      );
      return response.data.logs || [];
    } else {
      // 全商品の在庫ログ取得
      const response = await axios.get(
        `${API_BASE_URL}/api/admin/inventory-logs`,
        { withCredentials: true }
      );
      return response.data.logs || [];
    }
  } catch (error) {
    console.error('在庫ログ取得エラー:', error);
    throw error;
  }
};

/**
 * 在庫調整（管理者）
 * @API_INTEGRATION
 */
export const createAdminInventoryLog = async (
  data: CreateInventoryLogRequest
): Promise<InventoryLog> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/admin/inventory-logs`,
      {
        productId: data.productId,
        quantity: data.quantity,
        type: data.type,
        note: data.reason,
      },
      { withCredentials: true }
    );

    return response.data.inventoryLog;
  } catch (error) {
    console.error('在庫調整エラー:', error);
    throw error;
  }
};

/**
 * 商品の現在在庫数を取得（管理者）
 * @API_INTEGRATION
 */
export const getProductCurrentStock = async (
  productId: string
): Promise<number> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/admin/inventory-logs/${productId}`,
      { withCredentials: true }
    );

    return response.data.currentStock || 0;
  } catch (error) {
    console.error('在庫数取得エラー:', error);
    throw error;
  }
};

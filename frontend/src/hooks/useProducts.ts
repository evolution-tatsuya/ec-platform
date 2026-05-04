// ========================================
// 商品管理カスタムフック（React Query）
// ========================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Product, InventoryLog } from '../types';
import type {
  ProductFilterParams,
  CreateProductRequest,
  UpdateProductRequest,
  CreateInventoryLogRequest,
} from '../services/api/products';
import {
  getAdminProducts,
  getAdminProductById,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  bulkPublishProducts,
  bulkUnpublishProducts,
  bulkDeleteProducts,
  getAdminInventoryLogs,
  createAdminInventoryLog,
  getProductCurrentStock,
} from '../services/api/products';

// ========================================
// 商品管理フック
// ========================================

/**
 * 商品一覧取得フック
 */
export const useAdminProducts = (filters?: ProductFilterParams) => {
  return useQuery<Product[], Error>({
    queryKey: ['adminProducts', filters],
    queryFn: () => getAdminProducts(filters),
    staleTime: 0, // フィルター変更時に即座にリフェッチ
    refetchOnMount: true,
  });
};

/**
 * 商品詳細取得フック
 */
export const useAdminProductById = (id: string) => {
  return useQuery<Product, Error>({
    queryKey: ['adminProduct', id],
    queryFn: () => getAdminProductById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5分間キャッシュ
  });
};

/**
 * 商品作成フック
 */
export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation<Product, Error, CreateProductRequest>({
    mutationFn: createAdminProduct,
    onSuccess: () => {
      // 商品一覧キャッシュを無効化して即座にリフェッチ
      queryClient.invalidateQueries({
        queryKey: ['adminProducts'],
        refetchType: 'active', // アクティブなクエリのみリフェッチ
      });
    },
  });
};

/**
 * 商品更新フック
 */
export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation<Product, Error, { id: string; data: UpdateProductRequest }>({
    mutationFn: ({ id, data }) => updateAdminProduct(id, data),
    onSuccess: (data) => {
      // 商品一覧キャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] });
      // 該当商品の詳細キャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['adminProduct', data.id] });
    },
  });
};

/**
 * 商品削除フック
 */
export const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteAdminProduct,
    onSuccess: () => {
      // 商品一覧キャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] });
    },
  });
};

/**
 * 商品一括公開フック
 */
export const useBulkPublishProducts = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string[]>({
    mutationFn: bulkPublishProducts,
    onSuccess: () => {
      // 商品一覧キャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] });
    },
  });
};

/**
 * 商品一括非公開フック
 */
export const useBulkUnpublishProducts = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string[]>({
    mutationFn: bulkUnpublishProducts,
    onSuccess: () => {
      // 商品一覧キャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] });
    },
  });
};

/**
 * 商品一括削除フック
 */
export const useBulkDeleteProducts = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string[]>({
    mutationFn: bulkDeleteProducts,
    onSuccess: () => {
      // 商品一覧キャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] });
    },
  });
};

// ========================================
// 在庫管理フック
// ========================================

/**
 * 在庫ログ一覧取得フック
 */
export const useInventoryLogs = (productId?: string) => {
  return useQuery<InventoryLog[], Error>({
    queryKey: ['inventoryLogs', productId],
    queryFn: () => getAdminInventoryLogs(productId),
    staleTime: 1000 * 60 * 5, // 5分間キャッシュ
  });
};

/**
 * 商品別在庫ログ取得フック
 */
export const useProductInventoryLogs = (productId: string) => {
  return useQuery<InventoryLog[], Error>({
    queryKey: ['inventoryLogs', productId],
    queryFn: () => getAdminInventoryLogs(productId),
    enabled: !!productId,
    staleTime: 1000 * 60 * 5, // 5分間キャッシュ
  });
};

/**
 * 在庫調整フック
 */
export const useCreateInventoryLog = () => {
  const queryClient = useQueryClient();

  return useMutation<InventoryLog, Error, CreateInventoryLogRequest>({
    mutationFn: createAdminInventoryLog,
    onSuccess: (data) => {
      // 在庫ログキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['inventoryLogs'] });
      // 該当商品の詳細キャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['adminProduct', data.productId] });
      // 商品一覧キャッシュを無効化（在庫数が変わるため）
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] });
    },
  });
};

/**
 * 商品の現在在庫数取得フック
 */
export const useProductCurrentStock = (productId: string) => {
  return useQuery<number, Error>({
    queryKey: ['productStock', productId],
    queryFn: () => getProductCurrentStock(productId),
    enabled: !!productId,
    staleTime: 1000 * 60 * 5, // 5分間キャッシュ
  });
};

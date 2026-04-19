// ========================================
// ナビゲーション軸カスタムフック
// スライス8-B: フロントエンド統合
// ========================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CategoryNavigationAxis,
  CategoryType,
  CreateNavigationAxisRequest,
  UpdateNavigationAxisRequest,
  UpdateAxisOrderRequest,
} from '../types';
import {
  getNavigationAxes,
  getNavigationAxesByCategory,
  createNavigationAxis,
  updateNavigationAxis,
  deleteNavigationAxis,
  updateNavigationAxisOrder,
} from '../services/api/navigationAxes';

// ========================================
// キャッシュキー定義
// ========================================

const QUERY_KEYS = {
  navigationAxes: ['navigationAxes'] as const,
  navigationAxesByCategory: (category: CategoryType) =>
    ['navigationAxes', category] as const,
};

// ========================================
// 1. useNavigationAxes - 全軸取得
// ========================================

/**
 * 全ナビゲーション軸取得フック
 */
export const useNavigationAxes = () => {
  return useQuery<CategoryNavigationAxis[], Error>({
    queryKey: QUERY_KEYS.navigationAxes,
    queryFn: getNavigationAxes,
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
  });
};

// ========================================
// 2. useNavigationAxesByCategory - カテゴリー別軸取得
// ========================================

/**
 * カテゴリー別ナビゲーション軸取得フック
 */
export const useNavigationAxesByCategory = (category: CategoryType) => {
  return useQuery<CategoryNavigationAxis[], Error>({
    queryKey: QUERY_KEYS.navigationAxesByCategory(category),
    queryFn: () => getNavigationAxesByCategory(category),
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
  });
};

// ========================================
// 3. useCreateNavigationAxis - 軸追加
// ========================================

/**
 * ナビゲーション軸追加フック
 */
export const useCreateNavigationAxis = () => {
  const queryClient = useQueryClient();

  return useMutation<CategoryNavigationAxis, Error, CreateNavigationAxisRequest>({
    mutationFn: createNavigationAxis,
    onSuccess: (newAxis) => {
      // 全軸キャッシュを無効化
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.navigationAxes });
      // カテゴリー別キャッシュを無効化
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.navigationAxesByCategory(newAxis.categoryType),
      });
    },
  });
};

// ========================================
// 4. useUpdateNavigationAxis - 軸更新
// ========================================

/**
 * ナビゲーション軸更新フック
 */
export const useUpdateNavigationAxis = () => {
  const queryClient = useQueryClient();

  return useMutation<
    CategoryNavigationAxis,
    Error,
    { id: string; data: UpdateNavigationAxisRequest }
  >({
    mutationFn: ({ id, data }) => updateNavigationAxis(id, data),
    onSuccess: (updatedAxis) => {
      // 全軸キャッシュを無効化
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.navigationAxes });
      // カテゴリー別キャッシュを無効化
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.navigationAxesByCategory(updatedAxis.categoryType),
      });
    },
  });
};

// ========================================
// 5. useDeleteNavigationAxis - 軸削除
// ========================================

/**
 * ナビゲーション軸削除フック
 */
export const useDeleteNavigationAxis = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteNavigationAxis,
    onSuccess: () => {
      // 全軸キャッシュを無効化
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.navigationAxes });
      // すべてのカテゴリー別キャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['navigationAxes'] });
    },
  });
};

// ========================================
// 6. useUpdateNavigationAxisOrder - 軸順序更新
// ========================================

/**
 * ナビゲーション軸順序更新フック
 */
export const useUpdateNavigationAxisOrder = () => {
  const queryClient = useQueryClient();

  return useMutation<
    CategoryNavigationAxis,
    Error,
    { id: string; data: UpdateAxisOrderRequest }
  >({
    mutationFn: ({ id, data }) => updateNavigationAxisOrder(id, data),
    onSuccess: (updatedAxis) => {
      // 全軸キャッシュを無効化
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.navigationAxes });
      // カテゴリー別キャッシュを無効化
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.navigationAxesByCategory(updatedAxis.categoryType),
      });
    },
  });
};

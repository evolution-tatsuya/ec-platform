// ========================================
// システム設定カスタムフック（管理者向け）
// ========================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  SystemSettings,
  UpdateCompanySettingsRequest,
  UpdatePaymentSettingsRequest,
  UpdateEmailSettingsRequest,
  UpdateDocumentTemplatesRequest,
  UpdateImageOptimizationRequest,
} from '../types';
import {
  getAdminSettings,
  updateCompanySettings,
  updatePaymentSettings,
  updateEmailSettings,
  updateDocumentTemplates,
  updateImageOptimization,
} from '../services/api/settings';

// クエリキー
const SETTINGS_QUERY_KEY = ['adminSettings'];

// ========================================
// 設定取得フック
// ========================================

export const useAdminSettings = () => {
  return useQuery<SystemSettings, Error>({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: getAdminSettings,
    staleTime: 5 * 60 * 1000, // 5分間はキャッシュを利用
    refetchOnWindowFocus: true,
  });
};

// ========================================
// 会社情報更新フック
// ========================================

export const useUpdateCompanySettings = () => {
  const queryClient = useQueryClient();

  return useMutation<SystemSettings, Error, UpdateCompanySettingsRequest>({
    mutationFn: updateCompanySettings,
    onSuccess: (data) => {
      // キャッシュを更新
      queryClient.setQueryData<SystemSettings>(SETTINGS_QUERY_KEY, data);
    },
  });
};

// ========================================
// 決済設定更新フック
// ========================================

export const useUpdatePaymentSettings = () => {
  const queryClient = useQueryClient();

  return useMutation<SystemSettings, Error, UpdatePaymentSettingsRequest>({
    mutationFn: updatePaymentSettings,
    onSuccess: (data) => {
      // キャッシュを更新
      queryClient.setQueryData<SystemSettings>(SETTINGS_QUERY_KEY, data);
    },
  });
};

// ========================================
// メール設定更新フック
// ========================================

export const useUpdateEmailSettings = () => {
  const queryClient = useQueryClient();

  return useMutation<SystemSettings, Error, UpdateEmailSettingsRequest>({
    mutationFn: updateEmailSettings,
    onSuccess: (data) => {
      // キャッシュを更新
      queryClient.setQueryData<SystemSettings>(SETTINGS_QUERY_KEY, data);
    },
  });
};

// ========================================
// 書類テンプレート更新フック
// ========================================

export const useUpdateDocumentTemplates = () => {
  const queryClient = useQueryClient();

  return useMutation<SystemSettings, Error, UpdateDocumentTemplatesRequest>({
    mutationFn: updateDocumentTemplates,
    onSuccess: (data) => {
      // キャッシュを更新
      queryClient.setQueryData<SystemSettings>(SETTINGS_QUERY_KEY, data);
    },
  });
};

// ========================================
// 画像最適化設定更新フック
// ========================================

export const useUpdateImageOptimization = () => {
  const queryClient = useQueryClient();

  return useMutation<SystemSettings, Error, UpdateImageOptimizationRequest>({
    mutationFn: updateImageOptimization,
    onSuccess: (data) => {
      // キャッシュを更新
      queryClient.setQueryData<SystemSettings>(SETTINGS_QUERY_KEY, data);
    },
  });
};

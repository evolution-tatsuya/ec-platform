// ========================================
// 注文管理カスタムフック（React Query）
// ========================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Order,
  AdminOrderFilterParams,
  ShipOrderRequest,
  DocumentGenerationResponse,
} from '../types';
import {
  getAdminOrders,
  getAdminOrderById,
  shipOrder,
  generateInvoice,
  generateReceipt,
  generateQuote,
} from '../services/api/orders';

// ========================================
// 注文管理フック
// ========================================

/**
 * 注文一覧取得フック（管理者）
 */
export const useAdminOrders = (filters?: AdminOrderFilterParams) => {
  return useQuery<Order[], Error>({
    queryKey: ['adminOrders', filters],
    queryFn: () => getAdminOrders(filters),
    staleTime: 1000 * 60 * 5, // 5分間キャッシュ
  });
};

/**
 * 注文詳細取得フック（管理者）
 */
export const useAdminOrderById = (id: string) => {
  return useQuery<Order, Error>({
    queryKey: ['adminOrder', id],
    queryFn: () => getAdminOrderById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5分間キャッシュ
  });
};

/**
 * 発送処理フック（管理者）
 */
export const useShipOrder = () => {
  const queryClient = useQueryClient();

  return useMutation<Order, Error, { id: string; data: ShipOrderRequest }>({
    mutationFn: ({ id, data }) => shipOrder(id, data),
    onSuccess: (data) => {
      // 注文一覧キャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      // 該当注文の詳細キャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['adminOrder', data.id] });
    },
  });
};

/**
 * 生成されたPDFを自動ダウンロード（+新規タブ表示）する。
 * 各書類生成フックのonSuccessから呼ぶ共通処理。
 */
const triggerDocumentDownload = (data: DocumentGenerationResponse): void => {
  if (!data.documentUrl) return;
  // 新規タブでプレビュー表示
  window.open(data.documentUrl, '_blank');
  // ダウンロードもトリガー（ファイル名付き）
  const link = document.createElement('a');
  link.href = data.documentUrl;
  link.download = data.fileName ?? 'document.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // 生成したObject URLを後片付け（少し遅延させてから解放）
  setTimeout(() => URL.revokeObjectURL(data.documentUrl), 10000);
};

/**
 * 納品書生成フック（管理者）
 */
export const useGenerateInvoice = () => {
  return useMutation<DocumentGenerationResponse, Error, string>({
    mutationFn: generateInvoice,
    onSuccess: triggerDocumentDownload,
  });
};

/**
 * 領収書生成フック（管理者）
 */
export const useGenerateReceipt = () => {
  return useMutation<DocumentGenerationResponse, Error, string>({
    mutationFn: generateReceipt,
    onSuccess: triggerDocumentDownload,
  });
};

/**
 * 見積書生成フック（管理者）
 */
export const useGenerateQuote = () => {
  return useMutation<DocumentGenerationResponse, Error, string>({
    mutationFn: generateQuote,
    onSuccess: triggerDocumentDownload,
  });
};

// ========================================
// 問い合わせ管理カスタムフック（React Query）
// ========================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Inquiry, InquiryStats, InquiryTrendData, InquiryReplyRequest } from '../types';
import type {
  InquiryFilterParams,
  InquiryListResponse,
} from '../services/api/inquiries';
import {
  getAdminInquiries,
  getAdminInquiryById,
  replyToInquiry,
  getInquiryStats,
  getInquiryTrends,
} from '../services/api/inquiries';

// ========================================
// 問い合わせ管理フック
// ========================================

/**
 * 問い合わせ一覧取得フック
 */
export const useAdminInquiries = (filters?: InquiryFilterParams) => {
  return useQuery<InquiryListResponse, Error>({
    queryKey: ['adminInquiries', filters],
    queryFn: () => getAdminInquiries(filters),
    staleTime: 1000 * 60 * 5, // 5分間キャッシュ
  });
};

/**
 * 問い合わせ詳細取得フック
 */
export const useAdminInquiryById = (id: string) => {
  return useQuery<Inquiry, Error>({
    queryKey: ['adminInquiry', id],
    queryFn: () => getAdminInquiryById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5分間キャッシュ
  });
};

/**
 * 問い合わせ返信フック
 */
export const useReplyToInquiry = () => {
  const queryClient = useQueryClient();

  return useMutation<Inquiry, Error, { id: string; data: InquiryReplyRequest }>({
    mutationFn: ({ id, data }) => replyToInquiry(id, data),
    onSuccess: (data) => {
      // 問い合わせ一覧キャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['adminInquiries'] });
      // 該当問い合わせの詳細キャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['adminInquiry', data.id] });
      // 統計情報を無効化
      queryClient.invalidateQueries({ queryKey: ['inquiryStats'] });
      queryClient.invalidateQueries({ queryKey: ['inquiryTrends'] });
    },
  });
};

/**
 * 問い合わせ統計情報取得フック
 */
export const useInquiryStats = () => {
  return useQuery<InquiryStats, Error>({
    queryKey: ['inquiryStats'],
    queryFn: getInquiryStats,
    staleTime: 1000 * 60 * 5, // 5分間キャッシュ
  });
};

/**
 * 問い合わせトレンド取得フック
 */
export const useInquiryTrends = (period: 'week' | 'month' = 'week') => {
  return useQuery<InquiryTrendData[], Error>({
    queryKey: ['inquiryTrends', period],
    queryFn: () => getInquiryTrends(period),
    staleTime: 1000 * 60 * 5, // 5分間キャッシュ
  });
};

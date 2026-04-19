// ========================================
// ダッシュボード統計カスタムフック（React Query）
// ========================================

import { useQuery } from '@tanstack/react-query';
import type { DashboardStats } from '../types';
import { getAdminDashboard } from '../services/api/dashboard';

// ========================================
// ダッシュボード統計フック
// ========================================

/**
 * ダッシュボード統計データ取得フック（管理者）
 * 自動リフレッチ: 60秒ごと
 */
export const useAdminDashboard = () => {
  return useQuery<DashboardStats, Error>({
    queryKey: ['adminDashboard'],
    queryFn: getAdminDashboard,
    refetchInterval: 60000, // 60秒ごとに自動リフレッチ
    staleTime: 30000, // 30秒間はキャッシュを新鮮とみなす
  });
};

// ========================================
// ダッシュボード統計API（管理者向け）
// ========================================

import axios from 'axios';
import type { DashboardStats } from '../../types';

// 環境変数からAPIベースURLを取得
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8432';

// ========================================
// API関数
// ========================================

/**
 * ダッシュボード統計データ取得（管理者）
 * 今月の売上、注文数、平均注文額、前月比、最近の注文、
 * トップ売れ筋商品、日別売上推移、カテゴリー別売上を取得
 * @API_INTEGRATION
 */
export const getAdminDashboard = async (): Promise<DashboardStats> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/admin/dashboard`, {
      withCredentials: true,
    });

    return response.data;
  } catch (error) {
    console.error('ダッシュボード統計取得エラー:', error);
    throw error;
  }
};

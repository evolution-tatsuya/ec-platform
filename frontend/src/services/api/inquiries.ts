// ========================================
// 問い合わせ管理API（管理者向け）
// ========================================

import axios from 'axios';
import type {
  Inquiry,
  InquiryStats,
  InquiryTrendData,
  InquiryReplyRequest,
} from '../../types';

// 環境変数からAPIベースURLを取得
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8432';

// ========================================
// 型定義
// ========================================

/**
 * 問い合わせフィルタリングパラメータ
 */
export interface InquiryFilterParams {
  search?: string;
  status?: 'all' | 'pending' | 'replied' | 'closed';
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 問い合わせ一覧レスポンス
 */
export interface InquiryListResponse {
  inquiries: Inquiry[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * 問い合わせトレンドレスポンス
 */
export interface InquiryTrendsResponse {
  period: 'week' | 'month';
  days: number;
  trends: InquiryTrendData[];
}

// ========================================
// API関数
// ========================================

/**
 * 問い合わせ一覧取得（管理者）
 * 対応状況別にフィルタリング可能
 * @API_INTEGRATION
 */
export const getAdminInquiries = async (
  filters?: InquiryFilterParams
): Promise<InquiryListResponse> => {
  try {
    const params: Record<string, string> = {};

    if (filters?.search) params.search = filters.search;
    if (filters?.status && filters.status !== 'all') params.status = filters.status;
    if (filters?.page) params.page = String(filters.page);
    if (filters?.limit) params.limit = String(filters.limit);
    if (filters?.sortBy) params.sortBy = filters.sortBy;
    if (filters?.sortOrder) params.sortOrder = filters.sortOrder;

    const response = await axios.get(`${API_BASE_URL}/api/admin/inquiries`, {
      params,
      withCredentials: true,
    });

    return response.data;
  } catch (error) {
    console.error('問い合わせ一覧取得エラー:', error);
    throw error;
  }
};

/**
 * 問い合わせ詳細取得（管理者）
 * 顧客情報、質問内容、AI回答、満足度フィードバックを含む
 * @API_INTEGRATION
 */
export const getAdminInquiryById = async (id: string): Promise<Inquiry> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/admin/inquiries/${id}`, {
      withCredentials: true,
    });

    return response.data;
  } catch (error) {
    console.error('問い合わせ詳細取得エラー:', error);
    throw error;
  }
};

/**
 * 問い合わせ返信送信（管理者）
 * メール返信（Resend経由）
 * @API_INTEGRATION
 */
export const replyToInquiry = async (
  id: string,
  data: InquiryReplyRequest
): Promise<Inquiry> => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/api/admin/inquiries/${id}/reply`,
      { reply: data.replyText },
      { withCredentials: true }
    );

    return response.data.inquiry;
  } catch (error) {
    console.error('問い合わせ返信エラー:', error);
    throw error;
  }
};

/**
 * AI使用状況統計取得（管理者）
 * 月間問い合わせ数、AI対応率、コスト、Gemini使用回数
 * @API_INTEGRATION
 */
export const getInquiryStats = async (): Promise<InquiryStats> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/admin/inquiries/stats`, {
      withCredentials: true,
    });

    // バックエンドのレスポンス形式を変換
    const stats = response.data;
    return {
      totalInquiries: stats.totalInquiries || 0,
      aiRespondedCount: 0, // 現在は計算していない
      aiResponseRate: 0, // 現在は計算していない
      monthlyCost: 0, // 現在は計算していない
      geminiUsageCount: 0, // 現在は計算していない
      trendData: [], // 別エンドポイントで取得
      distribution: [], // 現在は計算していない
    };
  } catch (error) {
    console.error('問い合わせ統計取得エラー:', error);
    throw error;
  }
};

/**
 * 問い合わせ推移取得（管理者）
 * 過去7日間の問い合わせ推移データ
 * @API_INTEGRATION
 */
export const getInquiryTrends = async (
  period: 'week' | 'month' = 'week'
): Promise<InquiryTrendData[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/admin/inquiries/trends`, {
      params: { period },
      withCredentials: true,
    });

    // バックエンドのレスポンス形式を変換
    const trendData = response.data.trends || [];
    return trendData.map((trend: any) => ({
      date: trend.date,
      total: trend.total,
      aiResponded: 0, // 現在は計算していない
      manualResponded: trend.replied || 0,
    }));
  } catch (error) {
    console.error('問い合わせ推移取得エラー:', error);
    throw error;
  }
};

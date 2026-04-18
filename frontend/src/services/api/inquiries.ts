// ========================================
// 問い合わせ管理API（管理者向け）
// ========================================

import type {
  Inquiry,
  InquiryStats,
  InquiryTrendData,
  InquiryReplyRequest,
} from '../../types';

// ========================================
// API関数
// ========================================

/**
 * 問い合わせ一覧取得（管理者）
 * 対応状況別にフィルタリング可能
 * @API_INTEGRATION
 */
export const getAdminInquiries = async (): Promise<Inquiry[]> => {
  throw new Error('API not implemented');
};

/**
 * 問い合わせ詳細取得（管理者）
 * 顧客情報、質問内容、AI回答、満足度フィードバックを含む
 * @API_INTEGRATION
 */
export const getAdminInquiryById = async (_id: string): Promise<Inquiry> => {
  throw new Error('API not implemented');
};

/**
 * 問い合わせ返信送信（管理者）
 * メール返信（Resend経由）
 * @API_INTEGRATION
 */
export const replyToInquiry = async (
  _id: string,
  _data: InquiryReplyRequest
): Promise<Inquiry> => {
  throw new Error('API not implemented');
};

/**
 * AI使用状況統計取得（管理者）
 * 月間問い合わせ数、AI対応率、コスト、Gemini使用回数
 * @API_INTEGRATION
 */
export const getInquiryStats = async (): Promise<InquiryStats> => {
  throw new Error('API not implemented');
};

/**
 * 問い合わせ推移取得（管理者）
 * 過去7日間の問い合わせ推移データ
 * @API_INTEGRATION
 */
export const getInquiryTrends = async (): Promise<InquiryTrendData[]> => {
  throw new Error('API not implemented');
};

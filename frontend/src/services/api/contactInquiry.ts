// ========================================
// 問い合わせAPI（顧客向け）
// P-012 お問い合わせページ（ContactPage.tsx）に対応
// ========================================

import axios from 'axios';
import type { Inquiry, InquiryResponse, InquiryHistory } from '../../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8432';

export interface CreateInquiryRequest {
  name: string;
  email: string;
  question: string;
  orderNumber?: string;
}

/**
 * 問い合わせ送信（AI自動返答連携、ゲスト可）
 * POST /api/inquiries
 */
export const createInquiry = async (
  data: CreateInquiryRequest
): Promise<InquiryResponse> => {
  const response = await axios.post(`${API_BASE_URL}/api/inquiries`, data, {
    withCredentials: true,
  });
  return response.data;
};

/**
 * 問い合わせ履歴取得（ログインユーザーのみ）
 * GET /api/inquiries/history
 */
export const getInquiryHistory = async (): Promise<InquiryHistory[]> => {
  const response = await axios.get(`${API_BASE_URL}/api/inquiries/history`, {
    withCredentials: true,
  });
  return response.data.inquiries;
};

/**
 * 満足度フィードバック
 * PUT /api/inquiries/:id/feedback
 */
export const submitInquiryFeedback = async (
  id: string,
  isSatisfied: boolean
): Promise<Inquiry> => {
  const response = await axios.put(
    `${API_BASE_URL}/api/inquiries/${id}/feedback`,
    { isSatisfied },
    { withCredentials: true }
  );
  return response.data.inquiry;
};

/**
 * オペレーターエスカレーション
 * PUT /api/inquiries/:id/escalate
 */
export const escalateInquiry = async (id: string): Promise<Inquiry> => {
  const response = await axios.put(
    `${API_BASE_URL}/api/inquiries/${id}/escalate`,
    {},
    { withCredentials: true }
  );
  return response.data.inquiry;
};

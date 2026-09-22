// ========================================
// 注文管理API（管理者向け）
// ========================================

import axios from 'axios';
import type {
  Order,
  AdminOrderFilterParams,
  ShipOrderRequest,
  DocumentGenerationResponse,
} from '../../types';

// 環境変数からAPIベースURLを取得
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8432';

// ========================================
// API関数
// ========================================

/**
 * 注文一覧取得（管理者）
 * @API_INTEGRATION
 */
export const getAdminOrders = async (
  filters?: AdminOrderFilterParams
): Promise<Order[]> => {
  try {
    const params: Record<string, string> = {};

    if (filters?.status && filters.status !== 'all') {
      params.status = filters.status;
    }
    if (filters?.paymentMethod && filters.paymentMethod !== 'all') {
      params.paymentMethod = filters.paymentMethod;
    }
    if (filters?.startDate) {
      params.startDate = filters.startDate;
    }
    if (filters?.endDate) {
      params.endDate = filters.endDate;
    }
    if (filters?.search) {
      params.search = filters.search;
    }

    const response = await axios.get(`${API_BASE_URL}/api/admin/orders`, {
      params,
      withCredentials: true,
    });

    return response.data.orders || [];
  } catch (error) {
    console.error('注文一覧取得エラー:', error);
    throw error;
  }
};

/**
 * 注文詳細取得（管理者）
 * @API_INTEGRATION
 */
export const getAdminOrderById = async (id: string): Promise<Order> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/admin/orders/${id}`, {
      withCredentials: true,
    });

    return response.data.order;
  } catch (error) {
    console.error('注文詳細取得エラー:', error);
    throw error;
  }
};

/**
 * 発送処理（管理者）
 * ステータスを「発送済み」に変更し、追跡番号を設定
 * 発送通知メールが自動送信される
 * @API_INTEGRATION
 */
export const shipOrder = async (
  id: string,
  data: ShipOrderRequest
): Promise<Order> => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/api/admin/orders/${id}/ship`,
      data,
      {
        withCredentials: true,
      }
    );

    return response.data.order;
  } catch (error) {
    console.error('発送処理エラー:', error);
    throw error;
  }
};

/**
 * 入金確認処理（管理者）: 注文を pending → paid にする
 * @API_INTEGRATION
 */
export const confirmPayment = async (id: string): Promise<Order> => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/api/admin/orders/${id}/confirm-payment`,
      {},
      {
        withCredentials: true,
      }
    );

    return response.data.order;
  } catch (error) {
    console.error('入金確認エラー:', error);
    throw error;
  }
};

/**
 * 納品書生成・ダウンロード（管理者）
 * pdfmeを使用してPDF形式で生成
 * @API_INTEGRATION
 */
export const generateInvoice = async (
  id: string
): Promise<DocumentGenerationResponse> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/admin/orders/${id}/documents/invoice`,
      {
        responseType: 'blob',
        withCredentials: true,
      }
    );

    // BlobからURLを生成
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const documentUrl = URL.createObjectURL(blob);
    const fileName = `invoice-${id}.pdf`;

    return {
      success: true,
      documentUrl,
      documentType: 'invoice',
      fileName,
    };
  } catch (error) {
    console.error('納品書生成エラー:', error);
    throw error;
  }
};

/**
 * 領収書生成・ダウンロード（管理者）
 * pdfmeを使用してPDF形式で生成
 * @API_INTEGRATION
 */
export const generateReceipt = async (
  id: string
): Promise<DocumentGenerationResponse> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/admin/orders/${id}/documents/receipt`,
      {
        responseType: 'blob',
        withCredentials: true,
      }
    );

    // BlobからURLを生成
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const documentUrl = URL.createObjectURL(blob);
    const fileName = `receipt-${id}.pdf`;

    return {
      success: true,
      documentUrl,
      documentType: 'receipt',
      fileName,
    };
  } catch (error) {
    console.error('領収書生成エラー:', error);
    throw error;
  }
};

/**
 * 見積書生成・ダウンロード（管理者）
 * pdfmeを使用してPDF形式で生成
 * @API_INTEGRATION
 */
export const generateQuote = async (
  id: string
): Promise<DocumentGenerationResponse> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/admin/orders/${id}/documents/quote`,
      {
        responseType: 'blob',
        withCredentials: true,
      }
    );

    // BlobからURLを生成
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const documentUrl = URL.createObjectURL(blob);
    const fileName = `quote-${id}.pdf`;

    return {
      success: true,
      documentUrl,
      documentType: 'quote',
      fileName,
    };
  } catch (error) {
    console.error('見積書生成エラー:', error);
    throw error;
  }
};

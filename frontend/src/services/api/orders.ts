// ========================================
// 注文管理API（管理者向け）
// ========================================

import type {
  Order,
  AdminOrderFilterParams,
  ShipOrderRequest,
  DocumentGenerationResponse,
} from '../../types';

// ========================================
// API関数
// ========================================

/**
 * 注文一覧取得（管理者）
 * @API_INTEGRATION
 */
export const getAdminOrders = async (
  _filters?: AdminOrderFilterParams
): Promise<Order[]> => {
  throw new Error('API not implemented');
};

/**
 * 注文詳細取得（管理者）
 * @API_INTEGRATION
 */
export const getAdminOrderById = async (_id: string): Promise<Order> => {
  throw new Error('API not implemented');
};

/**
 * 発送処理（管理者）
 * ステータスを「発送済み」に変更し、追跡番号を設定
 * 発送通知メールが自動送信される
 * @API_INTEGRATION
 */
export const shipOrder = async (
  _id: string,
  _data: ShipOrderRequest
): Promise<Order> => {
  throw new Error('API not implemented');
};

/**
 * 納品書生成・ダウンロード（管理者）
 * pdfmeを使用してPDF形式で生成
 * @API_INTEGRATION
 */
export const generateInvoice = async (
  _id: string
): Promise<DocumentGenerationResponse> => {
  throw new Error('API not implemented');
};

/**
 * 領収書生成・ダウンロード（管理者）
 * pdfmeを使用してPDF形式で生成
 * @API_INTEGRATION
 */
export const generateReceipt = async (
  _id: string
): Promise<DocumentGenerationResponse> => {
  throw new Error('API not implemented');
};

/**
 * 見積書生成・ダウンロード（管理者）
 * pdfmeを使用してPDF形式で生成
 * @API_INTEGRATION
 */
export const generateQuote = async (
  _id: string
): Promise<DocumentGenerationResponse> => {
  throw new Error('API not implemented');
};

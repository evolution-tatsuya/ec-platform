// ========================================
// システム設定API（管理者向け）
// ========================================

import type {
  SystemSettings,
  UpdateCompanySettingsRequest,
  UpdatePaymentSettingsRequest,
  UpdateEmailSettingsRequest,
  UpdateDocumentTemplatesRequest,
  UpdateImageOptimizationRequest,
} from '../../types';

// ========================================
// 全設定取得
// ========================================

/**
 * 全設定取得（管理者）
 * @API_INTEGRATION
 */
export const getAdminSettings = async (): Promise<SystemSettings> => {
  throw new Error('API not implemented');
};

// ========================================
// 会社情報設定
// ========================================

/**
 * 会社情報更新（管理者）
 * @API_INTEGRATION
 */
export const updateCompanySettings = async (
  _data: UpdateCompanySettingsRequest
): Promise<SystemSettings> => {
  throw new Error('API not implemented');
};

// ========================================
// 決済設定
// ========================================

/**
 * 決済設定更新（管理者）
 * @API_INTEGRATION
 */
export const updatePaymentSettings = async (
  _data: UpdatePaymentSettingsRequest
): Promise<SystemSettings> => {
  throw new Error('API not implemented');
};

// ========================================
// メール設定
// ========================================

/**
 * メール設定更新（管理者）
 * @API_INTEGRATION
 */
export const updateEmailSettings = async (
  _data: UpdateEmailSettingsRequest
): Promise<SystemSettings> => {
  throw new Error('API not implemented');
};

// ========================================
// 書類テンプレート設定
// ========================================

/**
 * 書類テンプレート更新（管理者）
 * @API_INTEGRATION
 */
export const updateDocumentTemplates = async (
  _data: UpdateDocumentTemplatesRequest
): Promise<SystemSettings> => {
  throw new Error('API not implemented');
};

// ========================================
// 画像最適化設定
// ========================================

/**
 * 画像最適化設定更新（管理者）
 * @API_INTEGRATION
 */
export const updateImageOptimization = async (
  _data: UpdateImageOptimizationRequest
): Promise<SystemSettings> => {
  throw new Error('API not implemented');
};

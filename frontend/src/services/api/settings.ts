// ========================================
// システム設定API（管理者向け）
// ========================================

import axios from 'axios';
import type {
  SystemSettings,
  UpdateCompanySettingsRequest,
  UpdatePaymentSettingsRequest,
  UpdateEmailSettingsRequest,
  UpdateDocumentTemplatesRequest,
  UpdateImageOptimizationRequest,
} from '../../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8432';

// ========================================
// 全設定取得
// ========================================

/**
 * 全設定取得（管理者）
 */
export const getAdminSettings = async (): Promise<SystemSettings> => {
  try {
    const response = await axios.get(`${API_URL}/api/admin/settings`, {
      withCredentials: true,
    });

    const settings = response.data.settings;

    // SiteSettingsモデルのフィールドをSystemSettings型にマッピング
    return {
      company: {
        companyName: settings.companyName || '',
        logoUrl: settings.companyLogoUrl || undefined,
        logoDisplayUrl: settings.logoDisplayUrl || undefined,
        showShopName: settings.showShopName !== false,
        postalCode: settings.companyPostalCode || '',
        address: settings.companyAddress || '',
        phone: settings.companyPhone || '',
        bankName: settings.bankName || '',
        branchName: settings.bankBranch || '',
        accountType: settings.bankAccountType || 'checking',
        accountNumber: settings.bankAccountNumber || '',
        accountHolder: settings.bankAccountHolder || '',
        primaryColor: '#1976d2',
        secondaryColor: '#dc004e',
        heroImageUrl: undefined,
      },
      payment: {
        bankTransferEnabled: settings.enableBankTransfer ?? true,
        bankTransferDiscountRate: settings.bankTransferDiscount ?? 0.036,
        creditCardEnabled: settings.enableCreditCard ?? true,
        stripePublicKey: '',
        stripeSecretKey: '',
      },
      email: {
        senderEmail: settings.emailFrom || '',
        shippingNotificationTemplate: '',
      },
      documentTemplates: {
        invoiceTemplate: undefined,
        receiptTemplate: undefined,
        estimateTemplate: undefined,
      },
      imageOptimization: {
        webpEnabled: settings.enableWebpConversion ?? true,
        compressionQuality: settings.imageQuality ?? 80,
        thumbnailSize: settings.thumbnailSize ?? 200,
      },
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.error || '設定の取得に失敗しました');
    }
    throw error;
  }
};

// ========================================
// 会社情報設定
// ========================================

/**
 * 会社情報更新（管理者）
 */
export const updateCompanySettings = async (
  data: UpdateCompanySettingsRequest
): Promise<SystemSettings> => {
  try {
    const requestData = {
      companyName: data.companyName,
      companyLogoUrl: data.logoUrl,
      companyPostalCode: data.postalCode,
      companyAddress: data.address,
      companyPhone: data.phone,
      showShopName: data.showShopName,
      bankName: data.bankName,
      bankBranch: data.branchName,
      bankAccountType: data.accountType,
      bankAccountNumber: data.accountNumber,
      bankAccountHolder: data.accountHolder,
    };

    const response = await axios.put(
      `${API_URL}/api/admin/settings/company`,
      requestData,
      {
        withCredentials: true,
      }
    );

    const settings = response.data.settings;

    return {
      company: {
        companyName: settings.companyName || '',
        logoUrl: settings.companyLogoUrl || undefined,
        logoDisplayUrl: settings.logoDisplayUrl || undefined,
        showShopName: settings.showShopName !== false,
        postalCode: settings.companyPostalCode || '',
        address: settings.companyAddress || '',
        phone: settings.companyPhone || '',
        bankName: settings.bankName || '',
        branchName: settings.bankBranch || '',
        accountType: settings.bankAccountType || 'checking',
        accountNumber: settings.bankAccountNumber || '',
        accountHolder: settings.bankAccountHolder || '',
        primaryColor: '#1976d2',
        secondaryColor: '#dc004e',
        heroImageUrl: undefined,
      },
      payment: {
        bankTransferEnabled: settings.enableBankTransfer ?? true,
        bankTransferDiscountRate: settings.bankTransferDiscount ?? 0.036,
        creditCardEnabled: settings.enableCreditCard ?? true,
        stripePublicKey: '',
        stripeSecretKey: '',
      },
      email: {
        senderEmail: settings.emailFrom || '',
        shippingNotificationTemplate: '',
      },
      documentTemplates: {
        invoiceTemplate: undefined,
        receiptTemplate: undefined,
        estimateTemplate: undefined,
      },
      imageOptimization: {
        webpEnabled: settings.enableWebpConversion ?? true,
        compressionQuality: settings.imageQuality ?? 80,
        thumbnailSize: settings.thumbnailSize ?? 200,
      },
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.error || '会社情報の更新に失敗しました');
    }
    throw error;
  }
};

// ========================================
// 決済設定
// ========================================

/**
 * 決済設定更新（管理者）
 */
export const updatePaymentSettings = async (
  data: UpdatePaymentSettingsRequest
): Promise<SystemSettings> => {
  try {
    const requestData = {
      enableBankTransfer: data.bankTransferEnabled,
      bankTransferDiscount: data.bankTransferDiscountRate,
      enableCreditCard: data.creditCardEnabled,
    };

    const response = await axios.put(
      `${API_URL}/api/admin/settings/payment`,
      requestData,
      {
        withCredentials: true,
      }
    );

    const settings = response.data.settings;

    return {
      company: {
        companyName: settings.companyName || '',
        logoUrl: settings.companyLogoUrl || undefined,
        logoDisplayUrl: settings.logoDisplayUrl || undefined,
        showShopName: settings.showShopName !== false,
        postalCode: settings.companyPostalCode || '',
        address: settings.companyAddress || '',
        phone: settings.companyPhone || '',
        bankName: settings.bankName || '',
        branchName: settings.bankBranch || '',
        accountType: settings.bankAccountType || 'checking',
        accountNumber: settings.bankAccountNumber || '',
        accountHolder: settings.bankAccountHolder || '',
        primaryColor: '#1976d2',
        secondaryColor: '#dc004e',
        heroImageUrl: undefined,
      },
      payment: {
        bankTransferEnabled: settings.enableBankTransfer ?? true,
        bankTransferDiscountRate: settings.bankTransferDiscount ?? 0.036,
        creditCardEnabled: settings.enableCreditCard ?? true,
        stripePublicKey: '',
        stripeSecretKey: '',
      },
      email: {
        senderEmail: settings.emailFrom || '',
        shippingNotificationTemplate: '',
      },
      documentTemplates: {
        invoiceTemplate: undefined,
        receiptTemplate: undefined,
        estimateTemplate: undefined,
      },
      imageOptimization: {
        webpEnabled: settings.enableWebpConversion ?? true,
        compressionQuality: settings.imageQuality ?? 80,
        thumbnailSize: settings.thumbnailSize ?? 200,
      },
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.error || '決済設定の更新に失敗しました');
    }
    throw error;
  }
};

// ========================================
// メール設定
// ========================================

/**
 * メール設定更新（管理者）
 */
export const updateEmailSettings = async (
  data: UpdateEmailSettingsRequest
): Promise<SystemSettings> => {
  try {
    const requestData = {
      emailFrom: data.senderEmail,
    };

    const response = await axios.put(
      `${API_URL}/api/admin/settings/email`,
      requestData,
      {
        withCredentials: true,
      }
    );

    const settings = response.data.settings;

    return {
      company: {
        companyName: settings.companyName || '',
        logoUrl: settings.companyLogoUrl || undefined,
        logoDisplayUrl: settings.logoDisplayUrl || undefined,
        showShopName: settings.showShopName !== false,
        postalCode: settings.companyPostalCode || '',
        address: settings.companyAddress || '',
        phone: settings.companyPhone || '',
        bankName: settings.bankName || '',
        branchName: settings.bankBranch || '',
        accountType: settings.bankAccountType || 'checking',
        accountNumber: settings.bankAccountNumber || '',
        accountHolder: settings.bankAccountHolder || '',
        primaryColor: '#1976d2',
        secondaryColor: '#dc004e',
        heroImageUrl: undefined,
      },
      payment: {
        bankTransferEnabled: settings.enableBankTransfer ?? true,
        bankTransferDiscountRate: settings.bankTransferDiscount ?? 0.036,
        creditCardEnabled: settings.enableCreditCard ?? true,
        stripePublicKey: '',
        stripeSecretKey: '',
      },
      email: {
        senderEmail: settings.emailFrom || '',
        shippingNotificationTemplate: '',
      },
      documentTemplates: {
        invoiceTemplate: undefined,
        receiptTemplate: undefined,
        estimateTemplate: undefined,
      },
      imageOptimization: {
        webpEnabled: settings.enableWebpConversion ?? true,
        compressionQuality: settings.imageQuality ?? 80,
        thumbnailSize: settings.thumbnailSize ?? 200,
      },
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.error || 'メール設定の更新に失敗しました');
    }
    throw error;
  }
};

// ========================================
// 書類テンプレート設定
// ========================================

/**
 * 書類テンプレート更新（管理者）
 */
export const updateDocumentTemplates = async (
  _data: UpdateDocumentTemplatesRequest
): Promise<SystemSettings> => {
  try {
    await axios.put(
      `${API_URL}/api/admin/settings/document-templates`,
      {},
      {
        withCredentials: true,
      }
    );

    // バックエンドはsettingsを返さないため、現在の設定を再取得
    return await getAdminSettings();
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.error || '書類テンプレート設定の更新に失敗しました');
    }
    throw error;
  }
};

// ========================================
// 画像最適化設定
// ========================================

/**
 * 画像最適化設定更新（管理者）
 */
export const updateImageOptimization = async (
  data: UpdateImageOptimizationRequest
): Promise<SystemSettings> => {
  try {
    const requestData = {
      enableWebpConversion: data.webpEnabled,
      imageQuality: data.compressionQuality,
      thumbnailSize: data.thumbnailSize,
    };

    const response = await axios.put(
      `${API_URL}/api/admin/settings/image-optimization`,
      requestData,
      {
        withCredentials: true,
      }
    );

    const settings = response.data.settings;

    return {
      company: {
        companyName: settings.companyName || '',
        logoUrl: settings.companyLogoUrl || undefined,
        logoDisplayUrl: settings.logoDisplayUrl || undefined,
        showShopName: settings.showShopName !== false,
        postalCode: settings.companyPostalCode || '',
        address: settings.companyAddress || '',
        phone: settings.companyPhone || '',
        bankName: settings.bankName || '',
        branchName: settings.bankBranch || '',
        accountType: settings.bankAccountType || 'checking',
        accountNumber: settings.bankAccountNumber || '',
        accountHolder: settings.bankAccountHolder || '',
        primaryColor: '#1976d2',
        secondaryColor: '#dc004e',
        heroImageUrl: undefined,
      },
      payment: {
        bankTransferEnabled: settings.enableBankTransfer ?? true,
        bankTransferDiscountRate: settings.bankTransferDiscount ?? 0.036,
        creditCardEnabled: settings.enableCreditCard ?? true,
        stripePublicKey: '',
        stripeSecretKey: '',
      },
      email: {
        senderEmail: settings.emailFrom || '',
        shippingNotificationTemplate: '',
      },
      documentTemplates: {
        invoiceTemplate: undefined,
        receiptTemplate: undefined,
        estimateTemplate: undefined,
      },
      imageOptimization: {
        webpEnabled: settings.enableWebpConversion ?? true,
        compressionQuality: settings.imageQuality ?? 80,
        thumbnailSize: settings.thumbnailSize ?? 200,
      },
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.error || '画像最適化設定の更新に失敗しました');
    }
    throw error;
  }
};

/**
 * ロゴ画像アップロード（管理者）
 * @returns アップロード後のR2キー
 */
export const uploadLogo = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('logo', file);
  const response = await axios.post(`${API_URL}/api/admin/settings/logo`, formData, {
    withCredentials: true,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.logoKey;
};

/** ロゴ削除（管理者） */
export const deleteLogo = async (): Promise<void> => {
  await axios.delete(`${API_URL}/api/admin/settings/logo`, { withCredentials: true });
};

import { Router } from 'express';
import {
  getAdminSettings,
  updateCompanySettings,
  updatePaymentSettings,
  updateEmailSettings,
  updateDocumentTemplateSettings,
  updateImageOptimizationSettings,
} from '../controllers/adminSettingsController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// 管理者認証必須
router.use(requireAuth);
router.use(requireAdmin);

// ========================================
// スライス8-A: システム設定API
// ========================================

// GET /api/admin/settings - 全設定取得
router.get('/settings', getAdminSettings);

// PUT /api/admin/settings/company - 会社情報更新
router.put('/settings/company', updateCompanySettings);

// PUT /api/admin/settings/payment - 決済設定更新
router.put('/settings/payment', updatePaymentSettings);

// PUT /api/admin/settings/email - メール設定更新
router.put('/settings/email', updateEmailSettings);

// PUT /api/admin/settings/document-templates - 書類テンプレート設定更新
router.put('/settings/document-templates', updateDocumentTemplateSettings);

// PUT /api/admin/settings/image-optimization - 画像最適化設定更新
router.put('/settings/image-optimization', updateImageOptimizationSettings);

export default router;

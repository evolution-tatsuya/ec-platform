/**
 * サイト設定ルート
 */

import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  getPaymentProviders,
} from '../controllers/settingsController';

const router = Router();

// GET /api/settings - サイト設定取得（顧客向け）
router.get('/', getSettings);

// GET /api/settings/payment-providers - 決済プロバイダー設定取得（顧客向け）
router.get('/payment-providers', getPaymentProviders);

// PUT /api/admin/settings - サイト設定更新（管理者向け）
// 注意: このルートは /api/admin/settings として登録される
export const adminSettingsRouter = Router();
adminSettingsRouter.put('/', updateSettings);

export default router;

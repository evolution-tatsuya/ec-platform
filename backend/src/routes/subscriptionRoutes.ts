/**
 * サブスク契約ルーティング
 *
 * 顧客向け（/api/subscriptions）:
 * - GET  /api/subscriptions                  - 自分の契約一覧
 * - GET  /api/subscriptions/reactivation-info - 再購入時の引き継ぎ可否・推奨モード
 * - POST /api/subscriptions/:id/cancel        - 解約
 *
 * 管理者向け（/api/admin/subscriptions）:
 * - GET  /api/admin/subscriptions      - 全契約一覧
 * - PUT  /api/admin/subscriptions/:id  - 契約情報更新
 */

import { Router } from 'express';
import {
  getMySubscriptions,
  cancelMySubscription,
  getReactivationInfo,
  adminGetSubscriptions,
  adminUpdateSubscription,
} from '../controllers/subscriptionController';
import { requireAuth, requireAdmin } from '../middleware/auth';

// ===== 顧客向けルーター =====
const router = Router();

router.use(requireAuth);
router.get('/', getMySubscriptions);
// 静的パスは :id より前に登録（/:id/cancel と衝突させない）
router.get('/reactivation-info', getReactivationInfo);
router.post('/:id/cancel', cancelMySubscription);

// ===== 管理者向けルーター =====
export const adminSubscriptionRouter = Router();

adminSubscriptionRouter.use(requireAuth);
adminSubscriptionRouter.use(requireAdmin);
adminSubscriptionRouter.get('/', adminGetSubscriptions);
adminSubscriptionRouter.put('/:id', adminUpdateSubscription);

export default router;

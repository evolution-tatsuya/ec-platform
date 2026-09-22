/**
 * 注文ルーティング
 *
 * エンドポイント:
 * - POST /api/orders - 注文作成
 * - GET /api/orders - 注文一覧取得
 * - GET /api/orders/:orderNumber - 注文詳細取得
 * - POST /api/orders/:orderId/reorder - 再注文（過去の注文をカートに追加）
 * - GET /api/orders/:orderId/downloads - デジタルダウンロード取得
 * - POST /api/admin/orders/:orderNumber/checkin - 受付処理（管理者専用）
 */

import { Router } from 'express';
import {
  createOrder,
  getOrders,
  getOrderByOrderNumber,
  checkinOrder,
  reorder,
  adminGetOrders,
  adminGetOrderById,
  shipOrder,
  confirmPayment,
  cancelOrder,
  generateInvoice,
  generateReceipt,
  generateShippingLabel,
  generateQuote,
} from '../controllers/orderController';
import { getDigitalDownloads } from '../controllers/downloadController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// POST /api/orders - 注文作成
router.post('/', createOrder);

// GET /api/orders - 注文一覧取得
router.get('/', getOrders);

// GET /api/orders/:orderNumber - 注文詳細取得
router.get('/:orderNumber', getOrderByOrderNumber);

// POST /api/orders/:orderId/reorder - 再注文
router.post('/:orderId/reorder', requireAuth, reorder);

// GET /api/orders/:orderId/downloads - デジタルダウンロード取得
router.get('/:orderId/downloads', requireAuth, getDigitalDownloads);

// ===== 管理者用ルーター =====
export const adminOrderRouter = Router();

// 全ての管理者用ルートに認証ミドルウェアを適用
adminOrderRouter.use(requireAuth, requireAdmin);

// GET /api/admin/orders - 注文一覧取得
adminOrderRouter.get('/', adminGetOrders);

// GET /api/admin/orders/:id - 注文詳細取得
adminOrderRouter.get('/:id', adminGetOrderById);

// PUT /api/admin/orders/:id/ship - 発送処理
adminOrderRouter.put('/:id/confirm-payment', confirmPayment);
adminOrderRouter.put('/:id/ship', shipOrder);

// PUT /api/admin/orders/:id/cancel - キャンセル処理
adminOrderRouter.put('/:id/cancel', cancelOrder);

// GET /api/admin/orders/:id/documents/invoice - 納品書PDF生成
adminOrderRouter.get('/:id/documents/invoice', generateInvoice);

// GET /api/admin/orders/:id/documents/receipt - 領収書PDF生成
adminOrderRouter.get('/:id/documents/receipt', generateReceipt);

// GET /api/admin/orders/:id/documents/quote - 見積書PDF生成
adminOrderRouter.get('/:id/documents/quote', generateQuote);

// GET /api/admin/orders/:id/shipping-label - 送り状PDF生成（旧形式、後方互換性のため残す）
adminOrderRouter.get('/:id/shipping-label', generateShippingLabel);

// POST /api/admin/orders/:orderNumber/checkin - 受付処理
adminOrderRouter.post('/:orderNumber/checkin', checkinOrder);

export default router;

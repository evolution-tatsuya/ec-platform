// ===== 管理者用在庫管理ルーター =====
// 目的: 管理者向け在庫ログ管理エンドポイント

import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import {
  getInventoryLogs,
  createInventoryLog,
  getInventoryLogsByProduct,
} from '../controllers/adminInventoryController';

const router = Router();

// ===== 全エンドポイントに管理者認証を適用 =====
router.use(requireAdmin);

// ===== 在庫ログ一覧取得 =====
// GET /api/admin/inventory-logs
router.get('/', getInventoryLogs);

// ===== 在庫ログ追加 =====
// POST /api/admin/inventory-logs
router.post('/', createInventoryLog);

// ===== 商品別在庫ログ取得 =====
// GET /api/admin/inventory-logs/:productId
router.get('/:productId', getInventoryLogsByProduct);

export default router;

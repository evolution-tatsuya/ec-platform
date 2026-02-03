// ===== 管理者用商品ルーター =====
// 目的: 管理者向け商品管理エンドポイント

import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import {
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustInventory,
  getInventoryLogs,
} from '../controllers/adminProductController';

const router = Router();

// ===== 全エンドポイントに管理者認証を適用 =====
router.use(requireAdmin);

// ===== 商品一覧取得 =====
// GET /api/admin/products
router.get('/', getAdminProducts);

// ===== 商品登録 =====
// POST /api/admin/products
router.post('/', createProduct);

// ===== 商品更新 =====
// PUT /api/admin/products/:id
router.put('/:id', updateProduct);

// ===== 商品削除 =====
// DELETE /api/admin/products/:id
router.delete('/:id', deleteProduct);

// ===== 在庫調整 =====
// POST /api/admin/products/:id/inventory
router.post('/:id/inventory', adjustInventory);

// ===== 在庫ログ取得 =====
// GET /api/admin/products/:id/inventory-logs
router.get('/:id/inventory-logs', getInventoryLogs);

export default router;

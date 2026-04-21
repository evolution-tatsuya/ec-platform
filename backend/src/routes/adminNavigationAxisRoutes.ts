import { Router } from 'express';
import {
  getNavigationAxes,
  getNavigationAxesByCategory,
  createNavigationAxis,
  updateNavigationAxis,
  deleteNavigationAxis,
  updateNavigationAxisOrder,
} from '../controllers/adminSettingsController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// 管理者認証必須
router.use(requireAuth);
router.use(requireAdmin);

// ========================================
// スライス8-B: ナビゲーション軸API
// ========================================

// GET /api/admin/navigation-axes - ナビゲーション軸一覧
router.get('/navigation-axes', getNavigationAxes);

// GET /api/admin/navigation-axes/:category - カテゴリー別ナビゲーション軸取得
router.get('/navigation-axes/:category', getNavigationAxesByCategory);

// POST /api/admin/navigation-axes - ナビゲーション軸作成
router.post('/navigation-axes', createNavigationAxis);

// PUT /api/admin/navigation-axes/:id - ナビゲーション軸更新
router.put('/navigation-axes/:id', updateNavigationAxis);

// DELETE /api/admin/navigation-axes/:id - ナビゲーション軸削除
router.delete('/navigation-axes/:id', deleteNavigationAxis);

// PUT /api/admin/navigation-axes/:id/order - ナビゲーション軸並び替え
router.put('/navigation-axes/:id/order', updateNavigationAxisOrder);

export default router;

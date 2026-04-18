import { Router } from 'express';
import {
  getNavigationAxes,
  getNavigationAxisById,
  createNavigationAxis,
  updateNavigationAxis,
  deleteNavigationAxis,
  reorderNavigationAxes,
} from '../controllers/adminNavigationAxisController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// 管理者認証必須
router.use(requireAuth);
router.use(requireAdmin);

// GET /api/admin/navigation-axes - ナビゲーション軸一覧
router.get('/navigation-axes', getNavigationAxes);

// GET /api/admin/navigation-axes/:id - ナビゲーション軸詳細
router.get('/navigation-axes/:id', getNavigationAxisById);

// POST /api/admin/navigation-axes - ナビゲーション軸作成
router.post('/navigation-axes', createNavigationAxis);

// PUT /api/admin/navigation-axes/:id - ナビゲーション軸更新
router.put('/navigation-axes/:id', updateNavigationAxis);

// DELETE /api/admin/navigation-axes/:id - ナビゲーション軸削除
router.delete('/navigation-axes/:id', deleteNavigationAxis);

// PUT /api/admin/navigation-axes/reorder - ナビゲーション軸並び替え
router.put('/navigation-axes-reorder', reorderNavigationAxes);

export default router;

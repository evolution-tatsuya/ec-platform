import { Router } from 'express';
import {
  getFullSettings,
  updateFullSettings,
  getNavigationAxes,
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

// システム設定
router.get('/settings/full', getFullSettings);
router.put('/settings/full', updateFullSettings);

// ナビゲーション軸
router.get('/navigation-axes', getNavigationAxes);
router.post('/navigation-axes', createNavigationAxis);
router.put('/navigation-axes/:id', updateNavigationAxis);
router.delete('/navigation-axes/:id', deleteNavigationAxis);
router.put('/navigation-axes/:id/order', updateNavigationAxisOrder);

export default router;

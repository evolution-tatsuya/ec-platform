import { Router } from 'express';
import { getDashboardStats } from '../controllers/adminDashboardController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// 管理者認証必須
router.use(requireAuth);
router.use(requireAdmin);

// GET /api/admin/dashboard - ダッシュボード統計取得
router.get('/dashboard', getDashboardStats);

export default router;

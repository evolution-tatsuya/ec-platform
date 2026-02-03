import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  getCustomerStats,
  updateCustomer,
} from '../controllers/adminCustomerController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// 管理者認証必須
router.use(requireAuth);
router.use(requireAdmin);

// GET /api/admin/customers/stats - 顧客統計
router.get('/customers/stats', getCustomerStats);

// GET /api/admin/customers - 顧客一覧
router.get('/customers', getCustomers);

// GET /api/admin/customers/:id - 顧客詳細
router.get('/customers/:id', getCustomerById);

// PUT /api/admin/customers/:id - 顧客情報更新
router.put('/customers/:id', updateCustomer);

export default router;

import { Router } from 'express';
import {
  getTickets,
  getTicketById,
  useTicket,
  resetTicket,
  getTicketStats,
} from '../controllers/adminTicketController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// 管理者認証必須
router.use(requireAuth);
router.use(requireAdmin);

// GET /api/admin/tickets/stats - チケット統計
router.get('/tickets/stats', getTicketStats);

// GET /api/admin/tickets - チケット一覧
router.get('/tickets', getTickets);

// GET /api/admin/tickets/:id - チケット詳細
router.get('/tickets/:id', getTicketById);

// PUT /api/admin/tickets/:id/use - チケット使用
router.put('/tickets/:id/use', useTicket);

// PUT /api/admin/tickets/:id/reset - チケットリセット
router.put('/tickets/:id/reset', resetTicket);

export default router;

import { Router } from 'express';
import {
  getInquiries,
  getInquiryById,
  getInquiryStats,
  replyToInquiry,
  updateInquiryStatus,
  deleteInquiry,
} from '../controllers/adminInquiryController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// 管理者認証必須
router.use(requireAuth);
router.use(requireAdmin);

// GET /api/admin/inquiries/stats - 問い合わせ統計
router.get('/inquiries/stats', getInquiryStats);

// GET /api/admin/inquiries - 問い合わせ一覧
router.get('/inquiries', getInquiries);

// GET /api/admin/inquiries/:id - 問い合わせ詳細
router.get('/inquiries/:id', getInquiryById);

// PUT /api/admin/inquiries/:id/reply - 問い合わせ返信
router.put('/inquiries/:id/reply', replyToInquiry);

// PUT /api/admin/inquiries/:id/status - ステータス更新
router.put('/inquiries/:id/status', updateInquiryStatus);

// DELETE /api/admin/inquiries/:id - 問い合わせ削除
router.delete('/inquiries/:id', deleteInquiry);

export default router;

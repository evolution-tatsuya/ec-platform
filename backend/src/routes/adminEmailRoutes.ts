// ===== 管理者用メールテンプレート/送信ルーター =====

import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import {
  getEmailTemplates,
  updateEmailTemplate,
  sendOrderEmail,
} from '../controllers/emailTemplateController';

const router = Router();
router.use(requireAuth);
router.use(requireAdmin);

// メールテンプレート
router.get('/email-templates', getEmailTemplates);
router.put('/email-templates/:id', updateEmailTemplate);

// 注文に対してメール送信
router.post('/orders/:orderId/send-email', sendOrderEmail);

export default router;

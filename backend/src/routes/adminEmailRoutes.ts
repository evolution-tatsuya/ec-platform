// ===== 管理者用メール/書類テンプレートルーター =====

import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import {
  getEmailTemplates,
  updateEmailTemplate,
  sendOrderEmail,
} from '../controllers/emailTemplateController';
import {
  getDocumentTemplate,
  saveDocumentTemplate,
  resetDocumentTemplate,
} from '../controllers/documentTemplateController';

const router = Router();
router.use(requireAuth);
router.use(requireAdmin);

// メールテンプレート
router.get('/email-templates', getEmailTemplates);
router.put('/email-templates/:id', updateEmailTemplate);

// 注文に対してメール送信
router.post('/orders/:orderId/send-email', sendOrderEmail);

// 書類テンプレート（pdfme）
router.get('/document-templates/:type', getDocumentTemplate);
router.put('/document-templates/:type', saveDocumentTemplate);
router.delete('/document-templates/:type', resetDocumentTemplate);

export default router;

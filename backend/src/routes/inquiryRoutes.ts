/**
 * 顧客向け問い合わせルーター
 * P-012 お問い合わせページ（ContactPage.tsx）に対応
 */

import { Router } from 'express';
import {
  createInquiry,
  getInquiryHistory,
  submitFeedback,
  escalateInquiry,
} from '../controllers/inquiryController';

const router = Router();

// 問い合わせ送信（AI自動返答連携、ゲスト可）
router.post('/', createInquiry);

// 問い合わせ履歴取得（ログインユーザーのみ）
router.get('/history', getInquiryHistory);

// 満足度フィードバック
router.put('/:id/feedback', submitFeedback);

// オペレーターエスカレーション
router.put('/:id/escalate', escalateInquiry);

export default router;

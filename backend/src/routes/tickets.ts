/**
 * チケットルート
 *
 * エンドポイント:
 * - GET /api/tickets - デジタルチケット一覧取得
 * - GET /api/tickets/:ticketId/qr - QRコード生成
 */

import express from 'express';
import { getTickets, getTicketQR } from '../controllers/ticketController';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// GET /api/tickets - デジタルチケット一覧取得（要認証）
router.get('/', requireAuth, getTickets);

// GET /api/tickets/:ticketId/qr - QRコード生成（要認証）
router.get('/:ticketId/qr', requireAuth, getTicketQR);

export default router;

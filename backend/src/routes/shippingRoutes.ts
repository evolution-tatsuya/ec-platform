/**
 * 配送管理ルーティング
 *
 * エンドポイント:
 * - GET /api/shipping/available-dates - 配送可能日取得
 * - GET /api/shipping/time-slots - 配送時間帯取得
 */

import { Router } from 'express';
import { getAvailableDates, getTimeSlots } from '../controllers/shippingController';

const router = Router();

// GET /api/shipping/available-dates - 配送可能日取得
router.get('/available-dates', getAvailableDates);

// GET /api/shipping/time-slots - 配送時間帯取得
router.get('/time-slots', getTimeSlots);

export default router;

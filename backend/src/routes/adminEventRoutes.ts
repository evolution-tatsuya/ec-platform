/**
 * 管理者用イベント管理ルーティング
 *
 * エンドポイント:
 * - GET /api/admin/events - イベント一覧取得
 * - POST /api/admin/events - イベント作成
 * - GET /api/admin/events/:id - イベント詳細取得
 * - GET /api/admin/events/:id/form - カスタムフォーム取得
 * - POST /api/admin/events/:id/form - カスタムフォーム設定
 * - GET /api/admin/events/:id/participants - 参加者リスト取得
 * - GET /api/admin/events/:id/participants/export/csv - CSV出力
 * - GET /api/admin/events/:id/participants/export/excel - Excel出力
 */

import { Router } from 'express';
import {
  getEvents,
  createEvent,
  getEventById,
  setEventForm,
  getEventForm,
  getEventParticipants,
  exportParticipantsCSV,
  exportParticipantsExcel,
} from '../controllers/adminEventController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// 全ての管理者用ルートに認証ミドルウェアを適用
router.use(requireAuth, requireAdmin);

// GET /api/admin/events - イベント一覧取得
router.get('/', getEvents);

// POST /api/admin/events - イベント作成
router.post('/', createEvent);

// GET /api/admin/events/:id - イベント詳細取得
router.get('/:id', getEventById);

// GET /api/admin/events/:id/form - カスタムフォーム取得
router.get('/:id/form', getEventForm);

// POST /api/admin/events/:id/form - カスタムフォーム設定
router.post('/:id/form', setEventForm);

// GET /api/admin/events/:id/participants - 参加者リスト取得
router.get('/:id/participants', getEventParticipants);

// GET /api/admin/events/:id/participants/export/csv - CSV出力
router.get('/:id/participants/export/csv', exportParticipantsCSV);

// GET /api/admin/events/:id/participants/export/excel - Excel出力
router.get('/:id/participants/export/excel', exportParticipantsExcel);

export default router;

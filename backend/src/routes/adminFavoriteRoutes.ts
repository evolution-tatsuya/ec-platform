/**
 * 管理者向けお気に入りルーター
 */

import { Router } from 'express';
import {
  getAllFavorites,
  getUserFavorites,
  getFavoriteStats,
} from '../controllers/adminFavoriteController';

const router = Router();

// お気に入り統計情報取得
router.get('/favorites/stats', getFavoriteStats);

// 全ユーザーのお気に入り一覧取得
router.get('/favorites', getAllFavorites);

// 特定ユーザーのお気に入り一覧取得
router.get('/favorites/user/:userId', getUserFavorites);

export default router;

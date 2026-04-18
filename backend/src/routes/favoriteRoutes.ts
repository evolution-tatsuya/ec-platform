/**
 * お気に入りルーター
 * 顧客向けのお気に入り機能ルート
 */

import { Router } from 'express';
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  checkFavorite,
} from '../controllers/favoriteController';

const router = Router();

// お気に入り一覧取得
router.get('/', getFavorites);

// お気に入り追加
router.post('/', addFavorite);

// 特定商品がお気に入りに入っているかチェック
router.get('/check/:productId', checkFavorite);

// お気に入り削除
router.delete('/:productId', removeFavorite);

export default router;

// ===== ユーザールーター =====
// 目的: ユーザー管理関連のエンドポイント定義

import { Router } from 'express';
import * as userController from '../controllers/userController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/users/me - ログイン中のユーザー情報取得
router.get('/me', requireAuth, userController.getMe);

// PUT /api/users/me - ログイン中のユーザー情報更新
router.put('/me', requireAuth, userController.updateMe);

// PUT /api/users/me/password - パスワード変更
router.put('/me/password', requireAuth, userController.updatePassword);

// GET /api/users/default-address - デフォルト配送先住所取得
router.get('/default-address', requireAuth, userController.getDefaultAddress);

export default router;

// ===== 認証ルーター =====
// 目的: 認証関連のエンドポイント定義

import { Router } from 'express';
import * as authController from '../controllers/authController';

const router = Router();

// POST /api/auth/register - 会員登録
router.post('/register', authController.register);

// POST /api/auth/login - ログイン
router.post('/login', authController.login);

// POST /api/auth/logout - ログアウト
router.post('/logout', authController.logout);

// GET /api/auth/session - セッション確認
router.get('/session', authController.getSession);

// POST /api/auth/password-reset/request - パスワードリセット申請
router.post('/password-reset/request', authController.requestPasswordReset);

// POST /api/auth/password-reset/confirm - パスワードリセット確認
router.post('/password-reset/confirm', authController.confirmPasswordReset);

export default router;

// ===== 認証ルーター =====
// 目的: 認証関連のエンドポイント定義

import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// POST /api/auth/register - 会員登録
router.post('/register', authController.register);

// POST /api/auth/login - ログイン（IPレート制限 + アカウントロック）
router.post('/login', authRateLimiter, authController.login);

// POST /api/auth/logout - ログアウト
router.post('/logout', authController.logout);

// GET /api/auth/session - セッション確認
router.get('/session', authController.getSession);

// POST /api/auth/password-reset/request - パスワードリセット申請（IPレート制限）
router.post('/password-reset/request', authRateLimiter, authController.requestPasswordReset);

// POST /api/auth/password-reset/confirm - パスワードリセット確認
router.post('/password-reset/confirm', authController.confirmPasswordReset);

export default router;

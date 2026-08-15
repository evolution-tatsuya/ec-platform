// ===== レート制限ミドルウェア =====
// 目的: ブルートフォース攻撃対策の第2の防御層（IPベース）。
// アカウント単位のロック（authController）が「既知のアカウント」を守るのに対し、
// こちらは1つのIPが多数のメールアドレスを総当たりする攻撃を抑止する。

import rateLimit from 'express-rate-limit';

/**
 * 認証系エンドポイント（ログイン・パスワードリセット）向けのレート制限。
 * 15分間に同一IPから20リクエストまで許可。
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 20, // 同一IPあたり最大20リクエスト
  standardHeaders: true, // RateLimit-* ヘッダーを返す
  legacyHeaders: false,
  message: {
    success: false,
    message: 'リクエストが多すぎます。しばらく待ってから再度お試しください',
  },
});

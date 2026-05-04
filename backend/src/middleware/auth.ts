// ===== 認証ミドルウェア =====
// 目的: セッション検証、管理者権限チェック

import { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler';

// セッション型定義の拡張
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    isAdmin?: boolean;
  }
}

// ログイン必須
export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return next(createError('認証が必要です', 401));
  }
  next();
};

// 管理者権限必須
export const requireAdmin = (req: Request, _res: Response, next: NextFunction) => {
  console.log('[requireAdmin] セッション情報:', {
    sessionID: req.sessionID,
    userId: req.session.userId,
    isAdmin: req.session.isAdmin,
    cookie: req.session.cookie,
  });

  if (!req.session.userId) {
    console.log('[requireAdmin] エラー: userId not found in session');
    return next(createError('認証が必要です', 401));
  }
  if (!req.session.isAdmin) {
    console.log('[requireAdmin] エラー: isAdmin=false');
    return next(createError('管理者権限が必要です', 403));
  }
  console.log('[requireAdmin] 認証成功');
  next();
};

// オプショナル認証（ログインしていればユーザー情報を取得、していなくてもOK）
export const optionalAuth = (_req: Request, _res: Response, next: NextFunction) => {
  // セッション情報があればそのまま、なくてもnextを呼ぶ
  next();
};

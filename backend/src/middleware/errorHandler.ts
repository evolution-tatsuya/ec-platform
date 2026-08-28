// ===== エラーハンドリングミドルウェア =====
// 目的: 統一されたエラーレスポンスとログ出力

import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // 開発環境ではスタックトレースをログ出力
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  // 本番の500エラーは原因調査のためスタックをログ出力（詳細はレスポンスには含めない）
  // TODO: 画像アップロード500の原因特定後に削除する一時ログ
  if (statusCode === 500) {
    console.error('[500 Error]', err?.message, '\n', err?.stack);
  }

  // 本番環境では詳細なエラー情報を隠す
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal Server Error'
      : message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export const createError = (message: string, statusCode: number = 500): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

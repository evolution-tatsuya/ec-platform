// ===== エラーハンドリングミドルウェア =====
// 目的: 統一されたエラーレスポンスとログ出力

import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // 開発環境では全エラーをスタックトレース付きで出力
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  } else if (statusCode >= 500) {
    // 本番環境ではサーバー側の想定外エラー(5xx)のみログ出力。
    // 400/404などの想定内エラーはノイズになるため出さない。
    // レスポンスに詳細は含めない（下記参照）が、Cloud Runログで原因を追えるようにする。
    console.error(
      `[${statusCode}] ${req.method} ${req.originalUrl} - ${err.message}\n${err.stack}`
    );
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

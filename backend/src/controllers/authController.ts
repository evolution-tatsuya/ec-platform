// ===== 認証コントローラー =====
// 目的: 会員登録、ログイン、ログアウト、セッション確認

import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma';
import { createError } from '../middleware/errorHandler';
import { sendPasswordResetEmail } from '../utils/emailService';

const SALT_ROUNDS = 10;

// ブルートフォース対策: 5回連続失敗で15分間ロック
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15分

/**
 * 会員登録
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;

    // バリデーション
    if (!email || !password || !name) {
      return next(createError('メールアドレス、パスワード、名前は必須です', 400));
    }

    // メールアドレスの重複チェック
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return next(createError('このメールアドレスは既に登録されています', 409));
    }

    // パスワードのハッシュ化
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // ユーザー作成
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        isAdmin: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // セッションに保存
    req.session.userId = user.id;
    req.session.isAdmin = user.isAdmin;

    return res.status(201).json({
      success: true,
      message: '会員登録が完了しました',
      user,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * ログイン
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // バリデーション
    if (!email || !password) {
      return next(createError('メールアドレスとパスワードは必須です', 400));
    }

    // ユーザー取得
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return next(createError('メールアドレスまたはパスワードが正しくありません', 401));
    }

    // アカウントロック中かチェック（ブルートフォース対策）
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMs = user.lockedUntil.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      return next(
        createError(
          `ログイン試行回数が上限に達しました。約${remainingMin}分後に再度お試しください`,
          429
        )
      );
    }

    // パスワード検証
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // 失敗回数をインクリメントし、上限到達でロック
      const attempts = user.failedLoginAttempts + 1;
      const shouldLock = attempts >= MAX_LOGIN_ATTEMPTS;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil: shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : null,
        },
      });

      if (shouldLock) {
        return next(
          createError(
            'ログイン試行回数が上限に達しました。15分後に再度お試しください',
            429
          )
        );
      }

      const remaining = MAX_LOGIN_ATTEMPTS - attempts;
      return next(
        createError(
          `メールアドレスまたはパスワードが正しくありません（あと${remaining}回でロックされます）`,
          401
        )
      );
    }

    // ログイン成功: 失敗カウントとロックをリセット
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    // セッションに保存
    req.session.userId = user.id;
    req.session.isAdmin = user.isAdmin;

    return res.json({
      success: true,
      message: 'ログインしました',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * ログアウト
 * POST /api/auth/logout
 */
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        return next(createError('ログアウトに失敗しました', 500));
      }

      res.clearCookie('connect.sid');
      return res.json({
        success: true,
        message: 'ログアウトしました',
      });
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * セッション確認
 * GET /api/auth/session
 */
export const getSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.session.userId) {
      return res.json({
        success: true,
        isAuthenticated: false,
        user: null,
      });
    }

    // ユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      // セッションは残っているがユーザーが削除されている場合
      req.session.destroy(() => {});
      return res.json({
        success: true,
        isAuthenticated: false,
        user: null,
      });
    }

    return res.json({
      success: true,
      isAuthenticated: true,
      user,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * パスワードリセット申請
 * POST /api/auth/password-reset/request
 */
export const requestPasswordReset = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    // バリデーション
    if (!email) {
      return next(createError('メールアドレスは必須です', 400));
    }

    // ユーザーを取得
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // セキュリティのため、ユーザーが存在しなくても同じレスポンスを返す
    if (!user) {
      return res.json({
        success: true,
        message:
          'パスワードリセットメールを送信しました。メールをご確認ください。',
      });
    }

    // ランダムトークンを生成（32文字）
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');

    // 有効期限を1時間後に設定
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // トークンを保存
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // パスワードリセットメール送信（共通の emailService 経由）
    // メール送信に失敗してもトークンは保存済みなので、エラーにはしない
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;
      await sendPasswordResetEmail({
        to: email,
        name: user.name || 'お客様',
        resetUrl,
      });
    } catch (emailError) {
      console.error('パスワードリセットメール送信エラー:', emailError);
    }

    return res.json({
      success: true,
      message:
        'パスワードリセットメールを送信しました。メールをご確認ください。',
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * パスワードリセット確認
 * POST /api/auth/password-reset/confirm
 */
export const confirmPasswordReset = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, newPassword } = req.body;

    // バリデーション
    if (!token || !newPassword) {
      return next(createError('トークンと新しいパスワードは必須です', 400));
    }

    if (newPassword.length < 8) {
      return next(
        createError('パスワードは8文字以上である必要があります', 400)
      );
    }

    // トークンを取得
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      return next(createError('無効なトークンです', 400));
    }

    // 使用済みチェック
    if (resetToken.isUsed) {
      return next(createError('このトークンは既に使用されています', 400));
    }

    // 有効期限チェック
    if (new Date() > resetToken.expiresAt) {
      return next(createError('トークンの有効期限が切れています', 400));
    }

    // パスワードのハッシュ化
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // トランザクションでパスワード更新とトークン使用済み化
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { isUsed: true },
      }),
    ]);

    return res.json({
      success: true,
      message: 'パスワードをリセットしました。新しいパスワードでログインしてください。',
    });
  } catch (error) {
    return next(error);
  }
};

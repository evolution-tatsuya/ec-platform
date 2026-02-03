// ===== ユーザー管理コントローラー =====
// 目的: ユーザー情報の取得・更新、パスワード変更

import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma';
import { createError } from '../middleware/errorHandler';

const SALT_ROUNDS = 10;

/**
 * ログイン中のユーザー情報取得
 * GET /api/users/me
 */
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return next(createError('認証が必要です', 401));
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        defaultAddress: true,
        defaultPostalCode: true,
        defaultPhone: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return next(createError('ユーザーが見つかりません', 404));
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ログイン中のユーザー情報更新
 * PUT /api/users/me
 */
export const updateMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return next(createError('認証が必要です', 401));
    }

    const { name, email, defaultAddress, defaultPostalCode, defaultPhone } = req.body;

    // バリデーション
    if (email) {
      // メール形式チェック
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return next(createError('有効なメールアドレスを入力してください', 400));
      }

      // メールアドレスの重複チェック（自分以外）
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.id !== userId) {
        return next(createError('このメールアドレスは既に使用されています', 409));
      }
    }

    // 郵便番号の形式チェック（省略可能）
    if (defaultPostalCode && !/^\d{7}$/.test(defaultPostalCode.replace(/-/g, ''))) {
      return next(createError('郵便番号は7桁の数字で入力してください', 400));
    }

    // 電話番号の形式チェック（省略可能）
    if (defaultPhone && !/^[\d-]+$/.test(defaultPhone)) {
      return next(createError('電話番号は数字とハイフンのみで入力してください', 400));
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(defaultAddress !== undefined && { defaultAddress }),
        ...(defaultPostalCode !== undefined && { defaultPostalCode }),
        ...(defaultPhone !== undefined && { defaultPhone }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        defaultAddress: true,
        defaultPostalCode: true,
        defaultPhone: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      message: 'ユーザー情報を更新しました',
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * パスワード変更
 * PUT /api/users/me/password
 */
export const updatePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return next(createError('認証が必要です', 401));
    }

    const { currentPassword, newPassword } = req.body;

    // バリデーション
    if (!currentPassword || !newPassword) {
      return next(createError('現在のパスワードと新しいパスワードは必須です', 400));
    }

    // パスワードポリシーチェック（8文字以上、英数字混在）
    if (newPassword.length < 8) {
      return next(createError('新しいパスワードは8文字以上で設定してください', 400));
    }

    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);

    if (!hasLetter || !hasNumber) {
      return next(createError('新しいパスワードは英字と数字を含めてください', 400));
    }

    // 現在のパスワード確認
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return next(createError('ユーザーが見つかりません', 404));
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      return next(createError('現在のパスワードが正しくありません', 401));
    }

    // 新しいパスワードのハッシュ化
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // パスワード更新
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    res.json({
      success: true,
      message: 'パスワードを変更しました',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * デフォルト配送先住所取得
 * GET /api/users/default-address
 */
export const getDefaultAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return next(createError('認証が必要です', 401));
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        defaultAddress: true,
        defaultPostalCode: true,
        defaultPhone: true,
      },
    });

    if (!user) {
      return next(createError('ユーザーが見つかりません', 404));
    }

    res.json({
      success: true,
      defaultAddress: {
        address: user.defaultAddress || '',
        postalCode: user.defaultPostalCode || '',
        phone: user.defaultPhone || '',
      },
    });
  } catch (error) {
    next(error);
  }
};

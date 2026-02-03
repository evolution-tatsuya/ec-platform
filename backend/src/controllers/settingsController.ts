/**
 * サイト設定コントローラー
 *
 * 機能:
 * - サイト設定取得（顧客向け）
 * - サイト設定更新（管理者向け）
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/settings
 * サイト設定取得（誰でもアクセス可能）
 */
export async function getSettings(req: Request, res: Response) {
  try {
    // 最初の設定レコードを取得（通常1件のみ）
    let settings = await prisma.siteSettings.findFirst();

    // 設定が存在しない場合はデフォルト設定を作成
    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: {
          enableDeliveryDateTime: true,
          bankTransferDiscount: 0.036,
        },
      });
    }

    return res.json({
      success: true,
      settings: {
        enableDeliveryDateTime: settings.enableDeliveryDateTime,
        bankTransferDiscount: settings.bankTransferDiscount,
      },
    });
  } catch (error: any) {
    console.error('設定取得エラー:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '設定の取得に失敗しました',
    });
  }
}

/**
 * GET /api/settings/payment-providers
 * 決済プロバイダー設定取得（誰でもアクセス可能）
 */
export async function getPaymentProviders(req: Request, res: Response) {
  try {
    // 環境変数から決済プロバイダーの有効/無効を判定
    const stripeEnabled = !!(
      process.env.STRIPE_PUBLIC_KEY && process.env.STRIPE_SECRET_KEY
    );
    const paypayEnabled = false; // PayPayは今回未実装

    // サイト設定から銀行振込割引率を取得
    let settings = await prisma.siteSettings.findFirst();

    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: {
          enableDeliveryDateTime: true,
          bankTransferDiscount: 0.036,
        },
      });
    }

    return res.json({
      success: true,
      paymentProviders: {
        bankTransfer: {
          enabled: true, // 銀行振込は常に有効
          displayName: '銀行振込',
          discount: settings.bankTransferDiscount,
          discountPercentage: settings.bankTransferDiscount * 100,
        },
        creditCard: {
          enabled: stripeEnabled,
          displayName: 'クレジットカード（Stripe）',
          provider: 'stripe',
          publicKey: stripeEnabled ? process.env.STRIPE_PUBLIC_KEY : null,
        },
        paypay: {
          enabled: paypayEnabled,
          displayName: 'PayPay',
          provider: 'paypay',
        },
      },
    });
  } catch (error: any) {
    console.error('決済プロバイダー設定取得エラー:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '決済プロバイダー設定の取得に失敗しました',
    });
  }
}

/**
 * PUT /api/admin/settings
 * サイト設定更新（管理者のみ）
 */
export async function updateSettings(req: Request, res: Response) {
  try {
    // 認証チェック（管理者のみ）
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'ログインが必要です',
      });
    }

    // 管理者チェック
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
    });

    if (!user || !user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: '管理者権限が必要です',
      });
    }

    const {
      enableDeliveryDateTime,
      bankTransferDiscount,
    }: {
      enableDeliveryDateTime?: boolean;
      bankTransferDiscount?: number;
    } = req.body;

    // バリデーション
    if (
      enableDeliveryDateTime !== undefined &&
      typeof enableDeliveryDateTime !== 'boolean'
    ) {
      return res.status(400).json({
        success: false,
        message: 'enableDeliveryDateTimeはboolean型である必要があります',
      });
    }

    if (bankTransferDiscount !== undefined) {
      if (
        typeof bankTransferDiscount !== 'number' ||
        bankTransferDiscount < 0 ||
        bankTransferDiscount > 1
      ) {
        return res.status(400).json({
          success: false,
          message: 'bankTransferDiscountは0〜1の数値である必要があります',
        });
      }
    }

    // 最初の設定レコードを取得
    let settings = await prisma.siteSettings.findFirst();

    if (!settings) {
      // 設定が存在しない場合は新規作成
      settings = await prisma.siteSettings.create({
        data: {
          enableDeliveryDateTime:
            enableDeliveryDateTime !== undefined
              ? enableDeliveryDateTime
              : true,
          bankTransferDiscount:
            bankTransferDiscount !== undefined ? bankTransferDiscount : 0.036,
        },
      });
    } else {
      // 既存設定を更新
      const updateData: any = { updatedAt: new Date() };

      if (enableDeliveryDateTime !== undefined) {
        updateData.enableDeliveryDateTime = enableDeliveryDateTime;
      }

      if (bankTransferDiscount !== undefined) {
        updateData.bankTransferDiscount = bankTransferDiscount;
      }

      settings = await prisma.siteSettings.update({
        where: { id: settings.id },
        data: updateData,
      });
    }

    return res.json({
      success: true,
      message: '設定を更新しました',
      settings: {
        enableDeliveryDateTime: settings.enableDeliveryDateTime,
        bankTransferDiscount: settings.bankTransferDiscount,
      },
    });
  } catch (error: any) {
    console.error('設定更新エラー:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '設定の更新に失敗しました',
    });
  }
}

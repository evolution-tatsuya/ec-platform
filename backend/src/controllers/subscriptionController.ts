/**
 * サブスク契約コントローラー
 *
 * 機能:
 * - 顧客: 自分のサブスク契約一覧取得・解約
 * - 管理者: 全契約一覧取得・契約情報更新（状態/キー受け渡し/メモ）
 *
 * 【案A: 手動運用】決済は銀行振込。ライセンスキーの生成・検証は在庫アプリ側が担当。
 * 解約されても在庫アプリ側はデータを消さず、運営者が目視で手動suspendする運用（要件a）。
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const getStringParam = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) return value[0];
  return value;
};

/**
 * GET /api/subscriptions
 * 自分のサブスク契約一覧取得（ログインユーザーのみ）
 */
export async function getMySubscriptions(req: Request, res: Response) {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'ログインが必要です',
      });
    }

    const subscriptions = await prisma.subscription.findMany({
      where: { userId: req.session.userId },
      include: {
        product: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      subscriptions,
    });
  } catch (error: any) {
    console.error('サブスク契約一覧取得エラー:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'サブスク契約一覧の取得に失敗しました',
    });
  }
}

/**
 * POST /api/subscriptions/:id/cancel
 * サブスク契約を解約（ログインユーザーが自分の契約のみ）
 * statusをcancelledに更新しcancelledAtを記録。データは残す（要件a）。
 */
export async function cancelMySubscription(req: Request, res: Response) {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'ログインが必要です',
      });
    }

    const id = getStringParam(req.params.id);

    // 自分の契約か確認
    const subscription = await prisma.subscription.findFirst({
      where: { id, userId: req.session.userId },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: '契約が見つかりません',
      });
    }

    if (subscription.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'この契約は既に解約済みです',
      });
    }

    if (subscription.billingType === 'onetime') {
      return res.status(400).json({
        success: false,
        message: '買い切りプランは解約できません',
      });
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        nextBillingDate: null, // 解約後は請求予定なし
      },
      include: {
        product: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return res.json({
      success: true,
      message: '解約しました。再契約すればまたご利用いただけます。',
      subscription: updated,
    });
  } catch (error: any) {
    console.error('サブスク解約エラー:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'サブスク契約の解約に失敗しました',
    });
  }
}

// ===== 管理者用エンドポイント =====

/**
 * GET /api/admin/subscriptions
 * 全サブスク契約一覧取得（管理者専用）
 * クエリ: status（active/suspended/cancelled）でフィルタ可能
 */
export async function adminGetSubscriptions(req: Request, res: Response) {
  try {
    const { status, search } = req.query as { status?: string; search?: string };

    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { product: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const subscriptions = await prisma.subscription.findMany({
      where,
      include: {
        product: {
          select: { id: true, name: true, slug: true },
        },
        user: {
          select: { id: true, email: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      subscriptions,
    });
  } catch (error: any) {
    console.error('サブスク契約一覧取得エラー（管理者）:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'サブスク契約一覧の取得に失敗しました',
    });
  }
}

/**
 * PUT /api/admin/subscriptions/:id
 * サブスク契約情報の更新（管理者専用）
 * 更新可能: status, licenseKeyDelivered, note, nextBillingDate
 */
export async function adminUpdateSubscription(req: Request, res: Response) {
  try {
    const id = getStringParam(req.params.id);
    const {
      status,
      licenseKeyDelivered,
      note,
      nextBillingDate,
    }: {
      status?: string;
      licenseKeyDelivered?: boolean;
      note?: string;
      nextBillingDate?: string | null;
    } = req.body;

    const existing = await prisma.subscription.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: '契約が見つかりません',
      });
    }

    const validStatuses = ['active', 'suspended', 'cancelled'];
    if (status !== undefined && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'statusは active / suspended / cancelled のいずれかである必要があります',
      });
    }

    const data: any = {};
    if (status !== undefined) {
      data.status = status;
      if (status === 'cancelled') {
        data.cancelledAt = new Date();
        data.nextBillingDate = null;
      }
    }
    if (licenseKeyDelivered !== undefined) data.licenseKeyDelivered = licenseKeyDelivered;
    if (note !== undefined) data.note = note;
    if (nextBillingDate !== undefined) {
      data.nextBillingDate = nextBillingDate ? new Date(nextBillingDate) : null;
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data,
      include: {
        product: { select: { id: true, name: true, slug: true } },
        user: { select: { id: true, email: true, name: true } },
      },
    });

    return res.json({
      success: true,
      message: '契約情報を更新しました',
      subscription: updated,
    });
  } catch (error: any) {
    console.error('サブスク契約更新エラー（管理者）:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'サブスク契約の更新に失敗しました',
    });
  }
}

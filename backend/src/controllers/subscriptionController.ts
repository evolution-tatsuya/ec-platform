/**
 * サブスク契約コントローラー
 *
 * 機能:
 * - 顧客: 自分のサブスク契約一覧取得・解約
 * - 管理者: 全契約一覧取得・契約情報更新（状態/キー受け渡し/メモ）
 *
 * 【案A: 手動運用】決済は銀行振込。ライセンスキーの生成・検証は在庫アプリ側が担当。
 * 解約/一時停止されると、在庫アプリ側のアカウントを自動でsuspend（ログイン停止・データ保持）する（要件b）。
 * 再開はunsuspend。冪等・失敗時は安全にスキップしてnoteに記録（provision/plan-changeと同じ防御）。
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  suspendTenant,
  unsuspendTenant,
} from '../services/inventoryProvisionService';
import {
  createSubscriptionCheckoutSession,
  syncStripeProductPrice,
} from '../services/stripeService';

const prisma = new PrismaClient();

/**
 * 契約から在庫アプリのアカウントをsuspendする（解約・一時停止時）。
 * 在庫側は provision時と同じ orderNumber でテナントを特定するため、
 * Subscription.orderId(=Order.id) ではなく Order.orderNumber を送る必要がある。
 * 失敗しても契約更新は止めず、noteに理由を追記して運営者が手動対応できるようにする。
 */
async function suspendInventoryForSubscription(
  subscriptionId: string,
  reason: 'cancelled' | 'suspended'
): Promise<void> {
  try {
    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { order: { select: { orderNumber: true } } },
    });
    // 買い切りは対象外。注文番号が無い契約もスキップ（在庫テナント無し）。
    if (!sub || sub.billingType === 'onetime') return;
    const orderNumber = sub.order?.orderNumber;
    if (!orderNumber) {
      console.error(
        `[suspend] 契約 ${subscriptionId} に注文番号が無いためスキップ`
      );
      return;
    }

    const result = await suspendTenant({ orderId: orderNumber, reason });
    if (!result.success) {
      await appendSubscriptionNote(
        subscriptionId,
        `⚠️在庫suspend失敗(${reason}): ${result.error} — 手動でsuspendしてください`
      );
    }
  } catch (error: any) {
    console.error('[suspend] 在庫suspend連携で例外:', error?.message || error);
  }
}

/**
 * 契約の在庫アプリのアカウントをunsuspend（再開）する。
 * 停止中の「同じ契約」をactiveに戻したとき（同一orderId）に呼ぶ。
 */
async function unsuspendInventoryForSubscription(
  subscriptionId: string
): Promise<void> {
  try {
    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { order: { select: { orderNumber: true } } },
    });
    if (!sub || sub.billingType === 'onetime') return;
    const orderNumber = sub.order?.orderNumber;
    if (!orderNumber) {
      console.error(
        `[unsuspend] 契約 ${subscriptionId} に注文番号が無いためスキップ`
      );
      return;
    }

    const result = await unsuspendTenant(orderNumber);
    if (!result.success) {
      await appendSubscriptionNote(
        subscriptionId,
        `⚠️在庫unsuspend失敗: ${result.error} — 手動で再開してください`
      );
    }
  } catch (error: any) {
    console.error('[unsuspend] 在庫unsuspend連携で例外:', error?.message || error);
  }
}

/** 契約のnoteに1行追記する（既存noteは保持）。 */
async function appendSubscriptionNote(
  subscriptionId: string,
  line: string
): Promise<void> {
  try {
    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: { note: true },
    });
    const prev = sub?.note ? `${sub.note}\n` : '';
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { note: `${prev}${line}` },
    });
  } catch (error: any) {
    console.error('[note] 契約noteの追記に失敗:', error?.message || error);
  }
}

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

    // 在庫アプリのアカウントを自動suspend（要件b）。失敗しても解約は成立させる。
    await suspendInventoryForSubscription(id, 'cancelled');

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

    const validStatuses = ['pending_payment', 'active', 'suspended', 'cancelled'];
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
      } else if (['active', 'pending_payment'].includes(status)) {
        // 有効状態に戻すときは解約日をクリア（解約が取り消された扱い）
        data.cancelledAt = null;
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

    // status遷移に応じて在庫アプリを自動suspend/unsuspend（要件b）。
    // 有効状態(active/pending_payment) ⇄ 停止状態(suspended/cancelled) が変わった時だけ連携。
    if (status !== undefined && status !== existing.status) {
      const wasActive = ['active', 'pending_payment'].includes(existing.status);
      const isActive = ['active', 'pending_payment'].includes(status);
      if (wasActive && !isActive) {
        // active → suspended/cancelled: 停止
        await suspendInventoryForSubscription(
          id,
          status === 'cancelled' ? 'cancelled' : 'suspended'
        );
      } else if (!wasActive && isActive) {
        // suspended/cancelled → active: 再開（同一契約なのでunsuspend）
        await unsuspendInventoryForSubscription(id);
      }
    }

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

// 引き継ぎ推奨のしきい値: 解約から180日以内なら旧データ引き継ぎを推奨。
const REACTIVATION_INHERIT_DAYS = 180;

/**
 * GET /api/subscriptions/reactivation-info?productId=xxx
 * 同一ユーザー×同一商品に「解約済み契約」があるか、あれば解約からの経過日数と
 * 推奨モード（inherit/new）を返す。再購入時のチェックアウトで選択UIの初期値に使う。
 */
export async function getReactivationInfo(req: Request, res: Response) {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'ログインが必要です' });
    }
    const productId = getStringParam(req.query.productId as string | undefined);
    if (!productId) {
      return res
        .status(400)
        .json({ success: false, message: 'productId は必須です' });
    }

    // 最新の解約済み契約を1件（買い切りは対象外＝在庫テナントに引き継ぐデータが無い）
    const prev = await prisma.subscription.findFirst({
      where: {
        userId: req.session.userId,
        productId,
        status: 'cancelled',
        billingType: { not: 'onetime' },
      },
      orderBy: { cancelledAt: 'desc' },
      include: { order: { select: { orderNumber: true } } },
    });

    // 引き継ぎ元テナントが無い（注文番号なし）なら引き継ぎ不可
    if (!prev || !prev.order?.orderNumber || !prev.cancelledAt) {
      return res.json({ success: true, canInherit: false });
    }

    const elapsedMs = Date.now() - new Date(prev.cancelledAt).getTime();
    const daysSinceCancel = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
    const recommendedMode: 'inherit' | 'new' =
      daysSinceCancel <= REACTIVATION_INHERIT_DAYS ? 'inherit' : 'new';

    return res.json({
      success: true,
      canInherit: true,
      daysSinceCancel,
      recommendedMode,
      thresholdDays: REACTIVATION_INHERIT_DAYS,
      prevOrderNumber: prev.order.orderNumber,
    });
  } catch (error: any) {
    console.error('再購入情報取得エラー:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '再購入情報の取得に失敗しました',
    });
  }
}

/**
 * POST /api/subscriptions/checkout
 * サブスク商品をカード（自動継続課金・案B）で申し込む。
 * pending注文＋pending_payment契約を先に作り、Stripe Checkout Session(mode:subscription)の
 * URLを返す。決済成功はWebhook(checkout.session.completed)で確定→provisionする。
 * body: { productId, inheritFromOrderNumber? }
 */
export async function createSubscriptionCheckout(req: Request, res: Response) {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'ログインが必要です' });
    }
    const userId = req.session.userId;
    const { productId } = req.body as { productId?: string };
    if (!productId) {
      return res.status(400).json({ success: false, message: 'productId は必須です' });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.productType !== 'subscription') {
      return res.status(404).json({ success: false, message: 'サブスク商品が見つかりません' });
    }
    if (product.billingType !== 'monthly' && product.billingType !== 'yearly') {
      return res
        .status(400)
        .json({ success: false, message: 'このプランはカード継続課金に対応していません' });
    }

    // Stripe Price を確保（未作成なら作る）
    if (!product.stripePriceId) {
      await syncStripeProductPrice(product.id);
    }
    const fresh = await prisma.product.findUnique({
      where: { id: productId },
      select: { stripePriceId: true, price: true, billingType: true, name: true },
    });
    if (!fresh?.stripePriceId) {
      return res.status(503).json({
        success: false,
        message: 'カード決済の準備ができていません（Stripe未設定）。銀行振込をご利用ください。',
      });
    }

    // 注文は「決済成功時（Webhook）」に作る。ここでは作らない
    // → 決済失敗・離脱で未決済のゴミ注文が残らない（入金前発行の防止も自然に維持）。
    const checkout = await createSubscriptionCheckoutSession({
      userId,
      productId,
      stripePriceId: fresh.stripePriceId,
    });
    if (!checkout) {
      return res.status(503).json({
        success: false,
        message: 'カード決済セッションの作成に失敗しました。時間をおいて再度お試しください。',
      });
    }

    return res.json({ success: true, checkoutUrl: checkout.url });
  } catch (error: any) {
    console.error('サブスクCheckout作成エラー:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'カード決済の開始に失敗しました',
    });
  }
}

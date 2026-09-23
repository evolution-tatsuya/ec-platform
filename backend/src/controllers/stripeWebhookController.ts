/**
 * Stripe Webhook（案B: 自動継続課金）
 *
 * 決済・課金イベントを受けて、注文/契約の状態を同期し、在庫連携を呼ぶ。
 * - checkout.session.completed  : 初回決済成功 → 注文paid + 契約active + provision
 * - invoice.paid                : 2回目以降の継続課金成功 → nextBillingDate更新
 * - invoice.payment_failed      : 課金失敗 → （最終的に）suspend
 * - customer.subscription.deleted: 解約 → 契約cancelled + suspend
 *
 * 署名検証必須。express.raw で受け取った生bodyを使う（index.tsでルート個別設定）。
 * 冪等: 既に目的の状態なら何もしない（Stripeは重複配信しうる）。
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getStripe } from '../config/stripe';
import { config } from '../config';
import { provisionAndDeliverForOrder } from './orderController';
import { suspendTenant } from '../services/inventoryProvisionService';
import Stripe from 'stripe';

const prisma = new PrismaClient();

export async function handleStripeWebhook(req: Request, res: Response) {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).send('Stripe未設定');
  }
  const webhookSecret = config.stripeWebhookSecret;
  if (!webhookSecret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET 未設定');
    return res.status(503).send('Webhook未設定');
  }

  const sig = req.headers['stripe-signature'];
  let event: Stripe.Event;
  try {
    // req.body は express.raw により Buffer
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      sig as string,
      webhookSecret
    );
  } catch (err: any) {
    console.error('[stripe-webhook] 署名検証失敗:', err?.message);
    return res.status(400).send(`Webhook署名検証失敗: ${err?.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'invoice.paid':
        await onInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await onInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'customer.subscription.deleted':
        await onSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        // 未対応イベントは無視（200で受理）
        break;
    }
  } catch (e: any) {
    console.error(`[stripe-webhook] ${event.type} 処理エラー:`, e?.message || e);
    // 500を返すとStripeがリトライする。処理系のエラーはリトライさせたいので500。
    return res.status(500).send('処理エラー');
  }

  return res.json({ received: true });
}

/** 初回決済成功: 注文をpaid化し契約をactiveにしてprovisionする。 */
async function onCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const orderNumber = session.metadata?.orderNumber;
  if (!orderNumber) {
    console.error('[stripe-webhook] checkout完了だがorderNumberメタデータ無し');
    return;
  }
  const stripeSubscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { subscriptions: true },
  });
  if (!order) {
    console.error(`[stripe-webhook] 注文が見つからない: ${orderNumber}`);
    return;
  }

  // 冪等: 既にpaidなら何もしない
  if (order.status !== 'paid') {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'paid' },
    });
  }

  // 契約をactive化＋StripeサブスクIDを記録（pending_payment→active）
  for (const sub of order.subscriptions) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: 'active',
        stripeSubscriptionId: stripeSubscriptionId || sub.stripeSubscriptionId,
        stripeStatus: 'active',
      },
    });
  }

  // 在庫アプリ発行（冪等・既存ロジック再利用）
  await provisionAndDeliverForOrder(order.id);
}

/** 継続課金成功（2回目以降）: 次回請求日を更新。 */
async function onInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const stripeSubscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;
  if (!stripeSubscriptionId) return;

  const sub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId },
  });
  if (!sub) return;

  // 次回請求予定日 = 今回の請求期間終了（period_end）
  const nextTs = invoice.lines?.data?.[0]?.period?.end;
  const nextBillingDate = nextTs ? new Date(nextTs * 1000) : null;

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      stripeStatus: 'active',
      status: sub.status === 'suspended' ? 'active' : sub.status, // 復活した場合
      ...(nextBillingDate ? { nextBillingDate } : {}),
    },
  });
}

/** 課金失敗: Stripe側の最終失敗（サブスクがpast_due/unpaid確定）でsuspend。 */
async function onInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const stripeSubscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;
  if (!stripeSubscriptionId) return;

  const sub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId },
    include: { order: { select: { orderNumber: true } } },
  });
  if (!sub) return;

  // 記録のみ更新（Stripeはリトライする。最終失敗はsubscription.deletedで来る想定だが、
  // past_dueをここで記録して運営者が把握できるようにする）
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { stripeStatus: 'past_due' },
  });
  console.error(
    `[stripe-webhook] 課金失敗: 契約 ${sub.id} (order ${sub.order?.orderNumber}) がpast_due`
  );
}

/** 解約（Stripeサブスク削除）: 契約をcancelled + 在庫suspend。 */
async function onSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const sub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
    include: { order: { select: { orderNumber: true } } },
  });
  if (!sub) return;

  if (sub.status !== 'cancelled') {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        nextBillingDate: null,
        stripeStatus: 'canceled',
      },
    });
  }

  // 在庫アプリをsuspend（orderNumberで特定）
  const orderNumber = sub.order?.orderNumber;
  if (orderNumber) {
    const r = await suspendTenant({ orderId: orderNumber, reason: 'cancelled' });
    if (!r.success) {
      console.error(
        `[stripe-webhook] 解約suspend失敗 (order ${orderNumber}): ${r.error}`
      );
    }
  }
}

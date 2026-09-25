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

/** 注文番号を生成（ORD-YYYYMMDD-XXXXX 形式）。 */
function genOrderNumber(): string {
  const now = new Date();
  const ymd =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `ORD-${ymd}-${rand}`;
}

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
  const userId = session.metadata?.userId;
  const productId = session.metadata?.productId;
  const inheritFromOrderId = session.metadata?.inheritFromOrderNumber || null;
  if (!userId || !productId) {
    console.error('[stripe-webhook] checkout完了だがuserId/productIdメタデータ無し');
    return;
  }
  const stripeSubscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;
  if (!stripeSubscriptionId) {
    console.error('[stripe-webhook] checkout完了だがsubscription IDが無い');
    return;
  }

  // 冪等: 同じStripeサブスクの注文が既にあれば二重作成しない（Webhook重複配信対策）
  const existing = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId },
    select: { orderId: true },
  });
  if (existing?.orderId) {
    // 既に作成済み。発行だけ念のため冪等呼び出し（provisionは二重発行しない）。
    await provisionAndDeliverForOrder(existing.orderId);
    return;
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!product || !user) {
    console.error(`[stripe-webhook] 注文作成に必要な商品/会員が無い: p=${productId} u=${userId}`);
    return;
  }

  // 一意な注文番号を採番
  let orderNumber = '';
  for (let i = 0; i < 10; i++) {
    const cand = genOrderNumber();
    const dup = await prisma.order.findUnique({ where: { orderNumber: cand } });
    if (!dup) {
      orderNumber = cand;
      break;
    }
  }
  if (!orderNumber) {
    console.error('[stripe-webhook] 注文番号の生成に失敗');
    return;
  }

  // 決済成功したのでpaid注文＋active契約を作成（ここで初めて注文が生まれる）
  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId,
      customerName: user.name || '',
      customerEmail: user.email || '',
      customerPhone: user.defaultPhone || '',
      status: 'paid',
      paymentMethod: 'credit_card',
      totalAmount: product.price,
      shippingAddress: 'サブスク（カード継続課金）',
      items: { create: [{ productId, quantity: 1, price: product.price }] },
      subscriptions: {
        create: [
          {
            userId,
            productId,
            status: 'active',
            billingType: product.billingType || 'monthly',
            amount: product.price,
            stripeSubscriptionId,
            stripeStatus: 'active',
            inheritFromOrderId, // 引き継ぎ再購入なら旧注文番号→provisionでreactivate分岐
          },
        ],
      },
    },
  });

  // 在庫アプリ発行（既存ロジック再利用・冪等）
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

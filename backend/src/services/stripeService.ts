/**
 * Stripe連携サービス（案B: 自動継続課金）
 *
 * Stripe Customer / Product / Price / Checkout / Subscription の操作をまとめる。
 * 在庫連携（inventoryProvisionService）とは独立。決済成功→provisionのフックは
 * Webhookコントローラ側で既存の provisionAndDeliverForOrder を再利用する。
 *
 * すべての関数は Stripe未設定時に安全にスキップ or 例外を投げる方針。
 */

import { PrismaClient } from '@prisma/client';
import { getStripe } from '../config/stripe';
import { config } from '../config';

const prisma = new PrismaClient();

/**
 * 会員のStripe Customerを取得（無ければ作成）。冪等。
 * 作成したIDは User.stripeCustomerId に保存する。
 * Stripe未設定なら null を返す（呼び出し側でカード決済を無効化）。
 */
export async function getOrCreateCustomer(userId: string): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, stripeCustomerId: true },
  });
  if (!user) return null;

  // 既存Customerを再利用（Stripe上でまだ生きているか軽く検証）
  if (user.stripeCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(user.stripeCustomerId);
      // 削除済み(deleted)でなければそのまま使う
      if (existing && !(existing as any).deleted) {
        return user.stripeCustomerId;
      }
    } catch {
      // 取得失敗（削除済み等）なら作り直す
    }
  }

  // 新規Customer作成
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name || undefined,
    metadata: { ecUserId: user.id },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

/**
 * サブスク商品のStripe Product/Priceを同期（作成・価格変更に追従）。
 * - Stripe Productが無ければ作成。
 * - Priceは金額/課金周期が変わったら新規作成し直す（StripeのPriceは金額変更不可）。
 * - 作成したIDを Product.stripeProductId / stripePriceId に保存。
 * 例外は投げず、失敗時は false を返す（商品保存自体は止めない）。
 *
 * 非サブスク商品（物販等）は継続課金Price不要なので何もしない。
 */
export async function syncStripeProductPrice(productId: string): Promise<boolean> {
  const stripe = getStripe();
  if (!stripe) return false;

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        price: true,
        productType: true,
        billingType: true,
        stripeProductId: true,
        stripePriceId: true,
      },
    });
    if (!product) return false;

    // サブスク（月額/年額）のみ対象。買い切り・物販はスキップ。
    if (
      product.productType !== 'subscription' ||
      (product.billingType !== 'monthly' && product.billingType !== 'yearly')
    ) {
      return false;
    }

    // 1. Stripe Product（無ければ作成、あれば名前を同期）
    let stripeProductId = product.stripeProductId;
    if (stripeProductId) {
      try {
        await stripe.products.update(stripeProductId, { name: product.name });
      } catch {
        stripeProductId = null; // 消えていたら作り直す
      }
    }
    if (!stripeProductId) {
      const sp = await stripe.products.create({
        name: product.name,
        metadata: { ecProductId: product.id },
      });
      stripeProductId = sp.id;
    }

    // 2. Price（金額 or 周期が変わっていたら新規作成）。既存Priceの金額は変更できない。
    const interval = product.billingType === 'yearly' ? 'year' : 'month';
    let needNewPrice = true;
    if (product.stripePriceId) {
      try {
        const existing = await stripe.prices.retrieve(product.stripePriceId);
        const sameAmount = existing.unit_amount === product.price;
        const sameInterval = existing.recurring?.interval === interval;
        if (existing.active && sameAmount && sameInterval) {
          needNewPrice = false;
        }
      } catch {
        needNewPrice = true;
      }
    }

    let stripePriceId = product.stripePriceId;
    if (needNewPrice) {
      const price = await stripe.prices.create({
        product: stripeProductId,
        unit_amount: product.price, // 円（JPYはゼロ小数通貨なのでそのまま）
        currency: 'jpy',
        recurring: { interval },
        metadata: { ecProductId: product.id },
      });
      stripePriceId = price.id;
      // 旧Priceは非アクティブ化（既存契約は旧Priceのまま継続される）
      if (product.stripePriceId && product.stripePriceId !== price.id) {
        try {
          await stripe.prices.update(product.stripePriceId, { active: false });
        } catch {
          // 失敗しても致命的でない
        }
      }
    }

    // 3. 保存（変わったときだけ）
    if (
      stripeProductId !== product.stripeProductId ||
      stripePriceId !== product.stripePriceId
    ) {
      await prisma.product.update({
        where: { id: product.id },
        data: { stripeProductId, stripePriceId },
      });
    }

    return true;
  } catch (e: any) {
    console.error('[stripe] Product/Price同期に失敗:', e?.message || e);
    return false;
  }
}

export interface CheckoutSessionResult {
  url: string;
  sessionId: string;
}

/**
 * サブスク（継続課金）用のStripe Checkout Sessionを作成する。
 * mode:subscription。price は商品の stripePriceId を使う。
 * metadata に orderNumber を埋め、Webhook(checkout.session.completed)で
 * 注文をpaid化＋provisionする際の突合キーにする。
 *
 * @param userId 会員ID
 * @param stripePriceId 商品のStripe Price ID
 * @param orderNumber 事前に作成した注文の表示用注文番号（provisionの冪等キー）
 * @returns {url, sessionId} or null（Stripe未設定・Price未作成時）
 */
export async function createSubscriptionCheckoutSession(params: {
  userId: string;
  stripePriceId: string;
  orderNumber: string;
}): Promise<CheckoutSessionResult | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const customerId = await getOrCreateCustomer(params.userId);
  if (!customerId) return null;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: params.stripePriceId, quantity: 1 }],
    // 決済成功/キャンセルの戻り先。orderNumberを success 側に付ける。
    success_url: `${config.frontendUrl}/mypage?subscribed=1&order=${params.orderNumber}`,
    cancel_url: `${config.frontendUrl}/pricing?canceled=1`,
    // Webhook・後続処理で注文を特定する
    metadata: { orderNumber: params.orderNumber },
    subscription_data: {
      metadata: { orderNumber: params.orderNumber },
    },
  });

  if (!session.url) return null;
  return { url: session.url, sessionId: session.id };
}

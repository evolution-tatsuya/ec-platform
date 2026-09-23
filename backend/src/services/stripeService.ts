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

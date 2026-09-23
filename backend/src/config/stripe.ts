/**
 * Stripeクライアント初期化（案B: 自動継続課金）
 *
 * config.stripeSecretKey（STRIPE_SECRET_KEY）でStripe SDKを初期化する。
 * TEST/LIVEはキーの種類（sk_test_ / sk_live_）で自動的に切り替わる。
 *
 * 注意: キーが未設定/ダミーの環境でも import 時にクラッシュしないよう、
 * getStripe() で遅延取得する。実際にStripeを叩く箇所で呼ぶこと。
 */

import Stripe from 'stripe';
import { config } from './index';

let stripeClient: Stripe | null = null;

/**
 * Stripeクライアントを取得（遅延初期化・シングルトン）。
 * STRIPE_SECRET_KEY が未設定なら null を返す（呼び出し側でスキップ判定）。
 */
export function getStripe(): Stripe | null {
  if (stripeClient) return stripeClient;
  const key = config.stripeSecretKey;
  if (!key || !key.startsWith('sk_')) {
    console.error('[stripe] STRIPE_SECRET_KEY が未設定/不正のためStripe連携をスキップします');
    return null;
  }
  stripeClient = new Stripe(key, {
    // stripe v17 の型が要求するAPIバージョン。SDK同梱の既定に合わせる。
    apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion,
    typescript: true,
  });
  return stripeClient;
}

/** 現在のStripeキーがLIVEモードか（本番判定・ログ用）。 */
export function isStripeLive(): boolean {
  return !!config.stripeSecretKey?.startsWith('sk_live_');
}

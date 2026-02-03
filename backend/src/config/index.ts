// ===== 環境変数設定 =====
// 目的: .env.localから環境変数を読み込み、型安全にアクセス

import dotenv from 'dotenv';
import path from 'path';

// ルートディレクトリの.env.localを読み込み
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

interface Config {
  // アプリケーション設定
  nodeEnv: string;
  port: number;
  frontendUrl: string;
  backendUrl: string;
  corsOrigin: string;

  // データベース
  databaseUrl: string;

  // セッション
  sessionSecret: string;

  // Cloudflare R2
  r2AccountId: string;
  r2AccessKeyId: string;
  r2SecretAccessKey: string;
  r2BucketName: string;

  // Stripe
  stripePublicKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;

  // Resend
  resendApiKey: string;
  resendFromEmail: string;

  // OpenAI
  openaiApiKey: string;

  // Gemini
  geminiApiKey: string;
}

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`環境変数 ${key} が設定されていません`);
  }
  return value;
};

export const config: Config = {
  nodeEnv: getEnv('NODE_ENV', 'development'),
  port: parseInt(getEnv('PORT', '8432'), 10),
  frontendUrl: getEnv('FRONTEND_URL', 'http://localhost:3247'),
  backendUrl: getEnv('BACKEND_URL', 'http://localhost:8432'),
  corsOrigin: getEnv('CORS_ORIGIN', 'http://localhost:3247'),

  databaseUrl: getEnv('DATABASE_URL'),
  sessionSecret: getEnv('SESSION_SECRET'),

  r2AccountId: getEnv('R2_ACCOUNT_ID'),
  r2AccessKeyId: getEnv('R2_ACCESS_KEY_ID'),
  r2SecretAccessKey: getEnv('R2_SECRET_ACCESS_KEY'),
  r2BucketName: getEnv('R2_BUCKET_NAME'),

  stripePublicKey: getEnv('STRIPE_PUBLIC_KEY'),
  stripeSecretKey: getEnv('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: getEnv('STRIPE_WEBHOOK_SECRET', ''),

  resendApiKey: getEnv('RESEND_API_KEY'),
  resendFromEmail: getEnv('RESEND_FROM_EMAIL'),

  openaiApiKey: getEnv('OPENAI_API_KEY'),
  geminiApiKey: getEnv('GEMINI_API_KEY'),
};

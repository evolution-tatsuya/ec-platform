/**
 * サイト設定テーブル追加マイグレーション
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// .env.localを読み込む
config({ path: resolve(__dirname, '../../.env.local') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 サイト設定テーブルを作成しています...');

  // SiteSettingsテーブルを作成するSQL
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS site_settings (
      id TEXT PRIMARY KEY,
      enable_delivery_date_time BOOLEAN NOT NULL DEFAULT true,
      bank_transfer_discount DOUBLE PRECISION NOT NULL DEFAULT 0.036,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL
    );
  `;

  console.log('✅ テーブル作成完了');

  // デフォルト設定を挿入
  const existing = await prisma.$queryRaw`SELECT * FROM site_settings LIMIT 1` as any[];

  if (existing.length === 0) {
    console.log('🔄 初期設定を追加しています...');

    await prisma.$executeRaw`
      INSERT INTO site_settings (id, enable_delivery_date_time, bank_transfer_discount, created_at, updated_at)
      VALUES (gen_random_uuid()::text, true, 0.036, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    `;

    console.log('✅ 初期設定追加完了');
  } else {
    console.log('ℹ️  設定は既に存在します');
  }

  console.log('✨ マイグレーション完了！');
}

main()
  .catch((e) => {
    console.error('❌ エラーが発生しました:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

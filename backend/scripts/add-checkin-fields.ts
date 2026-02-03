/**
 * 受付フィールド追加マイグレーション
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// .env.localを読み込む
config({ path: resolve(__dirname, '../../.env.local') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 受付フィールドを追加しています...');

  // 受付フィールドを追加
  await prisma.$executeRaw`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS checked_in_by TEXT;
  `;

  console.log('✅ フィールド追加完了');

  // インデックスを作成
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS orders_checked_in_idx ON orders(checked_in);
  `;

  console.log('✅ インデックス作成完了');

  // 既存の注文データを確認
  const orderCount = await prisma.order.count();
  console.log(`ℹ️  既存注文数: ${orderCount}件`);

  if (orderCount > 0) {
    console.log('ℹ️  既存注文はすべて未受付（checked_in = false）として設定されました');
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

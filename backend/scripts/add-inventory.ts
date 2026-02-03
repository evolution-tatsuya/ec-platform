/**
 * 在庫データ追加スクリプト
 *
 * すべての商品に在庫データ（InventoryLog）を追加します
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// .env.localを読み込む
config({ path: resolve(__dirname, '../../.env.local') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 在庫データを追加しています...');

  // すべての商品を取得
  const products = await prisma.product.findMany();

  console.log(`📦 ${products.length}件の商品が見つかりました`);

  // 各商品に在庫データを追加
  for (const product of products) {
    // 既存の在庫を確認
    const existingLogs = await prisma.inventoryLog.findMany({
      where: { productId: product.id },
    });

    const currentStock = existingLogs.reduce((sum, log) => sum + log.quantity, 0);

    if (currentStock === 0) {
      // 在庫がない場合は100個追加
      await prisma.inventoryLog.create({
        data: {
          productId: product.id,
          quantity: 100,
          type: 'purchase',
          note: '初期在庫追加',
        },
      });
      console.log(`✅ ${product.name}: 100個の在庫を追加しました`);
    } else {
      console.log(`ℹ️  ${product.name}: すでに在庫があります（現在: ${currentStock}個）`);
    }
  }

  console.log('✨ 在庫データの追加が完了しました！');
}

main()
  .catch((e) => {
    console.error('❌ エラーが発生しました:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

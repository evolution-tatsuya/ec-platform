// ===== テスト商品シードスクリプト =====
// 目的: E2Eテスト用の商品データを作成

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 テスト商品シード開始...\n');

  // カテゴリーを作成
  console.log('📂 カテゴリー作成中...');

  const carPartsCategory = await prisma.category.upsert({
    where: { slug: 'car-parts' },
    update: {},
    create: {
      name: '車パーツ',
      slug: 'car-parts',
      description: '車パーツカテゴリー',
    },
  });

  const digitalCategory = await prisma.category.upsert({
    where: { slug: 'digital' },
    update: {},
    create: {
      name: 'デジタル商品',
      slug: 'digital',
      description: 'デジタル商品カテゴリー',
    },
  });

  console.log('✅ カテゴリー作成完了\n');

  // 商品を作成（16件: ピックアップ用6件 + 予備10件）
  console.log('📦 商品作成中...');

  const products = [];

  // ピックアップ商品用（6件）
  for (let i = 1; i <= 6; i++) {
    const product = await prisma.product.upsert({
      where: { slug: `pickup-product-${i}` },
      update: {},
      create: {
        name: `ピックアップ商品 ${i}`,
        slug: `pickup-product-${i}`,
        description: `E2Eテスト用のピックアップ商品です（${i}）`,
        price: 1000 * i,
        categoryId: carPartsCategory.id,
        isActive: true,
        productType: 'physical',
      },
    });
    products.push(product);

    // 在庫を追加
    await prisma.inventoryLog.create({
      data: {
        productId: product.id,
        quantity: 100,
        type: 'purchase',
        note: 'テストデータ初期在庫',
      },
    });
  }

  // 追加の商品（新着・セール・人気商品として使用）
  for (let i = 7; i <= 16; i++) {
    const product = await prisma.product.upsert({
      where: { slug: `test-product-${i}` },
      update: {},
      create: {
        name: `テスト商品 ${i}`,
        slug: `test-product-${i}`,
        description: `E2Eテスト用の商品です（${i}）`,
        price: 500 * i,
        categoryId: i % 2 === 0 ? carPartsCategory.id : digitalCategory.id,
        isActive: true,
        productType: i % 2 === 0 ? 'physical' : 'digital',
      },
    });
    products.push(product);

    // 在庫を追加（物理商品のみ）
    if (i % 2 === 0) {
      await prisma.inventoryLog.create({
        data: {
          productId: product.id,
          quantity: 50,
          type: 'purchase',
          note: 'テストデータ初期在庫',
        },
      });
    }
  }

  console.log(`✅ 商品 ${products.length}件 作成完了\n`);

  console.log('🎉 テスト商品シード完了！');
  console.log('次のステップ: npm run seed:top-page を実行してトップページデータを設定してください');
}

main()
  .catch((e) => {
    console.error('❌ シード実行エラー:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

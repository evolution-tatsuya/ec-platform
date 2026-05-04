// ===== テスト商品シードスクリプト =====
// 目的: E2Eテスト用の商品データを作成

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 テスト商品シード開始...\n');

  // カテゴリーを作成
  console.log('📂 カテゴリー作成中...');

  const carPartsCategory = await prisma.category.upsert({
    where: { slug: 'cars' },
    update: {},
    create: {
      name: '車パーツ',
      slug: 'cars',
      description: '車パーツカテゴリー',
    },
  });

  await prisma.category.upsert({
    where: { slug: 'events' },
    update: {},
    create: {
      name: 'イベント',
      slug: 'events',
      description: 'イベントカテゴリー',
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

  // 検索テスト用商品（プリウス ブレーキパッド）
  const priusProduct = await prisma.product.upsert({
    where: { slug: 'prius-brake-pad' },
    update: {},
    create: {
      name: 'トヨタ プリウス ZVW30 ブレーキパッド',
      slug: 'prius-brake-pad',
      description: 'E2Eテスト用の検索対象商品です（プリウス）',
      price: 12800,
      categoryId: carPartsCategory.id,
      isActive: true,
      productType: 'physical',
    },
  });
  products.push(priusProduct);

  // 在庫を追加（在庫少テスト用に5個）
  await prisma.inventoryLog.create({
    data: {
      productId: priusProduct.id,
      quantity: 5,
      type: 'purchase',
      note: 'テストデータ初期在庫',
    },
  });

  // ピックアップ商品用（6件）- カテゴリーを分散
  const eventsCategory = await prisma.category.findUnique({ where: { slug: 'events' } });
  for (let i = 1; i <= 6; i++) {
    // i=1,2 → 車パーツ、i=3,4 → イベント、i=5,6 → デジタル
    const categoryId = i <= 2 ? carPartsCategory.id : (i <= 4 ? eventsCategory!.id : digitalCategory.id);
    const productType = i <= 2 ? 'physical' : (i <= 4 ? 'digital_ticket' : 'digital');

    const product = await prisma.product.upsert({
      where: { slug: `pickup-product-${i}` },
      update: {},
      create: {
        name: `ピックアップ商品 ${i}`,
        slug: `pickup-product-${i}`,
        description: `E2Eテスト用のピックアップ商品です（${i}）`,
        price: 1000 * i,
        categoryId: categoryId,
        isActive: true,
        productType: productType,
      },
    });
    products.push(product);

    // 在庫を追加（物理商品とチケットのみ）
    if (i <= 4) {
      await prisma.inventoryLog.create({
        data: {
          productId: product.id,
          quantity: 200,
          type: 'purchase',
          note: 'テストデータ初期在庫',
        },
      });
    }
  }

  // E2E-CART-004用: 在庫5個の商品を追加（カートテスト専用）
  const cart5stockProduct = await prisma.product.upsert({
    where: { slug: 'cart-test-product-5stock' },
    update: {},
    create: {
      name: 'カートテスト商品（在庫5個）',
      slug: 'cart-test-product-5stock',
      description: 'E2E-CART-004テスト用の在庫5個商品',
      price: 5000,
      categoryId: carPartsCategory.id,
      isActive: true,
      productType: 'physical',
    },
  });
  products.push(cart5stockProduct);

  // 在庫を5個に設定
  await prisma.inventoryLog.create({
    data: {
      productId: cart5stockProduct.id,
      quantity: 5,
      type: 'purchase',
      note: 'E2E-CART-004用の在庫5個テストデータ',
    },
  });

  // 追加の商品（新着・セール・人気商品として使用）- カテゴリーを均等に分散
  for (let i = 7; i <= 16; i++) {
    // i=7,8,9,10 → 車パーツ、i=11,12,13 → イベント、i=14,15,16 → デジタル
    const categoryId = i <= 10 ? carPartsCategory.id : (i <= 13 ? eventsCategory!.id : digitalCategory.id);
    const productType = i <= 10 ? 'physical' : (i <= 13 ? 'digital_ticket' : 'digital');

    const product = await prisma.product.upsert({
      where: { slug: `test-product-${i}` },
      update: {},
      create: {
        name: `テスト商品 ${i}`,
        slug: `test-product-${i}`,
        description: `E2Eテスト用の商品です（${i}）`,
        price: 500 * i,
        categoryId: categoryId,
        isActive: true,
        productType: productType,
      },
    });
    products.push(product);

    // 在庫を追加（物理商品とチケットのみ）- 在庫テスト用にバリエーション追加
    if (i <= 13) {
      let quantity;
      if (i === 7) quantity = 0; // 在庫切れ
      else if (i === 8) quantity = 3; // 在庫少
      else if (i === 9) quantity = 8; // 在庫少
      else quantity = 100; // 在庫あり

      await prisma.inventoryLog.create({
        data: {
          productId: product.id,
          quantity: quantity,
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

// ===== カートページE2Eテスト用データシードスクリプト =====
// 目的: カートページE2Eテスト用のユーザー、商品、カートデータを作成

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🛒 カートページE2Eテスト用データシード開始...\n');

  // カテゴリーを取得または作成
  console.log('📂 カテゴリー取得中...');
  const carPartsCategory = await prisma.category.upsert({
    where: { slug: 'car-parts' },
    update: {},
    create: {
      name: '車パーツ',
      slug: 'car-parts',
      description: '車パーツカテゴリー',
    },
  });
  console.log('✅ カテゴリー取得完了\n');

  // テストユーザーを作成（2名）
  console.log('👤 テストユーザー作成中...');

  // ユーザーA: カートに商品2点
  const hashedPasswordA = await bcrypt.hash('TestUser2025!', 10);
  const userA = await prisma.user.upsert({
    where: { email: 'cart-user-a@test.local' },
    update: {},
    create: {
      email: 'cart-user-a@test.local',
      password: hashedPasswordA,
      name: 'カートテストA',
      isAdmin: false,
    },
  });

  // ユーザーB: カート空
  const hashedPasswordB = await bcrypt.hash('TestUser2025!', 10);
  const userB = await prisma.user.upsert({
    where: { email: 'cart-user-b@test.local' },
    update: {},
    create: {
      email: 'cart-user-b@test.local',
      password: hashedPasswordB,
      name: 'カートテストB',
      isAdmin: false,
    },
  });

  console.log(`✅ テストユーザー作成完了: ${userA.email}, ${userB.email}\n`);

  // テスト用商品を作成（5点）
  console.log('📦 テスト商品作成中...');

  const products = [];

  // 在庫10個以上の商品（3点）
  for (let i = 1; i <= 3; i++) {
    const product = await prisma.product.upsert({
      where: { slug: `cart-test-product-${i}` },
      update: {},
      create: {
        name: `カートテスト商品 ${i}（在庫15個）`,
        slug: `cart-test-product-${i}`,
        description: `E2Eテスト用の商品です（在庫15個）`,
        price: 10000 + (i * 1000),
        categoryId: carPartsCategory.id,
        isActive: true,
        productType: 'physical',
      },
    });
    products.push(product);

    // 在庫を追加（15個）
    await prisma.inventoryLog.create({
      data: {
        productId: product.id,
        quantity: 15,
        type: 'purchase',
        note: 'カートE2Eテスト用初期在庫',
      },
    });
  }

  // 在庫5個の商品（1点）
  const product5Stock = await prisma.product.upsert({
    where: { slug: 'cart-test-product-5stock' },
    update: {},
    create: {
      name: 'カートテスト商品（在庫5個）',
      slug: 'cart-test-product-5stock',
      description: 'E2Eテスト用の商品です（在庫5個）',
      price: 8000,
      categoryId: carPartsCategory.id,
      isActive: true,
      productType: 'physical',
    },
  });
  products.push(product5Stock);

  // 在庫を追加（5個）
  await prisma.inventoryLog.create({
    data: {
      productId: product5Stock.id,
      quantity: 5,
      type: 'purchase',
      note: 'カートE2Eテスト用初期在庫',
    },
  });

  // 在庫1個の商品（1点）
  const product1Stock = await prisma.product.upsert({
    where: { slug: 'cart-test-product-1stock' },
    update: {},
    create: {
      name: 'カートテスト商品（在庫1個）',
      slug: 'cart-test-product-1stock',
      description: 'E2Eテスト用の商品です（在庫1個）',
      price: 5000,
      categoryId: carPartsCategory.id,
      isActive: true,
      productType: 'physical',
    },
  });
  products.push(product1Stock);

  // 在庫を追加（1個）
  await prisma.inventoryLog.create({
    data: {
      productId: product1Stock.id,
      quantity: 1,
      type: 'purchase',
      note: 'カートE2Eテスト用初期在庫',
    },
  });

  console.log(`✅ テスト商品 ${products.length}件 作成完了\n`);

  // ユーザーAのカートに商品を追加（2点）
  console.log('🛒 ユーザーAのカートに商品追加中...');

  // 既存のカートを削除
  await prisma.cart.deleteMany({
    where: { userId: userA.id },
  });

  // 新しいカートを作成
  const cartA = await prisma.cart.create({
    data: {
      userId: userA.id,
      items: {
        create: [
          {
            productId: products[0].id, // 在庫15個の商品1
            quantity: 1,
          },
          {
            productId: products[1].id, // 在庫15個の商品2
            quantity: 1,
          },
        ],
      },
    },
  });

  console.log('✅ ユーザーAのカート作成完了（2点）\n');

  // ユーザーBのカートをクリア
  console.log('🛒 ユーザーBのカートクリア中...');
  await prisma.cart.deleteMany({
    where: { userId: userB.id },
  });
  console.log('✅ ユーザーBのカート空にしました\n');

  console.log('🎉 カートページE2Eテスト用データシード完了！');
  console.log('\n📝 テストアカウント情報:');
  console.log('------------------------------------');
  console.log('ユーザーA (カート2点):');
  console.log(`  Email: ${userA.email}`);
  console.log('  Password: TestUser2025!');
  console.log('');
  console.log('ユーザーB (カート空):');
  console.log(`  Email: ${userB.email}`);
  console.log('  Password: TestUser2025!');
  console.log('------------------------------------\n');
  console.log('次のステップ: npm run test:e2e:cart を実行してカートページE2Eテストを開始してください');
}

main()
  .catch((e) => {
    console.error('❌ シード実行エラー:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

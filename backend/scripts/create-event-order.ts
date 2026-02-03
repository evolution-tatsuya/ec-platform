/**
 * イベントチケット注文のテストデータ作成スクリプト
 */
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../../.env.local') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🎫 イベントチケット注文データを作成中...\n');

  // 1. テストユーザーを取得または作成
  let user = await prisma.user.findFirst({
    where: { email: 'test@example.com' },
  });

  if (!user) {
    console.log('📝 テストユーザーを作成中...');
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash('password123', 10);

    user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: hashedPassword,
        name: '山田 太郎',
      },
    });
    console.log(`✅ ユーザー作成完了: ${user.email}\n`);
  } else {
    console.log(`✅ 既存ユーザーを使用: ${user.email}\n`);
  }

  // 2. イベントカテゴリーを取得または作成
  let eventCategory = await prisma.category.findFirst({
    where: { slug: 'events' },
  });

  if (!eventCategory) {
    console.log('📁 イベントカテゴリーを作成中...');
    eventCategory = await prisma.category.create({
      data: {
        name: 'イベント',
        slug: 'events',
        description: 'カーイベント、展示会、試乗会など',
      },
    });
    console.log(`✅ カテゴリー作成完了: ${eventCategory.name}\n`);
  } else {
    console.log(`✅ 既存カテゴリーを使用: ${eventCategory.name}\n`);
  }

  // 3. イベントチケット商品を取得または作成
  let eventProduct = await prisma.product.findFirst({
    where: {
      productType: 'event',
      categoryId: eventCategory.id,
    },
  });

  if (!eventProduct) {
    console.log('🎟️  イベントチケット商品を作成中...');
    eventProduct = await prisma.product.create({
      data: {
        name: '2026年春 カーショー入場チケット',
        slug: 'car-show-2026-spring',
        description: '最新モデルが集結！国内最大級のカーショー',
        price: 3000,
        categoryId: eventCategory.id,
        productType: 'event',
        isActive: true,
      },
    });
    console.log(`✅ 商品作成完了: ${eventProduct.name}\n`);

    // 在庫を追加
    await prisma.inventoryLog.create({
      data: {
        productId: eventProduct.id,
        quantity: 100, // チケット100枚
        type: 'purchase',
        note: 'イベントチケット初期在庫',
      },
    });
    console.log('✅ 在庫追加完了: 100枚\n');
  } else {
    console.log(`✅ 既存商品を使用: ${eventProduct.name}\n`);
  }

  // 4. 注文番号を生成
  const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')}`;

  // 5. 注文を作成
  console.log('📦 注文を作成中...');
  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId: user.id,
      status: 'paid', // 入金済み
      paymentMethod: 'credit_card',
      totalAmount: eventProduct.price * 2, // 2枚購入
      items: {
        create: [
          {
            productId: eventProduct.id,
            quantity: 2,
            price: eventProduct.price,
          },
        ],
      },
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  // 在庫を減らす
  await prisma.inventoryLog.create({
    data: {
      productId: eventProduct.id,
      quantity: -2,
      type: 'sale',
      note: `注文 ${orderNumber} による販売`,
    },
  });

  console.log(`✅ 注文作成完了: ${order.orderNumber}`);
  console.log(`   商品: ${eventProduct.name} × 2枚`);
  console.log(`   金額: ¥${order.totalAmount.toLocaleString()}`);
  console.log(`   状態: ${order.status}\n`);

  console.log('🎉 完了！\n');
  console.log('ログイン情報:');
  console.log(`  Email: ${user.email}`);
  console.log(`  Password: password123`);
  console.log('\nこのアカウントでログインすると、マイページで注文履歴が確認できます。');
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

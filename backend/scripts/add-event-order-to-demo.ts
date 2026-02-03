/**
 * demoアカウントにイベントチケット注文を追加
 */
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../../.env.local') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🎫 demoアカウントにイベントチケット注文を追加中...\n');

  // 1. demoユーザーを確認
  const user = await prisma.user.findUnique({
    where: { email: 'demo@example.com' },
  });

  if (!user) {
    console.log('❌ demo@example.com アカウントが見つかりません。');
    console.log('このアカウントは登録されていないようです。\n');
    return;
  }

  console.log(`✅ ユーザー確認: ${user.email} (${user.name})\n`);

  // 2. イベント商品を取得
  let eventProduct = await prisma.product.findFirst({
    where: {
      productType: 'event',
    },
  });

  if (!eventProduct) {
    console.log('🎟️  イベント商品が見つからないため、新規作成します...');

    // イベントカテゴリーを取得または作成
    let eventCategory = await prisma.category.findFirst({
      where: { slug: 'events' },
    });

    if (!eventCategory) {
      eventCategory = await prisma.category.create({
        data: {
          name: 'イベント',
          slug: 'events',
          description: 'カーイベント、展示会、試乗会など',
        },
      });
    }

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

    // 在庫を追加
    await prisma.inventoryLog.create({
      data: {
        productId: eventProduct.id,
        quantity: 100,
        type: 'purchase',
        note: 'イベントチケット初期在庫',
      },
    });
    console.log('✅ イベント商品作成完了\n');
  }

  console.log(`📦 商品: ${eventProduct.name}\n`);

  // 3. 注文番号を生成
  const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')}`;

  // 4. 注文を作成
  console.log('📝 注文作成中...');
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

  console.log(`✅ 注文作成完了!\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📋 注文番号: ${order.orderNumber}`);
  console.log(`👤 お客様: ${user.name} (${user.email})`);
  console.log(`🎟️  商品: ${eventProduct.name} × 2枚`);
  console.log(`💰 金額: ¥${order.totalAmount.toLocaleString()}`);
  console.log(`📊 状態: ${order.status} (入金済み)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('🎉 完了！\n');
  console.log('次の手順:');
  console.log('1. demo@example.com / demo123 でログイン');
  console.log('2. マイページを開く');
  console.log('3. 購入履歴タブでイベントチケットを確認');
  console.log('4. QRコード表示ボタンをクリックしてQRコードを表示');
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

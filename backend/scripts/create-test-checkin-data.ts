import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('=== テストデータ作成開始 ===\n');

  // 1. カテゴリー作成
  let category = await prisma.category.findFirst({
    where: { slug: 'event' },
  });

  if (!category) {
    category = await prisma.category.create({
      data: {
        name: 'イベント',
        slug: 'event',
        description: 'イベントチケットのカテゴリー',
      },
    });
    console.log('✅ イベントカテゴリー作成');
  } else {
    console.log('✅ イベントカテゴリー確認済み');
  }

  // 2. デモユーザー作成または取得
  let user = await prisma.user.findUnique({
    where: { email: 'demo@example.com' },
  });

  if (!user) {
    const hashedPassword = await bcrypt.hash('demo1234', 10);
    user = await prisma.user.create({
      data: {
        email: 'demo@example.com',
        password: hashedPassword,
        name: 'デモユーザー',
        isAdmin: false,
      },
    });
    console.log('✅ デモユーザー作成: demo@example.com / demo1234');
  } else {
    console.log('✅ デモユーザー確認済み: demo@example.com');
  }

  // 3. 管理者ユーザー作成または取得
  let admin = await prisma.user.findUnique({
    where: { email: 'admin@example.com' },
  });

  if (!admin) {
    const hashedPassword = await bcrypt.hash('admin1234', 10);
    admin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: hashedPassword,
        name: '管理者',
        isAdmin: true,
      },
    });
    console.log('✅ 管理者アカウント作成: admin@example.com / admin1234');
  } else {
    console.log('✅ 管理者アカウント確認済み: admin@example.com');
  }

  // 4. イベントチケット商品作成
  let eventProduct = await prisma.product.findFirst({
    where: {
      productType: 'event',
      name: { contains: 'テストイベント' },
    },
  });

  if (!eventProduct) {
    eventProduct = await prisma.product.create({
      data: {
        name: 'テストイベント - 車の祭典2026',
        slug: 'test-event-car-festival-2026',
        description: 'QRチェックイン機能のテスト用イベントチケットです。\n開催日時: 2026年2月15日 10:00-17:00\n会場: 東京ビッグサイト',
        price: 3000,
        categoryId: category.id,
        productType: 'event',
        isActive: true,
      },
    });

    // 在庫ログ追加（100枚入庫）
    await prisma.inventoryLog.create({
      data: {
        productId: eventProduct.id,
        quantity: 100,
        type: 'purchase',
        note: '初期在庫',
      },
    });

    console.log(`✅ イベント商品作成: ${eventProduct.name}`);
  } else {
    console.log(`✅ イベント商品確認済み: ${eventProduct.name}`);
  }

  // 5. 注文作成
  const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId: user.id,
      status: 'paid',
      paymentMethod: 'bank_transfer',
      totalAmount: eventProduct.price,
      checkedIn: false,
      items: {
        create: [
          {
            productId: eventProduct.id,
            quantity: 1,
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

  // 在庫減算（1枚売上）
  await prisma.inventoryLog.create({
    data: {
      productId: eventProduct.id,
      quantity: -1,
      type: 'sale',
      note: `注文: ${orderNumber}`,
    },
  });

  console.log(`✅ 注文作成: ${order.orderNumber}`);
  console.log(`   - 商品: ${order.items[0].product.name}`);
  console.log(`   - 金額: ¥${order.totalAmount.toLocaleString()}`);
  console.log(`   - 支払い状態: ${order.status}`);
  console.log(`   - 受付状態: ${order.checkedIn ? '受付済み' : '未受付'}\n`);

  console.log('=== テストデータ作成完了 ===\n');
  console.log('【テスト用情報】');
  console.log(`注文番号: ${order.orderNumber}`);
  console.log(`デモユーザー: demo@example.com / demo1234`);
  console.log(`管理者: admin@example.com / admin1234`);
  console.log(`\n受付ページ: http://192.168.2.100:5173/admin/checkin`);
  console.log(`マイページ: http://192.168.2.100:5173/mypage`);
  console.log(`\n【手動入力テスト用】`);
  console.log(`注文番号をコピーして管理画面で受付してください: ${order.orderNumber}`);
}

main()
  .catch((e) => {
    console.error('エラー:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

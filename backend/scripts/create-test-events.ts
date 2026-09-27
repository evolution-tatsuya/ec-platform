/**
 * イベント管理テストデータ作成スクリプト
 *
 * 実行方法:
 * npx tsx backend/scripts/create-test-events.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🎉 イベント管理テストデータ作成開始...\n');

  // 1. カテゴリー取得（eventsカテゴリーを使用、なければ作成）
  let eventsCategory = await prisma.category.findFirst({
    where: { slug: 'events' },
  });

  if (!eventsCategory) {
    eventsCategory = await prisma.category.create({
      data: {
        name: 'イベント',
        slug: 'events',
        description: 'イベントチケット・参加申込',
      },
    });
    console.log('✓ eventsカテゴリー作成完了');
  } else {
    console.log('✓ eventsカテゴリー取得完了');
  }

  // 2. テスト用イベント商品作成（3件）
  const events = [
    {
      name: 'カスタムカーミーティング2026春',
      slug: 'custom-car-meeting-2026-spring',
      description: '全国のカスタムカー愛好家が集結！最新カスタムパーツ展示、試乗会、フォトコンテスト開催！',
      price: 5000,
    },
    {
      name: 'クラシックカーフェスタ',
      slug: 'classic-car-festa-2026',
      description: '往年の名車が大集合！クラシックカーの展示、トークショー、オーナー交流会を開催。',
      price: 3000,
    },
    {
      name: 'エコカーテクノロジー展示会',
      slug: 'eco-car-technology-expo-2026',
      description: '最新のEVやハイブリッド技術を体験！試乗会、技術セミナー、未来のモビリティを考える。',
      price: 8000,
    },
  ];

  const createdEvents = [];
  for (const eventData of events) {
    // 既存チェック
    const existing = await prisma.product.findUnique({
      where: { slug: eventData.slug },
    });

    if (existing) {
      console.log(`⏭  「${eventData.name}」はすでに存在しています（スキップ）`);
      createdEvents.push(existing);
      continue;
    }

    // イベント作成
    const event = await prisma.product.create({
      data: {
        ...eventData,
        productType: 'event',
        categoryId: eventsCategory.id,
        isActive: true,
      },
    });

    console.log(`✓ イベント作成: ${event.name} (ID: ${event.id})`);
    createdEvents.push(event);
  }

  // 3. EventFormTemplate作成（各イベントに1つずつ）
  for (const event of createdEvents) {
    const existingTemplate = await prisma.eventFormTemplate.findUnique({
      where: { productId: event.id },
    });

    if (existingTemplate) {
      console.log(`⏭  「${event.name}」のフォームテンプレートは既に存在しています（スキップ）`);
      continue;
    }

    const template = await prisma.eventFormTemplate.create({
      data: {
        productId: event.id,
        name: `${event.name} 参加申込フォーム`,
        description: 'イベント参加に必要な情報を入力してください',
      },
    });

    // EventFormField作成（共通フィールド）
    const fields = [
      {
        templateId: template.id,
        label: '参加者名',
        fieldType: 'TEXT',
        isRequired: true,
        order: 1,
      },
      {
        templateId: template.id,
        label: 'メールアドレス',
        fieldType: 'EMAIL',
        isRequired: true,
        order: 2,
      },
      {
        templateId: template.id,
        label: '電話番号',
        fieldType: 'PHONE',
        isRequired: true,
        order: 3,
      },
      {
        templateId: template.id,
        label: '参加人数',
        fieldType: 'DROPDOWN',
        isRequired: true,
        order: 4,
        options: JSON.stringify(['1人', '2人', '3人', '4人', '5人以上']),
      },
      {
        templateId: template.id,
        label: '参加理由',
        fieldType: 'TEXTAREA',
        isRequired: false,
        order: 5,
      },
    ];

    await prisma.eventFormField.createMany({ data: fields });
    console.log(`✓ フォームテンプレート作成: ${template.name}`);
  }

  // 4. テスト用ユーザー作成（3名、パスワード: Test1234!）
  const testUsers = [
    {
      email: 'participant1@test.com',
      name: '参加者 太郎',
    },
    {
      email: 'participant2@test.com',
      name: '参加者 花子',
    },
    {
      email: 'participant3@test.com',
      name: '参加者 次郎',
    },
  ];

  const bcrypt = await import('bcrypt');
  const hashedPassword = await bcrypt.hash('Test1234!', 10);

  const createdUsers = [];
  for (const userData of testUsers) {
    const existing = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existing) {
      console.log(`⏭  「${userData.name}」はすでに存在しています（スキップ）`);
      createdUsers.push(existing);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
        isAdmin: false,
      },
    });

    console.log(`✓ テストユーザー作成: ${user.name} (${user.email})`);
    createdUsers.push(user);
  }

  // 5. 注文&デジタルチケット作成（各イベントに1参加者ずつ）
  for (let i = 0; i < createdEvents.length; i++) {
    const event = createdEvents[i];
    const user = createdUsers[i % createdUsers.length];

    // 既存注文チェック
    const existingOrder = await prisma.order.findFirst({
      where: {
        userId: user.id,
        items: {
          some: {
            productId: event.id,
          },
        },
      },
    });

    if (existingOrder) {
      console.log(`⏭  「${user.name}」の「${event.name}」注文は既に存在しています（スキップ）`);
      continue;
    }

    // 注文作成
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: user.id,
        customerName: user.name || 'テスト参加者',
        customerEmail: user.email,
        customerPhone: '090-1234-5678',
        status: 'paid',
        paymentMethod: 'credit_card',
        totalAmount: event.price,
      },
    });

    // 注文商品作成
    const orderItem = await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: event.id,
        quantity: 1,
        price: event.price,
      },
    });

    // デジタルチケット作成
    const ticketCode = `TICKET-${Date.now()}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
    const ticket = await prisma.digitalTicket.create({
      data: {
        orderId: order.id,
        orderItemId: orderItem.id,
        productId: event.id,
        ticketCode,
        qrCodeData: JSON.stringify({
          ticketCode,
          eventId: event.id,
          eventName: event.name,
          customerName: user.name,
          orderNumber,
        }),
      },
    });

    console.log(`✓ チケット作成: ${user.name} → ${event.name} (${ticket.ticketCode})`);
  }

  console.log('\n🎉 イベント管理テストデータ作成完了！');
  console.log(`\n作成データ:`);
  console.log(`  - イベント: ${createdEvents.length}件`);
  console.log(`  - テストユーザー: ${createdUsers.length}名`);
  console.log(`  - デジタルチケット: ${createdEvents.length}枚`);
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/**
 * テストデータ投入スクリプト
 * 注文、商品、問い合わせなどのテストデータを追加
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedTestData() {
  try {
    console.log('🌱 テストデータ投入を開始します...\n');

    // 1. テストユーザー作成
    console.log('👤 テストユーザーを作成中...');
    const testUser = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 10),
        name: 'テストユーザー',
        isAdmin: false,
      },
    });
    console.log('✅ テストユーザー作成完了: test@example.com\n');

    // 2. 商品データ追加
    console.log('📦 商品データを追加中...');

    const product1 = await prisma.product.upsert({
      where: { slug: 'car-inspection-guide-2026' },
      update: {},
      create: {
        name: '車検完全ガイド 2026年版',
        slug: 'car-inspection-guide-2026',
        description: '車検に必要な書類、手続き、費用を網羅したガイドブック。最新の法改正に対応。',
        price: 1500,
        productType: 'physical',
      },
    });

    const product2 = await prisma.product.upsert({
      where: { slug: 'oil-filter-toyota' },
      update: {},
      create: {
        name: 'オイルフィルター (トヨタ車用)',
        slug: 'oil-filter-toyota',
        description: 'トヨタ車専用のオイルフィルター。純正品質で長持ち。',
        price: 800,
        productType: 'physical',
      },
    });

    const product3 = await prisma.product.upsert({
      where: { slug: 'brake-pad-front' },
      update: {},
      create: {
        name: 'ブレーキパッド フロント用',
        slug: 'brake-pad-front',
        description: '高性能ブレーキパッド。制動力が向上し、静粛性も抜群。',
        price: 5800,
        productType: 'physical',
      },
    });

    const product4 = await prisma.product.upsert({
      where: { slug: 'car-event-ticket-2026' },
      update: {},
      create: {
        name: '2026年カーイベント参加チケット',
        slug: 'car-event-ticket-2026',
        description: '年間最大のカーイベントの参加チケット。試乗会や展示会が楽しめます。',
        price: 2000,
        productType: 'event',
      },
    });

    const product5 = await prisma.product.upsert({
      where: { slug: 'custom-car-photo-book-digital' },
      update: {},
      create: {
        name: 'カスタムカー写真集 デジタル版',
        slug: 'custom-car-photo-book-digital',
        description: '国内外のカスタムカー300台を収録したデジタル写真集。',
        price: 1200,
        productType: 'digital',
      },
    });

    // 在庫ログを追加（イミュータブルデータモデル）
    await prisma.inventoryLog.createMany({
      data: [
        { productId: product1.id, quantity: 100, type: 'purchase', note: '初期在庫' },
        { productId: product2.id, quantity: 50, type: 'purchase', note: '初期在庫' },
        { productId: product3.id, quantity: 30, type: 'purchase', note: '初期在庫' },
        { productId: product4.id, quantity: 200, type: 'purchase', note: '初期在庫' },
        { productId: product5.id, quantity: 999, type: 'purchase', note: '初期在庫' },
      ],
    });

    console.log(`✅ 商品データ追加完了: 5件\n`);

    // 3. 注文データ追加
    console.log('🛒 注文データを追加中...');

    // 注文1: 入金待ち
    await prisma.order.create({
      data: {
        orderNumber: `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-00001`,
        userId: testUser.id,
        customerName: testUser.name || 'テストユーザー',
        customerEmail: testUser.email,
        customerPhone: '090-1234-5678',
        shippingPostalCode: '150-0001',
        shippingAddress: '東京都渋谷区神宮前1-2-3',
        totalAmount: 7300,
        paymentMethod: 'bank_transfer',
        status: 'pending',
        items: {
          create: [
            {
              productId: product1.id,
              quantity: 2,
              price: 1500,
            },
            {
              productId: product2.id,
              quantity: 5,
              price: 800,
            },
          ],
        },
      },
    });

    // 在庫減算ログ
    await prisma.inventoryLog.createMany({
      data: [
        { productId: product1.id, quantity: -2, type: 'sale', note: '注文 ORD-00001' },
        { productId: product2.id, quantity: -5, type: 'sale', note: '注文 ORD-00001' },
      ],
    });

    // 注文2: 発送済み
    await prisma.order.create({
      data: {
        orderNumber: `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-00002`,
        userId: testUser.id,
        customerName: testUser.name || 'テストユーザー',
        customerEmail: testUser.email,
        customerPhone: '090-1234-5678',
        shippingPostalCode: '150-0001',
        shippingAddress: '東京都渋谷区神宮前1-2-3',
        totalAmount: 6300,
        paymentMethod: 'credit_card',
        status: 'shipped',
        carrier: 'yamato',
        trackingNumber: '1234-5678-9012',
        items: {
          create: [
            {
              productId: product3.id,
              quantity: 1,
              price: 5800,
            },
          ],
        },
      },
    });

    // 在庫減算ログ
    await prisma.inventoryLog.create({
      data: { productId: product3.id, quantity: -1, type: 'sale', note: '注文 ORD-00002' },
    });

    // 注文3: 配達完了
    await prisma.order.create({
      data: {
        orderNumber: `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-00003`,
        userId: testUser.id,
        customerName: testUser.name || 'テストユーザー',
        customerEmail: testUser.email,
        customerPhone: '090-1234-5678',
        shippingPostalCode: '150-0001',
        shippingAddress: '東京都渋谷区神宮前1-2-3',
        totalAmount: 2000,
        paymentMethod: 'credit_card',
        status: 'delivered',
        items: {
          create: [
            {
              productId: product4.id,
              quantity: 1,
              price: 2000,
            },
          ],
        },
      },
    });

    // 在庫減算ログ
    await prisma.inventoryLog.create({
      data: { productId: product4.id, quantity: -1, type: 'sale', note: '注文 ORD-00003' },
    });

    console.log('✅ 注文データ追加完了: 3件\n');

    // 4. 問い合わせデータ追加
    console.log('💬 問い合わせデータを追加中...');

    await prisma.inquiry.create({
      data: {
        userId: testUser.id,
        name: testUser.name || 'テストユーザー',
        email: testUser.email,
        subject: '商品の在庫について',
        message: 'ブレーキパッドの在庫はいつ頃補充されますか？',
        status: 'pending',
      },
    });

    await prisma.inquiry.create({
      data: {
        userId: testUser.id,
        name: testUser.name || 'テストユーザー',
        email: testUser.email,
        subject: '配送について',
        message: '注文した商品はいつ届きますか？追跡番号を教えてください。',
        status: 'replied',
        reply: 'ご注文の商品は本日発送されました。追跡番号は1234-5678-9012です。',
        repliedAt: new Date(),
      },
    });

    await prisma.inquiry.create({
      data: {
        userId: testUser.id,
        name: testUser.name || 'テストユーザー',
        email: testUser.email,
        subject: '返品について',
        message: '商品のサイズが合わなかったので返品したいです。',
        status: 'closed',
        reply: '返品を承りました。返送用の伝票をお送りいたしますので、お待ちください。',
        repliedAt: new Date(),
      },
    });

    console.log('✅ 問い合わせデータ追加完了: 3件\n');

    console.log('🎉 すべてのテストデータ投入が完了しました！\n');
    console.log('==========================================');
    console.log('📧 テストユーザー: test@example.com');
    console.log('🔑 パスワード: password123');
    console.log('==========================================\n');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestData();

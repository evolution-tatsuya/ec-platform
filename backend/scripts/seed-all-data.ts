// ===== 統合テストデータシードスクリプト =====
// 目的: 開発に必要な全データを一括投入
// 実行: npx tsx scripts/seed-all-data.ts

import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

// 環境変数読み込み
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 統合テストデータシード開始...\n');

  // ===== 1. カテゴリー作成 (5件) =====
  console.log('📁 カテゴリー作成中...');

  const carsCategory = await prisma.category.upsert({
    where: { slug: 'cars' },
    update: {},
    create: {
      name: '車パーツ',
      slug: 'cars',
      description: '自動車パーツ・アクセサリー',
    },
  });

  const eventsCategory = await prisma.category.upsert({
    where: { slug: 'events' },
    update: {},
    create: {
      name: 'イベント',
      slug: 'events',
      description: 'カーイベント・ミーティング',
    },
  });

  const digitalCategory = await prisma.category.upsert({
    where: { slug: 'digital' },
    update: {},
    create: {
      name: 'デジタル商品',
      slug: 'digital',
      description: 'デジタルコンテンツ',
    },
  });

  const accessoriesCategory = await prisma.category.upsert({
    where: { slug: 'accessories' },
    update: {},
    create: {
      name: 'アクセサリー',
      slug: 'accessories',
      description: 'カーアクセサリー',
    },
  });

  const othersCategory = await prisma.category.upsert({
    where: { slug: 'others' },
    update: {},
    create: {
      name: 'その他',
      slug: 'others',
      description: 'その他商品',
    },
  });

  const categoryCount = await prisma.category.count();
  console.log(`✅ カテゴリー作成完了: ${categoryCount}件\n`);

  // ===== 2. 商品作成 (15件) =====
  console.log('🛍️  商品作成中...');

  // 車パーツ商品（5件: physical）
  const carProducts = [
    {
      name: 'ターボキット GT2860RS',
      slug: 'turbo-kit-gt2860rs',
      description: '高性能ターボキット。最大馬力350psまで対応。',
      price: 198000,
      categoryId: carsCategory.id,
      productType: 'physical',
      isActive: true,
    },
    {
      name: 'エアロパーツセット フロント・リア・サイド',
      slug: 'aero-parts-set-complete',
      description: 'FRP製エアロパーツ3点セット。カーボン調塗装済み。',
      price: 128000,
      categoryId: carsCategory.id,
      productType: 'physical',
      isActive: true,
    },
    {
      name: 'レーシングシート FIA公認',
      slug: 'racing-seat-fia',
      description: 'FIA公認レーシングシート。ホールド性抜群で長時間走行も快適。',
      price: 85000,
      categoryId: carsCategory.id,
      productType: 'physical',
      isActive: true,
    },
    {
      name: 'LEDヘッドライト 6000K',
      slug: 'led-headlight-6000k',
      description: '明るさ8000lm。純白光で視認性向上。',
      price: 32000,
      categoryId: carsCategory.id,
      productType: 'physical',
      isActive: true,
    },
    {
      name: 'スポーツマフラー ステンレス製',
      slug: 'sports-muffler-stainless',
      description: 'オールステンレス製。重低音サウンド。',
      price: 78000,
      categoryId: carsCategory.id,
      productType: 'physical',
      isActive: true,
    },
  ];

  // イベント商品（5件: digital_ticket）
  const eventProducts = [
    {
      name: 'スーパーカーミーティング 2026春',
      slug: 'super-car-meeting-2026-spring',
      description: '年に一度の大規模カーイベント。全国から200台以上が集結！',
      price: 5000,
      categoryId: eventsCategory.id,
      productType: 'digital_ticket',
      isActive: true,
    },
    {
      name: 'ドリフト走行会 富士スピードウェイ',
      slug: 'drift-session-fuji',
      description: 'プロドリフターによる特別レッスン付き。',
      price: 12000,
      categoryId: eventsCategory.id,
      productType: 'digital_ticket',
      isActive: true,
    },
    {
      name: 'カスタムカーコンテスト 2026',
      slug: 'custom-car-contest-2026',
      description: '自慢の愛車を展示しよう！観覧チケット。',
      price: 3000,
      categoryId: eventsCategory.id,
      productType: 'digital_ticket',
      isActive: true,
    },
    {
      name: 'オフロード走行体験 in 山梨',
      slug: 'offroad-experience-yamanashi',
      description: '初心者歓迎！4WD車で本格オフロード走行。',
      price: 8000,
      categoryId: eventsCategory.id,
      productType: 'digital_ticket',
      isActive: true,
    },
    {
      name: '旧車ミーティング 横浜',
      slug: 'classic-car-meeting-yokohama',
      description: '昭和の名車が大集合。懐かしい1台に会える。',
      price: 2000,
      categoryId: eventsCategory.id,
      productType: 'digital_ticket',
      isActive: true,
    },
  ];

  // デジタル商品（5件: digital）
  const digitalProducts = [
    {
      name: '車両整備マニュアル 完全版 (PDF)',
      slug: 'vehicle-maintenance-manual-complete',
      description: 'エンジン・サスペンション・電装系まで網羅した300ページの詳細マニュアル。',
      price: 4800,
      categoryId: digitalCategory.id,
      productType: 'digital',
      isActive: true,
    },
    {
      name: 'カスタムペイント デザイン集 Vol.1',
      slug: 'custom-paint-design-vol1',
      description: 'プロデザイナーによるペイントデザイン100点収録。',
      price: 3500,
      categoryId: digitalCategory.id,
      productType: 'digital',
      isActive: true,
    },
    {
      name: 'ドラテク上達講座 動画セット',
      slug: 'driving-technique-video-set',
      description: 'サーキット走行テクニックを動画で学ぶ（MP4形式、計3時間）。',
      price: 6800,
      categoryId: digitalCategory.id,
      productType: 'digital',
      isActive: true,
    },
    {
      name: 'カー写真撮影ガイド (PDF)',
      slug: 'car-photography-guide',
      description: '愛車を美しく撮影するためのテクニック集。',
      price: 2200,
      categoryId: digitalCategory.id,
      productType: 'digital',
      isActive: true,
    },
    {
      name: '車検完全ガイド 2026年版',
      slug: 'vehicle-inspection-guide-2026',
      description: '車検の流れ・必要書類・費用を徹底解説。',
      price: 1500,
      categoryId: digitalCategory.id,
      productType: 'digital',
      isActive: true,
    },
  ];

  // 全商品を投入
  const allProducts = [...carProducts, ...eventProducts, ...digitalProducts];

  for (const productData of allProducts) {
    await prisma.product.upsert({
      where: { slug: productData.slug },
      update: {},
      create: productData,
    });
  }

  const productCount = await prisma.product.count();
  console.log(`✅ 商品作成完了: ${productCount}件\n`);

  // ===== 3. テストユーザー作成 (1件) =====
  console.log('👤 テストユーザー作成中...');

  const hashedPassword = await bcrypt.hash('TestPassword123', 10);

  await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: hashedPassword,
      name: 'テストユーザー',
      isAdmin: false,
      defaultAddress: '東京都渋谷区道玄坂1-2-3',
      defaultPostalCode: '150-0043',
      defaultPhone: '090-1234-5678',
    },
  });

  const userCount = await prisma.user.count();
  console.log(`✅ テストユーザー作成完了: ${userCount}件\n`);

  // ===== 4. ヒーロースライド作成 (3件) =====
  console.log('📸 ヒーロースライド作成中...');

  await prisma.heroSlide.deleteMany({});

  await prisma.heroSlide.createMany({
    data: [
      {
        imageUrl: 'https://placehold.co/1200x400/4f46e5/ffffff?text=New+Spring+Sale',
        title: '新春セール開催中',
        description: '全商品10%OFF！期間限定のお得なキャンペーン',
        linkUrl: '/products',
        order: 1,
        isActive: true,
      },
      {
        imageUrl: 'https://placehold.co/1200x400/ec4899/ffffff?text=New+Arrivals',
        title: '新商品入荷',
        description: '最新モデル対応パーツが続々入荷中',
        linkUrl: '/cars',
        order: 2,
        isActive: true,
      },
      {
        imageUrl: 'https://placehold.co/1200x400/14b8a6/ffffff?text=Event+Registration',
        title: 'イベント告知',
        description: '今月のカーイベント情報をチェック',
        linkUrl: '/events',
        order: 3,
        isActive: true,
      },
    ],
  });

  const heroSlideCount = await prisma.heroSlide.count();
  console.log(`✅ ヒーロースライド作成完了: ${heroSlideCount}件\n`);

  // ===== 5. メガカテゴリー作成 (3件) =====
  console.log('🎨 メガカテゴリー作成中...');

  await prisma.megaCategory.deleteMany({});

  await prisma.megaCategory.createMany({
    data: [
      {
        categoryType: 'cars',
        name: '車パーツ',
        description: '豊富な車種対応のパーツを取り揃えています',
        backgroundImageUrl: 'https://placehold.co/600x300/3b82f6/ffffff?text=Car+Parts',
        linkUrl: '/cars',
        order: 1,
        isActive: true,
      },
      {
        categoryType: 'events',
        name: 'イベント',
        description: 'カーイベントやミーティングの参加受付中',
        backgroundImageUrl: 'https://placehold.co/600x300/8b5cf6/ffffff?text=Events',
        linkUrl: '/events',
        order: 2,
        isActive: true,
      },
      {
        categoryType: 'digital',
        name: 'デジタル商品',
        description: 'デジタルコンテンツをダウンロード',
        backgroundImageUrl: 'https://placehold.co/600x300/10b981/ffffff?text=Digital',
        linkUrl: '/digital-products',
        order: 3,
        isActive: true,
      },
    ],
  });

  const megaCategoryCount = await prisma.megaCategory.count();
  console.log(`✅ メガカテゴリー作成完了: ${megaCategoryCount}件\n`);

  // ===== 6. ニュース作成 (3件) =====
  console.log('📰 ニュース作成中...');

  await prisma.newsItem.deleteMany({});

  await prisma.newsItem.createMany({
    data: [
      {
        title: 'サイトオープンのお知らせ',
        content: '多機能ECプラットフォームがオープンしました！車パーツ、イベント、デジタル商品を豊富に取り揃えております。',
        publishedAt: new Date('2026-02-01'),
        isPublished: true,
      },
      {
        title: '配送スケジュールのお知らせ',
        content: '現在、ご注文から発送まで3-5営業日頂いております。お急ぎの場合はお問い合わせください。',
        publishedAt: new Date('2026-02-02'),
        isPublished: true,
      },
      {
        title: 'キャンペーン情報',
        content: '新規会員登録で1000円分のクーポンプレゼント！この機会にぜひご利用ください。',
        publishedAt: new Date('2026-02-02'),
        isPublished: true,
      },
    ],
  });

  const newsCount = await prisma.newsItem.count();
  console.log(`✅ ニュース作成完了: ${newsCount}件\n`);

  // ===== 7. 在庫データ作成 =====
  console.log('📦 在庫データ作成中...');

  // 物理商品のみ在庫を設定
  const physicalProducts = await prisma.product.findMany({
    where: { productType: 'physical' },
  });

  for (const product of physicalProducts) {
    const stockQuantity = Math.floor(Math.random() * 41) + 10; // 10-50の在庫

    // 既存の在庫ログをチェック
    const existingLog = await prisma.inventoryLog.findFirst({
      where: {
        productId: product.id,
        type: 'purchase',
        note: '初期在庫投入',
      },
    });

    if (!existingLog) {
      await prisma.inventoryLog.create({
        data: {
          productId: product.id,
          quantity: stockQuantity,
          type: 'purchase',
          note: '初期在庫投入',
        },
      });
    }
  }

  // イベント商品の在庫（20-100）
  const eventProductsList = await prisma.product.findMany({
    where: { productType: 'digital_ticket' },
  });

  for (const product of eventProductsList) {
    const stockQuantity = Math.floor(Math.random() * 81) + 20; // 20-100の在庫

    const existingLog = await prisma.inventoryLog.findFirst({
      where: {
        productId: product.id,
        type: 'purchase',
        note: 'イベント定員数',
      },
    });

    if (!existingLog) {
      await prisma.inventoryLog.create({
        data: {
          productId: product.id,
          quantity: stockQuantity,
          type: 'purchase',
          note: 'イベント定員数',
        },
      });
    }
  }

  // デジタル商品の在庫（999）
  const digitalProductsList = await prisma.product.findMany({
    where: { productType: 'digital' },
  });

  for (const product of digitalProductsList) {
    const existingLog = await prisma.inventoryLog.findFirst({
      where: {
        productId: product.id,
        type: 'purchase',
        note: 'デジタル商品（実質無制限）',
      },
    });

    if (!existingLog) {
      await prisma.inventoryLog.create({
        data: {
          productId: product.id,
          quantity: 999,
          type: 'purchase',
          note: 'デジタル商品（実質無制限）',
        },
      });
    }
  }

  const inventoryCount = await prisma.inventoryLog.count();
  console.log(`✅ 在庫データ作成完了: ${inventoryCount}件\n`);

  // ===== 最終集計 =====
  console.log('=== テストデータ投入完了 ===');
  console.log(`カテゴリー: ${categoryCount}件`);
  console.log(`商品: ${productCount}件`);
  console.log(`  - 物理商品（車パーツ）: ${physicalProducts.length}件`);
  console.log(`  - イベントチケット: ${eventProductsList.length}件`);
  console.log(`  - デジタル商品: ${digitalProductsList.length}件`);
  console.log(`テストユーザー: ${userCount}件`);
  console.log(`ヒーロースライド: ${heroSlideCount}件`);
  console.log(`メガカテゴリー: ${megaCategoryCount}件`);
  console.log(`ニュース: ${newsCount}件`);
  console.log(`在庫ログ: ${inventoryCount}件`);
  console.log('🎉 全データのシード完了！');
}

main()
  .catch((e) => {
    console.error('❌ シード実行エラー:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

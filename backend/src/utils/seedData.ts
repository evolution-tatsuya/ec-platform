// ===== テストデータ投入スクリプト =====
// 目的: 開発用のカテゴリー・商品データを投入

import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';

// 環境変数読み込み
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

const prisma = new PrismaClient();

async function main() {
  console.log('=== テストデータ投入開始 ===\n');

  // ===== カテゴリー作成 =====
  console.log('1. カテゴリー作成中...');

  // 車パーツカテゴリー
  const carsCategory = await prisma.category.upsert({
    where: { slug: 'cars' },
    update: {},
    create: {
      name: '車パーツ',
      slug: 'cars',
      description: '自動車パーツ・アクセサリー',
    },
  });

  const partsCategories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'engine-parts' },
      update: {},
      create: {
        name: 'エンジンパーツ',
        slug: 'engine-parts',
        description: 'エンジン関連パーツ',
        parentId: carsCategory.id,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'exterior-parts' },
      update: {},
      create: {
        name: 'エクステリアパーツ',
        slug: 'exterior-parts',
        description: '外装パーツ',
        parentId: carsCategory.id,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'interior-parts' },
      update: {},
      create: {
        name: 'インテリアパーツ',
        slug: 'interior-parts',
        description: '内装パーツ',
        parentId: carsCategory.id,
      },
    }),
  ]);

  // イベントカテゴリー
  const eventsCategory = await prisma.category.upsert({
    where: { slug: 'events' },
    update: {},
    create: {
      name: 'イベント',
      slug: 'events',
      description: 'カーイベント・ミーティング',
    },
  });

  // デジタル商品カテゴリー
  const digitalCategory = await prisma.category.upsert({
    where: { slug: 'digital' },
    update: {},
    create: {
      name: 'デジタル商品',
      slug: 'digital',
      description: 'デジタルコンテンツ',
    },
  });

  console.log(`✅ カテゴリー作成完了: ${partsCategories.length + 3}件\n`);

  // ===== 商品作成 =====
  console.log('2. 商品作成中...');

  const products = [];

  // 車パーツ商品（30点）
  for (let i = 1; i <= 10; i++) {
    products.push({
      name: `ターボキット No.${String(i).padStart(3, '0')}`,
      slug: `turbo-kit-${i}`,
      description: `高性能ターボキット。馬力アップに最適。`,
      price: 150000 + i * 10000,
      categoryId: partsCategories[0].id,
      productType: 'physical',
      isActive: true,
    });
  }

  for (let i = 1; i <= 10; i++) {
    products.push({
      name: `エアロパーツセット No.${String(i).padStart(3, '0')}`,
      slug: `aero-parts-${i}`,
      description: `フロント・リア・サイドスカートの3点セット。`,
      price: 80000 + i * 5000,
      categoryId: partsCategories[1].id,
      productType: 'physical',
      isActive: true,
    });
  }

  for (let i = 1; i <= 10; i++) {
    products.push({
      name: `レーシングシート No.${String(i).padStart(3, '0')}`,
      slug: `racing-seat-${i}`,
      description: `FIA公認レーシングシート。ホールド性抜群。`,
      price: 45000 + i * 3000,
      categoryId: partsCategories[2].id,
      productType: 'physical',
      isActive: true,
    });
  }

  // イベントチケット（10点）
  for (let i = 1; i <= 10; i++) {
    products.push({
      name: `カーミーティング ${i}月開催`,
      slug: `car-meeting-${i}`,
      description: `月例カーミーティング参加チケット。`,
      price: 3000,
      categoryId: eventsCategory.id,
      productType: 'digital_ticket',
      isActive: true,
    });
  }

  // デジタル商品（10点）
  for (let i = 1; i <= 10; i++) {
    products.push({
      name: `整備マニュアル Vol.${i}`,
      slug: `manual-vol-${i}`,
      description: `車両整備マニュアル（PDF版）。`,
      price: 2000,
      categoryId: digitalCategory.id,
      productType: 'digital',
      isActive: true,
    });
  }

  // 一括作成
  let createdCount = 0;
  for (const productData of products) {
    await prisma.product.upsert({
      where: { slug: productData.slug },
      update: {},
      create: productData,
    });
    createdCount++;
    if (createdCount % 10 === 0) {
      console.log(`  ${createdCount}/${products.length}件作成済み...`);
    }
  }

  console.log(`✅ 商品作成完了: ${products.length}件\n`);

  // ===== 在庫ログ作成 =====
  console.log('3. 在庫データ作成中...');

  const allProducts = await prisma.product.findMany({
    where: {
      productType: 'physical',
    },
  });

  for (const product of allProducts) {
    await prisma.inventoryLog.create({
      data: {
        productId: product.id,
        quantity: Math.floor(Math.random() * 50) + 10, // 10〜60の在庫
        type: 'purchase',
        note: '初期在庫',
      },
    });
  }

  console.log(`✅ 在庫データ作成完了: ${allProducts.length}件\n`);

  // ===== 集計 =====
  const categoryCount = await prisma.category.count();
  const productCount = await prisma.product.count();
  const inventoryCount = await prisma.inventoryLog.count();

  console.log('=== テストデータ投入完了 ===');
  console.log(`カテゴリー: ${categoryCount}件`);
  console.log(`商品: ${productCount}件`);
  console.log(`在庫ログ: ${inventoryCount}件`);
}

main()
  .catch((e) => {
    console.error('エラー:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

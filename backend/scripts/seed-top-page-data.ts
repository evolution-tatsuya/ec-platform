// ===== トップページデータシードスクリプト =====
// 目的: ヒーロースライド、メガカテゴリー、ピックアップ商品、ニュースのテストデータを作成

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 トップページデータシード開始...\n');

  // ===== 1. ヒーロースライド =====
  console.log('📸 ヒーロースライド作成中...');

  // 既存のヒーロースライドを削除
  await prisma.heroSlide.deleteMany({});

  const heroSlides = await prisma.heroSlide.createMany({
    data: [
      {
        imageUrl: 'https://placehold.co/1200x400/4f46e5/ffffff?text=Hero+Slide+1',
        title: '新春セール開催中',
        description: '全商品10%OFF！期間限定のお得なキャンペーン',
        linkUrl: '/products',
        order: 1,
        isActive: true,
      },
      {
        imageUrl: 'https://placehold.co/1200x400/ec4899/ffffff?text=Hero+Slide+2',
        title: '新車種パーツ入荷',
        description: '最新モデル対応パーツが続々入荷中',
        linkUrl: '/cars',
        order: 2,
        isActive: true,
      },
      {
        imageUrl: 'https://placehold.co/1200x400/14b8a6/ffffff?text=Hero+Slide+3',
        title: 'イベント参加者募集',
        description: '今月のカーイベント情報をチェック',
        linkUrl: '/events',
        order: 3,
        isActive: true,
      },
    ],
  });
  console.log(`✅ ヒーロースライド ${heroSlides.count}件 作成完了\n`);

  // ===== 2. メガカテゴリー =====
  console.log('🎨 メガカテゴリー作成中...');

  // 既存のメガカテゴリーを削除
  await prisma.megaCategory.deleteMany({});

  const megaCategories = await prisma.megaCategory.createMany({
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
  console.log(`✅ メガカテゴリー ${megaCategories.count}件 作成完了\n`);

  // ===== 3. ピックアップ商品 =====
  console.log('⭐ ピックアップ商品設定中...');

  // アクティブな商品を取得（最大6件）
  const products = await prisma.product.findMany({
    where: { isActive: true },
    take: 6,
    orderBy: { createdAt: 'desc' },
  });

  if (products.length > 0) {
    // 既存のピックアップ商品を削除
    await prisma.pickupProduct.deleteMany({});

    const pickupProducts = await prisma.pickupProduct.createMany({
      data: products.map((product, index) => ({
        productId: product.id,
        order: index + 1,
        isActive: true,
      })),
    });
    console.log(`✅ ピックアップ商品 ${pickupProducts.count}件 設定完了\n`);
  } else {
    console.log('⚠️  アクティブな商品がないため、ピックアップ商品は作成されませんでした\n');
  }

  // ===== 4. ニュース =====
  console.log('📰 ニュース作成中...');

  // 既存のニュースを削除
  await prisma.newsItem.deleteMany({});

  const newsItems = await prisma.newsItem.createMany({
    data: [
      {
        title: '新春セール開催のお知らせ',
        content: '1月15日より全商品10%OFFのセールを開催いたします。期間限定ですのでお見逃しなく！',
        publishedAt: new Date('2026-01-15'),
        isPublished: true,
      },
      {
        title: '配送遅延のお詫び',
        content: '一部地域において配送遅延が発生しております。ご迷惑をおかけし申し訳ございません。',
        publishedAt: new Date('2026-01-20'),
        isPublished: true,
      },
      {
        title: '新商品入荷情報',
        content: '最新モデル対応のカスタムパーツが入荷しました。詳細は商品ページをご確認ください。',
        publishedAt: new Date('2026-01-25'),
        isPublished: true,
      },
      {
        title: 'カーイベント開催決定',
        content: '2月10日に大規模カーイベントを開催します。参加受付を開始しましたので、イベントページよりお申し込みください。',
        publishedAt: new Date('2026-01-28'),
        isPublished: true,
      },
      {
        title: 'サイトリニューアルのお知らせ',
        content: '当サイトをリニューアルいたしました。より使いやすく、見やすいデザインに変更しております。',
        publishedAt: new Date('2026-01-30'),
        isPublished: true,
      },
    ],
  });
  console.log(`✅ ニュース ${newsItems.count}件 作成完了\n`);

  console.log('🎉 トップページデータシード完了！');
}

main()
  .catch((e) => {
    console.error('❌ シード実行エラー:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

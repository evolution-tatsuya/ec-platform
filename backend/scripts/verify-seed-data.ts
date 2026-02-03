// ===== シードデータ検証スクリプト =====
// 目的: 投入されたテストデータを確認

import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';

// 環境変数読み込み
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 データベース検証開始...\n');

  // ===== 1. カテゴリー確認 =====
  console.log('📁 カテゴリー確認:');
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
  });
  console.log(`  総数: ${categories.length}件`);
  categories.forEach((cat) => {
    console.log(`    - ${cat.name} (slug: ${cat.slug})`);
  });
  console.log('');

  // ===== 2. 商品確認 =====
  console.log('🛍️  商品確認:');
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { productType: 'asc' },
  });
  console.log(`  総数: ${products.length}件`);

  const physicalProducts = products.filter((p) => p.productType === 'physical');
  const ticketProducts = products.filter((p) => p.productType === 'digital_ticket');
  const digitalProducts = products.filter((p) => p.productType === 'digital');

  console.log(`\n  物理商品（physical）: ${physicalProducts.length}件`);
  physicalProducts.forEach((p) => {
    console.log(`    - ${p.name} (¥${p.price.toLocaleString()})`);
  });

  console.log(`\n  イベントチケット（digital_ticket）: ${ticketProducts.length}件`);
  ticketProducts.forEach((p) => {
    console.log(`    - ${p.name} (¥${p.price.toLocaleString()})`);
  });

  console.log(`\n  デジタル商品（digital）: ${digitalProducts.length}件`);
  digitalProducts.forEach((p) => {
    console.log(`    - ${p.name} (¥${p.price.toLocaleString()})`);
  });
  console.log('');

  // ===== 3. 在庫確認 =====
  console.log('📦 在庫確認:');
  const inventoryLogs = await prisma.inventoryLog.findMany({
    include: { product: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`  在庫ログ総数: ${inventoryLogs.length}件`);

  for (const log of inventoryLogs) {
    console.log(`    - ${log.product.name}: ${log.quantity}個 (${log.note})`);
  }
  console.log('');

  // ===== 4. テストユーザー確認 =====
  console.log('👤 テストユーザー確認:');
  const users = await prisma.user.findMany();
  console.log(`  総数: ${users.length}件`);
  users.forEach((user) => {
    console.log(`    - ${user.name} (${user.email})`);
    console.log(`      管理者: ${user.isAdmin ? 'はい' : 'いいえ'}`);
  });
  console.log('');

  // ===== 5. ヒーロースライド確認 =====
  console.log('📸 ヒーロースライド確認:');
  const heroSlides = await prisma.heroSlide.findMany({
    orderBy: { order: 'asc' },
  });
  console.log(`  総数: ${heroSlides.count}件`);
  heroSlides.forEach((slide) => {
    console.log(`    - ${slide.title} (order: ${slide.order})`);
  });
  console.log('');

  // ===== 6. メガカテゴリー確認 =====
  console.log('🎨 メガカテゴリー確認:');
  const megaCategories = await prisma.megaCategory.findMany({
    orderBy: { order: 'asc' },
  });
  console.log(`  総数: ${megaCategories.length}件`);
  megaCategories.forEach((mega) => {
    console.log(`    - ${mega.name} (categoryType: ${mega.categoryType})`);
  });
  console.log('');

  // ===== 7. ニュース確認 =====
  console.log('📰 ニュース確認:');
  const newsItems = await prisma.newsItem.findMany({
    orderBy: { publishedAt: 'desc' },
  });
  console.log(`  総数: ${newsItems.length}件`);
  newsItems.forEach((news) => {
    const date = news.publishedAt.toISOString().split('T')[0];
    console.log(`    - ${news.title} (${date})`);
  });
  console.log('');

  console.log('✅ データベース検証完了！');
}

main()
  .catch((e) => {
    console.error('❌ 検証エラー:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

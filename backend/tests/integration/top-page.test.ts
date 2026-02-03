/**
 * トップページAPI 統合テスト（実DB検証版）
 *
 * テスト対象:
 * - GET /api/top-page - トップページデータ取得
 *
 * 実行方法:
 * npx ts-node tests/integration/top-page.test.ts
 *
 * 検証方針:
 * 1. Prisma Clientで直接DBアクセスし、実データを取得
 * 2. APIレスポンスと突き合わせて一致を確認
 * 3. リレーションデータの完全性チェック
 * 4. トランザクション整合性検証
 */

import { config } from '../../src/config';
import { PrismaClient } from '@prisma/client';

const BASE_URL = config.backendUrl || 'http://localhost:8432';
const prisma = new PrismaClient();

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

/**
 * レスポンス型
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiResponse = any;

/**
 * テストヘルパー関数
 */
async function runTest(
  testName: string,
  testFn: () => Promise<void>
): Promise<void> {
  try {
    await testFn();
    results.push({ testName, passed: true });
    console.log(`✅ ${testName}`);
  } catch (error) {
    results.push({
      testName,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.error(`❌ ${testName}`);
    console.error(`   エラー: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * テスト1: ヒーロースライドのDB突き合わせ
 */
async function testHeroSlidesDbMatch() {
  // 1. DBから直接取得
  const dbHeroSlides = await prisma.heroSlide.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
  });

  // 2. API経由で取得
  const response = await fetch(`${BASE_URL}/api/top-page`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data: ApiResponse = await response.json();
  if (!data.success) {
    throw new Error('success: false');
  }

  const apiHeroSlides = data.data.heroSlides;

  // 3. 件数の一致確認
  if (dbHeroSlides.length !== apiHeroSlides.length) {
    throw new Error(
      `ヒーロースライド件数が不一致: DB=${dbHeroSlides.length}, API=${apiHeroSlides.length}`
    );
  }

  // 4. 各スライドの完全一致確認
  for (let i = 0; i < dbHeroSlides.length; i++) {
    const dbSlide = dbHeroSlides[i];
    const apiSlide = apiHeroSlides[i];

    if (dbSlide.id !== apiSlide.id) {
      throw new Error(`スライド${i}のIDが不一致: DB=${dbSlide.id}, API=${apiSlide.id}`);
    }

    if (dbSlide.imageUrl !== apiSlide.imageUrl) {
      throw new Error(`スライド${i}のimageUrlが不一致`);
    }

    if (dbSlide.order !== apiSlide.order) {
      throw new Error(`スライド${i}のorderが不一致: DB=${dbSlide.order}, API=${apiSlide.order}`);
    }

    if (dbSlide.isActive !== apiSlide.isActive) {
      throw new Error(`スライド${i}のisActiveが不一致`);
    }
  }

  console.log(`   ✓ DB件数: ${dbHeroSlides.length}, API件数: ${apiHeroSlides.length}`);
  console.log(`   ✓ 全件一致確認済み`);
}

/**
 * テスト2: メガカテゴリーのDB突き合わせ
 */
async function testMegaCategoriesDbMatch() {
  // 1. DBから直接取得
  const dbMegaCategories = await prisma.megaCategory.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
  });

  // 2. API経由で取得
  const response = await fetch(`${BASE_URL}/api/top-page`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data: ApiResponse = await response.json();
  if (!data.success) {
    throw new Error('success: false');
  }

  const apiMegaCategories = data.data.megaCategories;

  // 3. 件数の一致確認
  if (dbMegaCategories.length !== apiMegaCategories.length) {
    throw new Error(
      `メガカテゴリー件数が不一致: DB=${dbMegaCategories.length}, API=${apiMegaCategories.length}`
    );
  }

  // 4. 各カテゴリーの完全一致確認
  for (let i = 0; i < dbMegaCategories.length; i++) {
    const dbCategory = dbMegaCategories[i];
    const apiCategory = apiMegaCategories[i];

    if (dbCategory.id !== apiCategory.id) {
      throw new Error(`カテゴリー${i}のIDが不一致: DB=${dbCategory.id}, API=${apiCategory.id}`);
    }

    if (dbCategory.categoryType !== apiCategory.categoryType) {
      throw new Error(`カテゴリー${i}のcategoryTypeが不一致`);
    }

    if (dbCategory.name !== apiCategory.name) {
      throw new Error(`カテゴリー${i}のnameが不一致`);
    }

    if (dbCategory.backgroundImageUrl !== apiCategory.backgroundImageUrl) {
      throw new Error(`カテゴリー${i}のbackgroundImageUrlが不一致`);
    }

    if (dbCategory.linkUrl !== apiCategory.linkUrl) {
      throw new Error(`カテゴリー${i}のlinkUrlが不一致`);
    }
  }

  console.log(`   ✓ DB件数: ${dbMegaCategories.length}, API件数: ${apiMegaCategories.length}`);
  console.log(`   ✓ 全件一致確認済み`);
}

/**
 * テスト3: ピックアップ商品のリレーション完全性チェック
 */
async function testPickupProductsRelationIntegrity() {
  // 1. DBから直接取得（リレーション含む）
  const dbPickupProducts = await prisma.pickupProduct.findMany({
    where: { isActive: true },
    include: {
      product: {
        include: {
          category: true,
        },
      },
    },
    orderBy: { order: 'asc' },
  });

  // 2. API経由で取得
  const response = await fetch(`${BASE_URL}/api/top-page`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data: ApiResponse = await response.json();
  if (!data.success) {
    throw new Error('success: false');
  }

  const apiPickupProducts = data.data.pickupProducts;

  // 3. 件数の一致確認
  if (dbPickupProducts.length !== apiPickupProducts.length) {
    throw new Error(
      `ピックアップ商品件数が不一致: DB=${dbPickupProducts.length}, API=${apiPickupProducts.length}`
    );
  }

  // 4. リレーションデータの完全性チェック
  for (let i = 0; i < dbPickupProducts.length; i++) {
    const dbPickup = dbPickupProducts[i];
    const apiPickup = apiPickupProducts[i];

    // PickupProduct自体のチェック
    if (dbPickup.id !== apiPickup.id) {
      throw new Error(`ピックアップ${i}のIDが不一致`);
    }

    if (dbPickup.productId !== apiPickup.productId) {
      throw new Error(`ピックアップ${i}のproductIdが不一致`);
    }

    // Product情報のチェック
    if (!apiPickup.product) {
      throw new Error(`ピックアップ${i}にproduct情報が含まれていません`);
    }

    if (dbPickup.product.id !== apiPickup.product.id) {
      throw new Error(`ピックアップ${i}のproduct.idが不一致`);
    }

    if (dbPickup.product.name !== apiPickup.product.name) {
      throw new Error(`ピックアップ${i}のproduct.nameが不一致`);
    }

    if (dbPickup.product.price !== apiPickup.product.price) {
      throw new Error(
        `ピックアップ${i}のproduct.priceが不一致: DB=${dbPickup.product.price}, API=${apiPickup.product.price}`
      );
    }

    // Category情報のチェック
    if (!apiPickup.product.category) {
      throw new Error(`ピックアップ${i}のproductにcategory情報が含まれていません`);
    }

    if (dbPickup.product.category.id !== apiPickup.product.category.id) {
      throw new Error(`ピックアップ${i}のproduct.category.idが不一致`);
    }

    if (dbPickup.product.category.name !== apiPickup.product.category.name) {
      throw new Error(`ピックアップ${i}のproduct.category.nameが不一致`);
    }
  }

  console.log(`   ✓ DB件数: ${dbPickupProducts.length}, API件数: ${apiPickupProducts.length}`);
  console.log(`   ✓ リレーションデータ完全性チェック完了`);
}

/**
 * テスト4: 新着商品のDB突き合わせとソート順検証
 */
async function testNewProductsDbMatchAndSort() {
  // 1. DBから直接取得
  const dbNewProducts = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      category: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 6,
  });

  // 2. API経由で取得
  const response = await fetch(`${BASE_URL}/api/top-page`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data: ApiResponse = await response.json();
  if (!data.success) {
    throw new Error('success: false');
  }

  const apiNewProducts = data.data.newProducts;

  // 3. 件数の一致確認
  if (dbNewProducts.length !== apiNewProducts.length) {
    throw new Error(
      `新着商品件数が不一致: DB=${dbNewProducts.length}, API=${apiNewProducts.length}`
    );
  }

  // 4. 各商品の一致確認
  for (let i = 0; i < dbNewProducts.length; i++) {
    const dbProduct = dbNewProducts[i];
    const apiProduct = apiNewProducts[i];

    if (dbProduct.id !== apiProduct.id) {
      throw new Error(`新着商品${i}のIDが不一致: DB=${dbProduct.id}, API=${apiProduct.id}`);
    }

    if (dbProduct.name !== apiProduct.name) {
      throw new Error(`新着商品${i}のnameが不一致`);
    }

    if (dbProduct.price !== apiProduct.price) {
      throw new Error(
        `新着商品${i}のpriceが不一致: DB=${dbProduct.price}, API=${apiProduct.price}`
      );
    }

    if (dbProduct.productType !== apiProduct.productType) {
      throw new Error(`新着商品${i}のproductTypeが不一致`);
    }

    // カテゴリー情報のチェック
    if (!apiProduct.category) {
      throw new Error(`新着商品${i}にcategory情報が含まれていません`);
    }

    if (dbProduct.category.id !== apiProduct.category.id) {
      throw new Error(`新着商品${i}のcategory.idが不一致`);
    }
  }

  // 5. createdAt降順ソート検証
  for (let i = 0; i < apiNewProducts.length - 1; i++) {
    const current = new Date(apiNewProducts[i].createdAt).getTime();
    const next = new Date(apiNewProducts[i + 1].createdAt).getTime();

    if (current < next) {
      throw new Error(
        `新着商品のソート順が不正: ${i}番目(${current}) < ${i + 1}番目(${next})`
      );
    }
  }

  console.log(`   ✓ DB件数: ${dbNewProducts.length}, API件数: ${apiNewProducts.length}`);
  console.log(`   ✓ createdAt降順ソート確認済み`);
}

/**
 * テスト5: 人気商品のDB突き合わせと注文数集計検証
 */
async function testPopularProductsDbMatchAndAggregation() {
  // 1. DBから直接取得（注文数含む）
  const dbProducts = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      category: true,
      orderItems: {
        select: { quantity: true },
      },
    },
    take: 20,
  });

  // 注文数でソート
  const dbPopularProducts = dbProducts
    .map((product) => {
      const totalOrders = product.orderItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
      return {
        product,
        totalOrders,
      };
    })
    .sort((a, b) => b.totalOrders - a.totalOrders)
    .slice(0, 6)
    .map((item) => item.product);

  // 2. API経由で取得
  const response = await fetch(`${BASE_URL}/api/top-page`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data: ApiResponse = await response.json();
  if (!data.success) {
    throw new Error('success: false');
  }

  const apiPopularProducts = data.data.popularProducts;

  // 3. 件数の一致確認（最大6件）
  if (dbPopularProducts.length !== apiPopularProducts.length) {
    throw new Error(
      `人気商品件数が不一致: DB=${dbPopularProducts.length}, API=${apiPopularProducts.length}`
    );
  }

  // 4. 各商品のID一致確認（注文数が同じ場合は順序が異なる可能性があるため、IDセットで比較）
  const dbIds = new Set(dbPopularProducts.map((p) => p.id));
  const apiIds = new Set(apiPopularProducts.map((p: any) => p.id));

  for (const dbId of dbIds) {
    if (!apiIds.has(dbId)) {
      throw new Error(`DB商品ID ${dbId} がAPIレスポンスに含まれていません`);
    }
  }

  for (const apiId of apiIds) {
    if (!dbIds.has(apiId as string)) {
      throw new Error(`API商品ID ${apiId} がDBに存在しません`);
    }
  }

  console.log(`   ✓ DB件数: ${dbPopularProducts.length}, API件数: ${apiPopularProducts.length}`);
  console.log(`   ✓ 注文数集計ロジック検証済み`);
}

/**
 * テスト6: ニュースのDB突き合わせとソート順検証
 */
async function testNewsDbMatchAndSort() {
  // 1. DBから直接取得
  const dbNews = await prisma.newsItem.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: 'desc' },
    take: 5,
  });

  // 2. API経由で取得
  const response = await fetch(`${BASE_URL}/api/top-page`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data: ApiResponse = await response.json();
  if (!data.success) {
    throw new Error('success: false');
  }

  const apiNews = data.data.news;

  // 3. 件数の一致確認
  if (dbNews.length !== apiNews.length) {
    throw new Error(`ニュース件数が不一致: DB=${dbNews.length}, API=${apiNews.length}`);
  }

  // 4. 各ニュースの一致確認
  for (let i = 0; i < dbNews.length; i++) {
    const dbNewsItem = dbNews[i];
    const apiNewsItem = apiNews[i];

    if (dbNewsItem.id !== apiNewsItem.id) {
      throw new Error(`ニュース${i}のIDが不一致: DB=${dbNewsItem.id}, API=${apiNewsItem.id}`);
    }

    if (dbNewsItem.title !== apiNewsItem.title) {
      throw new Error(`ニュース${i}のtitleが不一致`);
    }

    if (dbNewsItem.isPublished !== apiNewsItem.isPublished) {
      throw new Error(`ニュース${i}のisPublishedが不一致`);
    }

    // 公開済みのみか確認
    if (!apiNewsItem.isPublished) {
      throw new Error(`ニュース${i}が非公開です（isPublished=false）`);
    }
  }

  // 5. publishedAt降順ソート検証
  for (let i = 0; i < apiNews.length - 1; i++) {
    const current = new Date(apiNews[i].publishedAt).getTime();
    const next = new Date(apiNews[i + 1].publishedAt).getTime();

    if (current < next) {
      throw new Error(
        `ニュースのソート順が不正: ${i}番目(${current}) < ${i + 1}番目(${next})`
      );
    }
  }

  console.log(`   ✓ DB件数: ${dbNews.length}, API件数: ${apiNews.length}`);
  console.log(`   ✓ publishedAt降順ソート確認済み`);
  console.log(`   ✓ 公開済みニュースのみ確認済み`);
}

/**
 * テスト7: トランザクション整合性検証（並行リクエスト）
 */
async function testTransactionConsistency() {
  // 並行リクエストを3回実行し、全て同じデータが返ってくることを確認
  const requests = [
    fetch(`${BASE_URL}/api/top-page`),
    fetch(`${BASE_URL}/api/top-page`),
    fetch(`${BASE_URL}/api/top-page`),
  ];

  const responses = await Promise.all(requests);

  // 全てのレスポンスが正常か確認
  for (let i = 0; i < responses.length; i++) {
    if (!responses[i].ok) {
      throw new Error(`リクエスト${i + 1}が失敗: HTTP ${responses[i].status}`);
    }
  }

  const dataList = await Promise.all(responses.map((r) => r.json()));

  // 全てのレスポンスが同じデータか確認
  for (let i = 1; i < dataList.length; i++) {
    const data1 = JSON.stringify((dataList[0] as any).data);
    const data2 = JSON.stringify((dataList[i] as any).data);

    if (data1 !== data2) {
      throw new Error(`並行リクエスト${i + 1}のデータが不一致`);
    }
  }

  console.log(`   ✓ 並行リクエスト3回実行`);
  console.log(`   ✓ 全てのレスポンスが同一データ`);
}

/**
 * テスト8: 非アクティブデータの除外確認
 */
async function testInactiveDataExclusion() {
  // 1. DBから全データ取得（非アクティブ含む）
  const [allHeroSlides, allMegaCategories, allPickupProducts] = await Promise.all([
    prisma.heroSlide.findMany(),
    prisma.megaCategory.findMany(),
    prisma.pickupProduct.findMany(),
  ]);

  // 2. API経由で取得
  const response = await fetch(`${BASE_URL}/api/top-page`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data: ApiResponse = await response.json();
  if (!data.success) {
    throw new Error('success: false');
  }

  // 3. APIレスポンスに非アクティブデータが含まれていないことを確認
  const inactiveHeroSlides = allHeroSlides.filter((s) => !s.isActive);
  for (const inactive of inactiveHeroSlides) {
    const found = data.data.heroSlides.find((s: any) => s.id === inactive.id);
    if (found) {
      throw new Error(`非アクティブなヒーロースライド(${inactive.id})が返却されています`);
    }
  }

  const inactiveMegaCategories = allMegaCategories.filter((c) => !c.isActive);
  for (const inactive of inactiveMegaCategories) {
    const found = data.data.megaCategories.find((c: any) => c.id === inactive.id);
    if (found) {
      throw new Error(`非アクティブなメガカテゴリー(${inactive.id})が返却されています`);
    }
  }

  const inactivePickupProducts = allPickupProducts.filter((p) => !p.isActive);
  for (const inactive of inactivePickupProducts) {
    const found = data.data.pickupProducts.find((p: any) => p.id === inactive.id);
    if (found) {
      throw new Error(`非アクティブなピックアップ商品(${inactive.id})が返却されています`);
    }
  }

  console.log(`   ✓ 非アクティブなヒーロースライド: ${inactiveHeroSlides.length}件（除外確認済み）`);
  console.log(`   ✓ 非アクティブなメガカテゴリー: ${inactiveMegaCategories.length}件（除外確認済み）`);
  console.log(`   ✓ 非アクティブなピックアップ商品: ${inactivePickupProducts.length}件（除外確認済み）`);
}

/**
 * メイン実行
 */
async function main() {
  console.log('\n=================================');
  console.log('🧪 トップページAPI 統合テスト開始（実DB検証版）');
  console.log('=================================\n');
  console.log(`Backend URL: ${BASE_URL}`);
  console.log(`Database: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || '不明'}\n`);

  // テスト実行
  await runTest('ヒーロースライドのDB突き合わせ', testHeroSlidesDbMatch);
  await runTest('メガカテゴリーのDB突き合わせ', testMegaCategoriesDbMatch);
  await runTest('ピックアップ商品のリレーション完全性チェック', testPickupProductsRelationIntegrity);
  await runTest('新着商品のDB突き合わせとソート順検証', testNewProductsDbMatchAndSort);
  await runTest('人気商品のDB突き合わせと注文数集計検証', testPopularProductsDbMatchAndAggregation);
  await runTest('ニュースのDB突き合わせとソート順検証', testNewsDbMatchAndSort);
  await runTest('トランザクション整合性検証（並行リクエスト）', testTransactionConsistency);
  await runTest('非アクティブデータの除外確認', testInactiveDataExclusion);

  // Prisma Clientを閉じる
  await prisma.$disconnect();

  // 結果サマリー
  console.log('\n=================================');
  console.log('📊 テスト結果サマリー');
  console.log('=================================\n');

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log(`✅ 成功: ${passedCount}件`);
  console.log(`❌ 失敗: ${failedCount}件`);
  console.log(`📝 合計: ${results.length}件\n`);

  if (failedCount > 0) {
    console.log('失敗したテスト:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.testName}`);
        console.log(`    エラー: ${r.error}`);
      });
    console.log('');
    process.exit(1);
  } else {
    console.log('🎉 全てのテストが成功しました！\n');
    process.exit(0);
  }
}

// 実行
main().catch((error) => {
  console.error('テスト実行エラー:', error);
  prisma.$disconnect();
  process.exit(1);
});

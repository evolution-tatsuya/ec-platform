/**
 * 配送管理API 統合テスト
 *
 * テスト対象:
 * - GET /api/shipping/available-dates - 配送可能日取得
 * - GET /api/shipping/time-slots - 配送時間帯取得
 *
 * 実行方法:
 * npx ts-node tests/integration/shipping.test.ts
 */

import { config } from '../../src/config';
import { prisma } from '../../src/config/prisma';

const BASE_URL = config.backendUrl || 'http://localhost:8432';

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
 * テスト1: 配送時間帯取得
 */
async function testGetTimeSlots() {
  const response = await fetch(`${BASE_URL}/api/shipping/time-slots`);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data: ApiResponse = await response.json();

  if (!data.success) {
    throw new Error('success: false');
  }

  if (!data.data || !data.data.timeSlots) {
    throw new Error('timeSlots が返却されていません');
  }

  if (!Array.isArray(data.data.timeSlots)) {
    throw new Error('timeSlots が配列ではありません');
  }

  if (data.data.timeSlots.length !== 6) {
    throw new Error(`時間帯の数が不正です（期待: 6, 実際: ${data.data.timeSlots.length}）`);
  }

  // 時間帯の形式チェック
  const firstSlot = data.data.timeSlots[0];
  if (!firstSlot.value || !firstSlot.label) {
    throw new Error('時間帯の形式が不正です');
  }

  console.log(`   取得した時間帯数: ${data.data.timeSlots.length}`);
  console.log(`   最初の時間帯: ${firstSlot.label}`);
}

/**
 * テスト2: 配送可能日取得（商品IDなし）
 */
async function testGetAvailableDatesWithoutProductIds() {
  const response = await fetch(`${BASE_URL}/api/shipping/available-dates`);

  if (response.ok) {
    throw new Error('商品IDなしでエラーになるべきですが、成功しました');
  }

  if (response.status !== 400) {
    throw new Error(`期待するステータスコード: 400, 実際: ${response.status}`);
  }
}

/**
 * テスト3: 配送可能日取得（有効な商品ID）
 */
async function testGetAvailableDatesWithValidProductIds() {
  // 実際のデータベースから商品を取得するために、まず商品一覧を取得
  const productsResponse = await fetch(`${BASE_URL}/api/products?limit=1`);

  if (!productsResponse.ok) {
    throw new Error('商品一覧の取得に失敗しました');
  }

  const productsData: ApiResponse = await productsResponse.json();

  if (!productsData.success || !productsData.products || productsData.products.length === 0) {
    throw new Error('テスト用の商品が見つかりません。先にテストデータを投入してください。');
  }

  const productId = productsData.products[0].id;

  // 配送可能日を取得
  const response = await fetch(
    `${BASE_URL}/api/shipping/available-dates?productIds=${productId}`
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data: ApiResponse = await response.json();

  if (!data.success) {
    throw new Error('success: false');
  }

  if (!data.data || !data.data.availableDates) {
    throw new Error('availableDates が返却されていません');
  }

  if (!Array.isArray(data.data.availableDates)) {
    throw new Error('availableDates が配列ではありません');
  }

  if (data.data.availableDates.length === 0) {
    throw new Error('配送可能日が0件です');
  }

  // 日付形式チェック（YYYY-MM-DD）
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const firstDate = data.data.availableDates[0];
  if (!dateRegex.test(firstDate)) {
    throw new Error(`日付形式が不正です: ${firstDate}`);
  }

  // minPreparationDaysチェック
  if (typeof data.data.minPreparationDays !== 'number') {
    throw new Error('minPreparationDays が数値ではありません');
  }

  // allowWeekendDeliveryチェック
  if (typeof data.data.allowWeekendDelivery !== 'boolean') {
    throw new Error('allowWeekendDelivery がブール値ではありません');
  }

  console.log(`   商品ID: ${productId}`);
  console.log(`   配送可能日数: ${data.data.availableDates.length}`);
  console.log(`   最初の配送可能日: ${firstDate}`);
  console.log(`   最小準備日数: ${data.data.minPreparationDays}日`);
  console.log(`   土日配送可否: ${data.data.allowWeekendDelivery}`);
}

/**
 * テスト4: 配送可能日取得（複数商品ID）
 */
async function testGetAvailableDatesWithMultipleProductIds() {
  // 複数の商品を取得
  const productsResponse = await fetch(`${BASE_URL}/api/products?limit=3`);

  if (!productsResponse.ok) {
    throw new Error('商品一覧の取得に失敗しました');
  }

  const productsData: ApiResponse = await productsResponse.json();

  if (!productsData.success || !productsData.products || productsData.products.length < 2) {
    console.log('   テスト用の商品が2件未満のため、このテストはスキップします');
    return;
  }

  const productIds = productsData.products.map((p: { id: string }) => p.id).join(',');

  // 配送可能日を取得
  const response = await fetch(
    `${BASE_URL}/api/shipping/available-dates?productIds=${productIds}`
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data: ApiResponse = await response.json();

  if (!data.success) {
    throw new Error('success: false');
  }

  if (!data.data || !data.data.availableDates) {
    throw new Error('availableDates が返却されていません');
  }

  console.log(`   商品数: ${productsData.products.length}`);
  console.log(`   配送可能日数: ${data.data.availableDates.length}`);
  console.log(`   最小準備日数: ${data.data.minPreparationDays}日`);
}

/**
 * テスト5: 配送可能日取得（存在しない商品ID）
 */
async function testGetAvailableDatesWithInvalidProductId() {
  const invalidProductId = '00000000-0000-0000-0000-000000000000';

  const response = await fetch(
    `${BASE_URL}/api/shipping/available-dates?productIds=${invalidProductId}`
  );

  if (response.ok) {
    throw new Error('存在しない商品IDでエラーになるべきですが、成功しました');
  }

  if (response.status !== 404) {
    throw new Error(`期待するステータスコード: 404, 実際: ${response.status}`);
  }
}

/**
 * テスト6: 準備日数の検証（Prisma Clientで直接テストデータ作成）
 */
async function testPreparationDaysLogic() {
  // テストデータ作成: カテゴリー
  const category = await prisma.category.create({
    data: {
      name: 'テストカテゴリー（配送テスト）',
      slug: `test-shipping-category-${Date.now()}`,
    },
  });

  // テストデータ作成: 準備日数が異なる2つの商品
  const product1 = await prisma.product.create({
    data: {
      name: 'テスト商品1（準備5日）',
      slug: `test-product-5days-${Date.now()}`,
      price: 1000,
      categoryId: category.id,
      productType: 'physical',
      preparationDays: 5,
      allowWeekendDelivery: true,
    },
  });

  const product2 = await prisma.product.create({
    data: {
      name: 'テスト商品2（準備2日）',
      slug: `test-product-2days-${Date.now()}`,
      price: 2000,
      categoryId: category.id,
      productType: 'physical',
      preparationDays: 2,
      allowWeekendDelivery: true,
    },
  });

  try {
    // 複数商品で配送可能日を取得
    const response = await fetch(
      `${BASE_URL}/api/shipping/available-dates?productIds=${product1.id},${product2.id}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: ApiResponse = await response.json();

    if (!data.success) {
      throw new Error('success: false');
    }

    // 最大準備日数が5日であることを検証
    if (data.data.minPreparationDays !== 5) {
      throw new Error(
        `準備日数が不正です（期待: 5, 実際: ${data.data.minPreparationDays}）`
      );
    }

    // 最初の配送可能日が「今日+5日後」以降であることを検証
    const today = new Date();
    const expectedMinDate = new Date(today);
    expectedMinDate.setDate(today.getDate() + 5);
    const expectedMinDateStr = expectedMinDate.toISOString().split('T')[0];

    const firstAvailableDate = data.data.availableDates[0];
    if (firstAvailableDate < expectedMinDateStr) {
      throw new Error(
        `配送可能日が早すぎます（期待: ${expectedMinDateStr}以降, 実際: ${firstAvailableDate}）`
      );
    }

    console.log(`   商品1準備日数: 5日`);
    console.log(`   商品2準備日数: 2日`);
    console.log(`   最大準備日数: ${data.data.minPreparationDays}日`);
    console.log(`   最初の配送可能日: ${firstAvailableDate} (今日+5日後: ${expectedMinDateStr})`);
  } finally {
    // テストデータ削除（クリーンアップ）
    await prisma.product.delete({ where: { id: product1.id } });
    await prisma.product.delete({ where: { id: product2.id } });
    await prisma.category.delete({ where: { id: category.id } });
  }
}

/**
 * テスト7: 土日除外ロジックの検証
 */
async function testWeekendExclusionLogic() {
  // テストデータ作成: カテゴリー
  const category = await prisma.category.create({
    data: {
      name: 'テストカテゴリー（土日配送テスト）',
      slug: `test-weekend-category-${Date.now()}`,
    },
  });

  // テストデータ作成: 土日配送不可の商品
  const product = await prisma.product.create({
    data: {
      name: 'テスト商品（土日配送不可）',
      slug: `test-product-no-weekend-${Date.now()}`,
      price: 3000,
      categoryId: category.id,
      productType: 'physical',
      preparationDays: 1,
      allowWeekendDelivery: false, // 土日配送不可
    },
  });

  try {
    // 配送可能日を取得
    const response = await fetch(
      `${BASE_URL}/api/shipping/available-dates?productIds=${product.id}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: ApiResponse = await response.json();

    if (!data.success) {
      throw new Error('success: false');
    }

    // allowWeekendDeliveryがfalseであることを検証
    if (data.data.allowWeekendDelivery !== false) {
      throw new Error(
        `土日配送設定が不正です（期待: false, 実際: ${data.data.allowWeekendDelivery}）`
      );
    }

    // 配送可能日に土日が含まれていないことを検証
    const hasWeekend = data.data.availableDates.some((dateStr: string) => {
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();
      return dayOfWeek === 0 || dayOfWeek === 6; // 日曜(0)または土曜(6)
    });

    if (hasWeekend) {
      throw new Error('土日配送不可なのに、配送可能日に土日が含まれています');
    }

    console.log(`   土日配送設定: ${data.data.allowWeekendDelivery}`);
    console.log(`   配送可能日数: ${data.data.availableDates.length}`);
    console.log(`   土日除外確認: OK`);
  } finally {
    // テストデータ削除（クリーンアップ）
    await prisma.product.delete({ where: { id: product.id } });
    await prisma.category.delete({ where: { id: category.id } });
  }
}

/**
 * テスト8: 複数商品の土日配送設定（1つでも不可なら全体が不可）
 */
async function testMixedWeekendDelivery() {
  // テストデータ作成: カテゴリー
  const category = await prisma.category.create({
    data: {
      name: 'テストカテゴリー（混合土日配送テスト）',
      slug: `test-mixed-weekend-category-${Date.now()}`,
    },
  });

  // テストデータ作成: 土日配送可の商品
  const product1 = await prisma.product.create({
    data: {
      name: 'テスト商品1（土日配送可）',
      slug: `test-product-weekend-ok-${Date.now()}`,
      price: 1000,
      categoryId: category.id,
      productType: 'physical',
      preparationDays: 1,
      allowWeekendDelivery: true, // 土日配送可
    },
  });

  // テストデータ作成: 土日配送不可の商品
  const product2 = await prisma.product.create({
    data: {
      name: 'テスト商品2（土日配送不可）',
      slug: `test-product-weekend-ng-${Date.now()}`,
      price: 2000,
      categoryId: category.id,
      productType: 'physical',
      preparationDays: 1,
      allowWeekendDelivery: false, // 土日配送不可
    },
  });

  try {
    // 複数商品で配送可能日を取得
    const response = await fetch(
      `${BASE_URL}/api/shipping/available-dates?productIds=${product1.id},${product2.id}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: ApiResponse = await response.json();

    if (!data.success) {
      throw new Error('success: false');
    }

    // 1つでも不可なら全体が不可
    if (data.data.allowWeekendDelivery !== false) {
      throw new Error(
        `土日配送設定が不正です（期待: false, 実際: ${data.data.allowWeekendDelivery}）`
      );
    }

    // 配送可能日に土日が含まれていないことを検証
    const hasWeekend = data.data.availableDates.some((dateStr: string) => {
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();
      return dayOfWeek === 0 || dayOfWeek === 6;
    });

    if (hasWeekend) {
      throw new Error('混合商品で土日配送不可なのに、配送可能日に土日が含まれています');
    }

    console.log(`   商品1土日配送: true`);
    console.log(`   商品2土日配送: false`);
    console.log(`   全体の土日配送: ${data.data.allowWeekendDelivery} (1つでも不可なら全体が不可)`);
    console.log(`   土日除外確認: OK`);
  } finally {
    // テストデータ削除（クリーンアップ）
    await prisma.product.delete({ where: { id: product1.id } });
    await prisma.product.delete({ where: { id: product2.id } });
    await prisma.category.delete({ where: { id: category.id } });
  }
}

/**
 * メイン実行
 */
async function main() {
  console.log('\n=================================');
  console.log('🧪 配送管理API 統合テスト開始');
  console.log('=================================\n');
  console.log(`Backend URL: ${BASE_URL}\n`);

  // テスト実行
  await runTest('配送時間帯取得', testGetTimeSlots);
  await runTest('配送可能日取得（商品IDなし）', testGetAvailableDatesWithoutProductIds);
  await runTest(
    '配送可能日取得（有効な商品ID）',
    testGetAvailableDatesWithValidProductIds
  );
  await runTest(
    '配送可能日取得（複数商品ID）',
    testGetAvailableDatesWithMultipleProductIds
  );
  await runTest(
    '配送可能日取得（存在しない商品ID）',
    testGetAvailableDatesWithInvalidProductId
  );
  await runTest('準備日数の検証（実データ作成）', testPreparationDaysLogic);
  await runTest('土日除外ロジックの検証', testWeekendExclusionLogic);
  await runTest('複数商品の土日配送設定（混合）', testMixedWeekendDelivery);

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
    await prisma.$disconnect();
    process.exit(1);
  } else {
    console.log('🎉 全てのテストが成功しました！\n');
    await prisma.$disconnect();
    process.exit(0);
  }
}

// 実行
main().catch(async (error) => {
  console.error('テスト実行エラー:', error);
  await prisma.$disconnect();
  process.exit(1);
});

/**
 * チケットAPI 統合テスト
 *
 * テスト対象:
 * - GET /api/tickets - ログイン中のユーザーのデジタルチケット一覧取得
 * - GET /api/tickets/:ticketId/qr - 特定チケットのQRコード生成
 *
 * 前提条件:
 * - productType='event' の商品が存在すること
 * - その商品を購入した注文が status='paid' または 'completed' であること
 * - 注文時にデジタルチケットが生成されること
 *
 * 実行方法:
 * npx ts-node tests/integration/tickets.test.ts
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
  console.log(`🔍 実行中: ${testName}`);
  try {
    await testFn();
    results.push({ testName, passed: true });
    console.log(`✅ 成功: ${testName}\n`);
  } catch (error) {
    results.push({
      testName,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.error(`❌ 失敗: ${testName}`);
    console.error(`   エラー: ${error instanceof Error ? error.message : String(error)}\n`);
  }
}

/**
 * グローバル変数
 */
let sessionCookie: string | null = null;
let testUserId: string | null = null;
let testEventProductId: string | null = null;
let testCategoryId: string | null = null;
let testTicketId: string | null = null;

/**
 * テストユーザー情報
 */
const TEST_USER = {
  email: `test-ticket-user-${Date.now()}@example.com`,
  password: 'TestPassword123',
  name: 'チケットテストユーザー',
};

/**
 * セットアップ: テストユーザーとイベント商品を作成
 */
async function setup() {
  console.log('\n📝 セットアップ: テストデータを作成...');

  // 1. テストユーザーを登録
  const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(TEST_USER),
  });

  if (!registerResponse.ok) {
    throw new Error(`会員登録に失敗しました: ${registerResponse.statusText}`);
  }

  const registerData: ApiResponse = await registerResponse.json();
  testUserId = registerData.user.id;

  // Cookieを取得
  const setCookieHeader = registerResponse.headers.get('set-cookie');
  if (setCookieHeader) {
    sessionCookie = setCookieHeader.split(';')[0];
  }

  if (!sessionCookie) {
    throw new Error('セッションCookieの取得に失敗しました');
  }

  console.log(`✅ テストユーザー登録完了: ${TEST_USER.email}`);
  console.log(`   ユーザーID: ${testUserId}`);

  // 2. テストカテゴリーを作成（イベント用）
  const category = await prisma.category.create({
    data: {
      name: 'テストイベントカテゴリー',
      slug: `test-event-category-${Date.now()}`,
      description: 'チケットテスト用カテゴリー',
    },
  });
  testCategoryId = category.id;
  console.log(`✅ テストカテゴリー作成完了: ${category.name}`);

  // 3. イベント商品を作成
  const eventProduct = await prisma.product.create({
    data: {
      name: 'テストイベント - 音楽フェス 2026',
      slug: `test-event-${Date.now()}`,
      description: 'チケットテスト用のイベント商品です',
      price: 5000,
      categoryId: testCategoryId,
      productType: 'event', // イベント商品
      isActive: true,
    },
  });
  testEventProductId = eventProduct.id;
  console.log(`✅ イベント商品作成完了: ${eventProduct.name}`);
  console.log(`   商品ID: ${testEventProductId}`);

  // 4. 在庫ログを追加（在庫10個）
  await prisma.inventoryLog.create({
    data: {
      productId: testEventProductId,
      quantity: 10,
      type: 'purchase',
      note: 'テスト用在庫追加',
    },
  });
  console.log(`✅ 在庫追加完了: 10個`);

  // 5. カートに商品を追加
  const cart = await prisma.cart.create({
    data: {
      userId: testUserId!,
    },
  });

  await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      productId: testEventProductId,
      quantity: 2, // チケット2枚
    },
  });

  console.log(`✅ カートに商品追加完了: 2枚`);

  // 6. 注文を作成（支払い完了済み）
  const orderNumber = `ORD-TEST-${Date.now()}`;
  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId: testUserId!,
      status: 'paid', // 支払い完了済み
      paymentMethod: 'credit_card',
      totalAmount: 10000,
      shippingAddress: 'テスト住所',
    },
  });

  console.log(`✅ 注文作成完了: ${orderNumber}`);

  // 7. 注文アイテムを作成
  const orderItem = await prisma.orderItem.create({
    data: {
      orderId: order.id,
      productId: testEventProductId,
      quantity: 2,
      price: 5000,
    },
  });

  console.log(`✅ 注文アイテム作成完了`);

  // 8. デジタルチケットを2枚生成
  const ticket1 = await prisma.digitalTicket.create({
    data: {
      orderId: order.id,
      orderItemId: orderItem.id,
      productId: testEventProductId,
      ticketCode: `TICKET-${Date.now()}-001`,
      qrCodeData: `TICKET-${Date.now()}-001`,
      isUsed: false,
    },
  });

  const ticket2 = await prisma.digitalTicket.create({
    data: {
      orderId: order.id,
      orderItemId: orderItem.id,
      productId: testEventProductId,
      ticketCode: `TICKET-${Date.now()}-002`,
      qrCodeData: `TICKET-${Date.now()}-002`,
      isUsed: false,
    },
  });

  testTicketId = ticket1.id;

  console.log(`✅ デジタルチケット生成完了: 2枚`);
  console.log(`   チケットID1: ${ticket1.id}`);
  console.log(`   チケットID2: ${ticket2.id}`);

  // 9. 在庫減算
  await prisma.inventoryLog.create({
    data: {
      productId: testEventProductId,
      quantity: -2,
      type: 'sale',
      note: `テスト注文: ${orderNumber}`,
    },
  });

  console.log(`✅ 在庫減算完了\n`);
}

/**
 * クリーンアップ: テストデータを削除
 */
async function cleanup() {
  console.log('\n🧹 クリーンアップ: テストデータを削除...');

  try {
    // デジタルチケットを削除
    await prisma.digitalTicket.deleteMany({
      where: {
        productId: testEventProductId!,
      },
    });

    // 注文アイテムを削除
    await prisma.orderItem.deleteMany({
      where: {
        productId: testEventProductId!,
      },
    });

    // 注文を削除
    await prisma.order.deleteMany({
      where: {
        userId: testUserId!,
      },
    });

    // カートアイテムを削除
    await prisma.cartItem.deleteMany({
      where: {
        productId: testEventProductId!,
      },
    });

    // カートを削除
    await prisma.cart.deleteMany({
      where: {
        userId: testUserId!,
      },
    });

    // 在庫ログを削除
    await prisma.inventoryLog.deleteMany({
      where: {
        productId: testEventProductId!,
      },
    });

    // 商品を削除
    if (testEventProductId) {
      await prisma.product.delete({
        where: {
          id: testEventProductId,
        },
      });
    }

    // カテゴリーを削除
    if (testCategoryId) {
      await prisma.category.delete({
        where: {
          id: testCategoryId,
        },
      });
    }

    // ユーザーを削除
    if (testUserId) {
      await prisma.user.delete({
        where: {
          id: testUserId,
        },
      });
    }

    console.log('✅ クリーンアップ完了\n');
  } catch (error) {
    console.error('⚠️ クリーンアップ中にエラーが発生しましたが、続行します:', error);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * テスト1: チケット一覧取得（認証なし）
 */
async function testGetTicketsWithoutAuth() {
  const response = await fetch(`${BASE_URL}/api/tickets`);

  if (response.ok) {
    throw new Error('認証なしでアクセスできてしまいました');
  }

  if (response.status !== 401) {
    throw new Error(`期待するステータスコード: 401, 実際: ${response.status}`);
  }
}

/**
 * テスト2: チケット一覧取得（認証あり）
 */
async function testGetTicketsWithAuth() {
  if (!sessionCookie) {
    throw new Error('セッションCookieがありません');
  }

  const response = await fetch(`${BASE_URL}/api/tickets`, {
    headers: {
      Cookie: sessionCookie,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data: ApiResponse = await response.json();

  if (!data.success) {
    throw new Error('success: false');
  }

  if (!data.tickets || !Array.isArray(data.tickets)) {
    throw new Error('tickets が配列として返却されていません');
  }

  if (data.tickets.length !== 2) {
    throw new Error(`チケット数が不一致: 期待2枚, 実際${data.tickets.length}枚`);
  }

  console.log(`   チケット数: ${data.tickets.length}枚`);

  const ticket = data.tickets[0];
  console.log(`   チケットID: ${ticket.id}`);
  console.log(`   チケットコード: ${ticket.ticketCode}`);
  console.log(`   商品名: ${ticket.product.name}`);
  console.log(`   注文番号: ${ticket.order.orderNumber}`);
  console.log(`   使用済み: ${ticket.isUsed}`);
}

/**
 * テスト3: QRコード生成（認証なし）
 */
async function testGetTicketQRWithoutAuth() {
  if (!testTicketId) {
    throw new Error('testTicketId がありません');
  }

  const response = await fetch(`${BASE_URL}/api/tickets/${testTicketId}/qr`);

  if (response.ok) {
    throw new Error('認証なしでアクセスできてしまいました');
  }

  if (response.status !== 401) {
    throw new Error(`期待するステータスコード: 401, 実際: ${response.status}`);
  }
}

/**
 * テスト4: QRコード生成（認証あり）
 */
async function testGetTicketQRWithAuth() {
  if (!sessionCookie) {
    throw new Error('セッションCookieがありません');
  }

  if (!testTicketId) {
    throw new Error('testTicketId がありません');
  }

  const response = await fetch(`${BASE_URL}/api/tickets/${testTicketId}/qr`, {
    headers: {
      Cookie: sessionCookie,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data: ApiResponse = await response.json();

  if (!data.success) {
    throw new Error('success: false');
  }

  if (!data.qrCode) {
    throw new Error('qrCode が返却されていません');
  }

  // Base64エンコードされた画像データかチェック
  if (!data.qrCode.startsWith('data:image/png;base64,')) {
    throw new Error('QRコードがBase64エンコードされた画像データではありません');
  }

  if (!data.ticket) {
    throw new Error('ticket が返却されていません');
  }

  console.log(`   チケットID: ${data.ticket.id}`);
  console.log(`   チケットコード: ${data.ticket.ticketCode}`);
  console.log(`   商品名: ${data.ticket.productName}`);
  console.log(`   QRコード: Base64エンコード済み (${data.qrCode.length}文字)`);
}

/**
 * テスト5: 存在しないチケットのQRコード生成
 */
async function testGetTicketQRWithInvalidId() {
  if (!sessionCookie) {
    throw new Error('セッションCookieがありません');
  }

  const invalidTicketId = 'invalid-ticket-id';

  const response = await fetch(`${BASE_URL}/api/tickets/${invalidTicketId}/qr`, {
    headers: {
      Cookie: sessionCookie,
    },
  });

  if (response.ok) {
    throw new Error('存在しないチケットでエラーになるべきですが、成功しました');
  }

  if (response.status !== 404) {
    throw new Error(`期待するステータスコード: 404, 実際: ${response.status}`);
  }
}

/**
 * テスト6: 他人のチケットのQRコード生成（アクセス不可）
 */
async function testGetTicketQRWithOtherUserTicket() {
  // 別のユーザーを作成
  const otherUser = {
    email: `other-ticket-user-${Date.now()}@example.com`,
    password: 'OtherPassword123',
    name: '別のチケットテストユーザー',
  };

  const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(otherUser),
  });

  if (!registerResponse.ok) {
    throw new Error('別ユーザーの登録に失敗しました');
  }

  const otherUserData: ApiResponse = await registerResponse.json();
  const otherUserId = otherUserData.user.id;

  // 別ユーザーのセッションCookie取得
  const otherUserCookie = registerResponse.headers.get('set-cookie')?.split(';')[0];

  if (!otherUserCookie) {
    throw new Error('別ユーザーのセッションCookieの取得に失敗しました');
  }

  // 別ユーザーが元のユーザーのチケットにアクセスしようとする
  const response = await fetch(`${BASE_URL}/api/tickets/${testTicketId}/qr`, {
    headers: {
      Cookie: otherUserCookie,
    },
  });

  if (response.ok) {
    throw new Error('他人のチケットでエラーになるべきですが、成功しました');
  }

  if (response.status !== 404) {
    throw new Error(`期待するステータスコード: 404, 実際: ${response.status}`);
  }

  // 別ユーザーをクリーンアップ
  await prisma.user.delete({
    where: {
      id: otherUserId,
    },
  });
}

/**
 * メイン実行
 */
async function main() {
  console.log('\n=================================');
  console.log('🧪 チケットAPI 統合テスト開始');
  console.log('=================================\n');
  console.log(`Backend URL: ${BASE_URL}\n`);

  try {
    // セットアップ
    await setup();

    // テスト実行
    await runTest('チケット一覧取得（認証なし）', testGetTicketsWithoutAuth);
    await runTest('チケット一覧取得（認証あり）', testGetTicketsWithAuth);
    await runTest('QRコード生成（認証なし）', testGetTicketQRWithoutAuth);
    await runTest('QRコード生成（認証あり）', testGetTicketQRWithAuth);
    await runTest('QRコード生成（存在しないチケット）', testGetTicketQRWithInvalidId);
    await runTest('QRコード生成（他人のチケット）', testGetTicketQRWithOtherUserTicket);

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
    } else {
      console.log('🎉 全てのテストが成功しました！\n');
    }
  } finally {
    // クリーンアップ
    await cleanup();

    if (results.filter((r) => !r.passed).length > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

// 実行
main().catch((error) => {
  console.error('テスト実行エラー:', error);
  cleanup().finally(() => {
    process.exit(1);
  });
});

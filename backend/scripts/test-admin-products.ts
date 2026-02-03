// ===== 管理者用商品管理API統合テスト =====
// 目的: 6つのエンドポイントの動作確認

import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.localを読み込み
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8432';
const ADMIN_EMAIL = 'admin@ec-platform.local';
const ADMIN_PASSWORD = 'TestAdmin2025!';

// Axiosインスタンス（セッション保持用）
const client = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
  validateStatus: () => true, // 全てのステータスコードを受け入れる
});

let sessionCookie: string;
let testProductId: string;
let testCategoryId: string;

// ===== テストヘルパー関数 =====

const log = (message: string) => {
  console.log(`\n🔵 ${message}`);
};

const logSuccess = (message: string) => {
  console.log(`✅ ${message}`);
};

const logError = (message: string) => {
  console.error(`❌ ${message}`);
};

const logInfo = (message: string, data?: any) => {
  console.log(`ℹ️  ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

// ===== テストケース =====

// 1. 管理者ログイン
async function testAdminLogin() {
  log('Test 1: 管理者ログイン');
  try {
    const response = await client.post('/api/auth/login', {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    if (response.status === 200 && response.data.success) {
      // セッションCookieを取得
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        sessionCookie = cookies[0];
        client.defaults.headers.common['Cookie'] = sessionCookie;
      }
      logSuccess('管理者ログイン成功');
      return true;
    } else {
      logError(`ログイン失敗: ${response.data.message}`);
      return false;
    }
  } catch (error: any) {
    logError(`ログインエラー: ${error.message}`);
    return false;
  }
}

// 2. カテゴリー取得（商品登録に必要）
async function getCategory() {
  log('Test 2: カテゴリー取得');
  try {
    const response = await client.get('/api/categories');

    if (response.status === 200 && response.data.categories?.length > 0) {
      testCategoryId = response.data.categories[0].id;
      logSuccess(`カテゴリー取得成功: ${testCategoryId}`);
      return true;
    } else {
      logError('カテゴリーが見つかりません');
      return false;
    }
  } catch (error: any) {
    logError(`カテゴリー取得エラー: ${error.message}`);
    return false;
  }
}

// 3. 商品登録
async function testCreateProduct() {
  log('Test 3: 商品登録 (POST /api/admin/products)');
  try {
    const response = await client.post('/api/admin/products', {
      name: 'テスト商品_管理画面API',
      slug: `test-product-admin-${Date.now()}`,
      description: '管理画面API統合テスト用商品',
      price: 9800,
      categoryId: testCategoryId,
      productType: 'physical',
      preparationDays: 3,
      allowWeekendDelivery: true,
      initialStock: 50,
    });

    if (response.status === 201 && response.data.success) {
      testProductId = response.data.product.id;
      logSuccess(`商品登録成功: ${testProductId}`);
      logInfo('登録された商品', response.data.product);
      return true;
    } else {
      logError(`商品登録失敗: ${response.data.message}`);
      return false;
    }
  } catch (error: any) {
    logError(`商品登録エラー: ${error.message}`);
    return false;
  }
}

// 4. 商品一覧取得
async function testGetProducts() {
  log('Test 4: 商品一覧取得 (GET /api/admin/products)');
  try {
    const response = await client.get('/api/admin/products', {
      params: {
        page: 1,
        limit: 10,
        search: 'テスト商品',
      },
    });

    if (response.status === 200 && response.data.success) {
      logSuccess(`商品一覧取得成功: ${response.data.products.length}件`);
      logInfo('取得した商品', response.data.products[0]);
      logInfo('ページネーション', response.data.pagination);
      return true;
    } else {
      logError(`商品一覧取得失敗: ${response.data.message}`);
      return false;
    }
  } catch (error: any) {
    logError(`商品一覧取得エラー: ${error.message}`);
    return false;
  }
}

// 5. 商品更新
async function testUpdateProduct() {
  log('Test 5: 商品更新 (PUT /api/admin/products/:id)');
  try {
    const response = await client.put(`/api/admin/products/${testProductId}`, {
      name: 'テスト商品_管理画面API（更新済み）',
      price: 12000,
      description: '管理画面API統合テスト用商品（更新テスト）',
      preparationDays: 5,
    });

    if (response.status === 200 && response.data.success) {
      logSuccess('商品更新成功');
      logInfo('更新された商品', response.data.product);
      return true;
    } else {
      logError(`商品更新失敗: ${response.data.message}`);
      return false;
    }
  } catch (error: any) {
    logError(`商品更新エラー: ${error.message}`);
    return false;
  }
}

// 6. 在庫調整
async function testAdjustInventory() {
  log('Test 6: 在庫調整 (POST /api/admin/products/:id/inventory)');
  try {
    const response = await client.post(`/api/admin/products/${testProductId}/inventory`, {
      quantity: 20,
      type: 'purchase',
      note: '追加入庫テスト',
    });

    if (response.status === 200 && response.data.success) {
      logSuccess(`在庫調整成功: 現在在庫 ${response.data.currentStock}`);
      logInfo('在庫ログ', response.data.inventoryLog);
      return true;
    } else {
      logError(`在庫調整失敗: ${response.data.message}`);
      return false;
    }
  } catch (error: any) {
    logError(`在庫調整エラー: ${error.message}`);
    return false;
  }
}

// 7. 在庫ログ取得
async function testGetInventoryLogs() {
  log('Test 7: 在庫ログ取得 (GET /api/admin/products/:id/inventory-logs)');
  try {
    const response = await client.get(`/api/admin/products/${testProductId}/inventory-logs`, {
      params: {
        limit: 20,
        offset: 0,
      },
    });

    if (response.status === 200 && response.data.success) {
      logSuccess(`在庫ログ取得成功: ${response.data.logs.length}件`);
      logInfo('在庫ログ', response.data.logs);
      logInfo('現在在庫', response.data.currentStock);
      return true;
    } else {
      logError(`在庫ログ取得失敗: ${response.data.message}`);
      return false;
    }
  } catch (error: any) {
    logError(`在庫ログ取得エラー: ${error.message}`);
    return false;
  }
}

// 8. 商品削除
async function testDeleteProduct() {
  log('Test 8: 商品削除 (DELETE /api/admin/products/:id)');
  try {
    const response = await client.delete(`/api/admin/products/${testProductId}`);

    if (response.status === 200 && response.data.success) {
      logSuccess('商品削除成功（論理削除）');
      logInfo('削除された商品', response.data.product);
      return true;
    } else {
      logError(`商品削除失敗: ${response.data.message}`);
      return false;
    }
  } catch (error: any) {
    logError(`商品削除エラー: ${error.message}`);
    return false;
  }
}

// ===== メイン処理 =====

async function runTests() {
  console.log('='.repeat(60));
  console.log('🚀 管理者用商品管理API統合テスト');
  console.log('='.repeat(60));

  const results = [];

  // テスト実行
  results.push(await testAdminLogin());
  if (!results[0]) {
    logError('管理者ログインに失敗しました。テストを中断します。');
    process.exit(1);
  }

  results.push(await getCategory());
  if (!results[1]) {
    logError('カテゴリー取得に失敗しました。テストを中断します。');
    process.exit(1);
  }

  results.push(await testCreateProduct());
  results.push(await testGetProducts());
  results.push(await testUpdateProduct());
  results.push(await testAdjustInventory());
  results.push(await testGetInventoryLogs());
  results.push(await testDeleteProduct());

  // 結果サマリー
  console.log('\n' + '='.repeat(60));
  console.log('📊 テスト結果サマリー');
  console.log('='.repeat(60));

  const passCount = results.filter((r) => r === true).length;
  const totalCount = results.length;

  console.log(`✅ 成功: ${passCount}/${totalCount}`);
  console.log(`❌ 失敗: ${totalCount - passCount}/${totalCount}`);

  if (passCount === totalCount) {
    console.log('\n🎉 全てのテストが成功しました！');
    process.exit(0);
  } else {
    console.log('\n⚠️  一部のテストが失敗しました。');
    process.exit(1);
  }
}

// 実行
runTests();

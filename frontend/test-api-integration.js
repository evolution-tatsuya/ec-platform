/**
 * API統合テストスクリプト
 *
 * 主要なユーザーフローをテストします:
 * 1. トップページ表示
 * 2. 商品一覧表示
 * 3. 商品詳細表示
 * 4. 会員登録
 * 5. ログイン
 * 6. カート追加
 * 7. チェックアウト
 */

const API_BASE_URL = 'http://localhost:8432';

// テスト用ユーザー情報
const testUser = {
  email: `test_${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: 'テストユーザー',
};

let sessionCookie = '';

// セッションCookieを保存するfetch wrapper
async function fetchWithSession(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (sessionCookie) {
    headers['Cookie'] = sessionCookie;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Set-Cookieヘッダーからセッションを保存
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    sessionCookie = setCookie.split(';')[0];
  }

  return response;
}

async function test1_TopPage() {
  console.log('\n📄 テスト1: トップページデータ取得');
  try {
    const response = await fetch(`${API_BASE_URL}/api/top-page`);
    const data = await response.json();

    if (!data.success) {
      throw new Error('トップページデータ取得失敗');
    }

    console.log('✅ トップページデータ取得成功');
    console.log(`  - ヒーロースライド: ${data.data.heroSlides.length}件`);
    console.log(`  - メガカテゴリー: ${data.data.megaCategories.length}件`);
    console.log(`  - 新着商品: ${data.data.newProducts.length}件`);
    console.log(`  - 人気商品: ${data.data.popularProducts.length}件`);
    console.log(`  - ニュース: ${data.data.news.length}件`);
    return true;
  } catch (error) {
    console.error('❌ テスト失敗:', error.message);
    return false;
  }
}

async function test2_ProductList() {
  console.log('\n📋 テスト2: 商品一覧取得');
  try {
    const response = await fetch(`${API_BASE_URL}/api/products?limit=5`);
    const data = await response.json();

    if (!data.success) {
      throw new Error('商品一覧取得失敗');
    }

    console.log('✅ 商品一覧取得成功');
    console.log(`  - 商品数: ${data.products.length}件`);
    console.log(`  - 総商品数: ${data.pagination.total}件`);
    return data.products[0]?.id; // 最初の商品IDを返す
  } catch (error) {
    console.error('❌ テスト失敗:', error.message);
    return null;
  }
}

async function test3_ProductDetail(productId) {
  console.log('\n🔍 テスト3: 商品詳細取得');
  try {
    const response = await fetch(`${API_BASE_URL}/api/products/${productId}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error('商品詳細取得失敗');
    }

    console.log('✅ 商品詳細取得成功');
    console.log(`  - 商品名: ${data.product.name}`);
    console.log(`  - 価格: ¥${data.product.price.toLocaleString()}`);
    console.log(`  - 在庫: ${data.product.currentStock || 0}個`);
    return true;
  } catch (error) {
    console.error('❌ テスト失敗:', error.message);
    return false;
  }
}

async function test4_Register() {
  console.log('\n👤 テスト4: 会員登録');
  try {
    const response = await fetchWithSession(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      body: JSON.stringify(testUser),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || '会員登録失敗');
    }

    console.log('✅ 会員登録成功');
    console.log(`  - ユーザーID: ${data.user.id}`);
    console.log(`  - メールアドレス: ${data.user.email}`);
    console.log(`  - 名前: ${data.user.name}`);
    return true;
  } catch (error) {
    console.error('❌ テスト失敗:', error.message);
    return false;
  }
}

async function test5_Login() {
  console.log('\n🔐 テスト5: ログイン');
  try {
    // まず登録
    await fetchWithSession(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      body: JSON.stringify(testUser),
    });

    // ログアウト
    await fetchWithSession(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
    });

    // ログイン
    const response = await fetchWithSession(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'ログイン失敗');
    }

    console.log('✅ ログイン成功');
    console.log(`  - ユーザーID: ${data.user.id}`);
    return true;
  } catch (error) {
    console.error('❌ テスト失敗:', error.message);
    return false;
  }
}

async function test6_Cart(productId) {
  console.log('\n🛒 テスト6: カート操作');
  try {
    // カートに追加
    const addResponse = await fetchWithSession(`${API_BASE_URL}/api/cart`, {
      method: 'POST',
      body: JSON.stringify({
        productId,
        quantity: 2,
      }),
    });

    const addData = await addResponse.json();

    if (!addData.success) {
      throw new Error(addData.message || 'カート追加失敗');
    }

    console.log('✅ カート追加成功');
    console.log(`  - 商品: ${addData.cartItem.product.name}`);
    console.log(`  - 数量: ${addData.cartItem.quantity}個`);

    // カート取得
    const getResponse = await fetchWithSession(`${API_BASE_URL}/api/cart`);
    const getData = await getResponse.json();

    if (!getData.success) {
      throw new Error('カート取得失敗');
    }

    console.log('✅ カート取得成功');
    console.log(`  - カート内商品数: ${getData.cart.totalItems}個`);
    console.log(`  - 合計金額: ¥${getData.cart.totalAmount.toLocaleString()}`);
    return true;
  } catch (error) {
    console.error('❌ テスト失敗:', error.message);
    return false;
  }
}

async function test7_Checkout() {
  console.log('\n💳 テスト7: チェックアウト');
  try {
    const response = await fetchWithSession(`${API_BASE_URL}/api/orders`, {
      method: 'POST',
      body: JSON.stringify({
        paymentMethod: 'bank_transfer',
        shippingAddress: '東京都渋谷区テスト町1-2-3',
      }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || '注文作成失敗');
    }

    console.log('✅ 注文作成成功');
    console.log(`  - 注文番号: ${data.order.orderNumber}`);
    console.log(`  - 合計金額: ¥${data.order.totalAmount.toLocaleString()}`);
    console.log(`  - 決済方法: ${data.order.paymentMethod}`);
    return true;
  } catch (error) {
    console.error('❌ テスト失敗:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 API統合テスト開始\n');
  console.log('=' .repeat(60));

  const results = [];

  // テスト1: トップページ
  results.push(await test1_TopPage());

  // テスト2: 商品一覧
  const productId = await test2_ProductList();
  results.push(!!productId);

  // テスト3: 商品詳細
  if (productId) {
    results.push(await test3_ProductDetail(productId));
  }

  // テスト4: 会員登録
  results.push(await test4_Register());

  // テスト5: ログイン
  results.push(await test5_Login());

  // テスト6: カート操作
  if (productId) {
    results.push(await test6_Cart(productId));
  }

  // テスト7: チェックアウト
  results.push(await test7_Checkout());

  // 結果サマリー
  console.log('\n' + '='.repeat(60));
  console.log('📊 テスト結果サマリー\n');

  const passed = results.filter(r => r).length;
  const total = results.length;
  const percentage = ((passed / total) * 100).toFixed(1);

  console.log(`合計: ${total}テスト`);
  console.log(`成功: ${passed}テスト`);
  console.log(`失敗: ${total - passed}テスト`);
  console.log(`成功率: ${percentage}%`);

  if (passed === total) {
    console.log('\n🎉 全てのテストが成功しました！');
  } else {
    console.log('\n⚠️  一部のテストが失敗しました。');
  }

  console.log('=' .repeat(60));
}

// テスト実行
runAllTests().catch(console.error);

/**
 * ユーザー管理API 統合テスト
 *
 * テスト対象:
 * - GET /api/users/me - ログイン中のユーザー情報取得
 * - PUT /api/users/me - ログイン中のユーザー情報更新
 * - PUT /api/users/me/password - パスワード変更
 * - GET /api/users/default-address - デフォルト配送先住所取得
 *
 * 実行方法:
 * npx ts-node tests/integration/users.test.ts
 */

import { config } from '../../src/config';

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
 * グローバル変数: セッションCookie
 */
let sessionCookie: string | null = null;

/**
 * テストユーザー情報
 */
const TEST_USER = {
  email: `test-user-${Date.now()}@example.com`,
  password: 'TestPassword123',
  name: 'テストユーザー',
};

/**
 * セットアップ: テストユーザーを登録してログイン
 */
async function setup() {
  console.log('\n📝 セットアップ: テストユーザーを登録...');

  // 会員登録
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

  // Cookieを取得
  const setCookieHeader = registerResponse.headers.get('set-cookie');
  if (setCookieHeader) {
    sessionCookie = setCookieHeader.split(';')[0];
  }

  if (!sessionCookie) {
    throw new Error('セッションCookieの取得に失敗しました');
  }

  console.log(`✅ テストユーザー登録完了: ${TEST_USER.email}\n`);
}

/**
 * テスト1: ログイン中のユーザー情報取得（認証なし）
 */
async function testGetMeWithoutAuth() {
  const response = await fetch(`${BASE_URL}/api/users/me`);

  if (response.ok) {
    throw new Error('認証なしでアクセスできてしまいました');
  }

  if (response.status !== 401) {
    throw new Error(`期待するステータスコード: 401, 実際: ${response.status}`);
  }
}

/**
 * テスト2: ログイン中のユーザー情報取得（認証あり）
 */
async function testGetMeWithAuth() {
  if (!sessionCookie) {
    throw new Error('セッションCookieがありません');
  }

  const response = await fetch(`${BASE_URL}/api/users/me`, {
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

  if (!data.user) {
    throw new Error('user が返却されていません');
  }

  if (data.user.email !== TEST_USER.email) {
    throw new Error(`メールアドレスが不一致: ${data.user.email}`);
  }

  if (data.user.name !== TEST_USER.name) {
    throw new Error(`名前が不一致: ${data.user.name}`);
  }

  console.log(`   ユーザーID: ${data.user.id}`);
  console.log(`   メールアドレス: ${data.user.email}`);
  console.log(`   名前: ${data.user.name}`);
}

/**
 * テスト3: ユーザー情報更新（名前と住所）
 */
async function testUpdateMe() {
  if (!sessionCookie) {
    throw new Error('セッションCookieがありません');
  }

  const updateData = {
    name: '更新されたユーザー',
    defaultAddress: '東京都渋谷区1-2-3',
    defaultPostalCode: '1500001',
    defaultPhone: '03-1234-5678',
  };

  const response = await fetch(`${BASE_URL}/api/users/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify(updateData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
  }

  const data: ApiResponse = await response.json();

  if (!data.success) {
    throw new Error('success: false');
  }

  if (!data.user) {
    throw new Error('user が返却されていません');
  }

  if (data.user.name !== updateData.name) {
    throw new Error(`名前が更新されていません: ${data.user.name}`);
  }

  if (data.user.defaultAddress !== updateData.defaultAddress) {
    throw new Error(`住所が更新されていません: ${data.user.defaultAddress}`);
  }

  if (data.user.defaultPostalCode !== updateData.defaultPostalCode) {
    throw new Error(`郵便番号が更新されていません: ${data.user.defaultPostalCode}`);
  }

  if (data.user.defaultPhone !== updateData.defaultPhone) {
    throw new Error(`電話番号が更新されていません: ${data.user.defaultPhone}`);
  }

  console.log(`   更新後の名前: ${data.user.name}`);
  console.log(`   更新後の住所: ${data.user.defaultAddress}`);
  console.log(`   更新後の郵便番号: ${data.user.defaultPostalCode}`);
  console.log(`   更新後の電話番号: ${data.user.defaultPhone}`);
}

/**
 * テスト4: ユーザー情報更新（メールアドレス重複チェック）
 */
async function testUpdateMeWithDuplicateEmail() {
  if (!sessionCookie) {
    throw new Error('セッションCookieがありません');
  }

  // 別のユーザーを登録
  const anotherUser = {
    email: `another-user-${Date.now()}@example.com`,
    password: 'AnotherPassword123',
    name: '別のユーザー',
  };

  const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(anotherUser),
  });

  if (!registerResponse.ok) {
    throw new Error('別ユーザーの登録に失敗しました');
  }

  // 元のユーザーが別ユーザーのメールアドレスに変更しようとする
  const response = await fetch(`${BASE_URL}/api/users/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({ email: anotherUser.email }),
  });

  if (response.ok) {
    throw new Error('重複メールアドレスでエラーになるべきですが、成功しました');
  }

  if (response.status !== 409) {
    throw new Error(`期待するステータスコード: 409, 実際: ${response.status}`);
  }
}

/**
 * テスト5: パスワード変更（正常系）
 */
async function testUpdatePassword() {
  if (!sessionCookie) {
    throw new Error('セッションCookieがありません');
  }

  const newPassword = 'NewPassword456';

  const response = await fetch(`${BASE_URL}/api/users/me/password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({
      currentPassword: TEST_USER.password,
      newPassword,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
  }

  const data: ApiResponse = await response.json();

  if (!data.success) {
    throw new Error('success: false');
  }

  // 新しいパスワードでログインできるか確認
  const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: TEST_USER.email,
      password: newPassword,
    }),
  });

  if (!loginResponse.ok) {
    throw new Error('新しいパスワードでログインできませんでした');
  }

  // セッションCookieを更新
  const setCookieHeader = loginResponse.headers.get('set-cookie');
  if (setCookieHeader) {
    sessionCookie = setCookieHeader.split(';')[0];
  }

  console.log('   パスワード変更成功、新しいパスワードでログイン成功');
}

/**
 * テスト6: パスワード変更（現在のパスワードが間違っている）
 */
async function testUpdatePasswordWithWrongCurrentPassword() {
  if (!sessionCookie) {
    throw new Error('セッションCookieがありません');
  }

  const response = await fetch(`${BASE_URL}/api/users/me/password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({
      currentPassword: 'WrongPassword999',
      newPassword: 'NewPassword789',
    }),
  });

  if (response.ok) {
    throw new Error('間違ったパスワードでエラーになるべきですが、成功しました');
  }

  if (response.status !== 401) {
    throw new Error(`期待するステータスコード: 401, 実際: ${response.status}`);
  }
}

/**
 * テスト7: パスワード変更（新しいパスワードが弱い）
 */
async function testUpdatePasswordWithWeakPassword() {
  if (!sessionCookie) {
    throw new Error('セッションCookieがありません');
  }

  const response = await fetch(`${BASE_URL}/api/users/me/password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({
      currentPassword: 'NewPassword456',
      newPassword: '123', // 8文字未満
    }),
  });

  if (response.ok) {
    throw new Error('弱いパスワードでエラーになるべきですが、成功しました');
  }

  if (response.status !== 400) {
    throw new Error(`期待するステータスコード: 400, 実際: ${response.status}`);
  }
}

/**
 * テスト8: デフォルト配送先住所取得
 */
async function testGetDefaultAddress() {
  if (!sessionCookie) {
    throw new Error('セッションCookieがありません');
  }

  const response = await fetch(`${BASE_URL}/api/users/default-address`, {
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

  if (!data.defaultAddress) {
    throw new Error('defaultAddress が返却されていません');
  }

  // テスト3で設定した住所が取得できるか確認
  if (data.defaultAddress.address !== '東京都渋谷区1-2-3') {
    throw new Error(`住所が不一致: ${data.defaultAddress.address}`);
  }

  if (data.defaultAddress.postalCode !== '1500001') {
    throw new Error(`郵便番号が不一致: ${data.defaultAddress.postalCode}`);
  }

  if (data.defaultAddress.phone !== '03-1234-5678') {
    throw new Error(`電話番号が不一致: ${data.defaultAddress.phone}`);
  }

  console.log(`   住所: ${data.defaultAddress.address}`);
  console.log(`   郵便番号: ${data.defaultAddress.postalCode}`);
  console.log(`   電話番号: ${data.defaultAddress.phone}`);
}

/**
 * メイン実行
 */
async function main() {
  console.log('\n=================================');
  console.log('🧪 ユーザー管理API 統合テスト開始');
  console.log('=================================\n');
  console.log(`Backend URL: ${BASE_URL}\n`);

  // セットアップ
  await setup();

  // テスト実行
  await runTest('ユーザー情報取得（認証なし）', testGetMeWithoutAuth);
  await runTest('ユーザー情報取得（認証あり）', testGetMeWithAuth);
  await runTest('ユーザー情報更新（名前と住所）', testUpdateMe);
  await runTest('ユーザー情報更新（メールアドレス重複チェック）', testUpdateMeWithDuplicateEmail);
  await runTest('パスワード変更（正常系）', testUpdatePassword);
  await runTest(
    'パスワード変更（現在のパスワードが間違っている）',
    testUpdatePasswordWithWrongCurrentPassword
  );
  await runTest('パスワード変更（新しいパスワードが弱い）', testUpdatePasswordWithWeakPassword);
  await runTest('デフォルト配送先住所取得', testGetDefaultAddress);

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
  process.exit(1);
});

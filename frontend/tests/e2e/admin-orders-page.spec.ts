import { test, expect } from '@playwright/test';

/**
 * 注文管理ページE2Eテスト
 *
 * テスト対象: A-003 注文管理ページ (AdminOrdersPage)
 * ページルート: /admin/orders
 * 権限: 管理者のみ
 *
 * 前提条件:
 * - バックエンドが起動していること (http://localhost:8432)
 * - フロントエンドが起動していること (http://localhost:3247)
 * - テストデータがシードされていること（注文20件、顧客10名）
 */

// 管理者認証情報
const ADMIN_USER = {
  email: 'admin@ec-platform.local',
  password: 'TestAdmin2025!',
};

const API_BASE_URL = 'http://localhost:8432';

/**
 * 管理者ログインヘルパー関数
 * 管理者としてログインし、セッションを確立する
 */
async function loginAsAdmin(page: any) {
  // ログインページに移動
  await page.goto('/admin/login');
  await page.waitForLoadState('domcontentloaded');

  // ログインフォーム入力
  await page.getByLabel('メールアドレス').fill(ADMIN_USER.email);
  await page.getByLabel('パスワード').fill(ADMIN_USER.password);

  // ログインAPIのレスポンスを待機しながらボタンをクリック
  const [response] = await Promise.all([
    page.waitForResponse(
      (resp: any) => resp.url().includes('/api/auth/login') && resp.status() === 200,
      { timeout: 30000 }
    ),
    page.getByRole('button', { name: 'ログイン' }).click(),
  ]);

  // レスポンスの内容を確認
  const responseData = await response.json();
  if (!responseData.success) {
    throw new Error(`Admin login failed: ${responseData.message}`);
  }

  console.log('Login API response:', responseData);

  // ログイン成功後、Cookieが保存されているか確認
  const cookies = await page.context().cookies();
  console.log('Cookies after login:', cookies);

  const sessionCookie = cookies.find(c => c.name === 'connect.sid');
  if (!sessionCookie) {
    throw new Error('Session cookie not found after login!');
  }

  console.log('Session cookie found:', sessionCookie.value);

  // セッションAPIを直接呼び出してセッションが有効か確認
  const sessionResponse = await page.request.get(`${API_BASE_URL}/api/auth/session`);
  const sessionData = await sessionResponse.json();
  console.log('Session API response:', sessionData);

  if (!sessionData.success || !sessionData.isAuthenticated) {
    throw new Error('Session not established after login!');
  }

  // セッション確立後、少し待機してAuthContextの状態更新を待つ
  await page.waitForTimeout(3000);

  // 現在のURLを確認（自動リダイレクトされているか）
  const currentUrl = page.url();
  console.log('Current URL after login:', currentUrl);
}

/**
 * TC-001: ページ表示確認
 * 目的: 管理者ログイン後、注文管理ページが正常に表示されることを確認
 */
test.only('TC-001: ページ表示確認', async ({ page }) => {
  // 前提条件: 管理者としてログイン済み
  await loginAsAdmin(page);

  // 1. 注文管理ページに移動
  await page.goto('/admin/orders');
  await page.waitForLoadState('domcontentloaded');

  // 少し待機してページのレンダリングを待つ
  await page.waitForTimeout(2000);

  // 2. URLが `/admin/orders` に遷移したことを確認
  expect(page.url()).toContain('/admin/orders');

  // 3. ページタイトル「注文管理」が表示されることを確認
  const pageTitle = page.getByRole('heading', { name: '注文管理' });
  await expect(pageTitle).toBeVisible();

  // 4. 検索・絞り込みエリアの各項目が表示されることを確認
  // DatePickerの確認（期間開始）
  const startDatePicker = page.getByLabel('期間（開始）').first();
  await expect(startDatePicker).toBeVisible();

  // DatePickerの確認（期間終了）
  const endDatePicker = page.getByLabel('期間（終了）').first();
  await expect(endDatePicker).toBeVisible();

  // ステータス絞り込みSelectの確認（FormControl内のSelectを特定）
  const statusFormControl = page.locator('label:has-text("ステータス")').locator('..');
  await expect(statusFormControl).toBeVisible();

  // 決済方法絞り込みSelectの確認（FormControl内のSelectを特定）
  const paymentMethodFormControl = page.locator('label:has-text("決済方法")').locator('..');
  await expect(paymentMethodFormControl).toBeVisible();

  // 5. 注文一覧DataGridが表示されることを確認
  const dataGrid = page.locator('.MuiDataGrid-root');
  await expect(dataGrid).toBeVisible();

  // DataGridのカラムヘッダーを確認
  await expect(page.getByRole('columnheader', { name: '注文番号' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: '顧客名' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: '注文日' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: '合計金額' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'ステータス' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: '決済方法' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: '操作' })).toBeVisible();

  console.log('✅ TC-001: 注文管理ページが正常に表示されました');
});

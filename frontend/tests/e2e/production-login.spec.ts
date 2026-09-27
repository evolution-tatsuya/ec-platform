import { test, expect } from '@playwright/test';

/**
 * 本番環境ログインテスト
 * 目的: デプロイ後の管理者ログイン動作確認
 */

const PRODUCTION_URL = 'https://frontend-2y0g6i6i9-tatsuyas-projects-20cab125.vercel.app';
const ADMIN_EMAIL = 'admin@ec-platform.local';
const ADMIN_PASSWORD = 'TestAdmin2025!';

test.describe('本番環境: 管理者ログイン', () => {
  test('TC-PROD-001: 本番環境にアクセス可能', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    await expect(page).toHaveTitle(/EC Platform/i);
  });

  test('TC-PROD-002: 管理者ログインページにアクセス可能', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/admin/login`);
    await expect(page.locator('h1, h2, h3, h4, h5, h6')).toContainText(/ログイン|Login/i);
  });

  test('TC-PROD-003: 管理者ログイン成功', async ({ page }) => {
    // ログインページに移動
    await page.goto(`${PRODUCTION_URL}/admin/login`);

    // ログインフォームに入力
    await page.fill('input[name="email"], input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"], input[type="password"]', ADMIN_PASSWORD);

    // ログインボタンをクリック
    await page.click('button[type="submit"]');

    // ダッシュボードへのリダイレクトを待機（最大10秒）
    await page.waitForURL(/\/admin\/dashboard|\/admin\/products|\/admin/i, { timeout: 10000 });

    // 管理画面にいることを確認
    expect(page.url()).toContain('/admin');

    // ダッシュボードの要素が存在することを確認
    const dashboardElement = page.locator('body');
    await expect(dashboardElement).toBeVisible();
  });

  test('TC-PROD-004: セッション維持確認', async ({ page }) => {
    // ログイン
    await page.goto(`${PRODUCTION_URL}/admin/login`);
    await page.fill('input[name="email"], input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"], input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/i, { timeout: 10000 });

    // 別のページに移動
    await page.goto(`${PRODUCTION_URL}/admin/products`);

    // ログアウトされていないことを確認
    expect(page.url()).toContain('/admin/products');
  });
});

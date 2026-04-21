/**
 * スライス8-A統合テスト: システム設定API
 *
 * テスト対象:
 * 1. GET /api/admin/settings - 全設定取得
 * 2. PUT /api/admin/settings/company - 会社情報更新
 * 3. PUT /api/admin/settings/payment - 決済設定更新
 * 4. PUT /api/admin/settings/email - メール設定更新
 * 5. PUT /api/admin/settings/document-templates - 書類テンプレート設定更新
 * 6. PUT /api/admin/settings/image-optimization - 画像最適化設定更新
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:8432';

// テストデータのクリーンアップ
async function cleanup() {
  // 外部キー制約の順序を考慮
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.inquiry.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.user.deleteMany();
  await prisma.siteSettings.deleteMany();
}

// テストデータのセットアップ
async function setup() {
  // 管理者ユーザー作成
  const hashedPassword = await bcrypt.hash('adminpassword123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin-slice8a@example.com',
      password: hashedPassword,
      name: 'スライス8A管理者',
      isAdmin: true,
    },
  });

  // 一般ユーザー作成
  const regularUserPassword = await bcrypt.hash('userpassword123', 10);
  const regularUser = await prisma.user.create({
    data: {
      email: 'user-slice8a@example.com',
      password: regularUserPassword,
      name: 'スライス8A一般ユーザー',
      isAdmin: false,
    },
  });

  return { admin, regularUser };
}

describe('スライス8-A: システム設定API', () => {
  let adminSessionCookie: string;
  let userSessionCookie: string;

  beforeAll(async () => {
    await cleanup();
    await setup();

    // 管理者ログイン（/api/auth/loginを使用、isAdmin=trueのユーザー）
    const adminLoginRes = await request(BASE_URL).post('/api/auth/login').send({
      email: 'admin-slice8a@example.com',
      password: 'adminpassword123',
    });

    if (!adminLoginRes.headers['set-cookie']) {
      console.error('Admin login failed:', adminLoginRes.status, adminLoginRes.body);
      throw new Error('Admin login failed');
    }
    adminSessionCookie = adminLoginRes.headers['set-cookie'][0];

    // 一般ユーザーログイン
    const userLoginRes = await request(BASE_URL).post('/api/auth/login').send({
      email: 'user-slice8a@example.com',
      password: 'userpassword123',
    });

    if (!userLoginRes.headers['set-cookie']) {
      console.error('User login failed:', userLoginRes.status, userLoginRes.body);
      throw new Error('User login failed');
    }
    userSessionCookie = userLoginRes.headers['set-cookie'][0];
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  // ===== 8.1: 全設定取得 =====
  describe('GET /api/admin/settings', () => {
    it('管理者は全設定を取得できる', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/settings')
        .set('Cookie', adminSessionCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.settings).toBeDefined();
      expect(res.body.settings.id).toBeDefined();
      expect(res.body.settings.enableBankTransfer).toBe(true); // デフォルト値
      expect(res.body.settings.enableCreditCard).toBe(true); // デフォルト値
      expect(res.body.settings.bankTransferDiscount).toBe(0.036); // デフォルト値
      expect(res.body.settings.enableWebpConversion).toBe(true); // デフォルト値
      expect(res.body.settings.imageQuality).toBe(80); // デフォルト値
      expect(res.body.settings.thumbnailSize).toBe(200); // デフォルト値
    });

    it('未認証の場合は401エラー', async () => {
      const res = await request(BASE_URL).get('/api/admin/settings').expect(401);

      expect(res.body.success).toBe(false);
    });

    it('一般ユーザーの場合は403エラー', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/settings')
        .set('Cookie', userSessionCookie)
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  // ===== 8.2: 会社情報更新 =====
  describe('PUT /api/admin/settings/company', () => {
    it('管理者は会社情報を更新できる', async () => {
      const res = await request(BASE_URL)
        .put('/api/admin/settings/company')
        .set('Cookie', adminSessionCookie)
        .send({
          companyName: 'テスト株式会社',
          companyLogoUrl: 'https://example.com/logo.png',
          companyPostalCode: '100-0001',
          companyAddress: '東京都千代田区千代田1-1-1',
          companyPhone: '03-1234-5678',
          bankName: 'テスト銀行',
          bankBranch: 'テスト支店',
          bankAccountType: '普通',
          bankAccountNumber: '1234567',
          bankAccountHolder: 'テストカブシキガイシャ',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('会社情報');
      expect(res.body.settings.companyName).toBe('テスト株式会社');
      expect(res.body.settings.companyPostalCode).toBe('100-0001');
      expect(res.body.settings.companyAddress).toBe('東京都千代田区千代田1-1-1');
      expect(res.body.settings.companyPhone).toBe('03-1234-5678');
      expect(res.body.settings.bankName).toBe('テスト銀行');
      expect(res.body.settings.bankAccountNumber).toBe('1234567');
    });

    it('部分更新が可能（一部のフィールドのみ更新）', async () => {
      const res = await request(BASE_URL)
        .put('/api/admin/settings/company')
        .set('Cookie', adminSessionCookie)
        .send({
          companyName: '更新後の会社名',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.settings.companyName).toBe('更新後の会社名');
      // 他のフィールドは保持される
      expect(res.body.settings.companyPhone).toBe('03-1234-5678');
    });

    it('未認証の場合は401エラー', async () => {
      const res = await request(BASE_URL)
        .put('/api/admin/settings/company')
        .send({ companyName: 'テスト会社' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('一般ユーザーの場合は403エラー', async () => {
      const res = await request(BASE_URL)
        .put('/api/admin/settings/company')
        .set('Cookie', userSessionCookie)
        .send({ companyName: 'テスト会社' })
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  // ===== 8.3: 決済設定更新 =====
  describe('PUT /api/admin/settings/payment', () => {
    it('管理者は決済設定を更新できる', async () => {
      const res = await request(BASE_URL)
        .put('/api/admin/settings/payment')
        .set('Cookie', adminSessionCookie)
        .send({
          enableBankTransfer: true,
          bankTransferDiscount: 0.05,
          enableCreditCard: true,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('決済設定');
      expect(res.body.settings.enableBankTransfer).toBe(true);
      expect(res.body.settings.bankTransferDiscount).toBe(0.05);
      expect(res.body.settings.enableCreditCard).toBe(true);
    });

    it('銀行振込を無効化できる', async () => {
      const res = await request(BASE_URL)
        .put('/api/admin/settings/payment')
        .set('Cookie', adminSessionCookie)
        .send({
          enableBankTransfer: false,
          bankTransferDiscount: 0.036,
          enableCreditCard: true,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.settings.enableBankTransfer).toBe(false);
    });

    it('クレジットカードを無効化できる', async () => {
      const res = await request(BASE_URL)
        .put('/api/admin/settings/payment')
        .set('Cookie', adminSessionCookie)
        .send({
          enableBankTransfer: true,
          bankTransferDiscount: 0.036,
          enableCreditCard: false,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.settings.enableCreditCard).toBe(false);
    });

    it('割引率0%も設定可能', async () => {
      const res = await request(BASE_URL)
        .put('/api/admin/settings/payment')
        .set('Cookie', adminSessionCookie)
        .send({
          enableBankTransfer: true,
          bankTransferDiscount: 0,
          enableCreditCard: true,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.settings.bankTransferDiscount).toBe(0);
    });

    it('未認証の場合は401エラー', async () => {
      const res = await request(BASE_URL)
        .put('/api/admin/settings/payment')
        .send({ enableBankTransfer: true })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('一般ユーザーの場合は403エラー', async () => {
      const res = await request(BASE_URL)
        .put('/api/admin/settings/payment')
        .set('Cookie', userSessionCookie)
        .send({ enableBankTransfer: true })
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  // ===== 8.4: メール設定更新 =====
  describe('PUT /api/admin/settings/email', () => {
    it('管理者はメール設定を更新できる', async () => {
      const res = await request(BASE_URL)
        .put('/api/admin/settings/email')
        .set('Cookie', adminSessionCookie)
        .send({
          emailFrom: 'info@test-company.com',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('メール設定');
      expect(res.body.settings.emailFrom).toBe('info@test-company.com');
    });

    it('メールアドレスを変更できる', async () => {
      const res = await request(BASE_URL)
        .put('/api/admin/settings/email')
        .set('Cookie', adminSessionCookie)
        .send({
          emailFrom: 'support@test-company.com',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.settings.emailFrom).toBe('support@test-company.com');
    });

    it('未認証の場合は401エラー', async () => {
      const res = await request(BASE_URL)
        .put('/api/admin/settings/email')
        .send({ emailFrom: 'test@example.com' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('一般ユーザーの場合は403エラー', async () => {
      const res = await request(BASE_URL)
        .put('/api/admin/settings/email')
        .set('Cookie', userSessionCookie)
        .send({ emailFrom: 'test@example.com' })
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  // ===== 8.5: 書類テンプレート設定更新 =====
  describe('PUT /api/admin/settings/document-templates', () => {
    it('管理者は書類テンプレート設定を更新できる', async () => {
      const res = await request(BASE_URL)
        .put('/api/admin/settings/document-templates')
        .set('Cookie', adminSessionCookie)
        .send({})
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('書類テンプレート設定');
    });

    it('未認証の場合は401エラー', async () => {
      const res = await request(BASE_URL)
        .put('/api/admin/settings/document-templates')
        .send({})
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('一般ユーザーの場合は403エラー', async () => {
      const res = await request(BASE_URL)
        .put('/api/admin/settings/document-templates')
        .set('Cookie', userSessionCookie)
        .send({})
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  // ===== 8.6: 画像最適化設定更新 =====
  describe('PUT /api/admin/settings/image-optimization', () => {
    it('管理者は画像最適化設定を更新できる', async () => {
      const res = await request(BASE_URL)
        .put('/api/admin/settings/image-optimization')
        .set('Cookie', adminSessionCookie)
        .send({
          enableWebpConversion: true,
          imageQuality: 85,
          thumbnailSize: 300,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('画像最適化設定');
      expect(res.body.settings.enableWebpConversion).toBe(true);
      expect(res.body.settings.imageQuality).toBe(85);
      expect(res.body.settings.thumbnailSize).toBe(300);
    });

    it('WebP変換を無効化できる', async () => {
      const res = await request(BASE_URL)
        .put('/api/admin/settings/image-optimization')
        .set('Cookie', adminSessionCookie)
        .send({
          enableWebpConversion: false,
          imageQuality: 80,
          thumbnailSize: 200,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.settings.enableWebpConversion).toBe(false);
    });

    it('画質を最高品質（100）に設定できる', async () => {
      const res = await request(BASE_URL)
        .put('/api/admin/settings/image-optimization')
        .set('Cookie', adminSessionCookie)
        .send({
          enableWebpConversion: true,
          imageQuality: 100,
          thumbnailSize: 200,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.settings.imageQuality).toBe(100);
    });

    it('画質を最低品質（60）に設定できる', async () => {
      const res = await request(BASE_URL)
        .put('/api/admin/settings/image-optimization')
        .set('Cookie', adminSessionCookie)
        .send({
          enableWebpConversion: true,
          imageQuality: 60,
          thumbnailSize: 200,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.settings.imageQuality).toBe(60);
    });

    it('サムネイルサイズを大きく（500px）できる', async () => {
      const res = await request(BASE_URL)
        .put('/api/admin/settings/image-optimization')
        .set('Cookie', adminSessionCookie)
        .send({
          enableWebpConversion: true,
          imageQuality: 80,
          thumbnailSize: 500,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.settings.thumbnailSize).toBe(500);
    });

    it('サムネイルサイズを小さく（100px）できる', async () => {
      const res = await request(BASE_URL)
        .put('/api/admin/settings/image-optimization')
        .set('Cookie', adminSessionCookie)
        .send({
          enableWebpConversion: true,
          imageQuality: 80,
          thumbnailSize: 100,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.settings.thumbnailSize).toBe(100);
    });

    it('未認証の場合は401エラー', async () => {
      const res = await request(BASE_URL)
        .put('/api/admin/settings/image-optimization')
        .send({ enableWebpConversion: true })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('一般ユーザーの場合は403エラー', async () => {
      const res = await request(BASE_URL)
        .put('/api/admin/settings/image-optimization')
        .set('Cookie', userSessionCookie)
        .send({ enableWebpConversion: true })
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  // ===== 統合テスト: 複数設定の連携 =====
  describe('統合テスト: 複数設定の連携', () => {
    it('会社情報、決済設定、メール設定、画像設定を順次更新し、全体が正しく保持される', async () => {
      // 会社情報更新
      await request(BASE_URL)
        .put('/api/admin/settings/company')
        .set('Cookie', adminSessionCookie)
        .send({
          companyName: '統合テスト株式会社',
          companyPhone: '03-9999-8888',
        })
        .expect(200);

      // 決済設定更新
      await request(BASE_URL)
        .put('/api/admin/settings/payment')
        .set('Cookie', adminSessionCookie)
        .send({
          enableBankTransfer: true,
          bankTransferDiscount: 0.04,
          enableCreditCard: true,
        })
        .expect(200);

      // メール設定更新
      await request(BASE_URL)
        .put('/api/admin/settings/email')
        .set('Cookie', adminSessionCookie)
        .send({
          emailFrom: 'integration@test-company.com',
        })
        .expect(200);

      // 画像最適化設定更新
      await request(BASE_URL)
        .put('/api/admin/settings/image-optimization')
        .set('Cookie', adminSessionCookie)
        .send({
          enableWebpConversion: true,
          imageQuality: 90,
          thumbnailSize: 250,
        })
        .expect(200);

      // 全設定取得して確認
      const res = await request(BASE_URL)
        .get('/api/admin/settings')
        .set('Cookie', adminSessionCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.settings.companyName).toBe('統合テスト株式会社');
      expect(res.body.settings.companyPhone).toBe('03-9999-8888');
      expect(res.body.settings.enableBankTransfer).toBe(true);
      expect(res.body.settings.bankTransferDiscount).toBe(0.04);
      expect(res.body.settings.enableCreditCard).toBe(true);
      expect(res.body.settings.emailFrom).toBe('integration@test-company.com');
      expect(res.body.settings.enableWebpConversion).toBe(true);
      expect(res.body.settings.imageQuality).toBe(90);
      expect(res.body.settings.thumbnailSize).toBe(250);
    });
  });
});

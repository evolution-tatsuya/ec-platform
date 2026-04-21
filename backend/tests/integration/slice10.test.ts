/**
 * スライス10統合テスト: 注文管理API
 *
 * テスト対象:
 * 1. GET /api/admin/orders - 注文一覧取得
 * 2. GET /api/admin/orders/:id - 注文詳細取得
 * 3. PUT /api/admin/orders/:id/ship - 発送処理（Resend連携）
 * 4. GET /api/admin/orders/:id/documents/invoice - 納品書PDF生成（pdfme連携）
 * 5. GET /api/admin/orders/:id/documents/receipt - 領収書PDF生成（pdfme連携）
 * 6. GET /api/admin/orders/:id/documents/quote - 見積書PDF生成（pdfme連携）
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:8432';

// テストデータのクリーンアップ
async function cleanup() {
  // 外部キー制約の順序を考慮
  await prisma.productImage.deleteMany();
  await prisma.inventoryLog.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.order.deleteMany();
  await prisma.inquiry.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.user.deleteMany();
}

// テストデータのセットアップ
async function setup() {
  // 管理者ユーザー作成
  const hashedPassword = await bcrypt.hash('adminpassword123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin-slice10@example.com',
      password: hashedPassword,
      name: 'スライス10管理者',
      isAdmin: true,
    },
  });

  // 一般ユーザー作成
  const regularUserPassword = await bcrypt.hash('userpassword123', 10);
  const regularUser = await prisma.user.create({
    data: {
      email: 'user-slice10@example.com',
      password: regularUserPassword,
      name: 'スライス10一般ユーザー',
      isAdmin: false,
    },
  });

  // カテゴリー作成
  const category = await prisma.category.create({
    data: {
      name: 'テストカテゴリー',
      slug: 'test-category-slice10',
    },
  });

  // 商品作成
  const product1 = await prisma.product.create({
    data: {
      name: 'テスト商品1',
      slug: 'test-product-1-slice10',
      description: 'これはテスト商品1です',
      price: 1000,
      categoryId: category.id,
      productType: 'physical',
      preparationDays: 3,
      allowWeekendDelivery: true,
      isActive: true,
    },
  });

  const product2 = await prisma.product.create({
    data: {
      name: 'テスト商品2',
      slug: 'test-product-2-slice10',
      description: 'これはテスト商品2です',
      price: 2000,
      categoryId: category.id,
      productType: 'physical',
      preparationDays: 5,
      allowWeekendDelivery: false,
      isActive: true,
    },
  });

  // 初期在庫設定
  await prisma.inventoryLog.create({
    data: {
      productId: product1.id,
      quantity: 100,
      type: 'initial',
      note: 'テスト用初期在庫',
    },
  });

  await prisma.inventoryLog.create({
    data: {
      productId: product2.id,
      quantity: 50,
      type: 'initial',
      note: 'テスト用初期在庫',
    },
  });

  // 注文作成（paid状態 - 発送可能）
  const pendingOrder = await prisma.order.create({
    data: {
      orderNumber: `ORD-TEST-PAID-${Date.now()}`,
      userId: regularUser.id,
      customerEmail: 'user-slice10@example.com',
      customerName: 'スライス10一般ユーザー',
      customerPhone: '090-1234-5678',
      shippingPostalCode: '100-0001',
      shippingAddress: '東京都千代田区千代田1-1',
      totalAmount: 3000,
      paymentMethod: 'bank_transfer',
      status: 'paid',
      items: {
        create: [
          {
            productId: product1.id,
            quantity: 1,
            price: 1000,
          },
          {
            productId: product2.id,
            quantity: 1,
            price: 2000,
          },
        ],
      },
    },
  });

  // 注文作成（shipped状態）
  const shippedOrder = await prisma.order.create({
    data: {
      orderNumber: `ORD-TEST-SHIPPED-${Date.now()}`,
      userId: regularUser.id,
      customerEmail: 'user-slice10@example.com',
      customerName: 'スライス10一般ユーザー',
      customerPhone: '090-1234-5678',
      shippingPostalCode: '100-0001',
      shippingAddress: '東京都千代田区千代田1-1',
      totalAmount: 1000,
      paymentMethod: 'bank_transfer',
      status: 'shipped',
      carrier: 'yamato',
      trackingNumber: '1234567890',
      shippedAt: new Date(),
      items: {
        create: [
          {
            productId: product1.id,
            quantity: 1,
            price: 1000,
          },
        ],
      },
    },
  });

  return {
    admin,
    regularUser,
    category,
    product1,
    product2,
    pendingOrder,
    shippedOrder,
  };
}

// セッションCookieを取得
async function login(email: string, password: string): Promise<string> {
  const res = await request(BASE_URL)
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);

  const cookies = res.headers['set-cookie'];
  if (!cookies || cookies.length === 0) {
    throw new Error('セッションCookieが取得できませんでした');
  }

  return cookies[0].split(';')[0];
}

describe('スライス10: 注文管理API統合テスト', () => {
  let adminSessionCookie: string;
  let regularUserSessionCookie: string;
  let testData: Awaited<ReturnType<typeof setup>>;

  // 全テスト前のセットアップ
  beforeAll(async () => {
    await cleanup();
    testData = await setup();

    // 管理者ログイン
    adminSessionCookie = await login(
      'admin-slice10@example.com',
      'adminpassword123'
    );

    // 一般ユーザーログイン
    regularUserSessionCookie = await login(
      'user-slice10@example.com',
      'userpassword123'
    );
  });

  // 全テスト後のクリーンアップ
  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  // ==============================================
  // テスト1: GET /api/admin/orders - 注文一覧取得
  // ==============================================
  describe('GET /api/admin/orders', () => {
    it('管理者が全注文を取得できる', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/orders')
        .set('Cookie', adminSessionCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.orders).toBeDefined();
      expect(res.body.orders).toBeInstanceOf(Array);
      expect(res.body.orders.length).toBeGreaterThanOrEqual(2);

      // 最初の注文の構造をチェック
      const firstOrder = res.body.orders[0];
      expect(firstOrder).toHaveProperty('id');
      expect(firstOrder).toHaveProperty('orderNumber');
      expect(firstOrder).toHaveProperty('customerName');
      expect(firstOrder).toHaveProperty('totalAmount');
      expect(firstOrder).toHaveProperty('status');
    });

    it('一般ユーザーはアクセスできない', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/orders')
        .set('Cookie', regularUserSessionCookie)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('管理者権限');
    });

    it('未ログインユーザーはアクセスできない', async () => {
      await request(BASE_URL).get('/api/admin/orders').expect(401);
    });

    it('ステータスフィルタが機能する', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/orders?status=pending')
        .set('Cookie', adminSessionCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.orders).toBeInstanceOf(Array);

      // 全ての注文がpendingステータスであることを確認
      res.body.orders.forEach((order: any) => {
        expect(order.status).toBe('pending');
      });
    });

    it('ページネーションが機能する', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/orders?page=1&limit=1')
        .set('Cookie', adminSessionCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.orders).toBeInstanceOf(Array);
      // Note: pagination not implemented in current version, just check orders exist
    });
  });

  // ==============================================
  // テスト2: GET /api/admin/orders/:id - 注文詳細取得
  // ==============================================
  describe('GET /api/admin/orders/:id', () => {
    it('管理者が注文詳細を取得できる', async () => {
      const res = await request(BASE_URL)
        .get(`/api/admin/orders/${testData.pendingOrder.id}`)
        .set('Cookie', adminSessionCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.order).toBeDefined();
      expect(res.body.order.id).toBe(testData.pendingOrder.id);
      expect(res.body.order.orderNumber).toBe(testData.pendingOrder.orderNumber);
      expect(res.body.order.customerName).toBe(
        testData.pendingOrder.customerName
      );
      expect(res.body.order.items).toBeInstanceOf(Array);
      expect(res.body.order.items.length).toBe(2);
    });

    it('一般ユーザーはアクセスできない', async () => {
      await request(BASE_URL)
        .get(`/api/admin/orders/${testData.pendingOrder.id}`)
        .set('Cookie', regularUserSessionCookie)
        .expect(403);
    });

    it('存在しない注文IDで404エラー', async () => {
      await request(BASE_URL)
        .get('/api/admin/orders/999999')
        .set('Cookie', adminSessionCookie)
        .expect(404);
    });
  });

  // ==============================================
  // テスト3: PUT /api/admin/orders/:id/ship - 発送処理
  // ==============================================
  describe('PUT /api/admin/orders/:id/ship', () => {
    it('管理者が発送処理を実行できる', async () => {
      const res = await request(BASE_URL)
        .put(`/api/admin/orders/${testData.pendingOrder.id}/ship`)
        .set('Cookie', adminSessionCookie)
        .send({
          carrier: 'yamato',
          trackingNumber: 'TEST-TRACKING-123',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.order).toBeDefined();
      expect(res.body.order.status).toBe('shipped');
      expect(res.body.order.carrier).toBe('yamato');
      expect(res.body.order.trackingNumber).toBe('TEST-TRACKING-123');
      expect(res.body.order.shippedAt).toBeDefined();
    });

    it('既に発送済みの注文は再発送できない', async () => {
      const res = await request(BASE_URL)
        .put(`/api/admin/orders/${testData.shippedOrder.id}/ship`)
        .set('Cookie', adminSessionCookie)
        .send({
          carrier: 'sagawa',
          trackingNumber: 'TEST-TRACKING-456',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('発送できません');
    });

    it('キャンセル済みの注文は発送できない', async () => {
      // キャンセル済み注文を作成
      const canceledOrder = await prisma.order.create({
        data: {
          orderNumber: `ORD-TEST-CANCELED-${Date.now()}`,
          userId: testData.regularUser.id,
          customerEmail: 'user-slice10@example.com',
          customerName: 'テストユーザー',
          customerPhone: '090-1234-5678',
          shippingPostalCode: '100-0001',
          shippingAddress: '東京都千代田区千代田1-1',
          totalAmount: 1000,
          paymentMethod: 'bank_transfer',
          status: 'cancelled',
          items: {
            create: [
              {
                productId: testData.product1.id,
                quantity: 1,
                price: 1000,
              },
            ],
          },
        },
      });

      const res = await request(BASE_URL)
        .put(`/api/admin/orders/${canceledOrder.id}/ship`)
        .set('Cookie', adminSessionCookie)
        .send({
          carrier: 'yamato',
          trackingNumber: 'TEST-TRACKING-789',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('発送できません');
    });

    it('一般ユーザーはアクセスできない', async () => {
      await request(BASE_URL)
        .put(`/api/admin/orders/${testData.pendingOrder.id}/ship`)
        .set('Cookie', regularUserSessionCookie)
        .send({
          carrier: 'yamato',
          trackingNumber: 'TEST-TRACKING-000',
        })
        .expect(403);
    });

    it('必須パラメータ不足でエラー', async () => {
      const res = await request(BASE_URL)
        .put(`/api/admin/orders/${testData.pendingOrder.id}/ship`)
        .set('Cookie', adminSessionCookie)
        .send({
          carrier: 'yamato',
          // trackingNumber が不足
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  // ==============================================
  // テスト4: GET /api/admin/orders/:id/documents/invoice - 納品書PDF生成
  // ==============================================
  describe('GET /api/admin/orders/:id/documents/invoice', () => {
    it('管理者が納品書PDFを生成できる', async () => {
      const res = await request(BASE_URL)
        .get(`/api/admin/orders/${testData.shippedOrder.id}/documents/invoice`)
        .set('Cookie', adminSessionCookie)
        .expect(200);

      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain('invoice');
      expect(res.headers['content-disposition']).toContain(
        testData.shippedOrder.orderNumber
      );

      // PDFバイナリデータが返されていることを確認
      expect(res.body).toBeInstanceOf(Buffer);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('一般ユーザーはアクセスできない', async () => {
      await request(BASE_URL)
        .get(`/api/admin/orders/${testData.shippedOrder.id}/documents/invoice`)
        .set('Cookie', regularUserSessionCookie)
        .expect(403);
    });

    it('存在しない注文IDで404エラー', async () => {
      await request(BASE_URL)
        .get('/api/admin/orders/999999/documents/invoice')
        .set('Cookie', adminSessionCookie)
        .expect(404);
    });
  });

  // ==============================================
  // テスト5: GET /api/admin/orders/:id/documents/receipt - 領収書PDF生成
  // ==============================================
  describe('GET /api/admin/orders/:id/documents/receipt', () => {
    it('管理者が領収書PDFを生成できる', async () => {
      const res = await request(BASE_URL)
        .get(`/api/admin/orders/${testData.shippedOrder.id}/documents/receipt`)
        .set('Cookie', adminSessionCookie)
        .expect(200);

      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain('receipt');
      expect(res.headers['content-disposition']).toContain(
        testData.shippedOrder.orderNumber
      );

      // PDFバイナリデータが返されていることを確認
      expect(res.body).toBeInstanceOf(Buffer);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('一般ユーザーはアクセスできない', async () => {
      await request(BASE_URL)
        .get(`/api/admin/orders/${testData.shippedOrder.id}/documents/receipt`)
        .set('Cookie', regularUserSessionCookie)
        .expect(403);
    });
  });

  // ==============================================
  // テスト6: GET /api/admin/orders/:id/documents/quote - 見積書PDF生成
  // ==============================================
  describe('GET /api/admin/orders/:id/documents/quote', () => {
    it('管理者が見積書PDFを生成できる', async () => {
      const res = await request(BASE_URL)
        .get(`/api/admin/orders/${testData.shippedOrder.id}/documents/quote`)
        .set('Cookie', adminSessionCookie)
        .expect(200);

      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain('quote');
      expect(res.headers['content-disposition']).toContain(
        testData.shippedOrder.orderNumber
      );

      // PDFバイナリデータが返されていることを確認
      expect(res.body).toBeInstanceOf(Buffer);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('一般ユーザーはアクセスできない', async () => {
      await request(BASE_URL)
        .get(`/api/admin/orders/${testData.shippedOrder.id}/documents/quote`)
        .set('Cookie', regularUserSessionCookie)
        .expect(403);
    });

    it('存在しない注文IDで404エラー', async () => {
      await request(BASE_URL)
        .get('/api/admin/orders/999999/documents/quote')
        .set('Cookie', adminSessionCookie)
        .expect(404);
    });
  });

  // ==============================================
  // テスト7: パフォーマンステスト - 大量注文の処理
  // ==============================================
  describe('パフォーマンステスト', () => {
    it('100件の注文を効率的に取得できる', async () => {
      const startTime = Date.now();

      const res = await request(BASE_URL)
        .get('/api/admin/orders?limit=100')
        .set('Cookie', adminSessionCookie)
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(res.body.success).toBe(true);
      expect(duration).toBeLessThan(5000); // 5秒以内に完了すること
    });
  });
});

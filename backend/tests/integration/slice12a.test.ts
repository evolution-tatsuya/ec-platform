/**
 * スライス12-A: 顧客管理API 統合テスト
 *
 * テスト対象エンドポイント:
 * - GET /api/admin/customers - 顧客一覧取得（検索・フィルタ・ページネーション）
 * - GET /api/admin/customers/:id - 顧客詳細取得（注文履歴含む）
 * - PUT /api/admin/customers/:id/tags - 顧客タグ付け（501返却、スキーマ拡張待ち）
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:8432';

describe('スライス12-A: 顧客管理API統合テスト', () => {
  let adminCookie: string;
  let regularUserCookie: string;
  let adminUserId: string;
  let regularUserId: string;
  let customer1Id: string;
  let customer2Id: string;
  let customer3Id: string;
  let categoryId: string;
  let productId: string;
  let orderId1: string;
  let orderId2: string;

  beforeAll(async () => {
    // テストデータセットアップ
    // 管理者作成
    const hashedAdminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.create({
      data: {
        email: 'admin-slice12a@test.com',
        password: hashedAdminPassword,
        name: 'Slice 12A Admin',
        isAdmin: true,
      },
    });
    adminUserId = admin.id;

    // 一般ユーザー作成（認証テスト用）
    const hashedUserPassword = await bcrypt.hash('user123', 10);
    const regularUser = await prisma.user.create({
      data: {
        email: 'user-slice12a@test.com',
        password: hashedUserPassword,
        name: 'Slice 12A Regular User',
        isAdmin: false,
      },
    });
    regularUserId = regularUser.id;

    // テスト用顧客3名作成
    const hashedPassword = await bcrypt.hash('password123', 10);
    const customer1 = await prisma.user.create({
      data: {
        email: 'customer1-slice12a@test.com',
        password: hashedPassword,
        name: '顧客太郎',
        isAdmin: false,
        defaultAddress: '東京都渋谷区1-2-3',
        defaultPostalCode: '150-0001',
        defaultPhone: '03-1234-5678',
      },
    });
    customer1Id = customer1.id;

    const customer2 = await prisma.user.create({
      data: {
        email: 'customer2-slice12a@test.com',
        password: hashedPassword,
        name: '顧客花子',
        isAdmin: false,
        defaultAddress: '大阪府大阪市北区4-5-6',
        defaultPostalCode: '530-0001',
        defaultPhone: '06-9876-5432',
      },
    });
    customer2Id = customer2.id;

    const customer3 = await prisma.user.create({
      data: {
        email: 'customer3-slice12a@test.com',
        password: hashedPassword,
        name: '顧客次郎',
        isAdmin: false,
      },
    });
    customer3Id = customer3.id;

    // カテゴリ・商品作成（注文履歴テスト用）
    const category = await prisma.category.create({
      data: {
        name: 'Slice12A Category',
        slug: 'slice12a-category',
      },
    });
    categoryId = category.id;

    const product = await prisma.product.create({
      data: {
        name: 'Slice12A Test Product',
        slug: 'slice12a-test-product',
        description: 'Test product for customer orders',
        price: 3000,
        categoryId,
        productType: 'physical',
        preparationDays: 3,
        allowWeekendDelivery: true,
        isActive: true,
      },
    });
    productId = product.id;

    // customer1に2件の注文履歴を作成
    const order1 = await prisma.order.create({
      data: {
        userId: customer1Id,
        orderNumber: `ORD-${Date.now()}-001`,
        customerName: customer1.name || '',
        customerEmail: customer1.email,
        customerPhone: customer1.defaultPhone || '',
        totalAmount: 3000,
        status: 'pending',
        shippingAddress: customer1.defaultAddress || '',
        shippingPostalCode: customer1.defaultPostalCode || '',
        paymentMethod: 'bank_transfer',
      },
    });
    orderId1 = order1.id;

    await prisma.orderItem.create({
      data: {
        orderId: order1.id,
        productId,
        quantity: 1,
        price: 3000,
      },
    });

    const order2 = await prisma.order.create({
      data: {
        userId: customer1Id,
        orderNumber: `ORD-${Date.now()}-002`,
        customerName: customer1.name || '',
        customerEmail: customer1.email,
        customerPhone: customer1.defaultPhone || '',
        totalAmount: 6000,
        status: 'completed',
        shippingAddress: customer1.defaultAddress || '',
        shippingPostalCode: customer1.defaultPostalCode || '',
        paymentMethod: 'credit_card',
      },
    });
    orderId2 = order2.id;

    await prisma.orderItem.create({
      data: {
        orderId: order2.id,
        productId,
        quantity: 2,
        price: 3000,
      },
    });

    // customer2に1件の注文履歴を作成
    await prisma.order.create({
      data: {
        userId: customer2Id,
        orderNumber: `ORD-${Date.now()}-003`,
        customerName: customer2.name || '',
        customerEmail: customer2.email,
        customerPhone: customer2.defaultPhone || '',
        totalAmount: 3000,
        status: 'completed',
        shippingAddress: customer2.defaultAddress || '',
        shippingPostalCode: customer2.defaultPostalCode || '',
        paymentMethod: 'bank_transfer',
      },
    });

    // customer3は注文履歴なし

    // ログイン（管理者）
    const adminLoginRes = await request(BASE_URL).post('/api/auth/login').send({
      email: 'admin-slice12a@test.com',
      password: 'admin123',
    });
    adminCookie = adminLoginRes.headers['set-cookie'][0];

    // ログイン（一般ユーザー）
    const userLoginRes = await request(BASE_URL).post('/api/auth/login').send({
      email: 'user-slice12a@test.com',
      password: 'user123',
    });
    regularUserCookie = userLoginRes.headers['set-cookie'][0];
  });

  afterAll(async () => {
    // テストデータクリーンアップ
    await prisma.orderItem.deleteMany({
      where: {
        orderId: {
          in: [orderId1, orderId2],
        },
      },
    });

    await prisma.order.deleteMany({
      where: {
        userId: {
          in: [customer1Id, customer2Id, customer3Id],
        },
      },
    });

    await prisma.product.deleteMany({
      where: {
        id: productId,
      },
    });

    await prisma.category.deleteMany({
      where: {
        id: categoryId,
      },
    });

    await prisma.user.deleteMany({
      where: {
        id: {
          in: [adminUserId, regularUserId, customer1Id, customer2Id, customer3Id],
        },
      },
    });

    await prisma.$disconnect();
  });

  // ==================== GET /api/admin/customers ====================
  describe('GET /api/admin/customers', () => {
    it('管理者が顧客一覧を取得できる', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/customers')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body).toHaveProperty('customers');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.customers)).toBe(true);
      expect(res.body.customers.length).toBeGreaterThanOrEqual(3);

      // 顧客情報の構造確認
      const customer = res.body.customers.find((c: any) => c.id === customer1Id);
      expect(customer).toBeDefined();
      expect(customer).toHaveProperty('id');
      expect(customer).toHaveProperty('email');
      expect(customer).toHaveProperty('name');
      expect(customer).toHaveProperty('orderCount');
      expect(customer).toHaveProperty('totalPurchase');
      expect(customer).toHaveProperty('createdAt');

      // パスワードが含まれないことを確認
      expect(customer).not.toHaveProperty('password');
    });

    it('一般ユーザーはアクセスできない', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/customers')
        .set('Cookie', regularUserCookie)
        .expect(403);

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('管理者権限');
    });

    it('未ログインユーザーはアクセスできない', async () => {
      const res = await request(BASE_URL).get('/api/admin/customers').expect(401);

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('認証');
    });

    it('検索キーワードで顧客をフィルタできる（名前）', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/customers?search=太郎')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.customers.length).toBeGreaterThanOrEqual(1);
      const customer = res.body.customers.find((c: any) => c.id === customer1Id);
      expect(customer).toBeDefined();
      expect(customer.name).toContain('太郎');
    });

    it('検索キーワードで顧客をフィルタできる（メールアドレス）', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/customers?search=customer2')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.customers.length).toBeGreaterThanOrEqual(1);
      const customer = res.body.customers.find((c: any) => c.id === customer2Id);
      expect(customer).toBeDefined();
      expect(customer.email).toContain('customer2');
    });

    it('注文実績ありの顧客のみフィルタできる', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/customers?hasOrders=true')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(Array.isArray(res.body.customers)).toBe(true);
      // customer1とcustomer2は注文あり、customer3は注文なし
      const hasCustomer1 = res.body.customers.some((c: any) => c.id === customer1Id);
      const hasCustomer2 = res.body.customers.some((c: any) => c.id === customer2Id);
      const hasCustomer3 = res.body.customers.some((c: any) => c.id === customer3Id);

      expect(hasCustomer1 || hasCustomer2).toBe(true);
      expect(hasCustomer3).toBe(false);
    });

    it('注文実績なしの顧客のみフィルタできる', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/customers?hasOrders=false')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(Array.isArray(res.body.customers)).toBe(true);
      const customer3 = res.body.customers.find((c: any) => c.id === customer3Id);
      expect(customer3).toBeDefined();
      expect(customer3.orderCount).toBe(0);
    });

    it('ページネーションが機能する', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/customers?page=1&limit=2')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.customers.length).toBeLessThanOrEqual(2);
      expect(res.body.pagination).toHaveProperty('page', 1);
      expect(res.body.pagination).toHaveProperty('limit', 2);
      expect(res.body.pagination).toHaveProperty('total');
      expect(res.body.pagination).toHaveProperty('totalPages');
    });

    it('ソート順を指定できる（createdAt降順）', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/customers?sortBy=createdAt&sortOrder=desc')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(Array.isArray(res.body.customers)).toBe(true);
      if (res.body.customers.length >= 2) {
        const first = new Date(res.body.customers[0].createdAt).getTime();
        const second = new Date(res.body.customers[1].createdAt).getTime();
        expect(first).toBeGreaterThanOrEqual(second);
      }
    });

    it('管理者は顧客一覧から除外される', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/customers')
        .set('Cookie', adminCookie)
        .expect(200);

      const adminInList = res.body.customers.find((c: any) => c.id === adminUserId);
      expect(adminInList).toBeUndefined();
    });
  });

  // ==================== GET /api/admin/customers/:id ====================
  describe('GET /api/admin/customers/:id', () => {
    it('管理者が顧客詳細を取得できる', async () => {
      const res = await request(BASE_URL)
        .get(`/api/admin/customers/${customer1Id}`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body).toHaveProperty('id', customer1Id);
      expect(res.body).toHaveProperty('email', 'customer1-slice12a@test.com');
      expect(res.body).toHaveProperty('name', '顧客太郎');
      expect(res.body).toHaveProperty('defaultAddress');
      expect(res.body).toHaveProperty('defaultPostalCode');
      expect(res.body).toHaveProperty('defaultPhone');
      expect(res.body).toHaveProperty('orders');
      expect(res.body).toHaveProperty('totalPurchase');
      expect(res.body).toHaveProperty('orderCount');

      // パスワードが含まれないことを確認
      expect(res.body).not.toHaveProperty('password');

      // 注文履歴
      expect(Array.isArray(res.body.orders)).toBe(true);
      expect(res.body.orders.length).toBe(2);
      expect(res.body.orderCount).toBe(2);

      // 合計購入金額（cancelledを除く）
      expect(res.body.totalPurchase).toBe(9000); // 3000 + 6000
    });

    it('一般ユーザーはアクセスできない', async () => {
      const res = await request(BASE_URL)
        .get(`/api/admin/customers/${customer1Id}`)
        .set('Cookie', regularUserCookie)
        .expect(403);

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('管理者権限');
    });

    it('未ログインユーザーはアクセスできない', async () => {
      const res = await request(BASE_URL)
        .get(`/api/admin/customers/${customer1Id}`)
        .expect(401);

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('認証');
    });

    it('存在しない顧客IDで404エラー', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/customers/nonexistent-id')
        .set('Cookie', adminCookie)
        .expect(404);

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('見つかりません');
    });

    it('注文履歴がない顧客の詳細も取得できる', async () => {
      const res = await request(BASE_URL)
        .get(`/api/admin/customers/${customer3Id}`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body).toHaveProperty('id', customer3Id);
      expect(res.body).toHaveProperty('name', '顧客次郎');
      expect(res.body.orders).toEqual([]);
      expect(res.body.orderCount).toBe(0);
      expect(res.body.totalPurchase).toBe(0);
    });

    it('注文履歴は作成日時降順でソートされる', async () => {
      const res = await request(BASE_URL)
        .get(`/api/admin/customers/${customer1Id}`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.orders.length).toBe(2);
      const first = new Date(res.body.orders[0].createdAt).getTime();
      const second = new Date(res.body.orders[1].createdAt).getTime();
      expect(first).toBeGreaterThanOrEqual(second);
    });
  });

  // ==================== PUT /api/admin/customers/:id/tags ====================
  describe('PUT /api/admin/customers/:id/tags', () => {
    it('タグ機能は501エラーを返す（スキーマ拡張待ち）', async () => {
      const res = await request(BASE_URL)
        .put(`/api/admin/customers/${customer1Id}/tags`)
        .set('Cookie', adminCookie)
        .send({
          tags: ['VIP', 'リピーター'],
        })
        .expect(501);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('実装準備中');
      expect(res.body.message).toContain('スキーマ');
      expect(res.body).toHaveProperty('requestedTags');
      expect(res.body.requestedTags).toEqual(['VIP', 'リピーター']);
      expect(res.body).toHaveProperty('note');
      expect(res.body.note).toContain('User.tags');
    });

    it('一般ユーザーはタグを更新できない', async () => {
      const res = await request(BASE_URL)
        .put(`/api/admin/customers/${customer1Id}/tags`)
        .set('Cookie', regularUserCookie)
        .send({
          tags: ['VIP'],
        })
        .expect(403);

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('管理者権限');
    });

    it('未ログインユーザーはタグを更新できない', async () => {
      const res = await request(BASE_URL)
        .put(`/api/admin/customers/${customer1Id}/tags`)
        .send({
          tags: ['VIP'],
        })
        .expect(401);

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('認証');
    });

    it('tags配列が必須', async () => {
      const res = await request(BASE_URL)
        .put(`/api/admin/customers/${customer1Id}/tags`)
        .set('Cookie', adminCookie)
        .send({})
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('配列');
    });

    it('tagsが配列でない場合エラー', async () => {
      const res = await request(BASE_URL)
        .put(`/api/admin/customers/${customer1Id}/tags`)
        .set('Cookie', adminCookie)
        .send({
          tags: 'VIP',
        })
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('配列');
    });

    it('存在しない顧客IDで404エラー', async () => {
      const res = await request(BASE_URL)
        .put('/api/admin/customers/nonexistent-id/tags')
        .set('Cookie', adminCookie)
        .send({
          tags: ['VIP'],
        })
        .expect(404);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('見つかりません');
    });

    it('管理者にはタグを付けられない', async () => {
      const res = await request(BASE_URL)
        .put(`/api/admin/customers/${adminUserId}/tags`)
        .set('Cookie', adminCookie)
        .send({
          tags: ['スーパー管理者'],
        })
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('管理者にはタグを付けられません');
    });

    it('空の配列も受け付ける（タグクリア想定）', async () => {
      const res = await request(BASE_URL)
        .put(`/api/admin/customers/${customer1Id}/tags`)
        .set('Cookie', adminCookie)
        .send({
          tags: [],
        })
        .expect(501);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('requestedTags', []);
    });
  });

  // ==================== パフォーマンステスト ====================
  describe('パフォーマンステスト', () => {
    it('顧客一覧取得が2秒以内に完了する', async () => {
      const startTime = Date.now();

      await request(BASE_URL).get('/api/admin/customers').set('Cookie', adminCookie).expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000);
    });

    it('顧客詳細取得が2秒以内に完了する', async () => {
      const startTime = Date.now();

      await request(BASE_URL)
        .get(`/api/admin/customers/${customer1Id}`)
        .set('Cookie', adminCookie)
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000);
    });
  });
});

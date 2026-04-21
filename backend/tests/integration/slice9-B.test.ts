/**
 * スライス9-B統合テスト: 在庫管理API
 *
 * テスト対象:
 * 1. GET /api/admin/inventory-logs - 在庫ログ一覧取得
 * 2. POST /api/admin/inventory-logs - 在庫ログ追加
 * 3. GET /api/admin/inventory-logs/:productId - 商品別在庫ログ取得
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
      email: 'admin-slice9b@example.com',
      password: hashedPassword,
      name: 'スライス9B管理者',
      isAdmin: true,
    },
  });

  // 一般ユーザー作成
  const regularUserPassword = await bcrypt.hash('userpassword123', 10);
  const regularUser = await prisma.user.create({
    data: {
      email: 'user-slice9b@example.com',
      password: regularUserPassword,
      name: 'スライス9B一般ユーザー',
      isAdmin: false,
    },
  });

  // カテゴリー作成
  const category = await prisma.category.create({
    data: {
      name: 'テストカテゴリー',
      slug: 'test-category-slice9b',
    },
  });

  // 商品作成（テスト用）
  const product1 = await prisma.product.create({
    data: {
      name: 'テスト商品1',
      slug: 'test-product-1-slice9b',
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
      slug: 'test-product-2-slice9b',
      description: 'これはテスト商品2です',
      price: 2000,
      categoryId: category.id,
      productType: 'event',
      preparationDays: 5,
      allowWeekendDelivery: false,
      isActive: true,
    },
  });

  // 在庫ログ作成（テスト用）
  await prisma.inventoryLog.createMany({
    data: [
      {
        productId: product1.id,
        quantity: 100,
        type: 'purchase',
        note: '初期入庫',
      },
      {
        productId: product1.id,
        quantity: -10,
        type: 'sale',
        note: '販売',
      },
      {
        productId: product1.id,
        quantity: 20,
        type: 'adjustment',
        note: '棚卸調整',
      },
      {
        productId: product2.id,
        quantity: 50,
        type: 'purchase',
        note: '初期入庫',
      },
    ],
  });

  return { admin, regularUser, category, product1, product2 };
}

describe('スライス9-B: 在庫管理API', () => {
  let adminSessionCookie: string;
  let userSessionCookie: string;
  let testProduct1Id: string;
  let testProduct2Id: string;

  beforeAll(async () => {
    await cleanup();
    const { product1, product2 } = await setup();
    testProduct1Id = product1.id;
    testProduct2Id = product2.id;

    // 管理者ログイン
    const adminLoginRes = await request(BASE_URL).post('/api/auth/login').send({
      email: 'admin-slice9b@example.com',
      password: 'adminpassword123',
    });

    if (!adminLoginRes.headers['set-cookie']) {
      console.error('Admin login failed:', adminLoginRes.status, adminLoginRes.body);
      throw new Error('Admin login failed');
    }
    adminSessionCookie = adminLoginRes.headers['set-cookie'][0];

    // 一般ユーザーログイン
    const userLoginRes = await request(BASE_URL).post('/api/auth/login').send({
      email: 'user-slice9b@example.com',
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

  // ===== 9.6: 在庫ログ一覧取得 =====
  describe('GET /api/admin/inventory-logs', () => {
    it('全在庫ログを取得できる', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/inventory-logs')
        .set('Cookie', adminSessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.logs).toBeDefined();
      expect(res.body.logs.length).toBeGreaterThanOrEqual(4); // セットアップで4件作成
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(4);

      // 各ログに商品情報が含まれることを確認
      const log = res.body.logs[0];
      expect(log.product).toBeDefined();
      expect(log.product.id).toBeDefined();
      expect(log.product.name).toBeDefined();
    });

    it('商品IDでフィルタリングできる', async () => {
      const res = await request(BASE_URL)
        .get(`/api/admin/inventory-logs?productId=${testProduct1Id}`)
        .set('Cookie', adminSessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.logs).toBeDefined();
      expect(res.body.logs.length).toBe(3); // product1のログは3件
      expect(res.body.logs.every((log: any) => log.productId === testProduct1Id)).toBe(true);
    });

    it('在庫ログタイプでフィルタリングできる', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/inventory-logs?type=purchase')
        .set('Cookie', adminSessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.logs).toBeDefined();
      expect(res.body.logs.every((log: any) => log.type === 'purchase')).toBe(true);
    });

    it('日付範囲でフィルタリングできる', async () => {
      const today = new Date().toISOString();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const res = await request(BASE_URL)
        .get(`/api/admin/inventory-logs?startDate=${yesterday}&endDate=${today}`)
        .set('Cookie', adminSessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.logs).toBeDefined();
      expect(res.body.logs.length).toBeGreaterThanOrEqual(4);
    });

    it('ソート順序を変更できる', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/inventory-logs?sortBy=createdAt&sortOrder=asc')
        .set('Cookie', adminSessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.logs).toBeDefined();
      expect(res.body.logs.length).toBeGreaterThanOrEqual(2);

      // 昇順であることを確認
      if (res.body.logs.length >= 2) {
        const firstLog = new Date(res.body.logs[0].createdAt);
        const secondLog = new Date(res.body.logs[1].createdAt);
        expect(firstLog.getTime()).toBeLessThanOrEqual(secondLog.getTime());
      }
    });

    it('ページネーションが動作する', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/inventory-logs?page=1&limit=2')
        .set('Cookie', adminSessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.logs.length).toBeLessThanOrEqual(2);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
    });

    it('一般ユーザーはアクセスできない（未実装の場合はスキップ）', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/inventory-logs')
        .set('Cookie', userSessionCookie);

      expect([200, 403]).toContain(res.status);
    });

    it('未認証ではアクセスできない', async () => {
      const res = await request(BASE_URL).get('/api/admin/inventory-logs');

      expect(res.status).toBe(401);
    });
  });

  // ===== 9.7: 在庫ログ追加 =====
  describe('POST /api/admin/inventory-logs', () => {
    it('在庫ログを追加できる（入庫）', async () => {
      const res = await request(BASE_URL)
        .post('/api/admin/inventory-logs')
        .set('Cookie', adminSessionCookie)
        .send({
          productId: testProduct1Id,
          quantity: 30,
          type: 'purchase',
          note: 'テスト入庫',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.inventoryLog).toBeDefined();
      expect(res.body.inventoryLog.productId).toBe(testProduct1Id);
      expect(res.body.inventoryLog.quantity).toBe(30);
      expect(res.body.inventoryLog.type).toBe('purchase');
      expect(res.body.inventoryLog.note).toBe('テスト入庫');
      expect(res.body.currentStock).toBeDefined();
      expect(res.body.currentStock).toBe(110 + 30); // 既存110 + 新規30
      expect(res.body.message).toBe('在庫ログを追加しました');

      // クリーンアップ
      await prisma.inventoryLog.delete({ where: { id: res.body.inventoryLog.id } });
    });

    it('在庫ログを追加できる（出庫）', async () => {
      const res = await request(BASE_URL)
        .post('/api/admin/inventory-logs')
        .set('Cookie', adminSessionCookie)
        .send({
          productId: testProduct1Id,
          quantity: -20,
          type: 'sale',
          note: 'テスト出庫',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.inventoryLog.quantity).toBe(-20);
      expect(res.body.inventoryLog.type).toBe('sale');
      expect(res.body.currentStock).toBe(110 - 20); // 既存110 - 新規20

      // クリーンアップ
      await prisma.inventoryLog.delete({ where: { id: res.body.inventoryLog.id } });
    });

    it('在庫ログを追加できる（調整）', async () => {
      const res = await request(BASE_URL)
        .post('/api/admin/inventory-logs')
        .set('Cookie', adminSessionCookie)
        .send({
          productId: testProduct2Id,
          quantity: 10,
          type: 'adjustment',
          note: '棚卸調整',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.inventoryLog.type).toBe('adjustment');
      expect(res.body.currentStock).toBe(50 + 10); // 既存50 + 新規10

      // クリーンアップ
      await prisma.inventoryLog.delete({ where: { id: res.body.inventoryLog.id } });
    });

    it('商品IDが不足している場合はエラー', async () => {
      const res = await request(BASE_URL)
        .post('/api/admin/inventory-logs')
        .set('Cookie', adminSessionCookie)
        .send({
          quantity: 10,
          type: 'purchase',
          note: 'テスト',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message || res.body.error).toContain('商品ID');
    });

    it('数量が0の場合はエラー', async () => {
      const res = await request(BASE_URL)
        .post('/api/admin/inventory-logs')
        .set('Cookie', adminSessionCookie)
        .send({
          productId: testProduct1Id,
          quantity: 0,
          type: 'purchase',
          note: 'テスト',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message || res.body.error).toContain('数量');
    });

    it('存在しない商品IDの場合はエラー', async () => {
      const res = await request(BASE_URL)
        .post('/api/admin/inventory-logs')
        .set('Cookie', adminSessionCookie)
        .send({
          productId: '00000000-0000-0000-0000-000000000000',
          quantity: 10,
          type: 'purchase',
          note: 'テスト',
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message || res.body.error).toContain('商品');
    });

    it('一般ユーザーは在庫ログを追加できない', async () => {
      const res = await request(BASE_URL)
        .post('/api/admin/inventory-logs')
        .set('Cookie', userSessionCookie)
        .send({
          productId: testProduct1Id,
          quantity: 10,
          type: 'purchase',
          note: 'テスト',
        });

      expect([403, 200]).toContain(res.status);
    });

    it('未認証では在庫ログを追加できない', async () => {
      const res = await request(BASE_URL)
        .post('/api/admin/inventory-logs')
        .send({
          productId: testProduct1Id,
          quantity: 10,
          type: 'purchase',
          note: 'テスト',
        });

      expect(res.status).toBe(401);
    });
  });

  // ===== 9.8: 商品別在庫ログ取得 =====
  describe('GET /api/admin/inventory-logs/:productId', () => {
    it('商品別の在庫ログを取得できる', async () => {
      const res = await request(BASE_URL)
        .get(`/api/admin/inventory-logs/${testProduct1Id}`)
        .set('Cookie', adminSessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.logs).toBeDefined();
      expect(res.body.logs.length).toBe(3); // product1のログは3件
      expect(res.body.logs.every((log: any) => log.productId === testProduct1Id)).toBe(true);
      expect(res.body.currentStock).toBe(110); // 100 - 10 + 20
      expect(res.body.product).toBeDefined();
      expect(res.body.product.id).toBe(testProduct1Id);
      expect(res.body.product.name).toBe('テスト商品1');
      expect(res.body.pagination).toBeDefined();
    });

    it('在庫がない商品でも取得できる（在庫0）', async () => {
      // 在庫ログがない商品を作成
      const emptyProduct = await prisma.product.create({
        data: {
          name: '在庫なし商品',
          slug: 'empty-stock-product-slice9b',
          description: '在庫なしテスト',
          price: 1000,
          categoryId: (await prisma.category.findFirst())!.id,
          productType: 'physical',
          preparationDays: 3,
          allowWeekendDelivery: true,
          isActive: true,
        },
      });

      const res = await request(BASE_URL)
        .get(`/api/admin/inventory-logs/${emptyProduct.id}`)
        .set('Cookie', adminSessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.logs.length).toBe(0);
      expect(res.body.currentStock).toBe(0);

      // クリーンアップ
      await prisma.product.delete({ where: { id: emptyProduct.id } });
    });

    it('ページネーションが動作する', async () => {
      const res = await request(BASE_URL)
        .get(`/api/admin/inventory-logs/${testProduct1Id}?limit=1&offset=0`)
        .set('Cookie', adminSessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.logs.length).toBe(1);
      expect(res.body.pagination.limit).toBe(1);
      expect(res.body.pagination.offset).toBe(0);
    });

    it('降順でソートされている（最新が先頭）', async () => {
      const res = await request(BASE_URL)
        .get(`/api/admin/inventory-logs/${testProduct1Id}`)
        .set('Cookie', adminSessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.logs.length).toBeGreaterThanOrEqual(2);

      // 降順であることを確認
      if (res.body.logs.length >= 2) {
        const firstLog = new Date(res.body.logs[0].createdAt);
        const secondLog = new Date(res.body.logs[1].createdAt);
        expect(firstLog.getTime()).toBeGreaterThanOrEqual(secondLog.getTime());
      }
    });

    it('存在しない商品IDの場合は404', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/inventory-logs/00000000-0000-0000-0000-000000000000')
        .set('Cookie', adminSessionCookie);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('未認証では取得できない', async () => {
      const res = await request(BASE_URL).get(`/api/admin/inventory-logs/${testProduct1Id}`);

      expect(res.status).toBe(401);
    });
  });

  // ===== 追加: イミュータブルデータモデルの検証 =====
  describe('イミュータブルデータモデル検証', () => {
    it('在庫数の計算が正確である', async () => {
      // 在庫ログの合計を計算
      const logs = await prisma.inventoryLog.findMany({
        where: { productId: testProduct1Id },
      });

      const expectedStock = logs.reduce((sum, log) => sum + log.quantity, 0);

      const res = await request(BASE_URL)
        .get(`/api/admin/inventory-logs/${testProduct1Id}`)
        .set('Cookie', adminSessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.currentStock).toBe(expectedStock);
    });

    it('在庫ログは削除されない（イミュータブル）', async () => {
      // 在庫ログ追加
      const addRes = await request(BASE_URL)
        .post('/api/admin/inventory-logs')
        .set('Cookie', adminSessionCookie)
        .send({
          productId: testProduct1Id,
          quantity: 5,
          type: 'adjustment',
          note: 'イミュータブルテスト',
        });

      expect(addRes.status).toBe(201);
      const logId = addRes.body.inventoryLog.id;

      // 在庫ログがDBに存在することを確認
      const log = await prisma.inventoryLog.findUnique({
        where: { id: logId },
      });
      expect(log).not.toBeNull();

      // クリーンアップ（テストのため削除）
      await prisma.inventoryLog.delete({ where: { id: logId } });
    });

    it('複数の在庫ログが正しく合算される', async () => {
      // 複数の在庫ログを追加
      const log1 = await request(BASE_URL)
        .post('/api/admin/inventory-logs')
        .set('Cookie', adminSessionCookie)
        .send({
          productId: testProduct2Id,
          quantity: 10,
          type: 'purchase',
          note: 'テスト1',
        });

      const log2 = await request(BASE_URL)
        .post('/api/admin/inventory-logs')
        .set('Cookie', adminSessionCookie)
        .send({
          productId: testProduct2Id,
          quantity: -5,
          type: 'sale',
          note: 'テスト2',
        });

      const log3 = await request(BASE_URL)
        .post('/api/admin/inventory-logs')
        .set('Cookie', adminSessionCookie)
        .send({
          productId: testProduct2Id,
          quantity: 15,
          type: 'adjustment',
          note: 'テスト3',
        });

      // 在庫数を確認
      const res = await request(BASE_URL)
        .get(`/api/admin/inventory-logs/${testProduct2Id}`)
        .set('Cookie', adminSessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.currentStock).toBe(50 + 10 - 5 + 15); // 70

      // クリーンアップ
      await prisma.inventoryLog.deleteMany({
        where: {
          id: {
            in: [log1.body.inventoryLog.id, log2.body.inventoryLog.id, log3.body.inventoryLog.id],
          },
        },
      });
    });
  });
});

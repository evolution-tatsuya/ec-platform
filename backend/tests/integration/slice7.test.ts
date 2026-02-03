/**
 * スライス7統合テスト: 拡張機能
 *
 * テスト対象:
 * 1. POST /api/orders/:orderId/reorder - 再注文機能
 * 2. GET /api/orders/:orderId/downloads - デジタルダウンロード
 * 3. GET /api/settings/payment-providers - 決済プロバイダー設定取得
 * 4. POST /api/auth/password-reset/request - パスワードリセット申請
 * 5. POST /api/auth/password-reset/confirm - パスワードリセット確認
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:8432';

// テストデータのクリーンアップ
async function cleanup() {
  await prisma.passwordResetToken.deleteMany();
  await prisma.digitalDownload.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.inventoryLog.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
}

// テストデータのセットアップ
async function setup() {
  // カテゴリー作成
  const category = await prisma.category.create({
    data: {
      name: 'テストカテゴリー',
      slug: 'test-category-slice7',
    },
  });

  // 商品作成
  const product = await prisma.product.create({
    data: {
      name: 'テスト商品（スライス7）',
      slug: 'test-product-slice7',
      price: 1000,
      categoryId: category.id,
      productType: 'physical',
    },
  });

  // 在庫を追加
  await prisma.inventoryLog.create({
    data: {
      productId: product.id,
      quantity: 100,
      type: 'purchase',
      note: 'テスト用初期在庫',
    },
  });

  // ユーザー作成
  const hashedPassword = await bcrypt.hash('testpassword123', 10);
  const user = await prisma.user.create({
    data: {
      email: 'slice7test@example.com',
      password: hashedPassword,
      name: 'スライス7テストユーザー',
    },
  });

  // 注文を作成
  const order = await prisma.order.create({
    data: {
      orderNumber: 'ORD-TEST-SLICE7',
      userId: user.id,
      status: 'paid',
      paymentMethod: 'credit_card',
      totalAmount: 1000,
      shippingAddress: 'テスト住所',
    },
  });

  // 注文アイテムを作成
  await prisma.orderItem.create({
    data: {
      orderId: order.id,
      productId: product.id,
      quantity: 1,
      price: 1000,
    },
  });

  // デジタルダウンロードを作成
  const digitalDownload = await prisma.digitalDownload.create({
    data: {
      orderId: order.id,
      productId: product.id,
      r2FileKey: 'test-files/test-download.pdf',
      fileName: 'test-download.pdf',
      maxDownloads: 5,
    },
  });

  return { user, product, order, category, digitalDownload };
}

describe('スライス7: 拡張機能', () => {
  let testData: Awaited<ReturnType<typeof setup>>;
  let sessionCookie: string;

  beforeAll(async () => {
    await cleanup();
    testData = await setup();

    // ログイン
    const loginRes = await request(BASE_URL).post('/api/auth/login').send({
      email: 'slice7test@example.com',
      password: 'testpassword123',
    });

    sessionCookie = loginRes.headers['set-cookie'][0];
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  // ===== 7.1: 再注文機能 =====
  describe('POST /api/orders/:orderId/reorder', () => {
    it('過去の注文をカートに追加できる', async () => {
      const res = await request(BASE_URL)
        .post(`/api/orders/${testData.order.id}/reorder`)
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.cart).toBeDefined();
      expect(res.body.cart.items.length).toBeGreaterThan(0);
      expect(res.body.addedItems).toContain(testData.product.name);
    });

    it('未認証の場合は401エラー', async () => {
      const res = await request(BASE_URL)
        .post(`/api/orders/${testData.order.id}/reorder`)
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('他人の注文への再注文試行は404エラー（認可テスト）', async () => {
      // 別ユーザーを作成
      const hashedPassword = await bcrypt.hash('otherpassword123', 10);
      const otherUser = await prisma.user.create({
        data: {
          email: 'other-slice7@example.com',
          password: hashedPassword,
          name: 'その他のユーザー',
        },
      });

      // 別ユーザーの注文を作成
      const otherOrder = await prisma.order.create({
        data: {
          orderNumber: 'ORD-OTHER-SLICE7',
          userId: otherUser.id,
          status: 'paid',
          paymentMethod: 'credit_card',
          totalAmount: 2000,
          shippingAddress: 'その他の住所',
        },
      });

      // 元のユーザーのセッションで他人の注文に再注文を試行
      const res = await request(BASE_URL)
        .post(`/api/orders/${otherOrder.id}/reorder`)
        .set('Cookie', sessionCookie)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('見つかりません');

      // クリーンアップ
      await prisma.order.delete({ where: { id: otherOrder.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    });

    it('在庫不足時の再注文エラーテスト', async () => {
      // 在庫不足の商品を作成
      const outOfStockProduct = await prisma.product.create({
        data: {
          name: '在庫不足テスト商品',
          slug: 'out-of-stock-test-product',
          price: 1500,
          categoryId: testData.category.id,
          productType: 'physical',
        },
      });

      // 在庫を0にする（在庫ログを作成しない）

      // この商品を含む注文を作成
      const outOfStockOrder = await prisma.order.create({
        data: {
          orderNumber: 'ORD-OUT-OF-STOCK-TEST',
          userId: testData.user.id,
          status: 'paid',
          paymentMethod: 'credit_card',
          totalAmount: 1500,
          shippingAddress: 'テスト住所',
        },
      });

      await prisma.orderItem.create({
        data: {
          orderId: outOfStockOrder.id,
          productId: outOfStockProduct.id,
          quantity: 1,
          price: 1500,
        },
      });

      // 再注文を試行
      const res = await request(BASE_URL)
        .post(`/api/orders/${outOfStockOrder.id}/reorder`)
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.outOfStockItems).toBeDefined();
      expect(res.body.outOfStockItems.length).toBeGreaterThan(0);
      // 商品名が含まれていることを検証（在庫情報も含まれる）
      expect(res.body.outOfStockItems[0]).toMatch(/在庫不足テスト商品/);

      // クリーンアップ
      await prisma.orderItem.deleteMany({ where: { orderId: outOfStockOrder.id } });
      await prisma.order.delete({ where: { id: outOfStockOrder.id } });
      await prisma.product.delete({ where: { id: outOfStockProduct.id } });
    });
  });

  // ===== 7.2: デジタルダウンロード =====
  describe('GET /api/orders/:orderId/downloads', () => {
    it('デジタルダウンロードリンクを取得できる', async () => {
      const res = await request(BASE_URL)
        .get(`/api/orders/${testData.order.id}/downloads`)
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.downloads).toBeDefined();
      expect(res.body.downloads.length).toBeGreaterThan(0);
      expect(res.body.downloads[0].downloadUrl).toBeDefined();
      expect(res.body.downloads[0].fileName).toBe('test-download.pdf');
    });

    it('未認証の場合は401エラー', async () => {
      const res = await request(BASE_URL)
        .get(`/api/orders/${testData.order.id}/downloads`)
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('他人の注文へのダウンロード試行は404エラー（認可テスト）', async () => {
      // 別ユーザーを作成
      const hashedPassword = await bcrypt.hash('otherpassword456', 10);
      const otherUser = await prisma.user.create({
        data: {
          email: 'other-download-slice7@example.com',
          password: hashedPassword,
          name: 'その他のダウンロードユーザー',
        },
      });

      // 別ユーザーの注文を作成
      const otherOrder = await prisma.order.create({
        data: {
          orderNumber: 'ORD-OTHER-DOWNLOAD-SLICE7',
          userId: otherUser.id,
          status: 'paid',
          paymentMethod: 'credit_card',
          totalAmount: 3000,
          shippingAddress: 'その他のダウンロード住所',
        },
      });

      // 元のユーザーのセッションで他人の注文のダウンロードを試行
      const res = await request(BASE_URL)
        .get(`/api/orders/${otherOrder.id}/downloads`)
        .set('Cookie', sessionCookie)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('見つかりません');

      // クリーンアップ
      await prisma.order.delete({ where: { id: otherOrder.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    });

    it('ダウンロード回数制限テスト', async () => {
      // 新しいダウンロード用の商品と注文を作成
      const downloadProduct = await prisma.product.create({
        data: {
          name: 'ダウンロード回数制限テスト商品',
          slug: 'download-limit-test-product',
          price: 500,
          categoryId: testData.category.id,
          productType: 'digital',
        },
      });

      const downloadOrder = await prisma.order.create({
        data: {
          orderNumber: 'ORD-DOWNLOAD-LIMIT-TEST',
          userId: testData.user.id,
          status: 'paid',
          paymentMethod: 'credit_card',
          totalAmount: 500,
          shippingAddress: 'デジタル商品（住所不要）',
        },
      });

      // maxDownloads = 3 のダウンロードを作成
      const limitedDownload = await prisma.digitalDownload.create({
        data: {
          orderId: downloadOrder.id,
          productId: downloadProduct.id,
          r2FileKey: 'test-files/limited-download.pdf',
          fileName: 'limited-download.pdf',
          maxDownloads: 3,
        },
      });

      // 3回ダウンロードを実行
      for (let i = 0; i < 3; i++) {
        const res = await request(BASE_URL)
          .get(`/api/orders/${downloadOrder.id}/downloads`)
          .set('Cookie', sessionCookie)
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.downloads[0].downloadUrl).toBeDefined();
        expect(res.body.downloads[0].downloadCount).toBe(i + 1);
      }

      // 4回目のダウンロード試行 → downloadUrl: null 期待
      const finalRes = await request(BASE_URL)
        .get(`/api/orders/${downloadOrder.id}/downloads`)
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(finalRes.body.success).toBe(true);
      expect(finalRes.body.downloads[0].downloadUrl).toBeNull();
      expect(finalRes.body.downloads[0].downloadCount).toBe(3);
      expect(finalRes.body.downloads[0].maxDownloads).toBe(3);

      // クリーンアップ
      await prisma.digitalDownload.delete({ where: { id: limitedDownload.id } });
      await prisma.order.delete({ where: { id: downloadOrder.id } });
      await prisma.product.delete({ where: { id: downloadProduct.id } });
    });

    it('デジタルダウンロードの有効期限切れテスト', async () => {
      // 有効期限切れダウンロード用の商品と注文を作成
      const expiredProduct = await prisma.product.create({
        data: {
          name: '有効期限切れテスト商品',
          slug: 'expired-download-test-product',
          price: 800,
          categoryId: testData.category.id,
          productType: 'digital',
        },
      });

      const expiredOrder = await prisma.order.create({
        data: {
          orderNumber: 'ORD-EXPIRED-DOWNLOAD-TEST',
          userId: testData.user.id,
          status: 'paid',
          paymentMethod: 'credit_card',
          totalAmount: 800,
          shippingAddress: 'デジタル商品（住所不要）',
        },
      });

      // 過去の日時（25時間前）で有効期限切れのダウンロードを作成
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 25);

      const expiredDownload = await prisma.digitalDownload.create({
        data: {
          orderId: expiredOrder.id,
          productId: expiredProduct.id,
          r2FileKey: 'test-files/expired-download.pdf',
          fileName: 'expired-download.pdf',
          maxDownloads: 5,
          expiresAt: expiredDate,
        },
      });

      // ダウンロード試行
      const res = await request(BASE_URL)
        .get(`/api/orders/${expiredOrder.id}/downloads`)
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.downloads).toBeDefined();
      expect(res.body.downloads.length).toBeGreaterThan(0);
      expect(res.body.downloads[0].downloadUrl).toBeNull();
      expect(res.body.downloads[0].isExpired).toBe(true);

      // クリーンアップ
      await prisma.digitalDownload.delete({ where: { id: expiredDownload.id } });
      await prisma.order.delete({ where: { id: expiredOrder.id } });
      await prisma.product.delete({ where: { id: expiredProduct.id } });
    });
  });

  // ===== 7.3: 決済プロバイダー設定取得 =====
  describe('GET /api/settings/payment-providers', () => {
    it('決済プロバイダー設定を取得できる', async () => {
      const res = await request(BASE_URL)
        .get('/api/settings/payment-providers')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.paymentProviders).toBeDefined();
      expect(res.body.paymentProviders.bankTransfer).toBeDefined();
      expect(res.body.paymentProviders.creditCard).toBeDefined();
      expect(res.body.paymentProviders.bankTransfer.enabled).toBe(true);
    });
  });

  // ===== 7.4+7.5: パスワードリセット =====
  describe('パスワードリセット', () => {
    let resetToken: string;

    it('パスワードリセット申請ができる', async () => {
      const res = await request(BASE_URL)
        .post('/api/auth/password-reset/request')
        .send({
          email: 'slice7test@example.com',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('メール');

      // トークンをDBから取得
      const tokenRecord = await prisma.passwordResetToken.findFirst({
        where: { userId: testData.user.id, isUsed: false },
        orderBy: { createdAt: 'desc' },
      });

      expect(tokenRecord).toBeDefined();
      resetToken = tokenRecord!.token;
    });

    it('存在しないメールアドレスでも同じレスポンス', async () => {
      const res = await request(BASE_URL)
        .post('/api/auth/password-reset/request')
        .send({
          email: 'nonexistent@example.com',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('メール');
    });

    it('パスワードリセット確認ができる', async () => {
      const res = await request(BASE_URL)
        .post('/api/auth/password-reset/confirm')
        .send({
          token: resetToken,
          newPassword: 'newpassword123',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('リセット');

      // 新しいパスワードでログインできるか確認
      const loginRes = await request(BASE_URL).post('/api/auth/login').send({
        email: 'slice7test@example.com',
        password: 'newpassword123',
      });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
    });

    it('使用済みトークンは使用できない', async () => {
      const res = await request(BASE_URL)
        .post('/api/auth/password-reset/confirm')
        .send({
          token: resetToken,
          newPassword: 'anotherpassword123',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('使用');
    });

    it('トークン有効期限切れテスト', async () => {
      // 過去の日時（2時間前）で有効期限切れトークンを作成
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 2);

      const expiredTokenRecord = await prisma.passwordResetToken.create({
        data: {
          userId: testData.user.id,
          token: 'expired-token-test-12345',
          expiresAt: expiredDate,
          isUsed: false,
        },
      });

      // 期限切れトークンでパスワードリセット確認を試行
      const res = await request(BASE_URL)
        .post('/api/auth/password-reset/confirm')
        .send({
          token: expiredTokenRecord.token,
          newPassword: 'shouldnotwork123',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/期限切れ|有効期限|expired/i);

      // クリーンアップ
      await prisma.passwordResetToken.delete({
        where: { id: expiredTokenRecord.id },
      });
    });

    it('無効なトークンでのパスワードリセットテスト', async () => {
      // 存在しないトークンでパスワードリセット確認を試行
      const res = await request(BASE_URL)
        .post('/api/auth/password-reset/confirm')
        .send({
          token: 'invalid-nonexistent-token-12345',
          newPassword: 'shouldnotwork456',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/無効|見つかりません|invalid|not found/i);
    });
  });
});

/**
 * スライス11: イベント・チケット管理API 統合テスト
 *
 * テスト対象エンドポイント:
 * - GET /api/admin/events - イベント一覧取得
 * - POST /api/admin/events - イベント作成
 * - GET /api/admin/events/:id - イベント詳細取得
 * - POST /api/admin/events/:id/form - カスタムフォーム設定
 * - GET /api/admin/events/:id/participants - 参加者リスト取得
 * - GET /api/admin/events/:id/participants/export/csv - CSV出力
 * - GET /api/admin/events/:id/participants/export/excel - Excel出力
 * - POST /api/admin/tickets/scan - QRスキャン受付
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:8432';

describe('スライス11: イベント・チケット管理API統合テスト', () => {
  let adminSession: string;
  let regularUserSession: string;
  let adminUser: any;
  let regularUser: any;
  let testCategory: any;
  let testEvent: any;
  let testOrder: any;
  let testTicket: any;

  beforeAll(async () => {
    // 管理者ユーザー作成
    const hashedPassword = await bcrypt.hash('AdminPass123!', 10);
    adminUser = await prisma.user.create({
      data: {
        email: `admin-slice11-${Date.now()}@test.com`,
        password: hashedPassword,
        name: 'スライス11管理者',
        isAdmin: true,
      },
    });

    // 一般ユーザー作成
    regularUser = await prisma.user.create({
      data: {
        email: `user-slice11-${Date.now()}@test.com`,
        password: hashedPassword,
        name: 'スライス11一般ユーザー',
        isAdmin: false,
      },
    });

    // 管理者ログイン
    const adminLoginRes = await request(BASE_URL).post('/api/auth/login').send({
      email: adminUser.email,
      password: 'AdminPass123!',
    });
    adminSession = adminLoginRes.headers['set-cookie'][0];

    // 一般ユーザーログイン
    const userLoginRes = await request(BASE_URL).post('/api/auth/login').send({
      email: regularUser.email,
      password: 'AdminPass123!',
    });
    regularUserSession = userLoginRes.headers['set-cookie'][0];

    // テスト用カテゴリー作成
    testCategory = await prisma.category.create({
      data: {
        name: 'イベントカテゴリー',
        slug: `event-category-${Date.now()}`,
        description: 'テスト用イベントカテゴリー',
      },
    });
  });

  afterAll(async () => {
    // テストデータクリーンアップ
    if (testTicket) {
      await prisma.digitalTicket.deleteMany({
        where: { orderId: testOrder.id },
      });
    }
    if (testOrder) {
      await prisma.orderItem.deleteMany({
        where: { orderId: testOrder.id },
      });
      await prisma.order.delete({
        where: { id: testOrder.id },
      });
    }
    if (testEvent) {
      await prisma.product.delete({
        where: { id: testEvent.id },
      });
    }
    if (testCategory) {
      await prisma.category.delete({
        where: { id: testCategory.id },
      });
    }
    await prisma.user.delete({ where: { id: adminUser.id } });
    await prisma.user.delete({ where: { id: regularUser.id } });
    await prisma.$disconnect();
  });

  describe('GET /api/admin/events', () => {
    it('管理者がイベント一覧を取得できる', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/events')
        .set('Cookie', adminSession);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.events).toBeInstanceOf(Array);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(20);
    });

    it('一般ユーザーはアクセスできない', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/events')
        .set('Cookie', regularUserSession);

      expect(res.status).toBe(403);
    });

    it('未ログインユーザーはアクセスできない', async () => {
      const res = await request(BASE_URL).get('/api/admin/events');

      expect(res.status).toBe(401);
    });

    it('検索キーワードでフィルタできる', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/events?search=テスト')
        .set('Cookie', adminSession);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('ページネーションが機能する', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/events?page=1&limit=10')
        .set('Cookie', adminSession);

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(10);
    });
  });

  describe('POST /api/admin/events', () => {
    it('管理者がイベントを作成できる', async () => {
      const eventData = {
        name: 'テストイベント2026',
        slug: `test-event-${Date.now()}`,
        description: '統合テスト用イベント',
        price: 5000,
        isActive: true,
        categoryId: testCategory.id,
      };

      const res = await request(BASE_URL)
        .post('/api/admin/events')
        .set('Cookie', adminSession)
        .send(eventData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.event).toBeDefined();
      expect(res.body.event.name).toBe(eventData.name);
      expect(res.body.event.slug).toBe(eventData.slug);
      expect(res.body.event.price).toBe(eventData.price);

      testEvent = res.body.event;
    });

    it('一般ユーザーはイベントを作成できない', async () => {
      const res = await request(BASE_URL)
        .post('/api/admin/events')
        .set('Cookie', regularUserSession)
        .send({
          name: 'テストイベント',
          slug: `test-event-fail-${Date.now()}`,
          description: 'これは失敗するべき',
          price: 3000,
        });

      expect(res.status).toBe(403);
    });

    it('必須パラメータ不足でエラー', async () => {
      const res = await request(BASE_URL)
        .post('/api/admin/events')
        .set('Cookie', adminSession)
        .send({
          name: 'テストイベント',
          // slug, description, price が不足
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('スラッグ重複でエラー', async () => {
      const res = await request(BASE_URL)
        .post('/api/admin/events')
        .set('Cookie', adminSession)
        .send({
          name: 'テストイベント2',
          slug: testEvent.slug, // 既存のスラッグ
          description: 'スラッグ重複テスト',
          price: 3000,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('既に使用されています');
    });

    it('負の価格でエラー', async () => {
      const res = await request(BASE_URL)
        .post('/api/admin/events')
        .set('Cookie', adminSession)
        .send({
          name: 'テストイベント3',
          slug: `test-event-negative-${Date.now()}`,
          description: '負の価格テスト',
          price: -1000,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('0以上');
    });
  });

  describe('GET /api/admin/events/:id', () => {
    it('管理者がイベント詳細を取得できる', async () => {
      const res = await request(BASE_URL)
        .get(`/api/admin/events/${testEvent.id}`)
        .set('Cookie', adminSession);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.event).toBeDefined();
      expect(res.body.event.id).toBe(testEvent.id);
      expect(res.body.event.participantCount).toBeDefined();
      expect(res.body.event.usedTicketCount).toBeDefined();
    });

    it('一般ユーザーはアクセスできない', async () => {
      const res = await request(BASE_URL)
        .get(`/api/admin/events/${testEvent.id}`)
        .set('Cookie', regularUserSession);

      expect(res.status).toBe(403);
    });

    it('存在しないIDで404エラー', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/events/nonexistent-id-12345')
        .set('Cookie', adminSession);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('見つかりません');
    });
  });

  describe('POST /api/admin/events/:id/form', () => {
    it('カスタムフォーム設定は501エラーを返す（スキーマ拡張待ち）', async () => {
      const res = await request(BASE_URL)
        .post(`/api/admin/events/${testEvent.id}/form`)
        .set('Cookie', adminSession)
        .send({
          formTemplate: {
            fields: [
              { name: 'company', label: '会社名', type: 'text', required: true },
            ],
          },
        });

      expect(res.status).toBe(501);
      expect(res.body.message).toContain('実装準備中');
    });

    it('一般ユーザーはアクセスできない', async () => {
      const res = await request(BASE_URL)
        .post(`/api/admin/events/${testEvent.id}/form`)
        .set('Cookie', regularUserSession)
        .send({ formTemplate: {} });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/admin/events/:id/participants', () => {
    beforeAll(async () => {
      // テスト用注文とチケット作成
      testOrder = await prisma.order.create({
        data: {
          orderNumber: `ORD-EVENT-TEST-${Date.now()}`,
          userId: regularUser.id,
          customerEmail: regularUser.email,
          customerName: regularUser.name,
          customerPhone: '090-1234-5678',
          shippingPostalCode: '100-0001',
          shippingAddress: '東京都千代田区千代田1-1',
          totalAmount: 5000,
          paymentMethod: 'bank_transfer',
          status: 'paid',
        },
      });

      const orderItem = await prisma.orderItem.create({
        data: {
          orderId: testOrder.id,
          productId: testEvent.id,
          quantity: 1,
          price: 5000,
        },
      });

      testTicket = await prisma.digitalTicket.create({
        data: {
          orderId: testOrder.id,
          orderItemId: orderItem.id,
          productId: testEvent.id,
          ticketCode: `TICKET-${Date.now()}`,
          qrCodeData: `QR-${Date.now()}`,
          isUsed: false,
        },
      });
    });

    it('管理者が参加者リストを取得できる', async () => {
      const res = await request(BASE_URL)
        .get(`/api/admin/events/${testEvent.id}/participants`)
        .set('Cookie', adminSession);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.participants).toBeInstanceOf(Array);
      expect(res.body.participants.length).toBeGreaterThan(0);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.totalParticipants).toBeGreaterThan(0);
    });

    it('一般ユーザーはアクセスできない', async () => {
      const res = await request(BASE_URL)
        .get(`/api/admin/events/${testEvent.id}/participants`)
        .set('Cookie', regularUserSession);

      expect(res.status).toBe(403);
    });

    it('使用状態でフィルタできる', async () => {
      const res = await request(BASE_URL)
        .get(`/api/admin/events/${testEvent.id}/participants?status=unused`)
        .set('Cookie', adminSession);

      expect(res.status).toBe(200);
      expect(res.body.participants.every((p: any) => !p.isUsed)).toBe(true);
    });

    it('検索キーワードが機能する', async () => {
      const res = await request(BASE_URL)
        .get(`/api/admin/events/${testEvent.id}/participants?search=${regularUser.name}`)
        .set('Cookie', adminSession);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('存在しないイベントIDで404エラー', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/events/nonexistent-id/participants')
        .set('Cookie', adminSession);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/admin/events/:id/participants/export/csv', () => {
    it('管理者がCSVを出力できる', async () => {
      const res = await request(BASE_URL)
        .get(`/api/admin/events/${testEvent.id}/participants/export/csv`)
        .set('Cookie', adminSession);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain('.csv');
      expect(res.text).toContain('チケットコード');
      expect(res.text).toContain('参加者名');
    });

    it('一般ユーザーはアクセスできない', async () => {
      const res = await request(BASE_URL)
        .get(`/api/admin/events/${testEvent.id}/participants/export/csv`)
        .set('Cookie', regularUserSession);

      expect(res.status).toBe(403);
    });

    it('存在しないイベントIDで404エラー', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/events/nonexistent-id/participants/export/csv')
        .set('Cookie', adminSession);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/admin/events/:id/participants/export/excel', () => {
    it('管理者がExcelを出力できる', async () => {
      const res = await request(BASE_URL)
        .get(`/api/admin/events/${testEvent.id}/participants/export/excel`)
        .set('Cookie', adminSession);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/vnd.ms-excel');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain('.xls');
      expect(res.text).toContain('チケットコード');
      expect(res.text).toContain('参加者名');
    });

    it('一般ユーザーはアクセスできない', async () => {
      const res = await request(BASE_URL)
        .get(`/api/admin/events/${testEvent.id}/participants/export/excel`)
        .set('Cookie', regularUserSession);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/admin/tickets/scan', () => {
    it('管理者がチケットコードでスキャンできる', async () => {
      const res = await request(BASE_URL)
        .post('/api/admin/tickets/scan')
        .set('Cookie', adminSession)
        .send({
          ticketCode: testTicket.ticketCode,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('受付完了');
      expect(res.body.ticket).toBeDefined();
      expect(res.body.ticket.ticketCode).toBe(testTicket.ticketCode);
      expect(res.body.ticket.usedAt).toBeDefined();
    });

    it('既に使用済みのチケットはエラー', async () => {
      const res = await request(BASE_URL)
        .post('/api/admin/tickets/scan')
        .set('Cookie', adminSession)
        .send({
          ticketCode: testTicket.ticketCode,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('既に使用済み');
    });

    it('QRコードデータでもスキャンできる', async () => {
      // 新しいチケット作成
      const newOrderItem = await prisma.orderItem.create({
        data: {
          orderId: testOrder.id,
          productId: testEvent.id,
          quantity: 1,
          price: 5000,
        },
      });

      const newTicket = await prisma.digitalTicket.create({
        data: {
          orderId: testOrder.id,
          orderItemId: newOrderItem.id,
          productId: testEvent.id,
          ticketCode: `TICKET-QR-${Date.now()}`,
          qrCodeData: `QR-DATA-${Date.now()}`,
          isUsed: false,
        },
      });

      const res = await request(BASE_URL)
        .post('/api/admin/tickets/scan')
        .set('Cookie', adminSession)
        .send({
          qrCodeData: newTicket.qrCodeData,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('受付完了');

      // クリーンアップ
      await prisma.digitalTicket.delete({ where: { id: newTicket.id } });
      await prisma.orderItem.delete({ where: { id: newOrderItem.id } });
    });

    it('存在しないチケットコードで404エラー', async () => {
      const res = await request(BASE_URL)
        .post('/api/admin/tickets/scan')
        .set('Cookie', adminSession)
        .send({
          ticketCode: 'NONEXISTENT-TICKET-12345',
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('見つかりません');
    });

    it('チケットコードとQRデータ両方なしでエラー', async () => {
      const res = await request(BASE_URL)
        .post('/api/admin/tickets/scan')
        .set('Cookie', adminSession)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('必要です');
    });

    it('一般ユーザーはスキャンできない', async () => {
      const res = await request(BASE_URL)
        .post('/api/admin/tickets/scan')
        .set('Cookie', regularUserSession)
        .send({
          ticketCode: testTicket.ticketCode,
        });

      expect(res.status).toBe(403);
    });
  });

  describe('パフォーマンステスト', () => {
    it('多数の参加者がいてもリスト取得が高速', async () => {
      const startTime = Date.now();

      const res = await request(BASE_URL)
        .get(`/api/admin/events/${testEvent.id}/participants?limit=50`)
        .set('Cookie', adminSession);

      const duration = Date.now() - startTime;

      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(3000); // 3秒以内
    });
  });
});

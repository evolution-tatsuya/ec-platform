/**
 * スライス12-B: 問い合わせ管理API 統合テスト
 *
 * テスト対象エンドポイント:
 * - GET /api/admin/inquiries - 問い合わせ一覧取得（検索・フィルタリング）
 * - GET /api/admin/inquiries/:id - 問い合わせ詳細取得
 * - GET /api/admin/inquiries/stats - 問い合わせ統計情報取得
 * - GET /api/admin/inquiries/trends - 問い合わせトレンド取得（日別・週別）
 * - PUT /api/admin/inquiries/:id/reply - 問い合わせに返信
 * - PUT /api/admin/inquiries/:id/status - 問い合わせステータス更新
 * - DELETE /api/admin/inquiries/:id - 問い合わせ削除
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:8432';

describe('スライス12-B: 問い合わせ管理API', () => {
  let adminUser: any;
  let normalUser: any;
  let testInquiry1: any;
  let testInquiry2: any;
  let testInquiry3: any;
  let authCookie: string;

  beforeAll(async () => {
    // テストデータ作成
    const hashedPassword = await bcrypt.hash('TestAdmin2025!', 10);

    adminUser = await prisma.user.create({
      data: {
        email: 'admin-inquiry-test@ec-platform.local',
        password: hashedPassword,
        name: '問い合わせ管理テスト管理者',
        isAdmin: true,
      },
    });

    normalUser = await prisma.user.create({
      data: {
        email: 'user-inquiry-test@ec-platform.local',
        password: hashedPassword,
        name: '問い合わせテストユーザー',
        isAdmin: false,
      },
    });

    // 問い合わせデータ作成
    testInquiry1 = await prisma.inquiry.create({
      data: {
        name: '山田太郎',
        email: 'yamada@example.com',
        subject: '配送について',
        message: '配送状況を確認したいです',
        status: 'pending',
        userId: normalUser.id,
      },
    });

    testInquiry2 = await prisma.inquiry.create({
      data: {
        name: '佐藤花子',
        email: 'sato@example.com',
        subject: '返品について',
        message: '商品を返品したいです',
        status: 'replied',
        reply: 'ご連絡ありがとうございます。返品手続きを承ります。',
        repliedAt: new Date(),
        repliedBy: adminUser.id,
      },
    });

    testInquiry3 = await prisma.inquiry.create({
      data: {
        name: '鈴木一郎',
        email: 'suzuki@example.com',
        subject: '商品について',
        message: '商品の在庫を知りたいです',
        status: 'closed',
        reply: 'ご確認いただき、ありがとうございます。',
        repliedAt: new Date(Date.now() - 3600000), // 1時間前
        repliedBy: adminUser.id,
      },
    });

    // 管理者でログイン
    const loginRes = await request(BASE_URL).post('/api/auth/login').send({
      email: adminUser.email,
      password: 'TestAdmin2025!',
    });

    authCookie = loginRes.headers['set-cookie'][0];
  });

  afterAll(async () => {
    // テストデータ削除
    await prisma.inquiry.deleteMany({
      where: {
        OR: [
          { id: testInquiry1.id },
          { id: testInquiry2.id },
          { id: testInquiry3.id },
        ],
      },
    });

    await prisma.user.deleteMany({
      where: {
        OR: [{ id: adminUser.id }, { id: normalUser.id }],
      },
    });

    await prisma.$disconnect();
  });

  describe('GET /api/admin/inquiries - 問い合わせ一覧取得', () => {
    it('問い合わせ一覧を取得できる', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/inquiries')
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body.inquiries).toBeDefined();
      expect(Array.isArray(res.body.inquiries)).toBe(true);
      expect(res.body.inquiries.length).toBeGreaterThan(0);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(3);
    });

    it('検索条件で問い合わせをフィルタリングできる', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/inquiries?search=山田')
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body.inquiries).toBeDefined();
      expect(res.body.inquiries.length).toBeGreaterThan(0);
      expect(
        res.body.inquiries.some((i: any) => i.name.includes('山田'))
      ).toBe(true);
    });

    it('ステータスで問い合わせをフィルタリングできる', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/inquiries?status=pending')
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body.inquiries).toBeDefined();
      expect(res.body.inquiries.every((i: any) => i.status === 'pending')).toBe(
        true
      );
    });

    it('ページネーションが正しく動作する', async () => {
      const res1 = await request(BASE_URL)
        .get('/api/admin/inquiries?page=1&limit=1')
        .set('Cookie', authCookie)
        .expect(200);

      expect(res1.body.inquiries.length).toBe(1);
      expect(res1.body.pagination.page).toBe(1);
      expect(res1.body.pagination.limit).toBe(1);

      const res2 = await request(BASE_URL)
        .get('/api/admin/inquiries?page=2&limit=1')
        .set('Cookie', authCookie)
        .expect(200);

      expect(res2.body.inquiries.length).toBeGreaterThanOrEqual(0);
      expect(res2.body.pagination.page).toBe(2);
    });

    it('ソート条件で並び替えできる', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/inquiries?sortBy=createdAt&sortOrder=asc')
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body.inquiries).toBeDefined();
      expect(res.body.inquiries.length).toBeGreaterThan(0);

      // 日付が昇順になっているか確認
      for (let i = 0; i < res.body.inquiries.length - 1; i++) {
        const date1 = new Date(res.body.inquiries[i].createdAt);
        const date2 = new Date(res.body.inquiries[i + 1].createdAt);
        expect(date1.getTime()).toBeLessThanOrEqual(date2.getTime());
      }
    });

    it('認証なしではアクセスできない', async () => {
      await request(BASE_URL).get('/api/admin/inquiries').expect(401);
    });
  });

  describe('GET /api/admin/inquiries/:id - 問い合わせ詳細取得', () => {
    it('問い合わせ詳細を取得できる', async () => {
      const res = await request(BASE_URL)
        .get(`/api/admin/inquiries/${testInquiry1.id}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body.id).toBe(testInquiry1.id);
      expect(res.body.name).toBe(testInquiry1.name);
      expect(res.body.email).toBe(testInquiry1.email);
      expect(res.body.subject).toBe(testInquiry1.subject);
      expect(res.body.message).toBe(testInquiry1.message);
      expect(res.body.status).toBe('pending');
    });

    it('返信済み問い合わせの詳細を取得できる', async () => {
      const res = await request(BASE_URL)
        .get(`/api/admin/inquiries/${testInquiry2.id}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body.id).toBe(testInquiry2.id);
      expect(res.body.status).toBe('replied');
      expect(res.body.reply).toBeDefined();
      expect(res.body.repliedAt).toBeDefined();
      expect(res.body.repliedByUser).toBeDefined();
      expect(res.body.repliedByUser.id).toBe(adminUser.id);
    });

    it('存在しない問い合わせIDで404エラー', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/inquiries/non-existent-id')
        .set('Cookie', authCookie)
        .expect(404);

      expect(res.body.message).toBe('問い合わせが見つかりません');
    });

    it('認証なしではアクセスできない', async () => {
      await request(BASE_URL)
        .get(`/api/admin/inquiries/${testInquiry1.id}`)
        .expect(401);
    });
  });

  describe('GET /api/admin/inquiries/stats - 問い合わせ統計情報取得', () => {
    it('問い合わせ統計を取得できる', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/inquiries/stats')
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body.totalInquiries).toBeDefined();
      expect(res.body.totalInquiries).toBeGreaterThanOrEqual(3);
      expect(res.body.pendingCount).toBeDefined();
      expect(res.body.repliedCount).toBeDefined();
      expect(res.body.closedCount).toBeDefined();
      expect(res.body.todayInquiries).toBeDefined();
      expect(res.body.averageReplyTimeHours).toBeDefined();
      expect(typeof res.body.averageReplyTimeHours).toBe('number');
    });

    it('統計の合計が正しい', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/inquiries/stats')
        .set('Cookie', authCookie)
        .expect(200);

      const total =
        res.body.pendingCount + res.body.repliedCount + res.body.closedCount;
      expect(total).toBe(res.body.totalInquiries);
    });

    it('認証なしではアクセスできない', async () => {
      await request(BASE_URL).get('/api/admin/inquiries/stats').expect(401);
    });
  });

  describe('GET /api/admin/inquiries/trends - 問い合わせトレンド取得', () => {
    it('週別トレンドを取得できる（デフォルト）', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/inquiries/trends')
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body.period).toBe('week');
      expect(res.body.days).toBe(7);
      expect(res.body.trends).toBeDefined();
      expect(Array.isArray(res.body.trends)).toBe(true);
      expect(res.body.trends.length).toBe(7);

      // 各日のデータ構造を確認
      res.body.trends.forEach((trend: any) => {
        expect(trend.date).toBeDefined();
        expect(trend.total).toBeDefined();
        expect(trend.pending).toBeDefined();
        expect(trend.replied).toBeDefined();
        expect(trend.closed).toBeDefined();
        expect(typeof trend.total).toBe('number');
      });
    });

    it('月別トレンドを取得できる', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/inquiries/trends?period=month')
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body.period).toBe('month');
      expect(res.body.days).toBe(30);
      expect(res.body.trends).toBeDefined();
      expect(Array.isArray(res.body.trends)).toBe(true);
      expect(res.body.trends.length).toBe(30);
    });

    it('トレンドデータが日付順にソートされている', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/inquiries/trends')
        .set('Cookie', authCookie)
        .expect(200);

      for (let i = 0; i < res.body.trends.length - 1; i++) {
        const date1 = res.body.trends[i].date;
        const date2 = res.body.trends[i + 1].date;
        expect(date1.localeCompare(date2)).toBeLessThan(0);
      }
    });

    it('各日の統計の合計が正しい', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/inquiries/trends')
        .set('Cookie', authCookie)
        .expect(200);

      res.body.trends.forEach((trend: any) => {
        const sum = trend.pending + trend.replied + trend.closed;
        expect(sum).toBe(trend.total);
      });
    });

    it('認証なしではアクセスできない', async () => {
      await request(BASE_URL).get('/api/admin/inquiries/trends').expect(401);
    });
  });

  describe('PUT /api/admin/inquiries/:id/reply - 問い合わせに返信', () => {
    it('問い合わせに返信できる', async () => {
      const res = await request(BASE_URL)
        .put(`/api/admin/inquiries/${testInquiry1.id}/reply`)
        .set('Cookie', authCookie)
        .send({
          reply: 'お問い合わせありがとうございます。配送状況を確認いたします。',
        })
        .expect(200);

      expect(res.body.message).toBe('返信を送信しました');
      expect(res.body.inquiry).toBeDefined();
      expect(res.body.inquiry.status).toBe('replied');
      expect(res.body.inquiry.reply).toBe(
        'お問い合わせありがとうございます。配送状況を確認いたします。'
      );
      expect(res.body.inquiry.repliedAt).toBeDefined();
      expect(res.body.inquiry.repliedByUser).toBeDefined();
      expect(res.body.inquiry.repliedByUser.id).toBe(adminUser.id);
    });

    it('返信内容なしで400エラー', async () => {
      const res = await request(BASE_URL)
        .put(`/api/admin/inquiries/${testInquiry1.id}/reply`)
        .set('Cookie', authCookie)
        .send({})
        .expect(400);

      expect(res.body.message).toBe('返信内容が必要です');
    });

    it('存在しない問い合わせIDで404エラー', async () => {
      const res = await request(BASE_URL)
        .put('/api/admin/inquiries/non-existent-id/reply')
        .set('Cookie', authCookie)
        .send({ reply: 'テスト返信' })
        .expect(404);

      expect(res.body.message).toBe('問い合わせが見つかりません');
    });

    it('認証なしではアクセスできない', async () => {
      await request(BASE_URL)
        .put(`/api/admin/inquiries/${testInquiry1.id}/reply`)
        .send({ reply: 'テスト返信' })
        .expect(401);
    });
  });

  describe('PUT /api/admin/inquiries/:id/status - 問い合わせステータス更新', () => {
    it('問い合わせステータスを更新できる', async () => {
      const res = await request(BASE_URL)
        .put(`/api/admin/inquiries/${testInquiry2.id}/status`)
        .set('Cookie', authCookie)
        .send({ status: 'closed' })
        .expect(200);

      expect(res.body.message).toBe('ステータスを更新しました');
      expect(res.body.inquiry).toBeDefined();
      expect(res.body.inquiry.status).toBe('closed');
    });

    it('無効なステータスで400エラー', async () => {
      const res = await request(BASE_URL)
        .put(`/api/admin/inquiries/${testInquiry2.id}/status`)
        .set('Cookie', authCookie)
        .send({ status: 'invalid-status' })
        .expect(400);

      expect(res.body.message).toBe('無効なステータスです');
    });

    it('存在しない問い合わせIDで404エラー', async () => {
      const res = await request(BASE_URL)
        .put('/api/admin/inquiries/non-existent-id/status')
        .set('Cookie', authCookie)
        .send({ status: 'closed' })
        .expect(404);

      expect(res.body.message).toBe('問い合わせが見つかりません');
    });

    it('認証なしではアクセスできない', async () => {
      await request(BASE_URL)
        .put(`/api/admin/inquiries/${testInquiry2.id}/status`)
        .send({ status: 'closed' })
        .expect(401);
    });
  });

  describe('DELETE /api/admin/inquiries/:id - 問い合わせ削除', () => {
    it('問い合わせを削除できる', async () => {
      // 削除用の問い合わせを作成
      const deleteInquiry = await prisma.inquiry.create({
        data: {
          name: '削除テスト',
          email: 'delete@example.com',
          subject: '削除テスト',
          message: 'このデータは削除されます',
          status: 'pending',
        },
      });

      const res = await request(BASE_URL)
        .delete(`/api/admin/inquiries/${deleteInquiry.id}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body.message).toBe('問い合わせを削除しました');

      // 削除を確認
      const deleted = await prisma.inquiry.findUnique({
        where: { id: deleteInquiry.id },
      });
      expect(deleted).toBeNull();
    });

    it('存在しない問い合わせIDで404エラー', async () => {
      const res = await request(BASE_URL)
        .delete('/api/admin/inquiries/non-existent-id')
        .set('Cookie', authCookie)
        .expect(404);

      expect(res.body.message).toBe('問い合わせが見つかりません');
    });

    it('認証なしではアクセスできない', async () => {
      await request(BASE_URL)
        .delete(`/api/admin/inquiries/${testInquiry3.id}`)
        .expect(401);
    });
  });

  describe('パフォーマンステスト', () => {
    it('問い合わせ一覧取得が2秒以内に完了する', async () => {
      const start = Date.now();
      await request(BASE_URL)
        .get('/api/admin/inquiries')
        .set('Cookie', authCookie)
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(2000);
    });

    it('問い合わせ統計取得が2秒以内に完了する', async () => {
      const start = Date.now();
      await request(BASE_URL)
        .get('/api/admin/inquiries/stats')
        .set('Cookie', authCookie)
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(2000);
    });
  });
});

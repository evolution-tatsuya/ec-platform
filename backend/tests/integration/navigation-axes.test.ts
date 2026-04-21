/**
 * スライス8-B統合テスト: ナビゲーション軸API
 *
 * テスト対象:
 * 1. GET /api/admin/navigation-axes - ナビゲーション軸一覧取得
 * 2. GET /api/admin/navigation-axes/:category - カテゴリー別ナビゲーション軸取得
 * 3. POST /api/admin/navigation-axes - ナビゲーション軸追加
 * 4. PUT /api/admin/navigation-axes/:id - ナビゲーション軸更新
 * 5. DELETE /api/admin/navigation-axes/:id - ナビゲーション軸削除
 * 6. PUT /api/admin/navigation-axes/:id/order - ナビゲーション軸の表示順序変更
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:8432';

// 管理者認証用クッキー
let adminCookie: string;

// テストデータのクリーンアップ
async function cleanup() {
  await prisma.navigationAxisOption.deleteMany();
  await prisma.navigationAxis.deleteMany();
  await prisma.user.deleteMany({ where: { email: 'admin-navtest@example.com' } });
}

// 管理者ログイン
async function loginAsAdmin() {
  // 管理者アカウント作成
  const hashedPassword = await bcrypt.hash('adminpassword123', 10);
  await prisma.user.create({
    data: {
      email: 'admin-navtest@example.com',
      password: hashedPassword,
      name: 'ナビゲーション軸テスト管理者',
      isAdmin: true,
    },
  });

  // ログイン
  const loginRes = await request(BASE_URL)
    .post('/api/auth/login')
    .send({
      email: 'admin-navtest@example.com',
      password: 'adminpassword123',
    });

  if (loginRes.status !== 200) {
    throw new Error(`管理者ログインに失敗: ${loginRes.status} ${JSON.stringify(loginRes.body)}`);
  }

  // クッキーを取得
  const cookies = loginRes.headers['set-cookie'];
  if (!cookies || cookies.length === 0) {
    throw new Error('セッションクッキーが取得できませんでした');
  }
  adminCookie = cookies[0];
}

// テストデータのセットアップ
async function setup() {
  // カテゴリータイプ「car-parts」用のナビゲーション軸を作成
  const axis1 = await prisma.navigationAxis.create({
    data: {
      categoryType: 'car-parts',
      axisName: 'メーカー',
      axisKey: 'manufacturer',
      axisType: 'single',
      displayType: 'dropdown',
      icon: 'factory',
      order: 0,
      isActive: true,
    },
  });

  // オプション追加
  await prisma.navigationAxisOption.createMany({
    data: [
      {
        navigationAxisId: axis1.id,
        label: 'トヨタ',
        value: 'toyota',
        order: 0,
      },
      {
        navigationAxisId: axis1.id,
        label: 'ホンダ',
        value: 'honda',
        order: 1,
      },
      {
        navigationAxisId: axis1.id,
        label: '日産',
        value: 'nissan',
        order: 2,
      },
    ],
  });

  const axis2 = await prisma.navigationAxis.create({
    data: {
      categoryType: 'car-parts',
      axisName: '車種',
      axisKey: 'car_model',
      axisType: 'single',
      displayType: 'dropdown',
      icon: 'directions_car',
      order: 1,
      isActive: true,
    },
  });

  // カテゴリータイプ「events」用のナビゲーション軸を作成
  const axis3 = await prisma.navigationAxis.create({
    data: {
      categoryType: 'events',
      axisName: 'イベント種類',
      axisKey: 'event_type',
      axisType: 'single',
      displayType: 'button',
      icon: 'event',
      order: 0,
      isActive: true,
    },
  });

  return { axis1, axis2, axis3 };
}

describe('ナビゲーション軸API統合テスト', () => {
  let testAxes: Awaited<ReturnType<typeof setup>>;

  beforeAll(async () => {
    await cleanup();
    await loginAsAdmin();
    testAxes = await setup();
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  describe('GET /api/admin/navigation-axes', () => {
    it('全ナビゲーション軸一覧を取得できること', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/navigation-axes')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.axes).toBeDefined();
      expect(Array.isArray(res.body.axes)).toBe(true);
      expect(res.body.axes.length).toBeGreaterThanOrEqual(3);

      // 最初の軸にオプションが含まれているか確認
      const firstAxis = res.body.axes[0];
      expect(firstAxis.options).toBeDefined();
      expect(Array.isArray(firstAxis.options)).toBe(true);
    });

    it('クエリパラメータでカテゴリータイプをフィルタリングできること', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/navigation-axes')
        .query({ categoryType: 'car-parts' })
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.axes).toBeDefined();
      expect(res.body.axes.length).toBe(2); // car-parts用は2つ

      // 全てのaxisがcar-partsであることを確認
      res.body.axes.forEach((axis: any) => {
        expect(axis.categoryType).toBe('car-parts');
      });
    });

    it('orderでソートされていること', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/navigation-axes')
        .query({ categoryType: 'car-parts' })
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.axes[0].order).toBe(0);
      expect(res.body.axes[1].order).toBe(1);
    });
  });

  describe('GET /api/admin/navigation-axes/:category', () => {
    it('カテゴリー別にナビゲーション軸を取得できること', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/navigation-axes/car-parts')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.axes).toBeDefined();
      expect(res.body.axes.length).toBe(2);

      // 全てのaxisがcar-partsであることを確認
      res.body.axes.forEach((axis: any) => {
        expect(axis.categoryType).toBe('car-parts');
      });
    });

    it('存在しないカテゴリーでも空配列を返すこと', async () => {
      const res = await request(BASE_URL)
        .get('/api/admin/navigation-axes/non-existent-category')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.axes).toBeDefined();
      expect(res.body.axes.length).toBe(0);
    });
  });

  describe('POST /api/admin/navigation-axes', () => {
    it('新しいナビゲーション軸を作成できること', async () => {
      const newAxis = {
        categoryType: 'car-parts',
        axisName: '型式',
        axisKey: 'car_type',
        axisType: 'single',
        displayType: 'dropdown',
        icon: 'tag',
        options: [
          { label: 'セダン', value: 'sedan' },
          { label: 'SUV', value: 'suv' },
          { label: 'ハッチバック', value: 'hatchback' },
        ],
      };

      const res = await request(BASE_URL)
        .post('/api/admin/navigation-axes')
        .set('Cookie', adminCookie)
        .send(newAxis)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('ナビゲーション軸を追加しました');
      expect(res.body.axis).toBeDefined();
      expect(res.body.axis.categoryType).toBe('car-parts');
      expect(res.body.axis.axisName).toBe('型式');
      expect(res.body.axis.axisKey).toBe('car_type');
      expect(res.body.axis.order).toBe(2); // car-partsの3番目なので order=2

      // オプションが正しく作成されているか
      expect(res.body.axis.options).toBeDefined();
      expect(res.body.axis.options.length).toBe(3);
      expect(res.body.axis.options[0].label).toBe('セダン');
      expect(res.body.axis.options[1].label).toBe('SUV');
      expect(res.body.axis.options[2].label).toBe('ハッチバック');
    });

    it('必須項目が不足している場合は400エラーを返すこと', async () => {
      const invalidAxis = {
        categoryType: 'car-parts',
        axisName: '不完全な軸',
        // axisKey, axisType, displayTypeが不足
      };

      const res = await request(BASE_URL)
        .post('/api/admin/navigation-axes')
        .set('Cookie', adminCookie)
        .send(invalidAxis)
        .expect(400);

      expect(res.body.error).toBe('必須項目が不足しています');
    });

    it('オプション無しでもナビゲーション軸を作成できること', async () => {
      const axisWithoutOptions = {
        categoryType: 'events',
        axisName: '開催月',
        axisKey: 'event_month',
        axisType: 'single',
        displayType: 'dropdown',
        icon: 'calendar_month',
      };

      const res = await request(BASE_URL)
        .post('/api/admin/navigation-axes')
        .set('Cookie', adminCookie)
        .send(axisWithoutOptions)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.axis.axisName).toBe('開催月');
      expect(res.body.axis.options).toEqual([]);
    });
  });

  describe('PUT /api/admin/navigation-axes/:id', () => {
    it('ナビゲーション軸を更新できること', async () => {
      const updateData = {
        axisName: 'メーカー（更新）',
        axisKey: 'manufacturer_updated',
        axisType: 'multiple',
        displayType: 'checkbox',
        icon: 'factory_updated',
        isActive: false,
      };

      const res = await request(BASE_URL)
        .put(`/api/admin/navigation-axes/${testAxes.axis1.id}`)
        .set('Cookie', adminCookie)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('ナビゲーション軸を更新しました');
      expect(res.body.axis.axisName).toBe('メーカー（更新）');
      expect(res.body.axis.axisKey).toBe('manufacturer_updated');
      expect(res.body.axis.axisType).toBe('multiple');
      expect(res.body.axis.displayType).toBe('checkbox');
      expect(res.body.axis.icon).toBe('factory_updated');
      expect(res.body.axis.isActive).toBe(false);
    });

    it('ナビゲーション軸のオプションを更新できること', async () => {
      const updateData = {
        axisName: 'メーカー',
        axisKey: 'manufacturer',
        axisType: 'single',
        displayType: 'dropdown',
        icon: 'factory',
        isActive: true,
        options: [
          { label: 'マツダ', value: 'mazda' },
          { label: 'スバル', value: 'subaru' },
        ],
      };

      const res = await request(BASE_URL)
        .put(`/api/admin/navigation-axes/${testAxes.axis1.id}`)
        .set('Cookie', adminCookie)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.axis.options.length).toBe(2);
      expect(res.body.axis.options[0].label).toBe('マツダ');
      expect(res.body.axis.options[1].label).toBe('スバル');
    });

    it('存在しないナビゲーション軸の更新は404エラーを返すこと', async () => {
      const updateData = {
        axisName: '存在しない軸',
        axisKey: 'non_existent',
        axisType: 'single',
        displayType: 'dropdown',
        isActive: true,
      };

      const res = await request(BASE_URL)
        .put('/api/admin/navigation-axes/non-existent-id')
        .set('Cookie', adminCookie)
        .send(updateData)
        .expect(404);

      expect(res.body.error).toBe('ナビゲーション軸が見つかりません');
    });
  });

  describe('DELETE /api/admin/navigation-axes/:id', () => {
    it('ナビゲーション軸を削除できること', async () => {
      // 削除用の軸を作成
      const axisToDelete = await prisma.navigationAxis.create({
        data: {
          categoryType: 'events',
          axisName: '削除テスト軸',
          axisKey: 'delete_test',
          axisType: 'single',
          displayType: 'dropdown',
          order: 10,
          isActive: true,
        },
      });

      const res = await request(BASE_URL)
        .delete(`/api/admin/navigation-axes/${axisToDelete.id}`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('ナビゲーション軸を削除しました');

      // 削除されたことを確認
      const deletedAxis = await prisma.navigationAxis.findUnique({
        where: { id: axisToDelete.id },
      });
      expect(deletedAxis).toBeNull();
    });

    it('存在しないナビゲーション軸の削除は404エラーを返すこと', async () => {
      const res = await request(BASE_URL)
        .delete('/api/admin/navigation-axes/non-existent-id')
        .set('Cookie', adminCookie)
        .expect(404);

      expect(res.body.error).toBe('ナビゲーション軸が見つかりません');
    });

    it('ナビゲーション軸を削除するとオプションも削除されること（カスケード削除）', async () => {
      // オプション付きの軸を作成
      const axisWithOptions = await prisma.navigationAxis.create({
        data: {
          categoryType: 'events',
          axisName: 'カスケード削除テスト',
          axisKey: 'cascade_test',
          axisType: 'single',
          displayType: 'dropdown',
          order: 11,
          isActive: true,
          options: {
            create: [
              { label: 'オプション1', value: 'opt1', order: 0 },
              { label: 'オプション2', value: 'opt2', order: 1 },
            ],
          },
        },
      });

      // 削除前にオプションが存在することを確認
      const optionsBeforeDelete = await prisma.navigationAxisOption.findMany({
        where: { navigationAxisId: axisWithOptions.id },
      });
      expect(optionsBeforeDelete.length).toBe(2);

      // 軸を削除
      await request(BASE_URL)
        .delete(`/api/admin/navigation-axes/${axisWithOptions.id}`)
        .set('Cookie', adminCookie)
        .expect(200);

      // オプションも削除されたことを確認
      const optionsAfterDelete = await prisma.navigationAxisOption.findMany({
        where: { navigationAxisId: axisWithOptions.id },
      });
      expect(optionsAfterDelete.length).toBe(0);
    });
  });

  describe('PUT /api/admin/navigation-axes/:id/order', () => {
    it('ナビゲーション軸の表示順序を変更できること（上に移動）', async () => {
      // 現在の順序: axis1(0), axis2(1)
      // axis2を0に移動 → 結果: axis2(0), axis1(1)

      const res = await request(BASE_URL)
        .put(`/api/admin/navigation-axes/${testAxes.axis2.id}/order`)
        .set('Cookie', adminCookie)
        .send({ newOrder: 0 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('表示順序を更新しました');
      expect(res.body.axis.order).toBe(0);

      // 他の軸の順序も確認
      const updatedAxis1 = await prisma.navigationAxis.findUnique({
        where: { id: testAxes.axis1.id },
      });
      expect(updatedAxis1?.order).toBe(1);
    });

    it('ナビゲーション軸の表示順序を変更できること（下に移動）', async () => {
      // 現在の順序: axis2(0), axis1(1)
      // axis2を1に戻す → 結果: axis1(0), axis2(1)

      const res = await request(BASE_URL)
        .put(`/api/admin/navigation-axes/${testAxes.axis2.id}/order`)
        .set('Cookie', adminCookie)
        .send({ newOrder: 1 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.axis.order).toBe(1);

      // 他の軸の順序も確認
      const updatedAxis1 = await prisma.navigationAxis.findUnique({
        where: { id: testAxes.axis1.id },
      });
      expect(updatedAxis1?.order).toBe(0);
    });

    it('newOrderが不足している場合は400エラーを返すこと', async () => {
      const res = await request(BASE_URL)
        .put(`/api/admin/navigation-axes/${testAxes.axis1.id}/order`)
        .set('Cookie', adminCookie)
        .send({})
        .expect(400);

      expect(res.body.error).toBe('新しい順序が必要です');
    });

    it('存在しないナビゲーション軸の順序変更は404エラーを返すこと', async () => {
      const res = await request(BASE_URL)
        .put('/api/admin/navigation-axes/non-existent-id/order')
        .set('Cookie', adminCookie)
        .send({ newOrder: 0 })
        .expect(404);

      expect(res.body.error).toBe('ナビゲーション軸が見つかりません');
    });

    it('同じ順序への変更でもエラーにならないこと', async () => {
      const res = await request(BASE_URL)
        .put(`/api/admin/navigation-axes/${testAxes.axis1.id}/order`)
        .set('Cookie', adminCookie)
        .send({ newOrder: 0 })
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });
});

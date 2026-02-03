// ===== 配送管理コントローラー =====
// 目的: 配送可能日・配送時間帯の取得

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { createError } from '../middleware/errorHandler';

/**
 * 配送可能日取得
 * GET /api/shipping/available-dates
 * クエリパラメータ:
 *   - productIds: カート内商品IDリスト（カンマ区切り）
 *
 * 処理ロジック:
 * 1. カート内全商品のshippingSettings.preparationDaysの最大値を取得
 * 2. 今日 + preparationDays 日後から30日分の日付を生成
 * 3. allowWeekendDelivery: false の商品がある場合、土日を除外
 * 4. 返却
 */
export const getAvailableDates = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { productIds } = req.query;

    if (!productIds || typeof productIds !== 'string') {
      return next(createError('商品IDが指定されていません', 400));
    }

    const productIdArray = productIds.split(',').filter((id) => id.trim());

    if (productIdArray.length === 0) {
      return next(createError('商品IDが指定されていません', 400));
    }

    // 商品情報を取得（配送設定を含む）
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIdArray },
      },
      select: {
        id: true,
        preparationDays: true,
        allowWeekendDelivery: true,
      },
    });

    if (products.length === 0) {
      return next(createError('商品が見つかりません', 404));
    }

    // 複数商品の場合、最大準備日数を計算
    const maxPreparationDays = Math.max(
      ...products.map((p) => p.preparationDays)
    );

    // 1つでも土日配送不可の商品があれば、全体を土日配送不可とする
    const allowWeekendDelivery = products.every((p) => p.allowWeekendDelivery);

    // 配送可能日を生成（今日 + preparationDays日後から30日分）
    const availableDates: string[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + maxPreparationDays);

    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      // 土日配送不可の場合は土日を除外
      if (!allowWeekendDelivery) {
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          continue; // 日曜(0)と土曜(6)をスキップ
        }
      }

      // ISO 8601形式（YYYY-MM-DD）で追加
      availableDates.push(date.toISOString().split('T')[0]);
    }

    res.json({
      success: true,
      data: {
        availableDates,
        minPreparationDays: maxPreparationDays,
        allowWeekendDelivery,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 配送時間帯取得
 * GET /api/shipping/time-slots
 *
 * ヤマト運輸の標準時間帯を返却
 */
export const getTimeSlots = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const timeSlots = [
      { value: '08:00-12:00', label: '午前中 (8:00-12:00)' },
      { value: '12:00-14:00', label: '12:00-14:00' },
      { value: '14:00-16:00', label: '14:00-16:00' },
      { value: '16:00-18:00', label: '16:00-18:00' },
      { value: '18:00-20:00', label: '18:00-20:00' },
      { value: '19:00-21:00', label: '19:00-21:00' },
    ];

    res.json({
      success: true,
      data: {
        timeSlots,
      },
    });
  } catch (error) {
    next(error);
  }
};

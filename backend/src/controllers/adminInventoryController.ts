// ===== 管理者用在庫管理コントローラー =====
// 目的: 在庫ログのCRUD操作（管理者専用）

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { createError } from '../middleware/errorHandler';

// ヘルパー関数: req.query/req.params の値を string | undefined に変換
const getStringParam = (value: any): string | undefined => {
  if (Array.isArray(value)) return value[0];
  if (typeof value === 'string') return value;
  return undefined;
};

/**
 * 在庫ログ一覧取得
 * GET /api/admin/inventory-logs
 * クエリパラメータ:
 *   - productId: 商品ID（オプション）
 *   - type: 在庫ログタイプ（オプション）
 *   - startDate: 開始日（オプション）
 *   - endDate: 終了日（オプション）
 *   - sortBy: ソート項目（createdAt, quantity）
 *   - sortOrder: ソート順序（asc, desc）
 *   - page: ページ番号（デフォルト: 1）
 *   - limit: 取得件数（デフォルト: 50）
 */
export const getInventoryLogs = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const {
      productId,
      type,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = '1',
      limit = '50',
    } = req.query;

    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);
    const offset = (pageNum - 1) * limitNum;

    // クエリ条件構築
    const where: any = {};

    if (productId) {
      where.productId = productId as string;
    }

    if (type) {
      where.type = type as string;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    // ソート設定
    const orderBy: any = {};
    orderBy[sortBy as string] = sortOrder as string;

    // 在庫ログ取得
    const [logs, total] = await Promise.all([
      prisma.inventoryLog.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy,
        take: limitNum,
        skip: offset,
      }),
      prisma.inventoryLog.count({ where }),
    ]);

    return res.json({
      success: true,
      logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasMore: offset + limitNum < total,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * 在庫ログ追加
 * POST /api/admin/inventory-logs
 * Body: { productId, quantity, type, note }
 */
export const createInventoryLog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, quantity, type = 'adjustment', note } = req.body;

    // バリデーション
    if (!productId) {
      return next(createError('商品IDは必須です', 400));
    }

    if (quantity === undefined || quantity === 0) {
      return next(createError('数量を指定してください（0以外）', 400));
    }

    // 商品存在チェック
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return next(createError('商品が見つかりません', 404));
    }

    // 在庫ログ作成
    const inventoryLog = await prisma.inventoryLog.create({
      data: {
        productId,
        quantity: parseInt(quantity, 10),
        type,
        note,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // 現在の在庫数を計算
    const inventorySum = await prisma.inventoryLog.aggregate({
      where: { productId },
      _sum: { quantity: true },
    });

    const currentStock = inventorySum._sum?.quantity || 0;

    return res.status(201).json({
      success: true,
      inventoryLog,
      currentStock,
      message: '在庫ログを追加しました',
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * 商品別在庫ログ取得
 * GET /api/admin/inventory-logs/:productId
 * クエリパラメータ:
 *   - limit: 取得件数（デフォルト: 50）
 *   - offset: オフセット（デフォルト: 0）
 */
export const getInventoryLogsByProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = getStringParam(req.params.productId);
    if (!productId) {
      return next(createError('商品IDが必要です', 400));
    }

    const limit = getStringParam(req.query.limit) || '50';
    const offset = getStringParam(req.query.offset) || '0';

    const limitNum = parseInt(limit, 10);
    const offsetNum = parseInt(offset, 10);

    // 商品存在チェック
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return next(createError('商品が見つかりません', 404));
    }

    // 在庫ログ取得
    const [logs, total] = await Promise.all([
      prisma.inventoryLog.findMany({
        where: { productId },
        orderBy: {
          createdAt: 'desc',
        },
        take: limitNum,
        skip: offsetNum,
      }),
      prisma.inventoryLog.count({ where: { productId } }),
    ]);

    // 現在の在庫数を計算
    const inventorySum = await prisma.inventoryLog.aggregate({
      where: { productId },
      _sum: { quantity: true },
    });

    const currentStock = inventorySum._sum?.quantity || 0;

    return res.json({
      success: true,
      logs,
      currentStock,
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
      },
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < total,
      },
    });
  } catch (error) {
    return next(error);
  }
};

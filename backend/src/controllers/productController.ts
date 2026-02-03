// ===== 商品コントローラー =====
// 目的: 商品一覧取得、商品詳細取得

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { createError } from '../middleware/errorHandler';

/**
 * 商品一覧取得
 * GET /api/products
 * クエリパラメータ:
 *   - categoryId: カテゴリーID（オプション）
 *   - search: 検索キーワード（オプション）
 *   - limit: 取得件数（デフォルト: 20）
 *   - offset: オフセット（デフォルト: 0）
 */
export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      categoryId,
      search,
      limit = '20',
      offset = '0',
    } = req.query;

    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);

    // クエリ条件構築
    const where: any = {
      isActive: true,
    };

    if (categoryId) {
      where.categoryId = categoryId as string;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // 商品取得
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limitNum,
        skip: offsetNum,
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      success: true,
      products,
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < total,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 商品詳細取得
 * GET /api/products/:id
 */
export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        inventoryLogs: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!product) {
      return next(createError('商品が見つかりません', 404));
    }

    if (!product.isActive) {
      return next(createError('この商品は現在取り扱っておりません', 404));
    }

    // 在庫数を計算（イミュータブルデータモデル）
    const inventorySum = await prisma.inventoryLog.aggregate({
      where: { productId: id },
      _sum: { quantity: true },
    });

    const currentStock = inventorySum._sum.quantity || 0;

    res.json({
      success: true,
      product: {
        ...product,
        currentStock,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 商品検索（オートコンプリート用）
 * GET /api/products/search
 */
export const searchProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, limit = '10' } = req.query;

    if (!q || (q as string).length < 2) {
      return res.json({
        success: true,
        products: [],
      });
    }

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q as string, mode: 'insensitive' } },
          { description: { contains: q as string, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        price: true,
        productType: true,
      },
      take: parseInt(limit as string, 10),
    });

    res.json({
      success: true,
      products,
    });
  } catch (error) {
    next(error);
  }
};

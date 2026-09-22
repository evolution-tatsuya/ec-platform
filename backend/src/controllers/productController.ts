// ===== 商品コントローラー =====
// 目的: 商品一覧取得、商品詳細取得

import { Request, Response, NextFunction } from 'express';

import { prisma } from '../config/prisma';
import { createError } from '../middleware/errorHandler';
import { buildProductImageList } from '../utils/productImageService';

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
          images: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limitNum,
        skip: offsetNum,
      }),
      prisma.product.count({ where }),
    ]);

    // 各商品の画像URL(order順)を付与
    const productsWithImages = await Promise.all(
      products.map(async (product) => {
        const productImages = await buildProductImageList(product.images);
        return {
          ...product,
          images: productImages.map((img) => img.detailUrl),
          productImages,
        };
      }),
    );

    return res.json({
      success: true,
      products: productsWithImages,
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

/**
 * サブスクプラン一覧取得（料金ページ用）
 * GET /api/products/subscription-plans
 * 公開中のサブスク商品を、上限・機能リスト・料金ページ表示フィールド付きで返す。
 */
export const getSubscriptionPlans = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true, productType: 'subscription' },
      orderBy: { price: 'asc' },
    });

    const plans = products.map((p) => {
      let features: string[] = [];
      if (p.planFeatures) {
        try {
          const parsed = JSON.parse(p.planFeatures);
          if (Array.isArray(parsed)) features = parsed;
        } catch {
          features = [];
        }
      }
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        billingType: p.billingType, // monthly | yearly | onetime
        maxParts: p.maxParts,
        maxImageMB: p.maxImageMB,
        maxUsers: p.maxUsers,
        unitLabel: p.unitLabel || 'パーツ',
        planTagline: p.planTagline || '',
        isPopular: p.isPopular,
        planFeatures: features,
        description: p.description || '',
      };
    });

    return res.json({ success: true, plans });
  } catch (error) {
    return next(error);
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
      where: { id: typeof id === 'string' ? id : id[0] },
      include: {
        category: true,
        images: true,
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
      where: { productId: typeof id === 'string' ? id : id[0] },
      _sum: { quantity: true },
    });

    const currentStock = inventorySum._sum?.quantity || 0;
    const productImages = await buildProductImageList(product.images);

    return res.json({
      success: true,
      product: {
        ...product,
        images: productImages.map((img) => img.detailUrl),
        productImages,
        currentStock,
      },
    });
  } catch (error) {
    return next(error);
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

    return res.json({
      success: true,
      products,
    });
  } catch (error) {
    return next(error);
  }
};

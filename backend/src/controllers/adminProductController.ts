// ===== 管理者用商品コントローラー =====
// 目的: 商品のCRUD操作、在庫管理（管理者専用）

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { createError } from '../middleware/errorHandler';

/**
 * 管理者用商品一覧取得
 * GET /api/admin/products
 * クエリパラメータ:
 *   - categoryId: カテゴリーID（オプション）
 *   - productType: 商品タイプ（オプション）
 *   - isActive: アクティブ状態（オプション）
 *   - search: 検索キーワード（オプション）
 *   - sortBy: ソート項目（createdAt, name, price）
 *   - sortOrder: ソート順序（asc, desc）
 *   - page: ページ番号（デフォルト: 1）
 *   - limit: 取得件数（デフォルト: 20）
 */
export const getAdminProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      categoryId,
      productType,
      isActive,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = '1',
      limit = '20',
    } = req.query;

    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);
    const offset = (pageNum - 1) * limitNum;

    // クエリ条件構築（管理者は全商品を閲覧可能）
    const where: any = {};

    if (categoryId) {
      where.categoryId = categoryId as string;
    }

    if (productType) {
      where.productType = productType as string;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { slug: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // ソート設定
    const orderBy: any = {};
    orderBy[sortBy as string] = sortOrder as string;

    // 商品取得
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
        },
        orderBy,
        take: limitNum,
        skip: offset,
      }),
      prisma.product.count({ where }),
    ]);

    // 各商品の在庫数を計算
    const productsWithStock = await Promise.all(
      products.map(async (product) => {
        const inventorySum = await prisma.inventoryLog.aggregate({
          where: { productId: product.id },
          _sum: { quantity: true },
        });
        return {
          ...product,
          currentStock: inventorySum._sum.quantity || 0,
        };
      })
    );

    res.json({
      success: true,
      products: productsWithStock,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasMore: offset + limitNum < total,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 商品登録
 * POST /api/admin/products
 * Body: { name, slug, description, price, categoryId, productType, preparationDays, allowWeekendDelivery, initialStock }
 */
export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      slug,
      description,
      price,
      categoryId,
      productType,
      preparationDays = 3,
      allowWeekendDelivery = true,
      initialStock = 0,
    } = req.body;

    // バリデーション
    if (!name || !slug || !categoryId || !productType) {
      return next(createError('必須項目が不足しています', 400));
    }

    if (price < 0) {
      return next(createError('価格は0以上である必要があります', 400));
    }

    // スラッグ重複チェック
    const existingProduct = await prisma.product.findUnique({
      where: { slug },
    });

    if (existingProduct) {
      return next(createError('このスラッグは既に使用されています', 400));
    }

    // カテゴリー存在チェック
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return next(createError('指定されたカテゴリーが存在しません', 404));
    }

    // トランザクション処理
    const product = await prisma.$transaction(async (tx) => {
      // 商品作成
      const newProduct = await tx.product.create({
        data: {
          name,
          slug,
          description,
          price: parseInt(price, 10),
          categoryId,
          productType,
          preparationDays: parseInt(preparationDays, 10),
          allowWeekendDelivery,
          isActive: true,
        },
        include: {
          category: true,
        },
      });

      // 初期在庫がある場合、在庫ログ作成
      if (initialStock > 0) {
        await tx.inventoryLog.create({
          data: {
            productId: newProduct.id,
            quantity: parseInt(initialStock, 10),
            type: 'purchase',
            note: '初期在庫登録',
          },
        });
      }

      return newProduct;
    });

    res.status(201).json({
      success: true,
      product,
      message: '商品を登録しました',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 商品更新
 * PUT /api/admin/products/:id
 * Body: { name, slug, description, price, categoryId, productType, preparationDays, allowWeekendDelivery, isActive }
 */
export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      name,
      slug,
      description,
      price,
      categoryId,
      productType,
      preparationDays,
      allowWeekendDelivery,
      isActive,
    } = req.body;

    // 商品存在チェック
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return next(createError('商品が見つかりません', 404));
    }

    // スラッグ重複チェック（自分以外）
    if (slug && slug !== existingProduct.slug) {
      const duplicateSlug = await prisma.product.findUnique({
        where: { slug },
      });

      if (duplicateSlug) {
        return next(createError('このスラッグは既に使用されています', 400));
      }
    }

    // カテゴリー存在チェック
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        return next(createError('指定されたカテゴリーが存在しません', 404));
      }
    }

    // 商品更新
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: parseInt(price, 10) }),
        ...(categoryId && { categoryId }),
        ...(productType && { productType }),
        ...(preparationDays !== undefined && { preparationDays: parseInt(preparationDays, 10) }),
        ...(allowWeekendDelivery !== undefined && { allowWeekendDelivery }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        category: true,
      },
    });

    // 在庫数を計算
    const inventorySum = await prisma.inventoryLog.aggregate({
      where: { productId: id },
      _sum: { quantity: true },
    });

    res.json({
      success: true,
      product: {
        ...updatedProduct,
        currentStock: inventorySum._sum.quantity || 0,
      },
      message: '商品を更新しました',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 商品削除
 * DELETE /api/admin/products/:id
 * ※物理削除ではなく論理削除（isActive = false）
 */
export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // 商品存在チェック
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return next(createError('商品が見つかりません', 404));
    }

    // 注文に紐づいているかチェック
    const orderItemsCount = await prisma.orderItem.count({
      where: { productId: id },
    });

    if (orderItemsCount > 0) {
      // 注文に紐づいている場合は論理削除のみ
      const updatedProduct = await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });

      return res.json({
        success: true,
        product: updatedProduct,
        message: '商品を非公開にしました（注文履歴に紐づいているため物理削除できません）',
      });
    }

    // 注文に紐づいていない場合は物理削除も可能
    // ここでは論理削除のみ実装
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      product: updatedProduct,
      message: '商品を削除しました',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 在庫調整
 * POST /api/admin/products/:id/inventory
 * Body: { quantity, type, note }
 */
export const adjustInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { quantity, type = 'adjustment', note } = req.body;

    // バリデーション
    if (quantity === undefined || quantity === 0) {
      return next(createError('数量を指定してください', 400));
    }

    // 商品存在チェック
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return next(createError('商品が見つかりません', 404));
    }

    // 在庫ログ作成
    const inventoryLog = await prisma.inventoryLog.create({
      data: {
        productId: id,
        quantity: parseInt(quantity, 10),
        type,
        note,
      },
    });

    // 現在の在庫数を計算
    const inventorySum = await prisma.inventoryLog.aggregate({
      where: { productId: id },
      _sum: { quantity: true },
    });

    const currentStock = inventorySum._sum.quantity || 0;

    res.json({
      success: true,
      inventoryLog,
      currentStock,
      message: '在庫を調整しました',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 在庫ログ取得
 * GET /api/admin/products/:id/inventory-logs
 * クエリパラメータ:
 *   - limit: 取得件数（デフォルト: 50）
 *   - offset: オフセット（デフォルト: 0）
 */
export const getInventoryLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { limit = '50', offset = '0' } = req.query;

    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);

    // 商品存在チェック
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return next(createError('商品が見つかりません', 404));
    }

    // 在庫ログ取得
    const [logs, total] = await Promise.all([
      prisma.inventoryLog.findMany({
        where: { productId: id },
        orderBy: {
          createdAt: 'desc',
        },
        take: limitNum,
        skip: offsetNum,
      }),
      prisma.inventoryLog.count({ where: { productId: id } }),
    ]);

    // 現在の在庫数を計算
    const inventorySum = await prisma.inventoryLog.aggregate({
      where: { productId: id },
      _sum: { quantity: true },
    });

    const currentStock = inventorySum._sum.quantity || 0;

    res.json({
      success: true,
      logs,
      currentStock,
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

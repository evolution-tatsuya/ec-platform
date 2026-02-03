// ===== カテゴリーコントローラー =====
// 目的: カテゴリー一覧取得、カテゴリー階層取得

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { createError } from '../middleware/errorHandler';

/**
 * カテゴリー一覧取得
 * GET /api/categories
 * クエリパラメータ:
 *   - includeChildren: 子カテゴリーを含めるか（デフォルト: false）
 */
export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { includeChildren } = req.query;

    const categories = await prisma.category.findMany({
      include: {
        children: includeChildren === 'true',
        products: {
          where: { isActive: true },
          select: { id: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // 商品数を集計
    const categoriesWithCount = categories.map((category) => ({
      ...category,
      productCount: category.products.length,
      products: undefined, // productsは商品数のカウントのみに使用
    }));

    res.json({
      success: true,
      categories: categoriesWithCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * カテゴリー詳細取得
 * GET /api/categories/:id
 */
export const getCategoryById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        products: {
          where: { isActive: true },
          include: {
            category: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!category) {
      return next(createError('カテゴリーが見つかりません', 404));
    }

    res.json({
      success: true,
      category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * カテゴリー階層取得（ツリー構造）
 * GET /api/categories/tree
 */
export const getCategoryTree = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // ルートカテゴリー（親がないもの）を取得
    const rootCategories = await prisma.category.findMany({
      where: {
        parentId: null,
      },
      include: {
        children: {
          include: {
            children: {
              include: {
                children: true, // 3階層まで取得
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json({
      success: true,
      tree: rootCategories,
    });
  } catch (error) {
    next(error);
  }
};

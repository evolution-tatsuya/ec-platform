/**
 * 管理者向けお気に入りコントローラー
 * 全ユーザーのお気に入り情報を取得・管理
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 全ユーザーのお気に入り一覧を取得
 * GET /api/admin/favorites
 */
export const getAllFavorites = async (req: Request, res: Response) => {
  try {
    const favorites = await prisma.favorite.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        product: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(favorites);
  } catch (error) {
    console.error('全お気に入り一覧取得エラー:', error);
    res.status(500).json({ message: '全お気に入り一覧の取得に失敗しました' });
  }
};

/**
 * 特定ユーザーのお気に入り一覧を取得
 * GET /api/admin/favorites/user/:userId
 */
export const getUserFavorites = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        product: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(favorites);
  } catch (error) {
    console.error('ユーザーお気に入り一覧取得エラー:', error);
    res.status(500).json({ message: 'ユーザーお気に入り一覧の取得に失敗しました' });
  }
};

/**
 * お気に入り統計情報を取得
 * GET /api/admin/favorites/stats
 */
export const getFavoriteStats = async (req: Request, res: Response) => {
  try {
    // 総お気に入り数
    const totalFavorites = await prisma.favorite.count();

    // お気に入りしているユーザー数
    const uniqueUsers = await prisma.favorite.groupBy({
      by: ['userId'],
    });
    const uniqueUserCount = uniqueUsers.length;

    // 最も人気の商品TOP10
    const popularProducts = await prisma.favorite.groupBy({
      by: ['productId'],
      _count: {
        productId: true,
      },
      orderBy: {
        _count: {
          productId: 'desc',
        },
      },
      take: 10,
    });

    // 商品情報を取得
    const productDetails = await Promise.all(
      popularProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });
        return {
          product,
          favoriteCount: item._count.productId,
        };
      })
    );

    res.json({
      totalFavorites,
      uniqueUserCount,
      popularProducts: productDetails,
    });
  } catch (error) {
    console.error('お気に入り統計取得エラー:', error);
    res.status(500).json({ message: 'お気に入り統計の取得に失敗しました' });
  }
};

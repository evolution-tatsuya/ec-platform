/**
 * お気に入りコントローラー
 * 顧客向けのお気に入り機能API
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * ログインユーザーのお気に入り一覧を取得
 * GET /api/favorites
 */
export const getFavorites = async (req: Request, res: Response) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: '認証が必要です' });
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId: req.session.userId },
      include: {
        product: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(favorites);
  } catch (error) {
    console.error('お気に入り一覧取得エラー:', error);
    res.status(500).json({ message: 'お気に入り一覧の取得に失敗しました' });
  }
};

/**
 * お気に入り追加
 * POST /api/favorites
 */
export const addFavorite = async (req: Request, res: Response) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: '認証が必要です' });
    }

    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ message: '商品IDが必要です' });
    }

    // 商品の存在確認
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ message: '商品が見つかりません' });
    }

    // 既にお気に入りに追加されているかチェック
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId: req.session.userId,
          productId,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ message: '既にお気に入りに追加されています' });
    }

    // お気に入り追加
    const favorite = await prisma.favorite.create({
      data: {
        userId: req.session.userId,
        productId,
      },
      include: {
        product: true,
      },
    });

    res.status(201).json(favorite);
  } catch (error) {
    console.error('お気に入り追加エラー:', error);
    res.status(500).json({ message: 'お気に入りの追加に失敗しました' });
  }
};

/**
 * お気に入り削除
 * DELETE /api/favorites/:productId
 */
export const removeFavorite = async (req: Request, res: Response) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: '認証が必要です' });
    }

    const { productId } = req.params;

    // お気に入りの存在確認
    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId: req.session.userId,
          productId,
        },
      },
    });

    if (!favorite) {
      return res.status(404).json({ message: 'お気に入りが見つかりません' });
    }

    // お気に入り削除
    await prisma.favorite.delete({
      where: {
        userId_productId: {
          userId: req.session.userId,
          productId,
        },
      },
    });

    res.json({ message: 'お気に入りから削除しました' });
  } catch (error) {
    console.error('お気に入り削除エラー:', error);
    res.status(500).json({ message: 'お気に入りの削除に失敗しました' });
  }
};

/**
 * 特定商品がお気に入りに入っているかチェック
 * GET /api/favorites/check/:productId
 */
export const checkFavorite = async (req: Request, res: Response) => {
  try {
    if (!req.session.userId) {
      return res.json({ isFavorite: false });
    }

    const { productId } = req.params;

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId: req.session.userId,
          productId,
        },
      },
    });

    res.json({ isFavorite: !!favorite });
  } catch (error) {
    console.error('お気に入りチェックエラー:', error);
    res.status(500).json({ message: 'お気に入りチェックに失敗しました' });
  }
};

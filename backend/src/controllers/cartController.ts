import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { createError } from '../middleware/errorHandler';

/**
 * POST /api/cart
 * カートに商品を追加
 * 認証必須
 */
export const addToCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return next(createError('ログインが必要です', 401));
    }

    const { productId, quantity } = req.body;

    if (!productId || !quantity || quantity < 1) {
      return next(createError('商品IDと数量が必要です', 400));
    }

    // 商品の存在確認と在庫チェック
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.isActive) {
      return next(createError('商品が見つかりません', 404));
    }

    // サブスク商品は在庫の概念がないため在庫チェックをスキップ
    const isSubscription = product.productType === 'subscription';

    // 在庫チェック（イミュータブルデータモデル）
    const inventorySum = await prisma.inventoryLog.aggregate({
      where: { productId },
      _sum: { quantity: true },
    });
    const currentStock = inventorySum._sum?.quantity || 0;

    if (!isSubscription && currentStock < quantity) {
      return next(createError('在庫が不足しています', 400));
    }

    // カート取得または作成
    let cart = await prisma.cart.findFirst({
      where: { userId },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
      });
    }

    // 排他カート: サブスク商品と物販商品は同一カートに共存できない。
    // (決済・配送・契約管理の性質が異なり、将来のStripeサブスク決済とも両立しないため)
    const otherItems = await prisma.cartItem.findMany({
      where: { cartId: cart.id, productId: { not: productId } },
      include: { product: { select: { productType: true } } },
    });
    const cartHasSubscription = otherItems.some(
      (it) => it.product.productType === 'subscription'
    );
    const cartHasNonSubscription = otherItems.some(
      (it) => it.product.productType !== 'subscription'
    );
    if (isSubscription && cartHasNonSubscription) {
      return next(
        createError(
          'サブスク商品は単独でご購入ください。カート内の他の商品と一緒には購入できません。',
          400
        )
      );
    }
    if (!isSubscription && cartHasSubscription) {
      return next(
        createError(
          'カートにサブスク商品が入っています。サブスク商品は単独購入のため、他の商品と一緒には追加できません。',
          400
        )
      );
    }

    // サブスク商品は数量1固定（同一契約を複数個購入する概念がないため）
    if (isSubscription && quantity > 1) {
      return next(createError('サブスク商品は1点のみご購入いただけます。', 400));
    }

    // カートアイテムの追加または数量更新
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
    });

    let cartItem;
    if (existingItem) {
      // サブスク商品は数量1固定。既にカートにあれば1のまま（重複追加で増やさない）。
      const newQuantity = isSubscription ? 1 : existingItem.quantity + quantity;

      // 更新後の在庫チェック（サブスクはスキップ）
      if (!isSubscription && currentStock < newQuantity) {
        return next(createError('在庫が不足しています', 400));
      }

      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      });
    } else {
      // 新規アイテムを追加
      cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
        },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      });
    }

    return res.json({
      success: true,
      message: 'カートに追加しました',
      cartItem,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/cart
 * カート内容を取得
 * 認証必須
 */
export const getCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return next(createError('ログインが必要です', 401));
    }

    // カート取得
    const cart = await prisma.cart.findFirst({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    // カートが存在しない場合は空カートを返す
    if (!cart) {
      return res.json({
        success: true,
        cart: {
          items: [],
          totalAmount: 0,
          totalItems: 0,
        },
      });
    }

    // 各アイテムの在庫チェックと小計計算
    const itemsWithStock = await Promise.all(
      cart.items.map(async (item) => {
        const inventorySum = await prisma.inventoryLog.aggregate({
          where: { productId: item.productId },
          _sum: { quantity: true },
        });
        const currentStock = inventorySum._sum?.quantity || 0;

        return {
          ...item,
          currentStock,
          subtotal: item.product.price * item.quantity,
        };
      })
    );

    // 合計金額と合計アイテム数を計算
    const totalAmount = itemsWithStock.reduce((sum, item) => sum + item.subtotal, 0);
    const totalItems = itemsWithStock.reduce((sum, item) => sum + item.quantity, 0);

    return res.json({
      success: true,
      cart: {
        id: cart.id,
        items: itemsWithStock,
        totalAmount,
        totalItems,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /api/cart/:itemId
 * カートアイテムの数量を更新
 * 認証必須
 */
export const updateCartItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return next(createError('ログインが必要です', 401));
    }

    const itemId = req.params.itemId as string;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return next(createError('数量は1以上である必要があります', 400));
    }

    // カートアイテムの存在確認と所有権チェック
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true,
        product: true,
      },
    });

    if (!cartItem) {
      return next(createError('カートアイテムが見つかりません', 404));
    }

    if (cartItem.cart.userId !== userId) {
      return next(createError('このカートアイテムにアクセスする権限がありません', 403));
    }

    // サブスク商品は数量1固定
    if (cartItem.product.productType === 'subscription' && quantity > 1) {
      return next(createError('サブスク商品は1点のみご購入いただけます。', 400));
    }

    // 在庫チェック（サブスク商品は在庫の概念がないためスキップ）
    const inventorySum = await prisma.inventoryLog.aggregate({
      where: { productId: cartItem.productId },
      _sum: { quantity: true },
    });
    const currentStock = inventorySum._sum?.quantity || 0;

    if (cartItem.product.productType !== 'subscription' && currentStock < quantity) {
      return next(createError('在庫が不足しています', 400));
    }

    // 数量更新
    const updatedItem = await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      message: 'カートを更新しました',
      cartItem: {
        ...updatedItem,
        currentStock,
        subtotal: updatedItem.product.price * updatedItem.quantity,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/cart/:itemId
 * カートアイテムを削除
 * 認証必須
 */
export const removeFromCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return next(createError('ログインが必要です', 401));
    }

    const itemId = req.params.itemId as string;

    // カートアイテムの存在確認と所有権チェック
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true,
      },
    });

    if (!cartItem) {
      return next(createError('カートアイテムが見つかりません', 404));
    }

    if (cartItem.cart.userId !== userId) {
      return next(createError('このカートアイテムにアクセスする権限がありません', 403));
    }

    // 削除
    await prisma.cartItem.delete({
      where: { id: itemId },
    });

    return res.json({
      success: true,
      message: 'カートから削除しました',
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/cart
 * カートを全てクリア
 * 認証必須
 */
export const clearCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return next(createError('ログインが必要です', 401));
    }

    // カート取得
    const cart = await prisma.cart.findFirst({
      where: { userId },
    });

    if (!cart) {
      return res.json({
        success: true,
        message: 'カートは既に空です',
      });
    }

    // カート内の全アイテムを削除（Cascadeで自動削除されるが、明示的に削除）
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return res.json({
      success: true,
      message: 'カートをクリアしました',
    });
  } catch (error) {
    return next(error);
  }
};

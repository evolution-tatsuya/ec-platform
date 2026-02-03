/**
 * 注文コントローラー
 *
 * 機能:
 * - 注文作成（カートから注文への変換）
 * - 在庫チェック・減算（トランザクション）
 * - 注文一覧取得
 * - 注文詳細取得
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  generateInvoicePDF,
  generateReceiptPDF,
  generateShippingLabelPDF,
} from '../utils/pdfGenerator';

const prisma = new PrismaClient();

/**
 * 注文番号を生成
 * 形式: ORD-YYYYMMDD-XXXXX（例: ORD-20250127-00001）
 */
function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
  return `ORD-${year}${month}${day}-${random}`;
}

/**
 * 在庫数を取得（InventoryLogの合計）
 */
async function getStockQuantity(
  productId: string,
  tx?: any
): Promise<number> {
  const client = tx || prisma;
  const result = await client.inventoryLog.aggregate({
    where: { productId },
    _sum: { quantity: true },
  });
  return result._sum.quantity || 0;
}

/**
 * POST /api/orders
 * 注文作成（カートから注文を作成し、在庫を減算）
 */
export async function createOrder(req: Request, res: Response) {
  try {
    // 認証チェック
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'ログインが必要です',
      });
    }

    const userId = req.session.userId;
    const {
      paymentMethod,
      shippingAddress,
    }: {
      paymentMethod: 'bank_transfer' | 'credit_card' | 'paypay';
      shippingAddress: string;
    } = req.body;

    // バリデーション
    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: '決済方法を選択してください',
      });
    }

    if (!shippingAddress) {
      return res.status(400).json({
        success: false,
        message: '配送先住所を入力してください',
      });
    }

    // トランザクション開始
    const order = await prisma.$transaction(async (tx) => {
      // 1. カートを取得
      const cart = await tx.cart.findFirst({
        where: { userId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new Error('カートが空です');
      }

      // 2. 在庫チェック
      for (const item of cart.items) {
        const stockQuantity = await getStockQuantity(item.productId, tx);

        if (stockQuantity < item.quantity) {
          throw new Error(
            `${item.product.name} の在庫が不足しています（在庫: ${stockQuantity}個、注文: ${item.quantity}個）`
          );
        }
      }

      // 3. 合計金額を計算
      let totalAmount = 0;
      for (const item of cart.items) {
        totalAmount += item.product.price * item.quantity;
      }

      // 銀行振込の場合は3.6%割引
      if (paymentMethod === 'bank_transfer') {
        totalAmount = Math.floor(totalAmount * 0.964);
      }

      // 4. 注文番号を生成（ユニークになるまでリトライ）
      let orderNumber: string;
      let attempts = 0;
      const MAX_ATTEMPTS = 10;

      while (attempts < MAX_ATTEMPTS) {
        orderNumber = generateOrderNumber();
        const existing = await tx.order.findUnique({
          where: { orderNumber },
        });

        if (!existing) {
          break;
        }
        attempts++;
      }

      if (attempts >= MAX_ATTEMPTS) {
        throw new Error('注文番号の生成に失敗しました');
      }

      // 5. 注文を作成
      const newOrder = await tx.order.create({
        data: {
          orderNumber: orderNumber!,
          userId,
          status: paymentMethod === 'bank_transfer' ? 'pending' : 'paid',
          paymentMethod,
          totalAmount,
          shippingAddress,
        },
      });

      // 6. 注文アイテムを作成 & 在庫を減算
      for (const item of cart.items) {
        // 注文アイテム作成
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price,
          },
        });

        // 在庫減算ログを作成
        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            quantity: -item.quantity,
            type: 'sale',
            note: `注文番号: ${orderNumber}`,
          },
        });
      }

      // 7. カートをクリア
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      // 8. 作成した注文を詳細情報付きで取得
      return await tx.order.findUnique({
        where: { id: newOrder.id },
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
    });

    return res.status(201).json({
      success: true,
      message: '注文を作成しました',
      order,
    });
  } catch (error: any) {
    console.error('注文作成エラー:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '注文の作成に失敗しました',
    });
  }
}

/**
 * GET /api/orders
 * 注文一覧取得（ログインユーザーの注文のみ）
 */
export async function getOrders(req: Request, res: Response) {
  try {
    // 認証チェック
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'ログインが必要です',
      });
    }

    const userId = req.session.userId;

    const orders = await prisma.order.findMany({
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.json({
      success: true,
      orders,
    });
  } catch (error: any) {
    console.error('注文一覧取得エラー:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '注文一覧の取得に失敗しました',
    });
  }
}

/**
 * GET /api/orders/:orderNumber
 * 注文詳細取得（注文番号で取得）
 */
export async function getOrderByOrderNumber(req: Request, res: Response) {
  try {
    // 認証チェック
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'ログインが必要です',
      });
    }

    const userId = req.session.userId;
    const { orderNumber } = req.params;

    const order = await prisma.order.findFirst({
      where: {
        orderNumber,
        userId, // 自分の注文のみ取得
      },
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

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '注文が見つかりません',
      });
    }

    return res.json({
      success: true,
      order,
    });
  } catch (error: any) {
    console.error('注文詳細取得エラー:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '注文詳細の取得に失敗しました',
    });
  }
}

/**
 * POST /api/admin/orders/:orderNumber/checkin
 * 注文受付処理（管理者専用）
 */
export async function checkinOrder(req: Request, res: Response) {
  try {
    // 認証不要（QRスキャナーページからのアクセスを許可）
    // セッションがあればユーザー情報を取得（オプション）
    let userId: string | undefined = undefined;
    if (req.session.userId) {
      const user = await prisma.user.findUnique({
        where: { id: req.session.userId },
      });
      if (user) {
        userId = user.id;
      }
    }

    const { orderNumber } = req.params;

    // 注文を取得
    const order = await prisma.order.findUnique({
      where: { orderNumber },
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

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '注文が見つかりません',
      });
    }

    // 既に受付済みかチェック
    if (order.checkedIn) {
      // 受付済みでも詳細を返す（何度でも確認可能）
      return res.json({
        success: true,
        message: 'この注文は既に受付済みです',
        alreadyCheckedIn: true, // 既に受付済みフラグ
        order,
      });
    }

    // 受付処理
    const updatedOrder = await prisma.order.update({
      where: { orderNumber },
      data: {
        checkedIn: true,
        checkedInAt: new Date(),
        checkedInBy: userId, // セッションがあれば記録、なければnull
      },
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

    return res.json({
      success: true,
      message: '受付処理が完了しました',
      alreadyCheckedIn: false, // 新規受付
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error('受付処理エラー:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '受付処理に失敗しました',
    });
  }
}

/**
 * POST /api/orders/:orderId/reorder
 * 再注文機能（過去の注文をカートに追加）
 */
export async function reorder(req: Request, res: Response) {
  try {
    // 認証チェック
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'ログインが必要です',
      });
    }

    const userId = req.session.userId;
    const { orderId } = req.params;

    // 注文を取得（自分の注文のみ）
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '注文が見つかりません',
      });
    }

    // カートを取得または作成
    let cart = await prisma.cart.findFirst({
      where: { userId },
      include: {
        items: true,
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId,
        },
        include: {
          items: true,
        },
      });
    }

    // 在庫チェックと追加
    const addedItems: string[] = [];
    const outOfStockItems: string[] = [];

    for (const orderItem of order.items) {
      // 商品が削除されていないか確認
      const product = await prisma.product.findUnique({
        where: { id: orderItem.productId },
      });

      if (!product || !product.isActive) {
        outOfStockItems.push(orderItem.product.name);
        continue;
      }

      // 在庫確認
      const stockQuantity = await getStockQuantity(orderItem.productId);
      if (stockQuantity < orderItem.quantity) {
        outOfStockItems.push(
          `${orderItem.product.name}（在庫不足: 在庫${stockQuantity}個）`
        );
        continue;
      }

      // カートに追加（既存の商品があれば数量を追加）
      const existingCartItem = await prisma.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId: orderItem.productId,
        },
      });

      if (existingCartItem) {
        await prisma.cartItem.update({
          where: { id: existingCartItem.id },
          data: {
            quantity: existingCartItem.quantity + orderItem.quantity,
          },
        });
      } else {
        await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId: orderItem.productId,
            quantity: orderItem.quantity,
          },
        });
      }

      addedItems.push(orderItem.product.name);
    }

    // 結果を取得
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      message:
        outOfStockItems.length > 0
          ? `一部の商品をカートに追加できませんでした: ${outOfStockItems.join(', ')}`
          : 'カートに商品を追加しました',
      cart: updatedCart,
      addedItems,
      outOfStockItems,
    });
  } catch (error: any) {
    console.error('再注文エラー:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '再注文の処理に失敗しました',
    });
  }
}

// ===== 管理者用エンドポイント =====

/**
 * GET /api/admin/orders
 * 注文一覧取得（管理者専用、全注文を取得）
 */
export async function adminGetOrders(req: Request, res: Response) {
  try {
    const {
      status,
      paymentMethod,
      startDate,
      endDate,
      search,
    }: {
      status?: string;
      paymentMethod?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
    } = req.query;

    // フィルター条件を構築
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.json({
      success: true,
      orders,
    });
  } catch (error: any) {
    console.error('注文一覧取得エラー（管理者）:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '注文一覧の取得に失敗しました',
    });
  }
}

/**
 * GET /api/admin/orders/:id
 * 注文詳細取得（管理者専用）
 */
export async function adminGetOrderById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
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

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '注文が見つかりません',
      });
    }

    return res.json({
      success: true,
      order,
    });
  } catch (error: any) {
    console.error('注文詳細取得エラー（管理者）:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '注文詳細の取得に失敗しました',
    });
  }
}

/**
 * PUT /api/admin/orders/:id/ship
 * 発送処理（管理者専用）
 */
export async function shipOrder(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      carrier,
      trackingNumber,
    }: {
      carrier: 'yamato' | 'sagawa' | 'japan_post';
      trackingNumber: string;
    } = req.body;

    // バリデーション
    if (!carrier) {
      return res.status(400).json({
        success: false,
        message: '配送業者を選択してください',
      });
    }

    if (!trackingNumber) {
      return res.status(400).json({
        success: false,
        message: '追跡番号を入力してください',
      });
    }

    // 注文を取得
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '注文が見つかりません',
      });
    }

    // ステータスチェック
    if (order.status !== 'paid' && order.status !== 'preparing') {
      return res.status(400).json({
        success: false,
        message: `この注文は発送できません（現在のステータス: ${order.status}）`,
      });
    }

    // 発送処理
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'shipped',
        carrier,
        trackingNumber,
        shippedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
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

    // TODO: 発送完了メールを送信（Resend SDK使用）
    // await sendShippingNotificationEmail(updatedOrder);

    return res.json({
      success: true,
      message: '発送処理が完了しました',
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error('発送処理エラー:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '発送処理に失敗しました',
    });
  }
}

/**
 * PUT /api/admin/orders/:id/cancel
 * キャンセル処理（管理者専用）
 */
export async function cancelOrder(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { cancelReason }: { cancelReason: string } = req.body;

    // バリデーション
    if (!cancelReason) {
      return res.status(400).json({
        success: false,
        message: 'キャンセル理由を入力してください',
      });
    }

    // トランザクション開始
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 注文を取得
      const order = await tx.order.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!order) {
        throw new Error('注文が見つかりません');
      }

      // ステータスチェック
      if (order.status === 'cancelled') {
        throw new Error('この注文は既にキャンセル済みです');
      }

      if (order.status === 'shipped' || order.status === 'completed') {
        throw new Error(
          `発送済み・完了済みの注文はキャンセルできません（現在のステータス: ${order.status}）`
        );
      }

      // 在庫を復元
      for (const item of order.items) {
        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            quantity: item.quantity, // 正数で復元
            type: 'return',
            note: `注文キャンセル: ${order.orderNumber}`,
          },
        });
      }

      // 注文をキャンセル
      return await tx.order.update({
        where: { id },
        data: {
          status: 'cancelled',
          cancelReason,
          cancelledAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
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
    });

    // TODO: キャンセル通知メールを送信（Resend SDK使用）
    // await sendCancellationNotificationEmail(updatedOrder);

    return res.json({
      success: true,
      message: '注文をキャンセルしました（在庫を復元しました）',
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error('キャンセル処理エラー:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'キャンセル処理に失敗しました',
    });
  }
}

/**
 * GET /api/admin/orders/:id/invoice
 * 納品書PDF生成（管理者専用）
 */
export async function generateInvoice(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '注文が見つかりません',
      });
    }

    // PDF生成
    const pdfBytes = await generateInvoicePDF({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      shippingAddress: order.shippingAddress,
      shippingPostalCode: order.shippingPostalCode,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        productName: item.product.name,
        quantity: item.quantity,
        price: item.price,
      })),
      totalAmount: order.totalAmount,
    });

    // PDFをレスポンスとして返す
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice-${order.orderNumber}.pdf"`
    );
    res.send(Buffer.from(pdfBytes));
  } catch (error: any) {
    console.error('納品書生成エラー:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '納品書の生成に失敗しました',
    });
  }
}

/**
 * GET /api/admin/orders/:id/receipt
 * 領収書PDF生成（管理者専用）
 */
export async function generateReceipt(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '注文が見つかりません',
      });
    }

    // PDF生成
    const pdfBytes = await generateReceiptPDF({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      paymentMethod: order.paymentMethod,
    });

    // PDFをレスポンスとして返す
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="receipt-${order.orderNumber}.pdf"`
    );
    res.send(Buffer.from(pdfBytes));
  } catch (error: any) {
    console.error('領収書生成エラー:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '領収書の生成に失敗しました',
    });
  }
}

/**
 * GET /api/admin/orders/:id/shipping-label
 * 送り状PDF生成（管理者専用）
 */
export async function generateShippingLabel(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '注文が見つかりません',
      });
    }

    // PDF生成
    const pdfBytes = await generateShippingLabelPDF({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      shippingAddress: order.shippingAddress,
      shippingPostalCode: order.shippingPostalCode,
      carrier: order.carrier,
      trackingNumber: order.trackingNumber,
    });

    // PDFをレスポンスとして返す
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="shipping-label-${order.orderNumber}.pdf"`
    );
    res.send(Buffer.from(pdfBytes));
  } catch (error: any) {
    console.error('送り状生成エラー:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '送り状の生成に失敗しました',
    });
  }
}

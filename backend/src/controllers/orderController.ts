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

/**
 * ヘルパー関数: クエリパラメータからstring型を取得
 */
const getStringParam = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) return value[0];
  return value;
};

import { PrismaClient } from '@prisma/client';
import {
  generateInvoicePDF,
  generateReceiptPDF,
  generateShippingLabelPDF,
  generateQuotePDF,
} from '../utils/pdfGenerator';
import {
  sendShippingNotificationEmail,
  sendCancellationNotificationEmail,
  sendGenericEmail,
  renderTemplate,
} from '../utils/emailService';
import {
  provisionTenant,
  reactivateTenant,
} from '../services/inventoryProvisionService';

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
 * サブスク契約の次回請求予定日を算出（手動請求の目安）
 * monthly: 1ヶ月後 / yearly: 1年後 / onetime(買い切り): null
 */
function calcNextBillingDate(billingType: string): Date | null {
  if (billingType === 'onetime') return null;
  const next = new Date();
  if (billingType === 'monthly') {
    next.setMonth(next.getMonth() + 1);
  } else if (billingType === 'yearly') {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    return null;
  }
  return next;
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
  return result._sum?.quantity || 0;
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
      paymentMethod: rawPaymentMethod,
      shippingAddress,
      subscriptionInheritance,
    }: {
      paymentMethod: string;
      shippingAddress: string;
      // 再購入時の商品別「引き継ぐ/新規」選択。mode='inherit'の商品は
      // 旧cancelled契約の注文番号を inheritFromOrderId に記録し、発行時にreactivateする。
      subscriptionInheritance?: { productId: string; mode: 'inherit' | 'new' }[];
    } = req.body;

    // 引き継ぎ希望の商品IDセット（'inherit'のみ）。未指定は新規扱い。
    const inheritProductIds = new Set(
      (subscriptionInheritance || [])
        .filter((s) => s && s.mode === 'inherit' && s.productId)
        .map((s) => s.productId)
    );

    // バリデーション
    if (!rawPaymentMethod) {
      return res.status(400).json({
        success: false,
        message: '決済方法を選択してください',
      });
    }

    // 決済手段を小文字に正規化（フロントのenumが大文字BANK_TRANSFER等で来ても
    // bank_transfer/credit_card/paypay の判定・割引・入金前発行の防止が正しく効くように）
    const paymentMethod = String(rawPaymentMethod).toLowerCase() as
      | 'bank_transfer'
      | 'credit_card'
      | 'paypay';

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

      // 2. 在庫チェック（サブスク商品は在庫の概念がないためスキップ）
      for (const item of cart.items) {
        if (item.product.productType === 'subscription') {
          continue;
        }
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
      let orderNumber: string = '';
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

      if (attempts >= MAX_ATTEMPTS || !orderNumber) {
        throw new Error('注文番号の生成に失敗しました');
      }

      // 5. 注文を作成（customerName, customerEmail, customerPhoneをリクエストから取得）
      // リクエストに指定が無い場合はログイン会員の登録情報で補完する
      const { customerName, customerEmail, customerPhone, shippingPostalCode } = req.body;

      const user = await tx.user.findUnique({ where: { id: userId } });

      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          customerName: customerName || user?.name || '',
          customerEmail: customerEmail || user?.email || '',
          customerPhone: customerPhone || user?.defaultPhone || '',
          status: paymentMethod === 'bank_transfer' ? 'pending' : 'paid',
          paymentMethod,
          totalAmount,
          shippingAddress,
          shippingPostalCode: shippingPostalCode || null,
        },
      });

      // 6. 注文アイテムを作成 & 在庫を減算 & サブスク契約を作成
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

        if (item.product.productType === 'subscription') {
          // サブスク商品: 在庫減算はせず、契約(Subscription)を作成する。
          // billingTypeに応じて次回請求予定日を設定（onetime=買い切りはnull）。
          const billingType = item.product.billingType || 'onetime';
          const nextBillingDate = calcNextBillingDate(billingType);

          // 入金前発行の防止: 注文が入金済み(paid)で作られる場合のみ active。
          // 銀行振込(pending)は入金待ち(pending_payment)で作り、入金確認時に active へ昇格する。
          const subscriptionStatus =
            newOrder.status === 'paid' ? 'active' : 'pending_payment';

          // 再購入で「引き継ぐ」選択時: 同一ユーザー×同一商品の解約済み契約(最新)を探し、
          // その注文番号を引き継ぎ元として記録する。発行時にreactivate(旧テナント付替)する。
          let inheritFromOrderId: string | null = null;
          if (inheritProductIds.has(item.productId)) {
            const prevCancelled = await tx.subscription.findFirst({
              where: { userId, productId: item.productId, status: 'cancelled' },
              orderBy: { cancelledAt: 'desc' },
              include: { order: { select: { orderNumber: true } } },
            });
            inheritFromOrderId = prevCancelled?.order?.orderNumber || null;
          }

          // 数量分だけ契約を作成（サブスクは数量1固定だが安全のためループ）
          for (let i = 0; i < item.quantity; i++) {
            await tx.subscription.create({
              data: {
                userId,
                productId: item.productId,
                orderId: newOrder.id,
                status: subscriptionStatus,
                billingType,
                amount: item.product.price,
                nextBillingDate,
                inheritFromOrderId,
              },
            });
          }
        } else {
          // 物販/デジタル等: 在庫減算ログを作成
          await tx.inventoryLog.create({
            data: {
              productId: item.productId,
              quantity: -item.quantity,
              type: 'sale',
              note: `注文番号: ${orderNumber}`,
            },
          });
        }
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
    }, {
      // 本番Neon(pooler経由)のレイテンシでデフォルト5秒を超えるため余裕を持たせる。
      maxWait: 10000, // 接続待ちの最大時間
      timeout: 20000, // トランザクション実行の最大時間
    });

    // 在庫アプリの発行API連携（P2）: カード即決済など注文が最初からpaidの場合、
    // active なサブスク契約についてテナント発行→キー保存→キー送付メール。
    // 銀行振込(pending)の場合はここでは発行せず、入金確認(confirmPayment)時に発行される。
    if (order && order.status === 'paid') {
      try {
        await provisionAndDeliverForOrder(order.id);
      } catch (provisionError) {
        console.error('発行連携エラー:', provisionError);
      }
    }

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
    const orderNumber = getStringParam(req.params.orderNumber);

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

    const orderNumber = getStringParam(req.params.orderNumber);

    // 注文を取得
    const order = await prisma.order.findUnique({
      where: { orderNumber: orderNumber || '' },
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
      where: { orderNumber: orderNumber || '' },
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
    const orderIdString = getStringParam(orderId);
    const order = await prisma.order.findFirst({
      where: {
        id: orderIdString,
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
    const id = getStringParam(req.params.id);

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
 * 入金確認メールを送信（payment_receivedテンプレート）。失敗しても呼び出し側の処理は継続。
 * emailTemplateController.sendOrderEmail と同じテンプレ→変数置換→送信のロジック。
 */
async function sendPaymentReceivedEmail(order: {
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  totalAmount: number;
}): Promise<void> {
  if (!order.customerEmail) return;

  const tpl = await prisma.emailTemplate.findUnique({
    where: { type: 'payment_received' },
  });
  if (!tpl || !tpl.isActive) return; // テンプレ未設定/無効なら送らない

  const settings = await prisma.siteSettings.findFirst();
  const bankInfo = settings
    ? [
        settings.bankName && `銀行名: ${settings.bankName}`,
        settings.bankBranch && `支店名: ${settings.bankBranch}`,
        settings.bankAccountType && `口座種別: ${settings.bankAccountType}`,
        settings.bankAccountNumber && `口座番号: ${settings.bankAccountNumber}`,
        settings.bankAccountHolder && `口座名義: ${settings.bankAccountHolder}`,
      ]
        .filter(Boolean)
        .join('\n')
    : '';

  const vars: Record<string, string> = {
    customerName: order.customerName || 'お客様',
    orderNumber: order.orderNumber || '',
    totalAmount: (order.totalAmount ?? 0).toLocaleString(),
    bankInfo,
  };

  await sendGenericEmail({
    to: order.customerEmail,
    subject: renderTemplate(tpl.subject, vars),
    body: renderTemplate(tpl.body, vars),
  });
}

/**
 * ライセンスキー送付メールを送信（license_deliveryテンプレート）。失敗しても呼び出し側は継続。
 */
async function sendLicenseDeliveryEmail(data: {
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  productName: string;
  licenseKey: string;
  activationUrl: string;
}): Promise<boolean> {
  if (!data.customerEmail) return false;

  const tpl = await prisma.emailTemplate.findUnique({
    where: { type: 'license_delivery' },
  });
  if (!tpl || !tpl.isActive) return false;

  const vars: Record<string, string> = {
    customerName: data.customerName || 'お客様',
    orderNumber: data.orderNumber || '',
    productName: data.productName || '',
    licenseKey: data.licenseKey || '',
    activationUrl: data.activationUrl || '',
  };

  await sendGenericEmail({
    to: data.customerEmail,
    subject: renderTemplate(tpl.subject, vars),
    body: renderTemplate(tpl.body, vars),
  });
  return true;
}

/**
 * 注文に紐づく active なサブスク契約について、在庫アプリの発行APIを呼び、
 * ライセンスキーを保存してキー送付メールを送る（P2連携の中核）。
 * DBトランザクション外で呼ぶこと（外部API・メールを含めない）。
 * 冪等キー=注文IDなので複数回呼ばれても在庫側で二重発行されない。
 */
async function provisionAndDeliverForOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      subscriptions: { include: { product: true } },
    },
  });
  if (!order) return;

  // active な契約のみ発行対象（pending_payment は入金前なので発行しない）
  const targets = order.subscriptions.filter((s) => s.status === 'active');
  if (targets.length === 0) return;

  for (const sub of targets) {
    // 既に発行・送付済みならスキップ（冪等・二重送信防止）
    if (sub.licenseKeyDelivered && sub.licenseKey) continue;

    // プランの上限（3項目必ず送る。null=無制限）
    const limits = {
      maxParts: sub.product?.maxParts ?? null,
      maxImageMB: sub.product?.maxImageMB ?? null,
      maxUsers: sub.product?.maxUsers ?? null,
    };

    // 1. 発行API呼び出し。
    //    引き継ぎ元(inheritFromOrderId)がある再購入は reactivate で旧テナントを新注文へ付け替え、
    //    無ければ provision で新規テナント発行。どちらも結果の形（key/url/slug）は共通。
    let result: {
      success: boolean;
      licenseKey?: string;
      activationUrl?: string;
      slug?: string;
      error?: string;
    };
    const isReactivate = !!sub.inheritFromOrderId;
    if (isReactivate) {
      result = await reactivateTenant({
        prevOrderId: sub.inheritFromOrderId!,
        newOrderId: order.orderNumber,
        plan: sub.product?.name,
        billingType: sub.billingType,
        productId: sub.productId,
        limits,
      });
    } else {
      result = await provisionTenant({
        orderId: order.orderNumber, // 冪等キー: 表示用注文番号（在庫側と合意）
        email: order.customerEmail,
        plan: sub.product?.name,
        billingType: sub.billingType,
        productId: sub.productId,
        limits,
      });
    }

    if (!result.success) {
      // 失敗はnoteに記録（運営者が管理画面から手動リカバリ可能）
      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          note: `[自動発行失敗 ${new Date().toISOString()}] ${result.error ?? ''}`.slice(0, 500),
        },
      });
      continue;
    }

    // 引き継ぎ(reactivate)は旧テナントの既存キーがそのまま有効で、在庫側は
    // キー/URLを返さない。表示が空にならないよう、返らなければ旧契約から引き継ぐ。
    let licenseKey = result.licenseKey ?? null;
    let activationUrl = result.activationUrl ?? null;
    if (isReactivate && (!licenseKey || !activationUrl)) {
      const prev = await prisma.subscription.findFirst({
        where: { order: { orderNumber: sub.inheritFromOrderId! } },
        select: { licenseKey: true, activationUrl: true },
        orderBy: { createdAt: 'desc' },
      });
      licenseKey = licenseKey ?? prev?.licenseKey ?? null;
      activationUrl = activationUrl ?? prev?.activationUrl ?? null;
    }

    // 2. 発行結果をSubscriptionに保存
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        licenseKey,
        activationUrl,
        tenantSlug: result.slug ?? null,
        provisionedAt: new Date(),
      },
    });

    // 引き継ぎ再購入は既存キーがそのまま有効なので、キー再送メールは送らない
    // （新しいキーを発行していないため。契約は復活済み＝delivered扱い）。
    if (isReactivate) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { licenseKeyDelivered: true },
      });
      continue;
    }

    // 3. キー送付メール（成功したら licenseKeyDelivered=true）
    try {
      const delivered = await sendLicenseDeliveryEmail({
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        orderNumber: order.orderNumber,
        productName: sub.product?.name ?? '',
        licenseKey: result.licenseKey ?? '',
        activationUrl: result.activationUrl ?? '',
      });
      if (delivered) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { licenseKeyDelivered: true },
        });
      }
    } catch (mailErr) {
      console.error('[provision] キー送付メール失敗:', mailErr);
      // メール失敗でもキーは保存済み。運営者が管理画面から手動送付できる。
    }
  }
}

/**
 * PUT /api/admin/orders/:id/confirm-payment
 * 入金確認処理（管理者専用）: 注文を pending → paid にする。
 * 銀行振込の入金確認に使う。紐づくサブスク契約(pending_payment)を active に昇格し、
 * 入金確認メールを自動送信する。
 */
export async function confirmPayment(req: Request, res: Response) {
  try {
    const id = getStringParam(req.params.id);

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return res.status(404).json({ success: false, message: '注文が見つかりません' });
    }

    if (order.status === 'cancelled') {
      return res
        .status(400)
        .json({ success: false, message: 'キャンセル済みの注文は入金確認できません' });
    }
    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `この注文は入金確認できません（現在のステータス: ${order.status}）`,
      });
    }

    // トランザクション: 注文をpaidに更新 + 紐づくサブスク契約をactiveへ昇格
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: { status: 'paid' },
        include: {
          user: { select: { id: true, email: true, name: true } },
          items: { include: { product: { include: { category: true } } } },
        },
      });

      // 入金待ちのサブスク契約を利用中へ昇格
      // （将来のP2ではここが在庫アプリの発行API(provision)を叩くフックポイントになる）
      await tx.subscription.updateMany({
        where: { orderId: id, status: 'pending_payment' },
        data: { status: 'active' },
      });

      return updated;
    }, {
      maxWait: 10000,
      timeout: 20000,
    });

    // 入金確認メールを自動送信（失敗しても入金確認は成功扱い）
    try {
      await sendPaymentReceivedEmail({
        customerEmail: updatedOrder.customerEmail,
        customerName: updatedOrder.customerName,
        orderNumber: updatedOrder.orderNumber,
        totalAmount: updatedOrder.totalAmount,
      });
    } catch (emailError) {
      console.error('入金確認メール送信エラー:', emailError);
    }

    // 在庫アプリの発行API連携（P2）: paid確定後、activeなサブスク契約について
    // テナント発行→ライセンスキー保存→キー送付メール。失敗しても入金確認自体は成功扱い。
    try {
      await provisionAndDeliverForOrder(id!);
    } catch (provisionError) {
      console.error('発行連携エラー:', provisionError);
    }

    return res.json({
      success: true,
      message: '入金を確認しました',
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error('入金確認エラー:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '入金確認に失敗しました',
    });
  }
}

/**
 * PUT /api/admin/orders/:id/ship
 * 発送処理（管理者専用）
 */
export async function shipOrder(req: Request, res: Response) {
  try {
    const id = getStringParam(req.params.id);
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

    // 発送完了メールを送信（Resend SDK使用）
    try {
      await sendShippingNotificationEmail({
        to: updatedOrder.customerEmail,
        customerName: updatedOrder.customerName,
        orderNumber: updatedOrder.orderNumber,
        carrier,
        trackingNumber,
        shippedAt: updatedOrder.shippedAt!,
      });
    } catch (emailError) {
      console.error('発送通知メール送信エラー:', emailError);
      // メール送信失敗しても発送処理は成功とする
    }

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
    const id = getStringParam(req.params.id);
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
    }, {
      maxWait: 10000,
      timeout: 20000,
    });

    // キャンセル通知メールを送信（Resend SDK使用）
    // メール送信失敗時もキャンセル処理は成功として扱う
    if (updatedOrder.customerEmail) {
      try {
        await sendCancellationNotificationEmail({
          to: updatedOrder.customerEmail,
          customerName: updatedOrder.customerName,
          orderNumber: updatedOrder.orderNumber,
          cancelReason: updatedOrder.cancelReason ?? undefined,
        });
      } catch (emailError) {
        console.error('キャンセル通知メール送信エラー:', emailError);
      }
    }

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
    const id = getStringParam(req.params.id);

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
      shippingAddress: order.shippingAddress || '',
      shippingPostalCode: order.shippingPostalCode || '',
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        productName: item.product.name,
        quantity: item.quantity,
        price: item.price,
      })),
      totalAmount: order.totalAmount,
      shippingFee: 0, // Order model doesn't have shippingFee field
      paymentMethod: order.paymentMethod,
    });

    // PDFをレスポンスとして返す
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice-${order.orderNumber}.pdf"`
    );
    return res.send(Buffer.from(pdfBytes));
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
    const id = getStringParam(req.params.id);

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
    return res.send(Buffer.from(pdfBytes));
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
    const id = getStringParam(req.params.id);

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
    return res.send(Buffer.from(pdfBytes));
  } catch (error: any) {
    console.error('送り状生成エラー:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '送り状の生成に失敗しました',
    });
  }
}

/**
 * 見積書PDF生成
 * GET /api/admin/orders/:id/documents/quote
 */
export async function generateQuote(req: Request, res: Response) {
  try {
    const id = getStringParam(req.params.id);

    // 注文情報取得
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

    // 有効期限を30日後に設定
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    // PDF生成
    const pdfBytes = await generateQuotePDF({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      items: order.items.map((item) => ({
        productName: item.product.name,
        quantity: item.quantity,
        price: item.price * item.quantity,
      })),
      totalAmount: order.totalAmount,
      shippingFee: 0, // Order model doesn't have shippingFee field
      validUntil,
    });

    // PDFをレスポンスとして返す
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="quote-${order.orderNumber}.pdf"`
    );
    return res.send(Buffer.from(pdfBytes));
  } catch (error: any) {
    console.error('見積書生成エラー:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '見積書の生成に失敗しました',
    });
  }
}

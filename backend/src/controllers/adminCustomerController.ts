import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * ヘルパー関数: クエリパラメータからstring型を取得
 */
const getStringParam = (value: any): string | undefined => {
  if (Array.isArray(value)) return value[0];
  if (typeof value === 'string') return value;
  return undefined;
};

/**
 * GET /api/admin/customers
 * 顧客一覧を取得（検索・フィルタリング）
 */
export const getCustomers = async (req: Request, res: Response) => {
  try {
    const {
      search,
      hasOrders,
      page = '1',
      limit = '50',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // フィルタ条件構築
    const where: any = {
      isAdmin: false, // 管理者を除外
    };

    const searchStr = getStringParam(search);
    if (searchStr) {
      where.OR = [
        { email: { contains: searchStr, mode: 'insensitive' } },
        { name: { contains: searchStr, mode: 'insensitive' } },
      ];
    }

    if (hasOrders === 'true') {
      where.orders = {
        some: {},
      };
    } else if (hasOrders === 'false') {
      where.orders = {
        none: {},
      };
    }

    // ソート条件
    const orderBy: any = {};
    orderBy[sortBy as string] = sortOrder as string;

    // 顧客一覧取得
    const [customers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          defaultAddress: true,
          defaultPostalCode: true,
          defaultPhone: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              orders: true,
            },
          },
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.user.count({ where }),
    ]);

    // 各顧客の合計購入金額を取得
    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const orderStats = await prisma.order.aggregate({
          where: {
            userId: customer.id,
            status: { not: 'cancelled' },
          },
          _sum: {
            totalAmount: true,
          },
        });

        return {
          ...customer,
          orderCount: customer._count.orders,
          totalPurchase: orderStats._sum?.totalAmount || 0,
        };
      })
    );

    return res.json({
      customers: customersWithStats,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('顧客一覧取得エラー:', error);
    return res.status(500).json({ error: '顧客一覧の取得に失敗しました' });
  }
};

/**
 * GET /api/admin/customers/:id
 * 顧客詳細取得（注文履歴含む）
 */
export const getCustomerById = async (req: Request, res: Response) => {
  try {
    const id = getStringParam(req.params.id);

    if (!id) {
      return res.status(400).json({ message: '顧客IDが必要です' });
    }

    const customer = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        defaultAddress: true,
        defaultPostalCode: true,
        defaultPhone: true,
        isAdmin: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        orders: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            status: true,
            createdAt: true,
            _count: {
              select: {
                items: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ message: '顧客が見つかりません' });
    }

    // 合計購入金額
    const orderStats = await prisma.order.aggregate({
      where: {
        userId: id,
        status: { not: 'cancelled' },
      },
      _sum: {
        totalAmount: true,
      },
    });

    // tagsはJSON文字列で保存されているため配列にパースして返す
    let parsedTags: string[] = [];
    try {
      parsedTags = customer.tags ? JSON.parse(customer.tags) : [];
    } catch {
      parsedTags = [];
    }

    return res.json({
      ...customer,
      tags: parsedTags,
      totalPurchase: orderStats._sum?.totalAmount || 0,
      orderCount: customer.orders.length,
    });
  } catch (error) {
    console.error('顧客詳細取得エラー:', error);
    return res.status(500).json({ message: '顧客詳細の取得に失敗しました' });
  }
};

/**
 * GET /api/admin/customers/stats
 * 顧客統計情報取得
 */
export const getCustomerStats = async (_req: Request, res: Response) => {
  try {
    // 全顧客数（管理者除く）
    const totalCustomers = await prisma.user.count({
      where: { isAdmin: false },
    });

    // 今月の新規顧客数
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newCustomersThisMonth = await prisma.user.count({
      where: {
        isAdmin: false,
        createdAt: { gte: startOfMonth },
      },
    });

    // 注文実績のある顧客数
    const customersWithOrders = await prisma.user.count({
      where: {
        isAdmin: false,
        orders: {
          some: {},
        },
      },
    });

    // トップ顧客（購入金額TOP10）
    const topCustomers = await prisma.$queryRaw<
      Array<{
        userId: string;
        totalPurchase: number;
        orderCount: number;
      }>
    >`
      SELECT
        "userId" as "userId",
        SUM("totalAmount") as "totalPurchase",
        COUNT(*) as "orderCount"
      FROM orders
      WHERE status != 'cancelled'
      GROUP BY "userId"
      ORDER BY "totalPurchase" DESC
      LIMIT 10
    `;

    // ユーザー情報を取得
    const userIds = topCustomers.map((c) => c.userId);
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    const userMap = users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {} as Record<string, any>);

    const topCustomersWithInfo = topCustomers.map((customer) => ({
      ...customer,
      user: userMap[customer.userId],
      totalPurchase: Number(customer.totalPurchase),
      orderCount: Number(customer.orderCount),
    }));

    return res.json({
      totalCustomers,
      newCustomersThisMonth,
      customersWithOrders,
      customersWithoutOrders: totalCustomers - customersWithOrders,
      topCustomers: topCustomersWithInfo,
    });
  } catch (error) {
    console.error('顧客統計取得エラー:', error);
    return res.status(500).json({ error: '顧客統計の取得に失敗しました' });
  }
};

/**
 * PUT /api/admin/customers/:id
 * 顧客情報更新
 */
export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const id = getStringParam(req.params.id);
    const { name, defaultAddress, defaultPostalCode, defaultPhone } = req.body;

    if (!id) {
      return res.status(400).json({ error: '顧客IDが必要です' });
    }

    // 顧客存在確認
    const customer = await prisma.user.findUnique({
      where: { id },
    });

    if (!customer) {
      return res.status(404).json({ error: '顧客が見つかりません' });
    }

    // 更新
    const updatedCustomer = await prisma.user.update({
      where: { id },
      data: {
        name,
        defaultAddress,
        defaultPostalCode,
        defaultPhone,
      },
      select: {
        id: true,
        email: true,
        name: true,
        defaultAddress: true,
        defaultPostalCode: true,
        defaultPhone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json({
      message: '顧客情報を更新しました',
      customer: updatedCustomer,
    });
  } catch (error) {
    console.error('顧客情報更新エラー:', error);
    return res.status(500).json({ error: '顧客情報の更新に失敗しました' });
  }
};

/**
 * PUT /api/admin/customers/:id/tags
 * 顧客タグ付け
 *
 * リクエストボディ:
 * - tags: string[] - タグ配列（例: ['VIP', 'リピーター', '要注意']）
 *
 * 注: 現在のスキーマにはtagsフィールドがないため、
 * 将来的にスキーマを拡張する必要があります。
 * 暫定的に、nameフィールドの末尾にタグ情報を付加する方式を採用。
 * または、別途TagモデルやUserMetadataモデルを作成することを推奨。
 */
export const updateCustomerTags = async (req: Request, res: Response) => {
  try {
    const id = getStringParam(req.params.id);
    const { tags } = req.body;

    // バリデーション
    if (!Array.isArray(tags)) {
      return res.status(400).json({
        success: false,
        message: 'tagsは配列である必要があります',
      });
    }

    if (!id) {
      return res.status(400).json({
        success: false,
        message: '顧客IDが必要です',
      });
    }

    // 顧客存在確認
    const customer = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: '顧客が見つかりません',
      });
    }

    if (customer.isAdmin) {
      return res.status(400).json({
        success: false,
        message: '管理者にはタグを付けられません',
      });
    }

    // タグは文字列配列であることを検証（各要素が文字列）
    const normalizedTags = tags
      .filter((t: unknown): t is string => typeof t === 'string')
      .map((t: string) => t.trim())
      .filter((t: string) => t.length > 0);

    // 重複を除去
    const uniqueTags = Array.from(new Set(normalizedTags));

    // JSON文字列として保存（Product.tagsと同じ方式）
    const updatedCustomer = await prisma.user.update({
      where: { id },
      data: { tags: JSON.stringify(uniqueTags) },
      select: {
        id: true,
        email: true,
        name: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json({
      success: true,
      message: 'タグを更新しました',
      customer: {
        ...updatedCustomer,
        tags: uniqueTags, // レスポンスは配列で返す
      },
    });
  } catch (error: any) {
    console.error('顧客タグ更新エラー:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'タグの更新に失敗しました',
    });
  }
};

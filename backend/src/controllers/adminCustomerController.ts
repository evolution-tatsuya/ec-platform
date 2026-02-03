import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { name: { contains: search as string, mode: 'insensitive' } },
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
          totalPurchase: orderStats._sum.totalAmount || 0,
        };
      })
    );

    res.json({
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
    res.status(500).json({ error: '顧客一覧の取得に失敗しました' });
  }
};

/**
 * GET /api/admin/customers/:id
 * 顧客詳細取得（注文履歴含む）
 */
export const getCustomerById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

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
                orderItems: true,
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
      return res.status(404).json({ error: '顧客が見つかりません' });
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

    res.json({
      ...customer,
      totalPurchase: orderStats._sum.totalAmount || 0,
      orderCount: customer.orders.length,
    });
  } catch (error) {
    console.error('顧客詳細取得エラー:', error);
    res.status(500).json({ error: '顧客詳細の取得に失敗しました' });
  }
};

/**
 * GET /api/admin/customers/stats
 * 顧客統計情報取得
 */
export const getCustomerStats = async (req: Request, res: Response) => {
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

    res.json({
      totalCustomers,
      newCustomersThisMonth,
      customersWithOrders,
      customersWithoutOrders: totalCustomers - customersWithOrders,
      topCustomers: topCustomersWithInfo,
    });
  } catch (error) {
    console.error('顧客統計取得エラー:', error);
    res.status(500).json({ error: '顧客統計の取得に失敗しました' });
  }
};

/**
 * PUT /api/admin/customers/:id
 * 顧客情報更新
 */
export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, defaultAddress, defaultPostalCode, defaultPhone } = req.body;

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

    res.json({
      message: '顧客情報を更新しました',
      customer: updatedCustomer,
    });
  } catch (error) {
    console.error('顧客情報更新エラー:', error);
    res.status(500).json({ error: '顧客情報の更新に失敗しました' });
  }
};

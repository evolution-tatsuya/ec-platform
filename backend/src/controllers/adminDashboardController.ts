import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/admin/dashboard
 * ダッシュボード統計データを取得
 */
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    // 現在の日時
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // 今月の統計
    const currentMonthOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startOfMonth },
        status: { not: 'cancelled' },
      },
    });

    // 先月の統計
    const lastMonthOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        status: { not: 'cancelled' },
      },
    });

    // 今月の総売上
    const currentMonthRevenue = currentMonthOrders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );

    // 先月の総売上
    const lastMonthRevenue = lastMonthOrders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );

    // 今月の注文数
    const currentMonthOrderCount = currentMonthOrders.length;

    // 先月の注文数
    const lastMonthOrderCount = lastMonthOrders.length;

    // 平均注文額
    const averageOrderValue =
      currentMonthOrderCount > 0 ? currentMonthRevenue / currentMonthOrderCount : 0;

    // 前月比（売上）
    const revenueGrowth =
      lastMonthRevenue > 0
        ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : currentMonthRevenue > 0
        ? 100
        : 0;

    // 前月比（注文数）
    const orderGrowth =
      lastMonthOrderCount > 0
        ? ((currentMonthOrderCount - lastMonthOrderCount) / lastMonthOrderCount) * 100
        : currentMonthOrderCount > 0
        ? 100
        : 0;

    // 最近の注文（最新10件）
    const recentOrders = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // トップ売れ筋商品（今月）
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: startOfMonth },
          status: { not: 'cancelled' },
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
    });

    // 商品ごとに集計
    const productSales = orderItems.reduce((acc, item) => {
      const productId = item.productId;
      if (!acc[productId]) {
        acc[productId] = {
          product: item.product,
          totalQuantity: 0,
          totalRevenue: 0,
        };
      }
      acc[productId].totalQuantity += item.quantity;
      acc[productId].totalRevenue += item.price * item.quantity;
      return acc;
    }, {} as Record<string, { product: any; totalQuantity: number; totalRevenue: number }>);

    // 売上順にソート
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5)
      .map((item) => ({
        ...item.product,
        totalQuantity: item.totalQuantity,
        totalRevenue: item.totalRevenue,
      }));

    // 日別売上推移（過去30日）
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: { not: 'cancelled' },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 日付ごとに集計
    const dailySales = dailyOrders.reduce((acc, order) => {
      const date = order.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, revenue: 0, orderCount: 0 };
      }
      acc[date].revenue += order.totalAmount;
      acc[date].orderCount += 1;
      return acc;
    }, {} as Record<string, { date: string; revenue: number; orderCount: number }>);

    const salesTrend = Object.values(dailySales);

    // カテゴリー別売上
    const categoryOrders = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: startOfMonth },
          status: { not: 'cancelled' },
        },
      },
      include: {
        product: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const categorySales = categoryOrders.reduce((acc, item) => {
      const categoryName = item.product.category?.name || '未分類';
      if (!acc[categoryName]) {
        acc[categoryName] = 0;
      }
      acc[categoryName] += item.price * item.quantity;
      return acc;
    }, {} as Record<string, number>);

    const categoryDistribution = Object.entries(categorySales).map(([name, value]) => ({
      name,
      value,
    }));

    // レスポンス
    res.json({
      stats: {
        revenue: {
          current: currentMonthRevenue,
          growth: revenueGrowth,
        },
        orders: {
          current: currentMonthOrderCount,
          growth: orderGrowth,
        },
        averageOrderValue,
      },
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt,
        user: order.user
          ? {
              id: order.user.id,
              email: order.user.email,
              name: order.user.name,
            }
          : null,
      })),
      topProducts,
      salesTrend,
      categoryDistribution,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'ダッシュボード統計の取得に失敗しました' });
  }
};

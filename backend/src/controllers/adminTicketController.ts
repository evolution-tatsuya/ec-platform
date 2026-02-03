import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/admin/tickets
 * 全チケット一覧を取得（検索・フィルタリング）
 */
export const getTickets = async (req: Request, res: Response) => {
  try {
    const {
      search,
      isUsed,
      productId,
      page = '1',
      limit = '50',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // フィルタ条件構築
    const where: any = {};

    if (search) {
      where.OR = [
        { ticketCode: { contains: search as string, mode: 'insensitive' } },
        { order: { orderNumber: { contains: search as string, mode: 'insensitive' } } },
        { product: { name: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    if (isUsed !== undefined) {
      where.isUsed = isUsed === 'true';
    }

    if (productId) {
      where.productId = productId as string;
    }

    // ソート条件
    const orderBy: any = {};
    orderBy[sortBy as string] = sortOrder as string;

    // チケット一覧取得
    const [tickets, total] = await Promise.all([
      prisma.digitalTicket.findMany({
        where,
        include: {
          order: {
            select: {
              orderNumber: true,
              createdAt: true,
              status: true,
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              productType: true,
            },
          },
          orderItem: {
            select: {
              quantity: true,
              price: true,
            },
          },
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.digitalTicket.count({ where }),
    ]);

    res.json({
      tickets,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('チケット一覧取得エラー:', error);
    res.status(500).json({ error: 'チケット一覧の取得に失敗しました' });
  }
};

/**
 * GET /api/admin/tickets/:id
 * チケット詳細取得
 */
export const getTicketById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.digitalTicket.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                default_phone: true,
              },
            },
          },
        },
        product: true,
        orderItem: true,
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'チケットが見つかりません' });
    }

    res.json(ticket);
  } catch (error) {
    console.error('チケット詳細取得エラー:', error);
    res.status(500).json({ error: 'チケット詳細の取得に失敗しました' });
  }
};

/**
 * PUT /api/admin/tickets/:id/use
 * チケットを使用済みにする
 */
export const useTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // チケット存在確認
    const ticket = await prisma.digitalTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'チケットが見つかりません' });
    }

    if (ticket.isUsed) {
      return res.status(400).json({ error: 'このチケットは既に使用済みです' });
    }

    // チケットを使用済みに更新
    const updatedTicket = await prisma.digitalTicket.update({
      where: { id },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        product: {
          select: {
            name: true,
          },
        },
      },
    });

    res.json({
      message: 'チケットを使用済みにしました',
      ticket: updatedTicket,
    });
  } catch (error) {
    console.error('チケット使用処理エラー:', error);
    res.status(500).json({ error: 'チケット使用処理に失敗しました' });
  }
};

/**
 * PUT /api/admin/tickets/:id/reset
 * チケットを未使用に戻す
 */
export const resetTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // チケット存在確認
    const ticket = await prisma.digitalTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'チケットが見つかりません' });
    }

    // チケットを未使用に更新
    const updatedTicket = await prisma.digitalTicket.update({
      where: { id },
      data: {
        isUsed: false,
        usedAt: null,
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        product: {
          select: {
            name: true,
          },
        },
      },
    });

    res.json({
      message: 'チケットを未使用に戻しました',
      ticket: updatedTicket,
    });
  } catch (error) {
    console.error('チケットリセット処理エラー:', error);
    res.status(500).json({ error: 'チケットリセット処理に失敗しました' });
  }
};

/**
 * GET /api/admin/tickets/stats
 * チケット統計情報取得
 */
export const getTicketStats = async (req: Request, res: Response) => {
  try {
    // 全チケット数
    const totalTickets = await prisma.digitalTicket.count();

    // 使用済みチケット数
    const usedTickets = await prisma.digitalTicket.count({
      where: { isUsed: true },
    });

    // 未使用チケット数
    const unusedTickets = totalTickets - usedTickets;

    // イベント別チケット数
    const ticketsByProduct = await prisma.digitalTicket.groupBy({
      by: ['productId'],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    });

    // productIdから商品情報を取得
    const productIds = ticketsByProduct.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const productMap = products.reduce((acc, product) => {
      acc[product.id] = product.name;
      return acc;
    }, {} as Record<string, string>);

    const ticketsByEvent = ticketsByProduct.map((item) => ({
      productId: item.productId,
      productName: productMap[item.productId] || '不明',
      ticketCount: item._count.id,
    }));

    res.json({
      totalTickets,
      usedTickets,
      unusedTickets,
      usageRate: totalTickets > 0 ? (usedTickets / totalTickets) * 100 : 0,
      ticketsByEvent,
    });
  } catch (error) {
    console.error('チケット統計取得エラー:', error);
    res.status(500).json({ error: 'チケット統計の取得に失敗しました' });
  }
};

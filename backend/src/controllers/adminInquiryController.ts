import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendInquiryReplyEmail } from '../utils/emailService';

const prisma = new PrismaClient();

/**
 * GET /api/admin/inquiries
 * 問い合わせ一覧を取得（検索・フィルタリング）
 */
export const getInquiries = async (req: Request, res: Response) => {
  try {
    const {
      search,
      status,
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
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { subject: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (status && status !== 'all') {
      where.status = status as string;
    }

    // ソート条件
    const orderBy: any = {};
    orderBy[sortBy as string] = sortOrder as string;

    // 問い合わせ一覧取得
    const [inquiries, total] = await Promise.all([
      prisma.inquiry.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          subject: true,
          message: true,
          status: true,
          repliedAt: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.inquiry.count({ where }),
    ]);

    return res.json({
      inquiries,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('問い合わせ一覧取得エラー:', error);
    return res.status(500).json({ message: '問い合わせ一覧の取得に失敗しました' });
  }
};

/**
 * GET /api/admin/inquiries/:id
 * 問い合わせ詳細取得
 */
export const getInquiryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const inquiry = await prisma.inquiry.findUnique({
      where: { id: id as string },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        repliedByUser: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!inquiry) {
      return res.status(404).json({ message: '問い合わせが見つかりません' });
    }

    return res.json(inquiry);
  } catch (error) {
    console.error('問い合わせ詳細取得エラー:', error);
    return res.status(500).json({ message: '問い合わせ詳細の取得に失敗しました' });
  }
};

/**
 * GET /api/admin/inquiries/stats
 * 問い合わせ統計情報取得
 */
export const getInquiryStats = async (_req: Request, res: Response) => {
  try {
    // 全問い合わせ数
    const totalInquiries = await prisma.inquiry.count();

    // ステータス別件数
    const pendingCount = await prisma.inquiry.count({
      where: { status: 'pending' },
    });
    const repliedCount = await prisma.inquiry.count({
      where: { status: 'replied' },
    });
    const closedCount = await prisma.inquiry.count({
      where: { status: 'closed' },
    });

    // 今日の新規問い合わせ
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayInquiries = await prisma.inquiry.count({
      where: {
        createdAt: { gte: today },
      },
    });

    // 平均返信時間（pending以外）
    const repliedInquiries = await prisma.inquiry.findMany({
      where: {
        status: { in: ['replied', 'closed'] },
        repliedAt: { not: null },
      },
      select: {
        createdAt: true,
        repliedAt: true,
      },
    });

    let averageReplyTimeHours = 0;
    if (repliedInquiries.length > 0) {
      const totalHours = repliedInquiries.reduce((sum, inquiry) => {
        const diff =
          new Date(inquiry.repliedAt!).getTime() -
          new Date(inquiry.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60); // ミリ秒を時間に変換
      }, 0);
      averageReplyTimeHours = totalHours / repliedInquiries.length;
    }

    return res.json({
      totalInquiries,
      pendingCount,
      repliedCount,
      closedCount,
      todayInquiries,
      averageReplyTimeHours: Math.round(averageReplyTimeHours * 10) / 10, // 小数点第1位まで
    });
  } catch (error) {
    console.error('問い合わせ統計取得エラー:', error);
    return res.status(500).json({ message: '問い合わせ統計の取得に失敗しました' });
  }
};

/**
 * GET /api/admin/inquiries/trends
 * 問い合わせトレンド取得（日別・週別）
 */
export const getInquiryTrends = async (req: Request, res: Response) => {
  try {
    const { period = 'week' } = req.query; // 'week' or 'month'

    const days = period === 'month' ? 30 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // 日別問い合わせ数
    const inquiries = await prisma.inquiry.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        status: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // 日付ごとにグループ化
    const trendData: Record<string, { date: string; total: number; pending: number; replied: number; closed: number }> = {};

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      trendData[dateStr] = {
        date: dateStr,
        total: 0,
        pending: 0,
        replied: 0,
        closed: 0,
      };
    }

    // データ集計
    inquiries.forEach((inquiry) => {
      const dateStr = new Date(inquiry.createdAt).toISOString().split('T')[0];
      if (trendData[dateStr]) {
        trendData[dateStr].total++;
        if (inquiry.status === 'pending') trendData[dateStr].pending++;
        else if (inquiry.status === 'replied') trendData[dateStr].replied++;
        else if (inquiry.status === 'closed') trendData[dateStr].closed++;
      }
    });

    const trends = Object.values(trendData).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    return res.json({
      period,
      days,
      trends,
    });
  } catch (error) {
    console.error('問い合わせトレンド取得エラー:', error);
    return res.status(500).json({ message: '問い合わせトレンドの取得に失敗しました' });
  }
};

/**
 * PUT /api/admin/inquiries/:id/reply
 * 問い合わせに返信
 */
export const replyToInquiry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;
    const adminId = (req as any).session.userId; // 管理者ID

    if (!reply) {
      return res.status(400).json({ message: '返信内容が必要です' });
    }

    // 問い合わせ存在確認
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: id as string },
    });

    if (!inquiry) {
      return res.status(404).json({ message: '問い合わせが見つかりません' });
    }

    // 返信を保存
    const updatedInquiry = await prisma.inquiry.update({
      where: { id: id as string },
      data: {
        reply,
        status: 'replied',
        repliedAt: new Date(),
        repliedBy: adminId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        repliedByUser: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // 返信メール送信（Resend SDK使用）
    // メール送信失敗時も返信保存は成功として扱う
    try {
      await sendInquiryReplyEmail({
        to: inquiry.email,
        customerName: inquiry.name,
        subject: inquiry.subject,
        originalMessage: inquiry.message,
        reply,
      });
    } catch (emailError) {
      console.error('問い合わせ返信メール送信エラー:', emailError);
    }

    return res.json({
      message: '返信を送信しました',
      inquiry: updatedInquiry,
    });
  } catch (error) {
    console.error('問い合わせ返信エラー:', error);
    return res.status(500).json({ message: '問い合わせへの返信に失敗しました' });
  }
};

/**
 * PUT /api/admin/inquiries/:id/status
 * 問い合わせステータス更新
 */
export const updateInquiryStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'replied', 'closed'].includes(status)) {
      return res.status(400).json({ message: '無効なステータスです' });
    }

    // 問い合わせ存在確認
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: id as string },
    });

    if (!inquiry) {
      return res.status(404).json({ message: '問い合わせが見つかりません' });
    }

    // ステータス更新
    const updatedInquiry = await prisma.inquiry.update({
      where: { id: id as string },
      data: { status },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        repliedByUser: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return res.json({
      message: 'ステータスを更新しました',
      inquiry: updatedInquiry,
    });
  } catch (error) {
    console.error('ステータス更新エラー:', error);
    return res.status(500).json({ message: 'ステータスの更新に失敗しました' });
  }
};

/**
 * DELETE /api/admin/inquiries/:id
 * 問い合わせ削除
 */
export const deleteInquiry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 問い合わせ存在確認
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: id as string },
    });

    if (!inquiry) {
      return res.status(404).json({ message: '問い合わせが見つかりません' });
    }

    // 削除
    await prisma.inquiry.delete({
      where: { id: id as string },
    });

    return res.json({ message: '問い合わせを削除しました' });
  } catch (error) {
    console.error('問い合わせ削除エラー:', error);
    return res.status(500).json({ message: '問い合わせの削除に失敗しました' });
  }
};

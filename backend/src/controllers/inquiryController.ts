// ===== 顧客向け問い合わせコントローラー =====
// 目的: 問い合わせ送信（AI自動返答連携）、履歴取得、満足度フィードバック、エスカレーション
// 対応ページ: P-012 お問い合わせ（ContactPage.tsx）

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { createError } from '../middleware/errorHandler';
import { generateAutoReply } from '../services/aiReplyService';
import { getStringParam } from '../utils/helpers';

/**
 * DBのInquiryレコードをフロントエンドのInquiry型へ変換する。
 * DBは message / status(小文字) を持つが、フロントは question / status(大文字enum) を期待するため吸収する。
 */
const toClientInquiry = (inquiry: {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  reply: string | null;
  repliedAt: Date | null;
  repliedBy: string | null;
  aiResponse: string | null;
  aiModel: string | null;
  isEscalated: boolean;
  isSatisfied: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: inquiry.id,
  userId: inquiry.userId ?? undefined,
  name: inquiry.name,
  email: inquiry.email,
  question: inquiry.message,
  aiResponse: inquiry.aiResponse ?? undefined,
  isSatisfied: inquiry.isSatisfied ?? undefined,
  isEscalated: inquiry.isEscalated,
  status: statusToEnum(inquiry.status),
  reply: inquiry.reply ?? undefined,
  repliedAt: inquiry.repliedAt ?? undefined,
  repliedBy: inquiry.repliedBy ?? undefined,
  createdAt: inquiry.createdAt,
  updatedAt: inquiry.updatedAt,
});

/**
 * DBの小文字ステータス → フロントの大文字enum文字列へ変換
 */
const statusToEnum = (status: string): string => {
  switch (status) {
    case 'ai_resolved':
      return 'AI_RESOLVED';
    case 'replied':
      return 'REPLIED';
    case 'closed':
      return 'CLOSED';
    case 'pending':
    default:
      return 'PENDING';
  }
};

/**
 * 問い合わせ送信（AI自動返答連携）
 * POST /api/inquiries
 * ゲスト可（ログイン時はuserIdを紐付け、履歴として保存）
 */
export const createInquiry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, question, orderNumber } = req.body;

    // バリデーション
    if (!name || !email || !question) {
      return next(createError('お名前、メールアドレス、質問内容は必須です', 400));
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return next(createError('メールアドレスの形式が正しくありません', 400));
    }

    // ログインユーザーの場合はuserIdを紐付け（ゲストの場合はnull）
    const userId = req.session.userId ?? null;

    // AI自動返答を生成（FAQ → Gemini → GPT-4o mini の3段階エスカレーション）
    const autoReply = await generateAutoReply(question);

    // AIが解決した場合は 'ai_resolved'、人間対応が必要な場合は 'pending'
    const initialStatus = autoReply.escalate ? 'pending' : 'ai_resolved';

    const inquiry = await prisma.inquiry.create({
      data: {
        userId,
        name,
        email,
        subject: question.slice(0, 100), // 件名は質問の先頭100文字を流用
        message: question,
        orderNumber: orderNumber || null,
        status: initialStatus,
        aiResponse: autoReply.response,
        aiModel: autoReply.model,
        isEscalated: autoReply.escalate,
      },
    });

    return res.status(201).json({
      success: true,
      message: '問い合わせを送信しました',
      inquiry: toClientInquiry(inquiry),
      aiModel: autoReply.model,
      aiResponse: autoReply.response,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * 問い合わせ履歴取得（ログインユーザーのみ）
 * GET /api/inquiries/history
 */
export const getInquiryHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.session.userId) {
      return next(createError('ログインが必要です', 401));
    }

    const inquiries = await prisma.inquiry.findMany({
      where: { userId: req.session.userId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      inquiries: inquiries.map(toClientInquiry),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * 満足度フィードバック
 * PUT /api/inquiries/:id/feedback
 * body: { isSatisfied: boolean }
 */
export const submitFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = getStringParam(req.params.id);
    const { isSatisfied } = req.body;

    if (!id) {
      return next(createError('問い合わせIDが指定されていません', 400));
    }

    if (typeof isSatisfied !== 'boolean') {
      return next(createError('isSatisfied（真偽値）は必須です', 400));
    }

    const inquiry = await prisma.inquiry.findUnique({ where: { id } });
    if (!inquiry) {
      return next(createError('問い合わせが見つかりません', 404));
    }

    // ログインユーザーの場合、本人の問い合わせのみ操作可能
    if (inquiry.userId && inquiry.userId !== req.session.userId) {
      return next(createError('この問い合わせを操作する権限がありません', 403));
    }

    // 「解決しなかった」場合は自動的にエスカレーション（人間対応待ち）
    const updated = await prisma.inquiry.update({
      where: { id },
      data: {
        isSatisfied,
        ...(isSatisfied
          ? { status: 'ai_resolved' }
          : { isEscalated: true, status: 'pending' }),
      },
    });

    return res.json({
      success: true,
      message: isSatisfied
        ? 'フィードバックありがとうございます'
        : 'オペレーターにおつなぎします',
      inquiry: toClientInquiry(updated),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * オペレーターエスカレーション
 * PUT /api/inquiries/:id/escalate
 */
export const escalateInquiry = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = getStringParam(req.params.id);

    if (!id) {
      return next(createError('問い合わせIDが指定されていません', 400));
    }

    const inquiry = await prisma.inquiry.findUnique({ where: { id } });
    if (!inquiry) {
      return next(createError('問い合わせが見つかりません', 404));
    }

    if (inquiry.userId && inquiry.userId !== req.session.userId) {
      return next(createError('この問い合わせを操作する権限がありません', 403));
    }

    const updated = await prisma.inquiry.update({
      where: { id },
      data: { isEscalated: true, status: 'pending' },
    });

    return res.json({
      success: true,
      message: 'オペレーターにおつなぎします',
      inquiry: toClientInquiry(updated),
    });
  } catch (error) {
    return next(error);
  }
};

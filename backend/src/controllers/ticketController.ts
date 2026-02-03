/**
 * チケットコントローラー
 *
 * 機能:
 * - GET /api/tickets - ログイン中のユーザーのデジタルチケット一覧取得
 * - GET /api/tickets/:ticketId/qr - 特定チケットのQRコード生成
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import QRCode from 'qrcode';

const prisma = new PrismaClient();

/**
 * GET /api/tickets
 * ログイン中のユーザーのデジタルチケット一覧を取得
 *
 * 条件:
 * - product.productType === 'event'
 * - order.status === 'paid' または 'completed'（支払い完了済み）
 */
export async function getTickets(req: Request, res: Response) {
  try {
    // 認証チェック
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'ログインが必要です',
      });
    }

    const userId = req.session.userId;

    // ログインユーザーの注文から、イベント商品のチケットを取得
    const tickets = await prisma.digitalTicket.findMany({
      where: {
        order: {
          userId,
          // 支払い完了済みの注文のみ
          status: {
            in: ['paid', 'completed'],
          },
        },
        product: {
          productType: 'event',
        },
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            createdAt: true,
            status: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
          },
        },
        orderItem: {
          select: {
            quantity: true,
            price: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.json({
      success: true,
      tickets,
    });
  } catch (error: any) {
    console.error('チケット一覧取得エラー:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'チケット一覧の取得に失敗しました',
    });
  }
}

/**
 * GET /api/tickets/:ticketId/qr
 * 特定チケットのQRコードを生成（Base64エンコード画像）
 *
 * セキュリティ:
 * - ログインユーザー自身のチケットのみ取得可能
 * - QRコードにはticketCodeを含める
 */
export async function getTicketQR(req: Request, res: Response) {
  try {
    // 認証チェック
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'ログインが必要です',
      });
    }

    const userId = req.session.userId;
    const { ticketId } = req.params;

    // チケットを取得（ログインユーザーのチケットのみ）
    const ticket = await prisma.digitalTicket.findFirst({
      where: {
        id: ticketId,
        order: {
          userId,
        },
      },
      include: {
        order: {
          select: {
            orderNumber: true,
          },
        },
        product: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'チケットが見つかりません',
      });
    }

    // QRコードを生成（ticketCodeをBase64エンコード）
    try {
      const qrCodeDataURL = await QRCode.toDataURL(ticket.ticketCode, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 300,
        margin: 2,
      });

      return res.json({
        success: true,
        qrCode: qrCodeDataURL, // Base64エンコードされた画像データ
        ticket: {
          id: ticket.id,
          ticketCode: ticket.ticketCode,
          isUsed: ticket.isUsed,
          usedAt: ticket.usedAt,
          orderNumber: ticket.order.orderNumber,
          productName: ticket.product.name,
          createdAt: ticket.createdAt,
        },
      });
    } catch (qrError: any) {
      console.error('QRコード生成エラー:', qrError);
      return res.status(500).json({
        success: false,
        message: 'QRコードの生成に失敗しました',
      });
    }
  } catch (error: any) {
    console.error('チケットQR取得エラー:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'チケットQRコードの取得に失敗しました',
    });
  }
}

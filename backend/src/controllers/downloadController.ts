/**
 * デジタルダウンロードコントローラー
 *
 * 機能:
 * - 注文に紐づくデジタル商品のダウンロードリンク取得
 * - ダウンロード回数制限（最大5回）
 * - 署名付きURL生成（24時間有効）
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateSignedUrl } from '../utils/r2Client';

const prisma = new PrismaClient();

/**
 * GET /api/orders/:orderId/downloads
 * デジタルダウンロードリンク取得
 */
export async function getDigitalDownloads(req: Request, res: Response) {
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
        digitalDownloads: {
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

    // デジタル商品がない場合
    if (order.digitalDownloads.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'この注文にデジタル商品は含まれていません',
      });
    }

    // 署名付きURLを生成
    const downloads = await Promise.all(
      order.digitalDownloads.map(async (download) => {
        // ダウンロード回数チェック
        if (download.downloadCount >= download.maxDownloads) {
          return {
            id: download.id,
            productId: download.productId,
            productName: download.product.name,
            fileName: download.fileName,
            downloadCount: download.downloadCount,
            maxDownloads: download.maxDownloads,
            lastDownloadedAt: download.lastDownloadedAt,
            expiresAt: download.expiresAt,
            downloadUrl: null,
            isExpired: true,
            message: 'ダウンロード回数の上限に達しました',
          };
        }

        // 有効期限チェック
        if (download.expiresAt && new Date() > download.expiresAt) {
          return {
            id: download.id,
            productId: download.productId,
            productName: download.product.name,
            fileName: download.fileName,
            downloadCount: download.downloadCount,
            maxDownloads: download.maxDownloads,
            lastDownloadedAt: download.lastDownloadedAt,
            expiresAt: download.expiresAt,
            downloadUrl: null,
            isExpired: true,
            message: 'ダウンロード期限が過ぎています',
          };
        }

        // 署名付きURLを生成
        const signedUrl = await generateSignedUrl(download.r2FileKey);

        // ダウンロード回数を更新
        await prisma.digitalDownload.update({
          where: { id: download.id },
          data: {
            downloadCount: download.downloadCount + 1,
            lastDownloadedAt: new Date(),
          },
        });

        return {
          id: download.id,
          productId: download.productId,
          productName: download.product.name,
          fileName: download.fileName,
          downloadCount: download.downloadCount + 1,
          maxDownloads: download.maxDownloads,
          lastDownloadedAt: new Date(),
          expiresAt: download.expiresAt,
          downloadUrl: signedUrl,
          urlExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24時間後
          isExpired: false,
        };
      })
    );

    return res.json({
      success: true,
      downloads,
    });
  } catch (error: any) {
    console.error('デジタルダウンロード取得エラー:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'ダウンロードリンクの取得に失敗しました',
    });
  }
}

/**
 * 管理者用イベント管理コントローラー
 *
 * イベントはProduct(productType='event')として実装
 * 参加者はDigitalTicketとして管理
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ヘルパー関数: req.query/req.params の値を string | undefined に変換
const getStringParam = (value: any): string | undefined => {
  if (Array.isArray(value)) return value[0];
  if (typeof value === 'string') return value;
  return undefined;
};

/**
 * GET /api/admin/events - イベント一覧取得
 *
 * クエリパラメータ:
 * - page: ページ番号（デフォルト1）
 * - limit: 取得件数（デフォルト20）
 * - search: 検索キーワード（イベント名）
 * - status: 販売状態フィルタ（active, inactive）
 * - dateFrom: 開催日フィルタ（開始日）
 * - dateTo: 開催日フィルタ（終了日）
 */
export async function getEvents(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    // 将来の拡張用: dateFrom, dateTo（現在未使用）
    // const dateFrom = req.query.dateFrom as string | undefined;
    // const dateTo = req.query.dateTo as string | undefined;

    const skip = (page - 1) * limit;

    // フィルタ条件構築
    // 商品登録の「イベントチケット」は productType='DIGITAL_TICKET'。
    // 旧データの 'event' も互換で拾う。
    const where: any = {
      productType: { in: ['DIGITAL_TICKET', 'event'] },
    };

    // 検索キーワード
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // 販売状態フィルタ
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    // 開催日フィルタ（将来の拡張用 - 現在はスキップ）
    // TODO: eventAttributes JSONフィールドを追加後に実装
    // if (dateFrom || dateTo) {
    //   where.eventAttributes = {
    //     path: ['eventDate'],
    //     ...(dateFrom && dateTo
    //       ? { gte: dateFrom, lte: dateTo }
    //       : dateFrom
    //       ? { gte: dateFrom }
    //       : { lte: dateTo }),
    //   };
    // }

    // イベント一覧取得
    const events = await prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        images: true,
        _count: {
          select: {
            digitalTickets: true, // 参加者数
          },
        },
      },
    });

    // 総件数取得
    const total = await prisma.product.count({ where });

    // レスポンス整形
    const eventList = events.map((event) => ({
      id: event.id,
      name: event.name,
      description: event.description,
      price: event.price,
      isActive: event.isActive,
      participantCount: event._count.digitalTickets,
      images: event.images,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    }));

    return res.json({
      success: true,
      events: eventList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('イベント一覧取得エラー:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'イベント一覧の取得に失敗しました',
    });
  }
}

/**
 * POST /api/admin/events - イベント作成
 *
 * リクエストボディ:
 * - name: イベント名（必須）
 * - description: 説明（必須）
 * - price: 参加費（必須、0以上）
 * - isActive: 販売状態（デフォルトtrue）
 * - slug: URL用スラッグ（必須）
 * - categoryId: カテゴリーID（任意）
 */
export async function createEvent(req: Request, res: Response) {
  try {
    const {
      name,
      description,
      price,
      isActive = true,
      slug,
      categoryId,
    } = req.body;

    // バリデーション
    if (!name || !description || price === undefined || !slug) {
      return res.status(400).json({
        success: false,
        message: 'イベント名、説明、参加費、スラッグは必須です',
      });
    }

    if (price < 0) {
      return res.status(400).json({
        success: false,
        message: '参加費は0以上である必要があります',
      });
    }

    // スラッグ重複チェック
    const existingProduct = await prisma.product.findUnique({
      where: { slug },
    });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'このスラッグは既に使用されています',
      });
    }

    // イベント作成（Product作成）
    const event = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        price,
        isActive,
        productType: 'event',
        categoryId: categoryId || null,
      },
      include: {
        images: true,
      },
    });

    return res.status(201).json({
      success: true,
      event: {
        id: event.id,
        name: event.name,
        slug: event.slug,
        description: event.description,
        price: event.price,
        isActive: event.isActive,
        categoryId: event.categoryId,
        images: event.images,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('イベント作成エラー:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'イベントの作成に失敗しました',
    });
  }
}

/**
 * GET /api/admin/events/:id - イベント詳細取得
 *
 * パスパラメータ:
 * - id: イベントID（Product ID）
 *
 * レスポンス:
 * - イベント基本情報
 * - 参加者数
 * - 画像一覧
 * - カスタムフォーム設定
 */
export async function getEventById(req: Request, res: Response) {
  try {
    const id = getStringParam(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: 'イベントIDが必要です' });
    }

    const event = await prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        _count: {
          select: {
            digitalTickets: true,
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'イベントが見つかりません',
      });
    }

    if (!['DIGITAL_TICKET', 'event'].includes(event.productType)) {
      return res.status(400).json({
        success: false,
        message: 'この商品はイベントではありません',
      });
    }

    // 参加者統計取得
    const participants = await prisma.digitalTicket.findMany({
      where: { productId: getStringParam(req.params.id) || id },
      select: {
        isUsed: true,
        usedAt: true,
      },
    });

    const usedCount = participants.filter((p) => p.isUsed).length;

    return res.json({
      success: true,
      event: {
        id: event.id,
        name: event.name,
        slug: event.slug,
        description: event.description,
        price: event.price,
        isActive: event.isActive,
        categoryId: event.categoryId,
        participantCount: event._count.digitalTickets,
        usedTicketCount: usedCount,
        images: event.images,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('イベント詳細取得エラー:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'イベント詳細の取得に失敗しました',
    });
  }
}

/**
 * POST /api/admin/events/:id/form - カスタムフォーム設定
 *
 * パスパラメータ:
 * - id: イベントID
 *
 * リクエストボディ:
 * - formTemplate: カスタムフォームテンプレート（JSON形式）
 *
 * 注: 現在のスキーマではeventAttributesフィールドがないため、
 * 実装はスキーマ更新後に行う予定
 */
export async function setEventForm(req: Request, res: Response) {
  try {
    const id = getStringParam(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: 'イベントIDが必要です' });
    }

    const { formTemplate } = req.body;

    // バリデーション: formTemplate と fields配列が必須
    if (!formTemplate || typeof formTemplate !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'formTemplate（フォームテンプレート）が必要です',
      });
    }

    if (!Array.isArray(formTemplate.fields)) {
      return res.status(400).json({
        success: false,
        message: 'formTemplate.fields（フィールド配列）が必要です',
      });
    }

    // イベント存在確認
    const event = await prisma.product.findUnique({
      where: { id },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'イベントが見つかりません',
      });
    }

    if (!['DIGITAL_TICKET', 'event'].includes(event.productType)) {
      return res.status(400).json({
        success: false,
        message: 'この商品はイベントではありません',
      });
    }

    // フィールドにIDを付与（フロントは id/templateId を省略して送る）
    const fieldsWithIds = formTemplate.fields.map((field: any, index: number) => ({
      ...field,
      id: field.id ?? `field-${id}-${index}`,
      templateId: id,
      order: field.order ?? index,
    }));

    const savedTemplate = {
      id,
      eventId: id,
      name: formTemplate.name ?? 'カスタムフォーム',
      description: formTemplate.description ?? '',
      fields: fieldsWithIds,
    };

    // eventAttributes(JSON文字列)としてProductに保存
    await prisma.product.update({
      where: { id },
      data: { eventAttributes: JSON.stringify(savedTemplate) },
    });

    return res.json({
      success: true,
      message: 'フォームテンプレートを保存しました',
      formTemplate: savedTemplate,
    });
  } catch (error: any) {
    console.error('フォーム設定エラー:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'フォームの設定に失敗しました',
    });
  }
}

/**
 * GET /api/admin/events/:id/form - カスタムフォーム取得
 *
 * パスパラメータ:
 * - id: イベントID
 */
export async function getEventForm(req: Request, res: Response) {
  try {
    const id = getStringParam(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: 'イベントIDが必要です' });
    }

    const event = await prisma.product.findUnique({
      where: { id },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'イベントが見つかりません',
      });
    }

    if (!['DIGITAL_TICKET', 'event'].includes(event.productType)) {
      return res.status(400).json({
        success: false,
        message: 'この商品はイベントではありません',
      });
    }

    // 未設定の場合は空のフォームテンプレートを返す
    let formTemplate: unknown = {
      id,
      eventId: id,
      name: '',
      description: '',
      fields: [],
    };

    if (event.eventAttributes) {
      try {
        formTemplate = JSON.parse(event.eventAttributes);
      } catch {
        // パース失敗時は空テンプレートのまま
      }
    }

    return res.json({
      success: true,
      formTemplate,
    });
  } catch (error: any) {
    console.error('フォーム取得エラー:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'フォームの取得に失敗しました',
    });
  }
}

/**
 * GET /api/admin/events/:id/participants - 参加者リスト取得
 *
 * パスパラメータ:
 * - id: イベントID
 *
 * クエリパラメータ:
 * - page: ページ番号（デフォルト1）
 * - limit: 取得件数（デフォルト50）
 * - search: 検索キーワード（注文者名・メール）
 * - status: 使用状態フィルタ（used, unused）
 */
export async function getEventParticipants(req: Request, res: Response) {
  try {
    const id = getStringParam(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: 'イベントIDが必要です' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = getStringParam(req.query.search);
    const status = getStringParam(req.query.status);

    const skip = (page - 1) * limit;

    // イベント存在確認
    const event = await prisma.product.findUnique({
      where: { id },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'イベントが見つかりません',
      });
    }

    if (!['DIGITAL_TICKET', 'event'].includes(event.productType)) {
      return res.status(400).json({
        success: false,
        message: 'この商品はイベントではありません',
      });
    }

    // フィルタ条件構築
    const where: any = {
      productId: id,
    };

    // 使用状態フィルタ
    if (status === 'used') {
      where.isUsed = true;
    } else if (status === 'unused') {
      where.isUsed = false;
    }

    // 参加者（デジタルチケット）取得
    const tickets = await prisma.digitalTicket.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            createdAt: true,
          },
        },
      },
    });

    // 検索フィルタ（メモリ上でフィルタリング）
    let filteredTickets = tickets;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredTickets = tickets.filter(
        (ticket) =>
          ticket.order.customerName.toLowerCase().includes(searchLower) ||
          ticket.order.customerEmail.toLowerCase().includes(searchLower)
      );
    }

    // 総件数取得
    const total = await prisma.digitalTicket.count({ where });

    // レスポンス整形
    const participants = filteredTickets.map((ticket) => ({
      ticketId: ticket.id,
      ticketCode: ticket.ticketCode,
      orderNumber: ticket.order.orderNumber,
      customerName: ticket.order.customerName,
      customerEmail: ticket.order.customerEmail,
      customerPhone: ticket.order.customerPhone,
      isUsed: ticket.isUsed,
      usedAt: ticket.usedAt,
      purchasedAt: ticket.order.createdAt,
    }));

    return res.json({
      success: true,
      participants,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalParticipants: total,
        usedTickets: filteredTickets.filter((t) => t.isUsed).length,
        unusedTickets: filteredTickets.filter((t) => !t.isUsed).length,
      },
    });
  } catch (error: any) {
    console.error('参加者リスト取得エラー:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '参加者リストの取得に失敗しました',
    });
  }
}

/**
 * GET /api/admin/events/:id/participants/export/csv - CSV出力
 *
 * パスパラメータ:
 * - id: イベントID
 */
export async function exportParticipantsCSV(req: Request, res: Response) {
  try {
    const id = getStringParam(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: 'イベントIDが必要です' });
    }

    // イベント存在確認
    const event = await prisma.product.findUnique({
      where: { id },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'イベントが見つかりません',
      });
    }

    if (!['DIGITAL_TICKET', 'event'].includes(event.productType)) {
      return res.status(400).json({
        success: false,
        message: 'この商品はイベントではありません',
      });
    }

    // 全参加者取得
    const tickets = await prisma.digitalTicket.findMany({
      where: { productId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: {
            orderNumber: true,
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            createdAt: true,
          },
        },
      },
    });

    // CSV生成
    const headers = [
      'チケットコード',
      '注文番号',
      '参加者名',
      'メールアドレス',
      '電話番号',
      '使用状態',
      '使用日時',
      '購入日時',
    ];

    const rows = tickets.map((ticket) => [
      ticket.ticketCode,
      ticket.order.orderNumber,
      ticket.order.customerName,
      ticket.order.customerEmail,
      ticket.order.customerPhone || '',
      ticket.isUsed ? '使用済み' : '未使用',
      ticket.usedAt ? ticket.usedAt.toISOString() : '',
      ticket.order.createdAt.toISOString(),
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    // BOM付きUTF-8でエンコード（Excel対応）
    const bom = '\uFEFF';
    const csvWithBom = bom + csvContent;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="participants-${event.slug}-${Date.now()}.csv"`
    );
    return res.send(csvWithBom);
  } catch (error: any) {
    console.error('CSV出力エラー:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'CSVの出力に失敗しました',
    });
  }
}

/**
 * GET /api/admin/events/:id/participants/export/excel - Excel出力
 *
 * パスパラメータ:
 * - id: イベントID
 *
 * 注: 簡易実装としてCSV形式で出力（Excel互換）
 * 本格的なExcel形式が必要な場合はexceljsライブラリを使用
 */
export async function exportParticipantsExcel(req: Request, res: Response) {
  try {
    const id = getStringParam(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: 'イベントIDが必要です' });
    }

    // イベント存在確認
    const event = await prisma.product.findUnique({
      where: { id },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'イベントが見つかりません',
      });
    }

    if (!['DIGITAL_TICKET', 'event'].includes(event.productType)) {
      return res.status(400).json({
        success: false,
        message: 'この商品はイベントではありません',
      });
    }

    // 全参加者取得
    const tickets = await prisma.digitalTicket.findMany({
      where: { productId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: {
            orderNumber: true,
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            createdAt: true,
          },
        },
      },
    });

    // CSV生成（Excel互換）
    const headers = [
      'チケットコード',
      '注文番号',
      '参加者名',
      'メールアドレス',
      '電話番号',
      '使用状態',
      '使用日時',
      '購入日時',
    ];

    const rows = tickets.map((ticket) => [
      ticket.ticketCode,
      ticket.order.orderNumber,
      ticket.order.customerName,
      ticket.order.customerEmail,
      ticket.order.customerPhone || '',
      ticket.isUsed ? '使用済み' : '未使用',
      ticket.usedAt ? ticket.usedAt.toISOString() : '',
      ticket.order.createdAt.toISOString(),
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    // BOM付きUTF-8でエンコード（Excel対応）
    const bom = '\uFEFF';
    const csvWithBom = bom + csvContent;

    // Excel用のContent-Type
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="participants-${event.slug}-${Date.now()}.xls"`
    );
    return res.send(csvWithBom);
  } catch (error: any) {
    console.error('Excel出力エラー:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Excelの出力に失敗しました',
    });
  }
}

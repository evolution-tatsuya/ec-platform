import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ========================================
// システム設定API（スライス8-A）
// ========================================

/**
 * GET /api/admin/settings
 * 全設定取得
 */
export const getAdminSettings = async (_req: Request, res: Response) => {
  try {
    // サイト設定取得（最初の1件）
    let settings = await prisma.siteSettings.findFirst();

    // 設定が存在しない場合はデフォルト値で作成
    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: {},
      });
    }

    return res.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('設定取得エラー:', error);
    return res.status(500).json({ error: '設定の取得に失敗しました' });
  }
};

/**
 * PUT /api/admin/settings/company
 * 会社情報更新
 */
export const updateCompanySettings = async (req: Request, res: Response) => {
  try {
    const {
      companyName,
      companyLogoUrl,
      companyPostalCode,
      companyAddress,
      companyPhone,
      bankName,
      bankBranch,
      bankAccountType,
      bankAccountNumber,
      bankAccountHolder,
    } = req.body;

    // 既存設定を取得
    let settings = await prisma.siteSettings.findFirst();

    if (!settings) {
      // 存在しない場合は作成
      settings = await prisma.siteSettings.create({
        data: {
          companyName,
          companyLogoUrl,
          companyPostalCode,
          companyAddress,
          companyPhone,
          bankName,
          bankBranch,
          bankAccountType,
          bankAccountNumber,
          bankAccountHolder,
        },
      });
    } else {
      // 存在する場合は更新
      settings = await prisma.siteSettings.update({
        where: { id: settings.id },
        data: {
          companyName,
          companyLogoUrl,
          companyPostalCode,
          companyAddress,
          companyPhone,
          bankName,
          bankBranch,
          bankAccountType,
          bankAccountNumber,
          bankAccountHolder,
        },
      });
    }

    return res.json({
      success: true,
      message: '会社情報を更新しました',
      settings,
    });
  } catch (error) {
    console.error('会社情報更新エラー:', error);
    return res.status(500).json({ error: '会社情報の更新に失敗しました' });
  }
};

/**
 * PUT /api/admin/settings/payment
 * 決済設定更新
 */
export const updatePaymentSettings = async (req: Request, res: Response) => {
  try {
    const {
      enableBankTransfer,
      bankTransferDiscount,
      enableCreditCard,
    } = req.body;

    // 既存設定を取得
    let settings = await prisma.siteSettings.findFirst();

    if (!settings) {
      // 存在しない場合は作成
      settings = await prisma.siteSettings.create({
        data: {
          enableBankTransfer,
          bankTransferDiscount,
          enableCreditCard,
        },
      });
    } else {
      // 存在する場合は更新
      settings = await prisma.siteSettings.update({
        where: { id: settings.id },
        data: {
          enableBankTransfer,
          bankTransferDiscount,
          enableCreditCard,
        },
      });
    }

    return res.json({
      success: true,
      message: '決済設定を更新しました',
      settings,
    });
  } catch (error) {
    console.error('決済設定更新エラー:', error);
    return res.status(500).json({ error: '決済設定の更新に失敗しました' });
  }
};

/**
 * PUT /api/admin/settings/email
 * メール設定更新
 */
export const updateEmailSettings = async (req: Request, res: Response) => {
  try {
    const { emailFrom } = req.body;

    // 既存設定を取得
    let settings = await prisma.siteSettings.findFirst();

    if (!settings) {
      // 存在しない場合は作成
      settings = await prisma.siteSettings.create({
        data: {
          emailFrom,
        },
      });
    } else {
      // 存在する場合は更新
      settings = await prisma.siteSettings.update({
        where: { id: settings.id },
        data: {
          emailFrom,
        },
      });
    }

    return res.json({
      success: true,
      message: 'メール設定を更新しました',
      settings,
    });
  } catch (error) {
    console.error('メール設定更新エラー:', error);
    return res.status(500).json({ error: 'メール設定の更新に失敗しました' });
  }
};

/**
 * PUT /api/admin/settings/document-templates
 * 書類テンプレート設定更新
 *
 * Note: 書類テンプレートの実際の内容は別テーブル or JSON形式で保存される可能性があるため、
 * ここでは将来の拡張を考慮してプレースホルダーを実装
 */
export const updateDocumentTemplateSettings = async (_req: Request, res: Response) => {
  try {
    // 将来的には書類テンプレートデータを受け取る
    // 現時点ではSiteSettingsに直接フィールドがないため、エラーなく処理を完了させる

    const settings = await prisma.siteSettings.findFirst();

    if (!settings) {
      await prisma.siteSettings.create({
        data: {},
      });
    }

    return res.json({
      success: true,
      message: '書類テンプレート設定を更新しました',
    });
  } catch (error) {
    console.error('書類テンプレート設定更新エラー:', error);
    return res.status(500).json({ error: '書類テンプレート設定の更新に失敗しました' });
  }
};

/**
 * PUT /api/admin/settings/image-optimization
 * 画像最適化設定更新
 */
export const updateImageOptimizationSettings = async (req: Request, res: Response) => {
  try {
    const {
      enableWebpConversion,
      imageQuality,
      thumbnailSize,
    } = req.body;

    // 既存設定を取得
    let settings = await prisma.siteSettings.findFirst();

    if (!settings) {
      // 存在しない場合は作成
      settings = await prisma.siteSettings.create({
        data: {
          enableWebpConversion,
          imageQuality,
          thumbnailSize,
        },
      });
    } else {
      // 存在する場合は更新
      settings = await prisma.siteSettings.update({
        where: { id: settings.id },
        data: {
          enableWebpConversion,
          imageQuality,
          thumbnailSize,
        },
      });
    }

    return res.json({
      success: true,
      message: '画像最適化設定を更新しました',
      settings,
    });
  } catch (error) {
    console.error('画像最適化設定更新エラー:', error);
    return res.status(500).json({ error: '画像最適化設定の更新に失敗しました' });
  }
};

// ========================================
// ナビゲーション軸API（スライス8-B）
// ========================================

/**
 * GET /api/admin/navigation-axes
 * ナビゲーション軸一覧取得
 */
export const getNavigationAxes = async (req: Request, res: Response) => {
  try {
    const categoryType = typeof req.query.categoryType === 'string'
      ? req.query.categoryType
      : Array.isArray(req.query.categoryType)
        ? req.query.categoryType[0]
        : undefined;

    const where: any = {};
    if (categoryType) {
      where.categoryType = categoryType;
    }

    const axes = await prisma.navigationAxis.findMany({
      where,
      include: {
        options: {
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    });

    return res.json({
      success: true,
      axes,
    });
  } catch (error) {
    console.error('ナビゲーション軸取得エラー:', error);
    return res.status(500).json({ error: 'ナビゲーション軸の取得に失敗しました' });
  }
};

/**
 * GET /api/admin/navigation-axes/:category
 * カテゴリー別ナビゲーション軸取得
 */
export const getNavigationAxesByCategory = async (req: Request, res: Response) => {
  try {
    const category = typeof req.params.category === 'string' ? req.params.category : req.params.category[0];

    const axes = await prisma.navigationAxis.findMany({
      where: {
        categoryType: category,
      },
      include: {
        options: {
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    });

    return res.json({
      success: true,
      axes,
    });
  } catch (error) {
    console.error('カテゴリー別ナビゲーション軸取得エラー:', error);
    return res.status(500).json({ error: 'カテゴリー別ナビゲーション軸の取得に失敗しました' });
  }
};

/**
 * POST /api/admin/navigation-axes
 * ナビゲーション軸追加
 */
export const createNavigationAxis = async (req: Request, res: Response) => {
  try {
    const { categoryType, axisName, axisKey, axisType, displayType, icon, options } = req.body;

    if (!categoryType || !axisName || !axisKey || !axisType || !displayType) {
      return res.status(400).json({ error: '必須項目が不足しています' });
    }

    // 最大order値を取得
    const maxAxis = await prisma.navigationAxis.findFirst({
      where: { categoryType },
      orderBy: { order: 'desc' },
    });
    const newOrder = maxAxis ? maxAxis.order + 1 : 0;

    // 軸作成
    const axis = await prisma.navigationAxis.create({
      data: {
        categoryType,
        axisName,
        axisKey,
        axisType,
        displayType,
        icon,
        order: newOrder,
        options: options
          ? {
              create: options.map((opt: any, index: number) => ({
                label: opt.label,
                value: opt.value,
                order: index,
              })),
            }
          : undefined,
      },
      include: {
        options: true,
      },
    });

    return res.json({
      success: true,
      message: 'ナビゲーション軸を追加しました',
      axis,
    });
  } catch (error) {
    console.error('ナビゲーション軸追加エラー:', error);
    return res.status(500).json({ error: 'ナビゲーション軸の追加に失敗しました' });
  }
};

/**
 * PUT /api/admin/navigation-axes/:id
 * ナビゲーション軸更新
 */
export const updateNavigationAxis = async (req: Request, res: Response) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
    if (!id) {
      return res.status(400).json({ error: 'ナビゲーション軸IDが必要です' });
    }

    const { axisName, axisKey, axisType, displayType, icon, isActive, options } = req.body;

    // 軸存在確認
    const axis = await prisma.navigationAxis.findUnique({
      where: { id },
    });

    if (!axis) {
      return res.status(404).json({ error: 'ナビゲーション軸が見つかりません' });
    }

    // 軸更新（optionsは別途更新）
    await prisma.navigationAxis.update({
      where: { id },
      data: {
        axisName,
        axisKey,
        axisType,
        displayType,
        icon,
        isActive,
      },
      include: {
        options: true,
      },
    });

    // optionsが提供されている場合は更新
    if (options) {
      // 既存のオプションを全削除
      await prisma.navigationAxisOption.deleteMany({
        where: { navigationAxisId: id },
      });

      // 新しいオプションを作成
      await prisma.navigationAxisOption.createMany({
        data: options.map((opt: any, index: number) => ({
          navigationAxisId: id,
          label: opt.label,
          value: opt.value,
          order: index,
        })),
      });
    }

    // 更新後のデータを取得
    const finalAxis = await prisma.navigationAxis.findUnique({
      where: { id },
      include: {
        options: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    return res.json({
      success: true,
      message: 'ナビゲーション軸を更新しました',
      axis: finalAxis,
    });
  } catch (error) {
    console.error('ナビゲーション軸更新エラー:', error);
    return res.status(500).json({ error: 'ナビゲーション軸の更新に失敗しました' });
  }
};

/**
 * DELETE /api/admin/navigation-axes/:id
 * ナビゲーション軸削除
 */
export const deleteNavigationAxis = async (req: Request, res: Response) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
    if (!id) {
      return res.status(400).json({ error: 'ナビゲーション軸IDが必要です' });
    }

    // 軸存在確認
    const axis = await prisma.navigationAxis.findUnique({
      where: { id },
    });

    if (!axis) {
      return res.status(404).json({ error: 'ナビゲーション軸が見つかりません' });
    }

    // 削除
    await prisma.navigationAxis.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: 'ナビゲーション軸を削除しました',
    });
  } catch (error) {
    console.error('ナビゲーション軸削除エラー:', error);
    return res.status(500).json({ error: 'ナビゲーション軸の削除に失敗しました' });
  }
};

/**
 * PUT /api/admin/navigation-axes/:id/order
 * ナビゲーション軸の表示順序変更
 */
export const updateNavigationAxisOrder = async (req: Request, res: Response) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
    if (!id) {
      return res.status(400).json({ error: 'ナビゲーション軸IDが必要です' });
    }

    const { newOrder } = req.body;

    if (typeof newOrder !== 'number') {
      return res.status(400).json({ error: '新しい順序が必要です' });
    }

    // 軸存在確認
    const axis = await prisma.navigationAxis.findUnique({
      where: { id },
    });

    if (!axis) {
      return res.status(404).json({ error: 'ナビゲーション軸が見つかりません' });
    }

    const oldOrder = axis.order;

    // 同じカテゴリーの他の軸の順序を調整
    if (newOrder < oldOrder) {
      // 上に移動
      await prisma.navigationAxis.updateMany({
        where: {
          categoryType: axis.categoryType,
          order: {
            gte: newOrder,
            lt: oldOrder,
          },
        },
        data: {
          order: {
            increment: 1,
          },
        },
      });
    } else if (newOrder > oldOrder) {
      // 下に移動
      await prisma.navigationAxis.updateMany({
        where: {
          categoryType: axis.categoryType,
          order: {
            gt: oldOrder,
            lte: newOrder,
          },
        },
        data: {
          order: {
            decrement: 1,
          },
        },
      });
    }

    // 対象の軸の順序を更新
    const updatedAxis = await prisma.navigationAxis.update({
      where: { id },
      data: { order: newOrder },
      include: {
        options: true,
      },
    });

    return res.json({
      success: true,
      message: '表示順序を更新しました',
      axis: updatedAxis,
    });
  } catch (error) {
    console.error('表示順序更新エラー:', error);
    return res.status(500).json({ error: '表示順序の更新に失敗しました' });
  }
};

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/admin/navigation-axes
 * ナビゲーション軸一覧取得
 */
export const getNavigationAxes = async (req: Request, res: Response) => {
  try {
    const { categoryType } = req.query;

    const where: any = {};
    if (categoryType) {
      where.categoryType = categoryType as string;
    }

    const axes = await prisma.navigationAxis.findMany({
      where,
      include: {
        options: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    res.json({ axes });
  } catch (error) {
    console.error('ナビゲーション軸一覧取得エラー:', error);
    res.status(500).json({ error: 'ナビゲーション軸一覧の取得に失敗しました' });
  }
};

/**
 * GET /api/admin/navigation-axes/:id
 * ナビゲーション軸詳細取得
 */
export const getNavigationAxisById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const axis = await prisma.navigationAxis.findUnique({
      where: { id },
      include: {
        options: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!axis) {
      return res.status(404).json({ error: 'ナビゲーション軸が見つかりません' });
    }

    res.json(axis);
  } catch (error) {
    console.error('ナビゲーション軸詳細取得エラー:', error);
    res.status(500).json({ error: 'ナビゲーション軸詳細の取得に失敗しました' });
  }
};

/**
 * POST /api/admin/navigation-axes
 * ナビゲーション軸作成
 */
export const createNavigationAxis = async (req: Request, res: Response) => {
  try {
    const { categoryType, axisName, axisKey, axisType, displayType, icon, order, options } = req.body;

    // バリデーション
    if (!categoryType || !axisName || !axisKey || !axisType || !displayType) {
      return res.status(400).json({ error: '必須項目が不足しています' });
    }

    // トランザクションで作成
    const axis = await prisma.$transaction(async (tx) => {
      // 軸を作成
      const newAxis = await tx.navigationAxis.create({
        data: {
          categoryType,
          axisName,
          axisKey,
          axisType,
          displayType,
          icon,
          order: order ?? 0,
        },
      });

      // 選択肢があれば作成
      if (options && Array.isArray(options) && options.length > 0) {
        await tx.navigationAxisOption.createMany({
          data: options.map((opt: any, index: number) => ({
            navigationAxisId: newAxis.id,
            label: opt.label,
            value: opt.value,
            order: opt.order ?? index,
          })),
        });
      }

      // 選択肢を含めて返す
      return await tx.navigationAxis.findUnique({
        where: { id: newAxis.id },
        include: {
          options: {
            orderBy: { order: 'asc' },
          },
        },
      });
    });

    res.status(201).json({ message: 'ナビゲーション軸を作成しました', axis });
  } catch (error) {
    console.error('ナビゲーション軸作成エラー:', error);
    res.status(500).json({ error: 'ナビゲーション軸の作成に失敗しました' });
  }
};

/**
 * PUT /api/admin/navigation-axes/:id
 * ナビゲーション軸更新
 */
export const updateNavigationAxis = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { categoryType, axisName, axisKey, axisType, displayType, icon, order, isActive, options } = req.body;

    // 軸の存在確認
    const existingAxis = await prisma.navigationAxis.findUnique({
      where: { id },
    });

    if (!existingAxis) {
      return res.status(404).json({ error: 'ナビゲーション軸が見つかりません' });
    }

    // トランザクションで更新
    const axis = await prisma.$transaction(async (tx) => {
      // 軸を更新
      const updatedAxis = await tx.navigationAxis.update({
        where: { id },
        data: {
          categoryType,
          axisName,
          axisKey,
          axisType,
          displayType,
          icon,
          order,
          isActive,
        },
      });

      // 選択肢が提供された場合、既存を削除して再作成
      if (options && Array.isArray(options)) {
        // 既存選択肢を削除
        await tx.navigationAxisOption.deleteMany({
          where: { navigationAxisId: id },
        });

        // 新しい選択肢を作成
        if (options.length > 0) {
          await tx.navigationAxisOption.createMany({
            data: options.map((opt: any, index: number) => ({
              navigationAxisId: id,
              label: opt.label,
              value: opt.value,
              order: opt.order ?? index,
            })),
          });
        }
      }

      // 選択肢を含めて返す
      return await tx.navigationAxis.findUnique({
        where: { id },
        include: {
          options: {
            orderBy: { order: 'asc' },
          },
        },
      });
    });

    res.json({ message: 'ナビゲーション軸を更新しました', axis });
  } catch (error) {
    console.error('ナビゲーション軸更新エラー:', error);
    res.status(500).json({ error: 'ナビゲーション軸の更新に失敗しました' });
  }
};

/**
 * DELETE /api/admin/navigation-axes/:id
 * ナビゲーション軸削除
 */
export const deleteNavigationAxis = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 軸の存在確認
    const existingAxis = await prisma.navigationAxis.findUnique({
      where: { id },
    });

    if (!existingAxis) {
      return res.status(404).json({ error: 'ナビゲーション軸が見つかりません' });
    }

    // 削除（Cascadeで選択肢も削除される）
    await prisma.navigationAxis.delete({
      where: { id },
    });

    res.json({ message: 'ナビゲーション軸を削除しました' });
  } catch (error) {
    console.error('ナビゲーション軸削除エラー:', error);
    res.status(500).json({ error: 'ナビゲーション軸の削除に失敗しました' });
  }
};

/**
 * PUT /api/admin/navigation-axes/reorder
 * ナビゲーション軸の並び替え
 */
export const reorderNavigationAxes = async (req: Request, res: Response) => {
  try {
    const { axisIds } = req.body;

    if (!Array.isArray(axisIds) || axisIds.length === 0) {
      return res.status(400).json({ error: '無効なデータです' });
    }

    // トランザクションで一括更新
    await prisma.$transaction(
      axisIds.map((id: string, index: number) =>
        prisma.navigationAxis.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    res.json({ message: 'ナビゲーション軸の順序を更新しました' });
  } catch (error) {
    console.error('ナビゲーション軸並び替えエラー:', error);
    res.status(500).json({ error: 'ナビゲーション軸の並び替えに失敗しました' });
  }
};

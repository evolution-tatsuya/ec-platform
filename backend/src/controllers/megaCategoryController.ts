// ===== メガカテゴリー管理コントローラー（管理者） =====

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { createError } from '../middleware/errorHandler';
import { uploadFile, deleteFile, generateSignedUrl } from '../utils/r2Client';
import sharp from 'sharp';

const getStringParam = (p: string | string[] | undefined): string | undefined =>
  Array.isArray(p) ? p[0] : p;

const resolveUrl = async (value?: string | null): Promise<string> => {
  if (!value) return '';
  if (value.startsWith('http')) return value;
  try {
    return await generateSignedUrl(value);
  } catch {
    return '';
  }
};

/**
 * メガカテゴリー一覧（管理者）
 * GET /api/admin/mega-categories
 */
export const getAdminMegaCategories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cats = await prisma.megaCategory.findMany({ orderBy: { order: 'asc' } });
    const withUrls = await Promise.all(
      cats.map(async (c) => ({
        ...c,
        imageDisplayUrl: await resolveUrl(c.backgroundImageUrl),
      })),
    );
    return res.json({ success: true, categories: withUrls });
  } catch (error) {
    return next(error);
  }
};

/**
 * メガカテゴリー作成
 * POST /api/admin/mega-categories (multipart: image, [original], categoryType, name, description, linkUrl, isActive)
 */
export const createMegaCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = req.files as { [k: string]: Express.Multer.File[] } | undefined;
    const imageFile = files?.image?.[0];
    const originalFile = files?.original?.[0];
    const { categoryType, name, description, linkUrl, isActive } = req.body;

    if (!name) return next(createError('名前は必須です', 400));

    let imageKey = '';
    if (imageFile) {
      const webp = await sharp(imageFile.buffer).webp({ quality: 88 }).toBuffer();
      imageKey = `mega/cat-${Date.now()}.webp`;
      await uploadFile(imageKey, webp, 'image/webp');
    }
    let originalKey: string | null = null;
    if (originalFile) {
      const orig = await sharp(originalFile.buffer).webp({ quality: 90 }).toBuffer();
      originalKey = `mega/original-${Date.now()}.webp`;
      await uploadFile(originalKey, orig, 'image/webp');
    }

    const last = await prisma.megaCategory.findFirst({ orderBy: { order: 'desc' } });
    const order = last ? last.order + 1 : 0;

    const category = await prisma.megaCategory.create({
      data: {
        categoryType: categoryType || 'cars',
        name,
        description: description || null,
        backgroundImageUrl: imageKey,
        originalImageUrl: originalKey,
        linkUrl: linkUrl || '',
        isActive: isActive === undefined ? true : isActive === 'true' || isActive === true,
        order,
      },
    });

    return res.status(201).json({ success: true, category, message: 'カテゴリーを作成しました' });
  } catch (error) {
    return next(error);
  }
};

/**
 * メガカテゴリー更新
 * PUT /api/admin/mega-categories/:id
 */
export const updateMegaCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req.params.id);
    if (!id) return next(createError('IDが必要です', 400));

    const existing = await prisma.megaCategory.findUnique({ where: { id } });
    if (!existing) return next(createError('カテゴリーが見つかりません', 404));

    const files = req.files as { [k: string]: Express.Multer.File[] } | undefined;
    const imageFile = files?.image?.[0];
    const originalFile = files?.original?.[0];
    const { categoryType, name, description, linkUrl, isActive, order } = req.body;

    const data: any = {};
    if (categoryType !== undefined) data.categoryType = categoryType;
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description || null;
    if (linkUrl !== undefined) data.linkUrl = linkUrl || '';
    if (isActive !== undefined) data.isActive = isActive === 'true' || isActive === true;
    if (order !== undefined) data.order = Number(order);

    if (imageFile) {
      const webp = await sharp(imageFile.buffer).webp({ quality: 88 }).toBuffer();
      const imageKey = `mega/cat-${Date.now()}.webp`;
      await uploadFile(imageKey, webp, 'image/webp');
      if (existing.backgroundImageUrl && !existing.backgroundImageUrl.startsWith('http')) {
        try { await deleteFile(existing.backgroundImageUrl); } catch { /* noop */ }
      }
      data.backgroundImageUrl = imageKey;
    }
    if (originalFile) {
      const orig = await sharp(originalFile.buffer).webp({ quality: 90 }).toBuffer();
      const originalKey = `mega/original-${Date.now()}.webp`;
      await uploadFile(originalKey, orig, 'image/webp');
      data.originalImageUrl = originalKey;
    }

    const category = await prisma.megaCategory.update({ where: { id }, data });
    return res.json({ success: true, category, message: 'カテゴリーを更新しました' });
  } catch (error) {
    return next(error);
  }
};

/**
 * メガカテゴリー削除
 * DELETE /api/admin/mega-categories/:id
 */
export const deleteMegaCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req.params.id);
    if (!id) return next(createError('IDが必要です', 400));

    const existing = await prisma.megaCategory.findUnique({ where: { id } });
    if (!existing) return next(createError('カテゴリーが見つかりません', 404));

    for (const key of [existing.backgroundImageUrl, existing.originalImageUrl]) {
      if (key && !key.startsWith('http')) {
        try { await deleteFile(key); } catch { /* noop */ }
      }
    }
    await prisma.megaCategory.delete({ where: { id } });
    return res.json({ success: true, message: 'カテゴリーを削除しました' });
  } catch (error) {
    return next(error);
  }
};

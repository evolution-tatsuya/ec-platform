// ===== ヒーロースライド管理コントローラー（管理者） =====

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { createError } from '../middleware/errorHandler';
import { uploadFile, deleteFile, generateSignedUrl } from '../utils/r2Client';
import sharp from 'sharp';

const getStringParam = (p: string | string[] | undefined): string | undefined =>
  Array.isArray(p) ? p[0] : p;

// R2キー（またはURL）を表示用URLに変換
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
 * ヒーロースライド一覧（管理者・非公開含む）
 * GET /api/admin/hero-slides
 */
export const getAdminHeroSlides = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const slides = await prisma.heroSlide.findMany({ orderBy: { order: 'asc' } });
    const withUrls = await Promise.all(
      slides.map(async (s) => ({
        ...s,
        imageDisplayUrl: await resolveUrl(s.imageUrl),
      })),
    );
    return res.json({ success: true, slides: withUrls });
  } catch (error) {
    return next(error);
  }
};

/**
 * ヒーロースライド作成（画像はトリミング済みを受け取る）
 * POST /api/admin/hero-slides  (multipart: image, [original], title, description, linkUrl, isActive)
 */
export const createHeroSlide = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = req.files as { [k: string]: Express.Multer.File[] } | undefined;
    const imageFile = files?.image?.[0];
    const originalFile = files?.original?.[0];
    if (!imageFile) return next(createError('画像が必要です', 400));

    const { title, description, linkUrl, isActive } = req.body;

    // トリミング済み画像をWebP化してR2へ
    const webp = await sharp(imageFile.buffer).webp({ quality: 88 }).toBuffer();
    const imageKey = `hero/slide-${Date.now()}.webp`;
    await uploadFile(imageKey, webp, 'image/webp');

    // 元画像も保存（再トリミング用）
    let originalKey: string | null = null;
    if (originalFile) {
      const orig = await sharp(originalFile.buffer).webp({ quality: 90 }).toBuffer();
      originalKey = `hero/original-${Date.now()}.webp`;
      await uploadFile(originalKey, orig, 'image/webp');
    }

    // 末尾のorderに追加
    const last = await prisma.heroSlide.findFirst({ orderBy: { order: 'desc' } });
    const order = last ? last.order + 1 : 0;

    const slide = await prisma.heroSlide.create({
      data: {
        imageUrl: imageKey,
        originalImageUrl: originalKey,
        title: title || null,
        description: description || null,
        linkUrl: linkUrl || null,
        isActive: isActive === undefined ? true : isActive === 'true' || isActive === true,
        order,
      },
    });

    return res.status(201).json({ success: true, slide, message: 'スライドを作成しました' });
  } catch (error) {
    return next(error);
  }
};

/**
 * ヒーロースライド更新
 * PUT /api/admin/hero-slides/:id (multipart optional image, or JSON for title/order/isActive)
 */
export const updateHeroSlide = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req.params.id);
    if (!id) return next(createError('IDが必要です', 400));

    const existing = await prisma.heroSlide.findUnique({ where: { id } });
    if (!existing) return next(createError('スライドが見つかりません', 404));

    const files = req.files as { [k: string]: Express.Multer.File[] } | undefined;
    const imageFile = files?.image?.[0];
    const originalFile = files?.original?.[0];
    const { title, description, linkUrl, isActive, order } = req.body;

    const data: any = {};
    if (title !== undefined) data.title = title || null;
    if (description !== undefined) data.description = description || null;
    if (linkUrl !== undefined) data.linkUrl = linkUrl || null;
    if (isActive !== undefined) data.isActive = isActive === 'true' || isActive === true;
    if (order !== undefined) data.order = Number(order);

    // 画像差し替え
    if (imageFile) {
      const webp = await sharp(imageFile.buffer).webp({ quality: 88 }).toBuffer();
      const imageKey = `hero/slide-${Date.now()}.webp`;
      await uploadFile(imageKey, webp, 'image/webp');
      // 旧画像削除
      if (existing.imageUrl && !existing.imageUrl.startsWith('http')) {
        try { await deleteFile(existing.imageUrl); } catch { /* noop */ }
      }
      data.imageUrl = imageKey;
    }
    if (originalFile) {
      const orig = await sharp(originalFile.buffer).webp({ quality: 90 }).toBuffer();
      const originalKey = `hero/original-${Date.now()}.webp`;
      await uploadFile(originalKey, orig, 'image/webp');
      data.originalImageUrl = originalKey;
    }

    const slide = await prisma.heroSlide.update({ where: { id }, data });
    return res.json({ success: true, slide, message: 'スライドを更新しました' });
  } catch (error) {
    return next(error);
  }
};

/**
 * ヒーロースライド削除
 * DELETE /api/admin/hero-slides/:id
 */
export const deleteHeroSlide = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req.params.id);
    if (!id) return next(createError('IDが必要です', 400));

    const existing = await prisma.heroSlide.findUnique({ where: { id } });
    if (!existing) return next(createError('スライドが見つかりません', 404));

    for (const key of [existing.imageUrl, existing.originalImageUrl]) {
      if (key && !key.startsWith('http')) {
        try { await deleteFile(key); } catch { /* noop */ }
      }
    }
    await prisma.heroSlide.delete({ where: { id } });
    return res.json({ success: true, message: 'スライドを削除しました' });
  } catch (error) {
    return next(error);
  }
};

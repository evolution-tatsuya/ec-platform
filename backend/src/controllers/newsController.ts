// ===== お知らせ・ニュース コントローラー =====
// 目的: お知らせのCRUD（管理者）+ 公開お知らせの取得（顧客）

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { createError } from '../middleware/errorHandler';

const getStringParam = (param: string | string[] | undefined): string | undefined => {
  if (Array.isArray(param)) return param[0];
  return param;
};

const VALID_CATEGORIES = ['new_product', 'holiday', 'shipping', 'other'];

/**
 * 公開お知らせ一覧取得（顧客向け）
 * GET /api/news
 */
export const getPublicNews = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const news = await prisma.newsItem.findMany({
      where: { isPublished: true, publishedAt: { lte: new Date() } },
      orderBy: { publishedAt: 'desc' },
    });
    return res.json({ success: true, news });
  } catch (error) {
    return next(error);
  }
};

/**
 * お知らせ詳細取得（顧客向け・公開のみ）
 * GET /api/news/:id
 */
export const getPublicNewsById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req.params.id);
    if (!id) return next(createError('IDが必要です', 400));

    const news = await prisma.newsItem.findUnique({ where: { id } });
    if (!news || !news.isPublished) {
      return next(createError('お知らせが見つかりません', 404));
    }
    return res.json({ success: true, news });
  } catch (error) {
    return next(error);
  }
};

/**
 * お知らせ一覧取得（管理者・非公開含む）
 * GET /api/admin/news
 */
export const getAdminNews = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const news = await prisma.newsItem.findMany({
      orderBy: { publishedAt: 'desc' },
    });
    return res.json({ success: true, news });
  } catch (error) {
    return next(error);
  }
};

/**
 * お知らせ作成（管理者）
 * POST /api/admin/news
 */
export const createNews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, content, category, linkUrl, publishedAt, isPublished } = req.body;

    if (!title || !String(title).trim()) {
      return next(createError('タイトルは必須です', 400));
    }

    const cat = VALID_CATEGORIES.includes(category) ? category : 'other';

    const news = await prisma.newsItem.create({
      data: {
        title: String(title).trim(),
        content: content ? String(content) : null,
        category: cat,
        linkUrl: linkUrl ? String(linkUrl).trim() : null,
        publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
        isPublished: typeof isPublished === 'boolean' ? isPublished : true,
      },
    });

    return res.status(201).json({ success: true, news, message: 'お知らせを作成しました' });
  } catch (error) {
    return next(error);
  }
};

/**
 * お知らせ更新（管理者）
 * PUT /api/admin/news/:id
 */
export const updateNews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req.params.id);
    if (!id) return next(createError('IDが必要です', 400));

    const existing = await prisma.newsItem.findUnique({ where: { id } });
    if (!existing) return next(createError('お知らせが見つかりません', 404));

    const { title, content, category, linkUrl, publishedAt, isPublished } = req.body;

    const news = await prisma.newsItem.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: String(title).trim() }),
        ...(content !== undefined && { content: content ? String(content) : null }),
        ...(category !== undefined && {
          category: VALID_CATEGORIES.includes(category) ? category : 'other',
        }),
        ...(linkUrl !== undefined && { linkUrl: linkUrl ? String(linkUrl).trim() : null }),
        ...(publishedAt !== undefined && { publishedAt: new Date(publishedAt) }),
        ...(isPublished !== undefined && { isPublished: Boolean(isPublished) }),
      },
    });

    return res.json({ success: true, news, message: 'お知らせを更新しました' });
  } catch (error) {
    return next(error);
  }
};

/**
 * お知らせ削除（管理者）
 * DELETE /api/admin/news/:id
 */
export const deleteNews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req.params.id);
    if (!id) return next(createError('IDが必要です', 400));

    const existing = await prisma.newsItem.findUnique({ where: { id } });
    if (!existing) return next(createError('お知らせが見つかりません', 404));

    await prisma.newsItem.delete({ where: { id } });
    return res.json({ success: true, message: 'お知らせを削除しました' });
  } catch (error) {
    return next(error);
  }
};

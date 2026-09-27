// ===== トップページコントローラー =====
// 目的: トップページ用のコンテンツを一括取得

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { buildProductImageList } from '../utils/productImageService';
import { generateSignedUrl } from '../utils/r2Client';

// R2キー（またはURL）を表示用URLに変換
const resolveImageUrl = async (value?: string | null): Promise<string> => {
  if (!value) return '';
  if (value.startsWith('http')) return value;
  try {
    return await generateSignedUrl(value);
  } catch {
    return '';
  }
};

/**
 * トップページデータ取得
 * GET /api/top-page
 *
 * レスポンス:
 * - heroSlides: ヒーロースライド（アクティブのみ、order順）
 * - megaCategories: メガカテゴリー（アクティブのみ、order順）
 * - pickupProducts: ピックアップ商品（アクティブのみ、order順、商品情報含む）
 * - newProducts: 新着商品（最新6件）
 * - saleProducts: セール商品（存在する場合、最大6件）
 * - popularProducts: 人気商品（注文数が多い商品、最大6件）
 * - news: ニュース（公開済みのみ、最新5件）
 */
export const getTopPageData = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 並列でデータ取得（パフォーマンス最適化）
    const [
      heroSlides,
      megaCategories,
      pickupProducts,
      newProducts,
      popularProducts,
      news,
      saleProductsRaw,
    ] = await Promise.all([
      // 1. ヒーロースライド取得
      prisma.heroSlide.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
      }),

      // 2. メガカテゴリー取得
      prisma.megaCategory.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
      }),

      // 3. ピックアップ商品取得
      prisma.pickupProduct.findMany({
        where: { isActive: true },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
        orderBy: { order: 'asc' },
      }),

      // 4. 新着商品取得（最新6件）
      prisma.product.findMany({
        where: { isActive: true },
        include: {
          category: true,
          images: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),

      // 5. 人気商品取得（注文数が多い商品）
      prisma.product.findMany({
        where: { isActive: true },
        include: {
          category: true,
          images: true,
          orderItems: {
            select: { quantity: true },
          },
        },
        take: 20, // 一旦多めに取得してソートする
      }),

      // 6. ニュース取得（公開済み、最新5件）
      prisma.newsItem.findMany({
        where: { isPublished: true },
        orderBy: { publishedAt: 'desc' },
        take: 5,
      }),

      // 7. セール商品取得（salePriceが設定されている公開商品、最新6件）
      prisma.product.findMany({
        where: {
          isActive: true,
          salePrice: { not: null },
        },
        include: {
          category: true,
          images: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 6,
      }),
    ]);

    // 人気商品を注文数でソート
    const sortedPopularProducts = popularProducts
      .map((product) => {
        const totalOrders = product.orderItems.reduce(
          (sum, item) => sum + item.quantity,
          0
        );
        return {
          ...product,
          totalOrders,
        };
      })
      .sort((a, b) => b.totalOrders - a.totalOrders)
      .slice(0, 6)
      .map(({ orderItems, totalOrders, ...product }) => product);

    // セール商品（salePriceが設定されている商品）

    // 商品画像を署名付きURL(order順)に変換して付与
    const withImages = async (products: any[]) =>
      Promise.all(
        products.map(async (p) => {
          const productImages = await buildProductImageList(p.images || []);
          return { ...p, images: productImages.map((img) => img.detailUrl), productImages };
        }),
      );

    const newProductsWithImages = await withImages(newProducts);
    const popularProductsWithImages = await withImages(sortedPopularProducts);
    const saleProducts = await withImages(saleProductsRaw);

    // ヒーロー/カテゴリーの画像(R2キー)を署名URLに変換
    const heroSlidesWithUrls = await Promise.all(
      heroSlides.map(async (s) => ({ ...s, imageUrl: await resolveImageUrl(s.imageUrl) })),
    );
    const megaCategoriesWithUrls = await Promise.all(
      megaCategories.map(async (c) => ({
        ...c,
        backgroundImageUrl: await resolveImageUrl(c.backgroundImageUrl),
      })),
    );

    return res.json({
      success: true,
      data: {
        heroSlides: heroSlidesWithUrls,
        megaCategories: megaCategoriesWithUrls,
        pickupProducts,
        newProducts: newProductsWithImages,
        saleProducts,
        popularProducts: popularProductsWithImages,
        news,
      },
    });
  } catch (error) {
    return next(error);
  }
};

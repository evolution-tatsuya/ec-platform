// ========================================
// お知らせ・ニュース API
// ========================================

import axios from 'axios';
import type { NewsItem, NewsCategory } from '../../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8432';

export interface NewsInput {
  title: string;
  content?: string;
  category: NewsCategory;
  linkUrl?: string;
  publishedAt?: string; // ISO文字列
  isPublished: boolean;
}

// ===== 顧客向け（公開） =====

/** 公開お知らせ一覧 */
export const getPublicNews = async (): Promise<NewsItem[]> => {
  const res = await axios.get(`${API_BASE_URL}/api/news`);
  return res.data.news || [];
};

/** お知らせ詳細（公開） */
export const getPublicNewsById = async (id: string): Promise<NewsItem> => {
  const res = await axios.get(`${API_BASE_URL}/api/news/${id}`);
  return res.data.news;
};

// ===== 管理者向け =====

/** お知らせ一覧（非公開含む） */
export const getAdminNews = async (): Promise<NewsItem[]> => {
  const res = await axios.get(`${API_BASE_URL}/api/admin/news`, { withCredentials: true });
  return res.data.news || [];
};

/** お知らせ作成 */
export const createNews = async (data: NewsInput): Promise<NewsItem> => {
  const res = await axios.post(`${API_BASE_URL}/api/admin/news`, data, { withCredentials: true });
  return res.data.news;
};

/** お知らせ更新 */
export const updateNews = async (id: string, data: Partial<NewsInput>): Promise<NewsItem> => {
  const res = await axios.put(`${API_BASE_URL}/api/admin/news/${id}`, data, { withCredentials: true });
  return res.data.news;
};

/** お知らせ削除 */
export const deleteNews = async (id: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/api/admin/news/${id}`, { withCredentials: true });
};

// ===== 表示ヘルパー =====

export const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  new_product: '新商品',
  holiday: '休業',
  shipping: '発送案内',
  other: 'その他',
};

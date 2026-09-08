// ========================================
// トップページ編集API（管理者）
// ========================================

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8432';

export interface HeroSlideAdmin {
  id: string;
  imageUrl: string;
  imageDisplayUrl: string;
  title?: string | null;
  description?: string | null;
  linkUrl?: string | null;
  order: number;
  isActive: boolean;
}

export interface MegaCategoryAdmin {
  id: string;
  categoryType: string;
  name: string;
  description?: string | null;
  backgroundImageUrl: string;
  imageDisplayUrl: string;
  linkUrl: string;
  order: number;
  isActive: boolean;
}

// ===== ヒーロースライド =====

export const getHeroSlides = async (): Promise<HeroSlideAdmin[]> => {
  const res = await axios.get(`${API_URL}/api/admin/hero-slides`, { withCredentials: true });
  return res.data.slides || [];
};

export const createHeroSlide = async (data: {
  imageBlob: Blob;
  originalBlob?: Blob;
  title?: string;
  linkUrl?: string;
  isActive?: boolean;
}): Promise<void> => {
  const fd = new FormData();
  fd.append('image', data.imageBlob, 'hero.jpg');
  if (data.originalBlob) fd.append('original', data.originalBlob, 'original.jpg');
  if (data.title !== undefined) fd.append('title', data.title);
  if (data.linkUrl !== undefined) fd.append('linkUrl', data.linkUrl);
  if (data.isActive !== undefined) fd.append('isActive', String(data.isActive));
  await axios.post(`${API_URL}/api/admin/hero-slides`, fd, {
    withCredentials: true,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const updateHeroSlide = async (
  id: string,
  data: { imageBlob?: Blob; originalBlob?: Blob; title?: string; linkUrl?: string; isActive?: boolean; order?: number },
): Promise<void> => {
  const fd = new FormData();
  if (data.imageBlob) fd.append('image', data.imageBlob, 'hero.jpg');
  if (data.originalBlob) fd.append('original', data.originalBlob, 'original.jpg');
  if (data.title !== undefined) fd.append('title', data.title);
  if (data.linkUrl !== undefined) fd.append('linkUrl', data.linkUrl);
  if (data.isActive !== undefined) fd.append('isActive', String(data.isActive));
  if (data.order !== undefined) fd.append('order', String(data.order));
  await axios.put(`${API_URL}/api/admin/hero-slides/${id}`, fd, {
    withCredentials: true,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const deleteHeroSlide = async (id: string): Promise<void> => {
  await axios.delete(`${API_URL}/api/admin/hero-slides/${id}`, { withCredentials: true });
};

// ===== メガカテゴリー =====

export const getMegaCategories = async (): Promise<MegaCategoryAdmin[]> => {
  const res = await axios.get(`${API_URL}/api/admin/mega-categories`, { withCredentials: true });
  return res.data.categories || [];
};

export const createMegaCategory = async (data: {
  imageBlob?: Blob;
  originalBlob?: Blob;
  categoryType: string;
  name: string;
  linkUrl?: string;
  isActive?: boolean;
}): Promise<void> => {
  const fd = new FormData();
  if (data.imageBlob) fd.append('image', data.imageBlob, 'cat.jpg');
  if (data.originalBlob) fd.append('original', data.originalBlob, 'original.jpg');
  fd.append('categoryType', data.categoryType);
  fd.append('name', data.name);
  if (data.linkUrl !== undefined) fd.append('linkUrl', data.linkUrl);
  if (data.isActive !== undefined) fd.append('isActive', String(data.isActive));
  await axios.post(`${API_URL}/api/admin/mega-categories`, fd, {
    withCredentials: true,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const updateMegaCategory = async (
  id: string,
  data: { imageBlob?: Blob; originalBlob?: Blob; categoryType?: string; name?: string; linkUrl?: string; isActive?: boolean; order?: number },
): Promise<void> => {
  const fd = new FormData();
  if (data.imageBlob) fd.append('image', data.imageBlob, 'cat.jpg');
  if (data.originalBlob) fd.append('original', data.originalBlob, 'original.jpg');
  if (data.categoryType !== undefined) fd.append('categoryType', data.categoryType);
  if (data.name !== undefined) fd.append('name', data.name);
  if (data.linkUrl !== undefined) fd.append('linkUrl', data.linkUrl);
  if (data.isActive !== undefined) fd.append('isActive', String(data.isActive));
  if (data.order !== undefined) fd.append('order', String(data.order));
  await axios.put(`${API_URL}/api/admin/mega-categories/${id}`, fd, {
    withCredentials: true,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const deleteMegaCategory = async (id: string): Promise<void> => {
  await axios.delete(`${API_URL}/api/admin/mega-categories/${id}`, { withCredentials: true });
};

// ========================================
// サブスクプランAPI（料金ページ用）
// 公開中のサブスク商品を上限・機能リスト付きで取得
// ========================================

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8432';

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  price: number;
  billingType: 'monthly' | 'yearly' | 'onetime';
  maxParts: number | null;
  maxImageMB: number | null;
  maxUsers: number | null;
  unitLabel: string;
  planTagline: string;
  isPopular: boolean;
  planFeatures: string[];
  description: string;
}

/** サブスクプラン一覧を取得（料金ページ用） */
export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  const res = await axios.get<{ success: boolean; plans: SubscriptionPlan[] }>(
    `${API_BASE_URL}/api/products/subscription-plans`
  );
  return res.data.plans;
};

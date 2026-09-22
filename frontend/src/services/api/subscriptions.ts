// ========================================
// サブスク契約API
// 顧客: 自分の契約一覧取得・解約
// 管理者: 全契約一覧取得・契約情報更新
// ========================================

import axios from 'axios';
import type { Subscription, SubscriptionStatus } from '../../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8432';

export interface SubscriptionsResponse {
  success: boolean;
  subscriptions: Subscription[];
}

export interface SubscriptionResponse {
  success: boolean;
  message?: string;
  subscription: Subscription;
}

/** 自分のサブスク契約一覧取得（顧客） */
export const getMySubscriptions = async (): Promise<Subscription[]> => {
  const res = await axios.get<SubscriptionsResponse>(
    `${API_BASE_URL}/api/subscriptions`,
    { withCredentials: true }
  );
  return res.data.subscriptions;
};

/** サブスク契約を解約（顧客） */
export const cancelMySubscription = async (
  id: string
): Promise<Subscription> => {
  const res = await axios.post<SubscriptionResponse>(
    `${API_BASE_URL}/api/subscriptions/${id}/cancel`,
    {},
    { withCredentials: true }
  );
  return res.data.subscription;
};

/** 全サブスク契約一覧取得（管理者） */
export const adminGetSubscriptions = async (params?: {
  status?: SubscriptionStatus | 'all';
  search?: string;
}): Promise<Subscription[]> => {
  const res = await axios.get<SubscriptionsResponse>(
    `${API_BASE_URL}/api/admin/subscriptions`,
    { params, withCredentials: true }
  );
  return res.data.subscriptions;
};

/** サブスク契約情報の更新（管理者） */
export const adminUpdateSubscription = async (
  id: string,
  data: {
    status?: SubscriptionStatus;
    licenseKeyDelivered?: boolean;
    note?: string;
    nextBillingDate?: string | null;
  }
): Promise<Subscription> => {
  const res = await axios.put<SubscriptionResponse>(
    `${API_BASE_URL}/api/admin/subscriptions/${id}`,
    data,
    { withCredentials: true }
  );
  return res.data.subscription;
};

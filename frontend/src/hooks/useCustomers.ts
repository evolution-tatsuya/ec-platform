// ========================================
// 顧客管理カスタムフック（React Query）
// ========================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CustomerWithStats, CustomerDetail, UpdateCustomerTagsRequest } from '../types';
import type { CustomerFilterParams } from '../services/api/customers';
import {
  getAdminCustomers,
  getAdminCustomerById,
  updateCustomerTags,
} from '../services/api/customers';

// ========================================
// 顧客管理フック
// ========================================

/**
 * 顧客一覧取得フック
 */
export const useAdminCustomers = (filters?: CustomerFilterParams) => {
  return useQuery<CustomerWithStats[], Error>({
    queryKey: ['adminCustomers', filters],
    queryFn: () => getAdminCustomers(filters),
    staleTime: 1000 * 60 * 5, // 5分間キャッシュ
  });
};

/**
 * 顧客詳細取得フック
 */
export const useAdminCustomerById = (id: string) => {
  return useQuery<CustomerDetail, Error>({
    queryKey: ['adminCustomer', id],
    queryFn: () => getAdminCustomerById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5分間キャッシュ
  });
};

/**
 * 顧客タグ更新フック
 */
export const useUpdateCustomerTags = () => {
  const queryClient = useQueryClient();

  return useMutation<CustomerDetail, Error, { id: string; data: UpdateCustomerTagsRequest }>({
    mutationFn: ({ id, data }) => updateCustomerTags(id, data),
    onSuccess: (data) => {
      // 顧客一覧キャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['adminCustomers'] });
      // 該当顧客の詳細キャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['adminCustomer', data.id] });
    },
  });
};

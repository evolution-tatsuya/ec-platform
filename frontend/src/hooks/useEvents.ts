// ========================================
// イベント・チケット管理カスタムフック
// ========================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminEvents,
  getAdminEventById,
  getAdminEventFormTemplate,
  saveAdminEventFormTemplate,
  getAdminEventParticipants,
  exportAdminEventParticipantsCSV,
  exportAdminEventParticipantsExcel,
  scanAdminTicket,
  getAdminParticipantById,
  updateAdminParticipantCheckIn,
  type AdminEventFilterParams,
  type SaveEventFormTemplateRequest,
  type ScanTicketRequest,
  type ParticipantFilterParams,
} from '../services/api/events';
import type { EventParticipant } from '../types';

// ========================================
// イベント管理フック
// ========================================

/**
 * イベント一覧取得
 */
export function useAdminEvents(filters?: AdminEventFilterParams) {
  return useQuery({
    queryKey: ['adminEvents', filters],
    queryFn: () => getAdminEvents(filters),
    staleTime: 5 * 60 * 1000, // 5分
  });
}

/**
 * イベント詳細取得
 */
export function useAdminEvent(eventId: string) {
  return useQuery({
    queryKey: ['adminEvent', eventId],
    queryFn: () => getAdminEventById(eventId),
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000, // 5分
  });
}

// ========================================
// フォームテンプレート管理フック
// ========================================

/**
 * イベントフォームテンプレート取得
 */
export function useAdminEventFormTemplate(eventId: string) {
  return useQuery({
    queryKey: ['adminEventFormTemplate', eventId],
    queryFn: () => getAdminEventFormTemplate(eventId),
    enabled: !!eventId,
    staleTime: 10 * 60 * 1000, // 10分
  });
}

/**
 * イベントフォームテンプレート保存
 */
export function useSaveAdminEventFormTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      data,
    }: {
      eventId: string;
      data: SaveEventFormTemplateRequest;
    }) => saveAdminEventFormTemplate(eventId, data),
    onSuccess: (_, variables) => {
      // 該当イベントのフォームテンプレートキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['adminEventFormTemplate', variables.eventId] });
    },
  });
}

// ========================================
// 参加者管理フック
// ========================================

/**
 * イベント参加者リスト取得
 */
export function useAdminEventParticipants(
  eventId: string,
  filters?: ParticipantFilterParams
) {
  return useQuery({
    queryKey: ['adminEventParticipants', eventId, filters],
    queryFn: () => getAdminEventParticipants(eventId, filters),
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000, // 2分（参加者リストは頻繁に更新される）
  });
}

/**
 * 参加者詳細取得
 */
export function useAdminParticipant(participantId: string) {
  return useQuery({
    queryKey: ['adminParticipant', participantId],
    queryFn: () => getAdminParticipantById(participantId),
    enabled: !!participantId,
    staleTime: 5 * 60 * 1000, // 5分
  });
}

/**
 * 参加者チェックインステータス更新
 */
export function useUpdateAdminParticipantCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      participantId,
      isUsed,
    }: {
      participantId: string;
      isUsed: boolean;
    }) => updateAdminParticipantCheckIn(participantId, isUsed),
    onSuccess: (data, variables) => {
      // 参加者詳細キャッシュを更新
      queryClient.setQueryData<EventParticipant>(
        ['adminParticipant', variables.participantId],
        data
      );

      // 参加者リストキャッシュを無効化（イベントIDが不明なため全て無効化）
      queryClient.invalidateQueries({ queryKey: ['adminEventParticipants'] });
    },
  });
}

// ========================================
// QRスキャンフック
// ========================================

/**
 * QRチケットスキャン
 */
export function useScanAdminTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ScanTicketRequest) => scanAdminTicket(data),
    onSuccess: () => {
      // 参加者リストキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['adminEventParticipants'] });
    },
  });
}

// ========================================
// エクスポートフック
// ========================================

/**
 * 参加者リストCSV出力
 */
export function useExportAdminEventParticipantsCSV() {
  return useMutation({
    mutationFn: (eventId: string) => exportAdminEventParticipantsCSV(eventId),
    onSuccess: (blob, eventId) => {
      // ダウンロード処理
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `participants-${eventId}-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}

/**
 * 参加者リストExcel出力
 */
export function useExportAdminEventParticipantsExcel() {
  return useMutation({
    mutationFn: (eventId: string) => exportAdminEventParticipantsExcel(eventId),
    onSuccess: (blob, eventId) => {
      // ダウンロード処理
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `participants-${eventId}-${Date.now()}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}

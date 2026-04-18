// ========================================
// イベント・チケット管理API（管理者向け）
// ========================================

import type {
  Product,
  EventFormTemplate,
  EventFormField,
  EventParticipant,
  EventParticipantListResponse,
} from '../../types';

// ========================================
// 型定義
// ========================================

/**
 * イベント一覧取得のフィルターパラメータ
 */
export interface AdminEventFilterParams {
  search?: string;
  startDate?: string;
  endDate?: string;
  status?: 'upcoming' | 'ongoing' | 'past' | 'all';
}

/**
 * フォームテンプレート保存リクエスト
 */
export interface SaveEventFormTemplateRequest {
  name: string;
  description?: string;
  fields: Omit<EventFormField, 'id' | 'templateId'>[];
}

/**
 * QRチケットスキャンリクエスト
 */
export interface ScanTicketRequest {
  ticketCode: string;
  qrCode?: string;
}

/**
 * QRチケットスキャンレスポンス
 */
export interface ScanTicketResponse {
  success: boolean;
  message: string;
  participant?: EventParticipant;
  alreadyUsed?: boolean;
}

/**
 * 参加者リストフィルターパラメータ
 */
export interface ParticipantFilterParams {
  search?: string;
  isUsed?: boolean;
}

// ========================================
// API関数
// ========================================

/**
 * イベント一覧取得（管理者）
 * @API_INTEGRATION
 */
export const getAdminEvents = async (
  _filters?: AdminEventFilterParams
): Promise<Product[]> => {
  throw new Error('API not implemented');
};

/**
 * イベント詳細取得（管理者）
 * @API_INTEGRATION
 */
export const getAdminEventById = async (_id: string): Promise<Product> => {
  throw new Error('API not implemented');
};

/**
 * イベントフォームテンプレート取得（管理者）
 * @API_INTEGRATION
 */
export const getAdminEventFormTemplate = async (
  _eventId: string
): Promise<EventFormTemplate> => {
  throw new Error('API not implemented');
};

/**
 * イベントフォームテンプレート保存（管理者）
 * @API_INTEGRATION
 */
export const saveAdminEventFormTemplate = async (
  _eventId: string,
  _data: SaveEventFormTemplateRequest
): Promise<EventFormTemplate> => {
  throw new Error('API not implemented');
};

/**
 * イベント参加者リスト取得（管理者）
 * @API_INTEGRATION
 */
export const getAdminEventParticipants = async (
  _eventId: string,
  _filters?: ParticipantFilterParams
): Promise<EventParticipantListResponse> => {
  throw new Error('API not implemented');
};

/**
 * イベント参加者リストCSV出力（管理者）
 * @API_INTEGRATION
 */
export const exportAdminEventParticipantsCSV = async (
  _eventId: string
): Promise<Blob> => {
  throw new Error('API not implemented');
};

/**
 * イベント参加者リストExcel出力（管理者）
 * @API_INTEGRATION
 */
export const exportAdminEventParticipantsExcel = async (
  _eventId: string
): Promise<Blob> => {
  throw new Error('API not implemented');
};

/**
 * QRチケットスキャン・チェックイン（管理者）
 * @API_INTEGRATION
 */
export const scanAdminTicket = async (
  _data: ScanTicketRequest
): Promise<ScanTicketResponse> => {
  throw new Error('API not implemented');
};

/**
 * 参加者詳細取得（管理者）
 * @API_INTEGRATION
 */
export const getAdminParticipantById = async (
  _participantId: string
): Promise<EventParticipant> => {
  throw new Error('API not implemented');
};

/**
 * 参加者チェックインステータス更新（管理者）
 * @API_INTEGRATION
 */
export const updateAdminParticipantCheckIn = async (
  _participantId: string,
  _isUsed: boolean
): Promise<EventParticipant> => {
  throw new Error('API not implemented');
};

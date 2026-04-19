// ========================================
// イベント・チケット管理API（管理者向け）
// ========================================

import axios from 'axios';
import type {
  Product,
  EventFormTemplate,
  EventFormField,
  EventParticipant,
  EventParticipantListResponse,
} from '../../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8432';

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
  status?: 'active' | 'inactive' | 'all';
  page?: number;
  limit?: number;
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
  ticketCode?: string;
  qrCodeData?: string;
}

/**
 * QRチケットスキャンレスポンス
 */
export interface ScanTicketResponse {
  success: boolean;
  message?: string;
  error?: string;
  ticket?: {
    ticketCode: string;
    eventName: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    purchasedAt: string;
    usedAt?: string;
  };
  alreadyUsed?: boolean;
}

/**
 * 参加者リストフィルターパラメータ
 */
export interface ParticipantFilterParams {
  search?: string;
  status?: 'used' | 'unused' | 'all';
  page?: number;
  limit?: number;
}

// バックエンドレスポンス型
interface EventListResponse {
  success: boolean;
  events: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    isActive: boolean;
    participantCount: number;
    images: Array<{ id: string; url: string }>;
    createdAt: string;
    updatedAt: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface EventDetailResponse {
  success: boolean;
  event: {
    id: string;
    name: string;
    slug: string;
    description: string;
    price: number;
    isActive: boolean;
    categoryId: string | null;
    participantCount: number;
    usedTicketCount: number;
    images: Array<{ id: string; url: string }>;
    createdAt: string;
    updatedAt: string;
  };
}

interface ParticipantListBackendResponse {
  success: boolean;
  participants: Array<{
    ticketId: string;
    ticketCode: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    isUsed: boolean;
    usedAt?: string;
    purchasedAt: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalParticipants: number;
    usedTickets: number;
    unusedTickets: number;
  };
}

// ========================================
// API関数
// ========================================

/**
 * イベント一覧取得（管理者）
 * GET /api/admin/events
 */
export const getAdminEvents = async (
  filters?: AdminEventFilterParams
): Promise<Product[]> => {
  const params: Record<string, string> = {};
  if (filters?.search) params.search = filters.search;
  if (filters?.status && filters.status !== 'all') params.status = filters.status;
  if (filters?.startDate) params.dateFrom = filters.startDate;
  if (filters?.endDate) params.dateTo = filters.endDate;
  if (filters?.page) params.page = String(filters.page);
  if (filters?.limit) params.limit = String(filters.limit);

  const response = await axios.get<EventListResponse>(`${API_URL}/api/admin/events`, {
    params,
    withCredentials: true,
  });

  // バックエンドレスポンスをフロントエンド型に変換
  return response.data.events.map((event) => ({
    id: event.id,
    name: event.name,
    slug: event.id,
    price: event.price,
    description: event.description,
    productType: 'DIGITAL_TICKET' as const,
    categoryType: 'events' as const,
    images: event.images.map((img) => img.url),
    isActive: event.isActive,
    currentStock: event.participantCount,
    createdAt: new Date(event.createdAt),
    updatedAt: new Date(event.updatedAt),
    attributes: [],
    tags: [],
  }));
};

/**
 * イベント詳細取得（管理者）
 * GET /api/admin/events/:id
 */
export const getAdminEventById = async (id: string): Promise<Product> => {
  const response = await axios.get<EventDetailResponse>(
    `${API_URL}/api/admin/events/${id}`,
    { withCredentials: true }
  );

  const event = response.data.event;
  return {
    id: event.id,
    name: event.name,
    slug: event.slug,
    price: event.price,
    description: event.description,
    productType: 'DIGITAL_TICKET' as const,
    categoryType: 'events' as const,
    images: event.images.map((img) => img.url),
    isActive: event.isActive,
    currentStock: event.participantCount,
    createdAt: new Date(event.createdAt),
    updatedAt: new Date(event.updatedAt),
    attributes: [],
    tags: [],
  };
};

/**
 * イベントフォームテンプレート取得（管理者）
 * GET /api/admin/events/:id/form
 * 注: 現在未実装（バックエンドが501を返す）
 */
export const getAdminEventFormTemplate = async (
  eventId: string
): Promise<EventFormTemplate> => {
  const response = await axios.get<{ success: boolean; formTemplate: EventFormTemplate }>(
    `${API_URL}/api/admin/events/${eventId}/form`,
    { withCredentials: true }
  );
  return response.data.formTemplate;
};

/**
 * イベントフォームテンプレート保存（管理者）
 * POST /api/admin/events/:id/form
 * 注: 現在未実装（バックエンドが501を返す）
 */
export const saveAdminEventFormTemplate = async (
  eventId: string,
  data: SaveEventFormTemplateRequest
): Promise<EventFormTemplate> => {
  const response = await axios.post<{ success: boolean; formTemplate: EventFormTemplate }>(
    `${API_URL}/api/admin/events/${eventId}/form`,
    { formTemplate: data },
    { withCredentials: true }
  );
  return response.data.formTemplate;
};

/**
 * イベント参加者リスト取得（管理者）
 * GET /api/admin/events/:id/participants
 */
export const getAdminEventParticipants = async (
  eventId: string,
  filters?: ParticipantFilterParams
): Promise<EventParticipantListResponse> => {
  const params: Record<string, string> = {};
  if (filters?.search) params.search = filters.search;
  if (filters?.status && filters.status !== 'all') params.status = filters.status;
  if (filters?.page) params.page = String(filters.page);
  if (filters?.limit) params.limit = String(filters.limit);

  const response = await axios.get<ParticipantListBackendResponse>(
    `${API_URL}/api/admin/events/${eventId}/participants`,
    {
      params,
      withCredentials: true,
    }
  );

  // バックエンドレスポンスをフロントエンド型に変換
  return {
    participants: response.data.participants.map((p) => ({
      id: p.ticketId,
      orderId: '',
      orderNumber: p.orderNumber,
      name: p.customerName,
      email: p.customerEmail,
      ticketCode: p.ticketCode,
      qrCode: p.ticketCode,
      isUsed: p.isUsed,
      usedAt: p.usedAt ? new Date(p.usedAt) : undefined,
      formData: {},
      createdAt: new Date(p.purchasedAt),
    })),
    total: response.data.pagination.total,
  };
};

/**
 * イベント参加者リストCSV出力（管理者）
 * GET /api/admin/events/:id/participants/export/csv
 */
export const exportAdminEventParticipantsCSV = async (eventId: string): Promise<Blob> => {
  const response = await axios.get(
    `${API_URL}/api/admin/events/${eventId}/participants/export/csv`,
    {
      responseType: 'blob',
      withCredentials: true,
    }
  );
  return response.data;
};

/**
 * イベント参加者リストExcel出力（管理者）
 * GET /api/admin/events/:id/participants/export/excel
 */
export const exportAdminEventParticipantsExcel = async (eventId: string): Promise<Blob> => {
  const response = await axios.get(
    `${API_URL}/api/admin/events/${eventId}/participants/export/excel`,
    {
      responseType: 'blob',
      withCredentials: true,
    }
  );
  return response.data;
};

/**
 * QRチケットスキャン・チェックイン（管理者）
 * POST /api/admin/tickets/scan
 */
export const scanAdminTicket = async (data: ScanTicketRequest): Promise<ScanTicketResponse> => {
  const response = await axios.post<ScanTicketResponse>(
    `${API_URL}/api/admin/tickets/scan`,
    data,
    { withCredentials: true }
  );
  return response.data;
};

/**
 * 参加者詳細取得（管理者）
 * GET /api/admin/tickets/:id
 * 注: バックエンドはチケットIDで検索
 */
export const getAdminParticipantById = async (participantId: string): Promise<EventParticipant> => {
  const response = await axios.get<{
    id: string;
    ticketCode: string;
    isUsed: boolean;
    usedAt?: string;
    createdAt: string;
    order: {
      id: string;
      orderNumber: string;
      customerName: string;
      customerEmail: string;
      customerPhone?: string;
      createdAt: string;
    };
    product: {
      id: string;
      name: string;
      price: number;
    };
  }>(`${API_URL}/api/admin/tickets/${participantId}`, { withCredentials: true });

  const ticket = response.data;
  return {
    id: ticket.id,
    orderId: ticket.order.id,
    orderNumber: ticket.order.orderNumber,
    name: ticket.order.customerName,
    email: ticket.order.customerEmail,
    ticketCode: ticket.ticketCode,
    qrCode: ticket.ticketCode,
    isUsed: ticket.isUsed,
    usedAt: ticket.usedAt ? new Date(ticket.usedAt) : undefined,
    formData: {},
    createdAt: new Date(ticket.createdAt),
    order: {
      id: ticket.order.id,
      customerName: ticket.order.customerName,
      customerEmail: ticket.order.customerEmail,
    },
  };
};

/**
 * 参加者チェックインステータス更新（管理者）
 * PUT /api/admin/tickets/:id/use または PUT /api/admin/tickets/:id/reset
 */
export const updateAdminParticipantCheckIn = async (
  participantId: string,
  isUsed: boolean
): Promise<EventParticipant> => {
  const endpoint = isUsed
    ? `${API_URL}/api/admin/tickets/${participantId}/use`
    : `${API_URL}/api/admin/tickets/${participantId}/reset`;

  const response = await axios.put<{
    message: string;
    ticket: {
      id: string;
      ticketCode: string;
      isUsed: boolean;
      usedAt?: string;
      createdAt: string;
      order: {
        orderNumber: string;
        user: {
          name: string;
          email: string;
        };
      };
      product: {
        name: string;
      };
    };
  }>(endpoint, {}, { withCredentials: true });

  const ticket = response.data.ticket;
  return {
    id: ticket.id,
    orderId: '',
    orderNumber: ticket.order.orderNumber,
    name: ticket.order.user.name,
    email: ticket.order.user.email,
    ticketCode: ticket.ticketCode,
    qrCode: ticket.ticketCode,
    isUsed: ticket.isUsed,
    usedAt: ticket.usedAt ? new Date(ticket.usedAt) : undefined,
    formData: {},
    createdAt: new Date(ticket.createdAt),
    order: {
      id: '',
      customerName: ticket.order.user.name,
      customerEmail: ticket.order.user.email,
    },
  };
};

// ========================================
// メールテンプレート/送信API（管理者）
// ========================================

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8432';

export interface EmailTemplate {
  id: string;
  type: string;
  name: string;
  subject: string;
  body: string;
  isActive: boolean;
}

export const EMAIL_TYPE_LABELS: Record<string, string> = {
  order_confirm: '注文受付・振込案内',
  payment_received: '入金確認',
  shipped: '発送連絡',
  delivery_notice: '納期案内',
  other: 'その他',
};

export const getEmailTemplates = async (): Promise<EmailTemplate[]> => {
  const res = await axios.get(`${API_URL}/api/admin/email-templates`, { withCredentials: true });
  return res.data.templates || [];
};

export const updateEmailTemplate = async (
  id: string,
  data: { name?: string; subject?: string; body?: string; isActive?: boolean },
): Promise<void> => {
  await axios.put(`${API_URL}/api/admin/email-templates/${id}`, data, { withCredentials: true });
};

/** 注文にメール送信（subject/body省略時はテンプレート使用） */
export const sendOrderEmail = async (
  orderId: string,
  data: { type: string; subject?: string; body?: string },
): Promise<void> => {
  await axios.post(`${API_URL}/api/admin/orders/${orderId}/send-email`, data, { withCredentials: true });
};

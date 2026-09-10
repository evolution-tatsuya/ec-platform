// ========================================
// 書類テンプレートAPI（pdfme・管理者）
// ========================================

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8432';

export const getDocumentTemplate = async (type: string): Promise<{ template: any; isCustom: boolean }> => {
  const res = await axios.get(`${API_URL}/api/admin/document-templates/${type}`, { withCredentials: true });
  return { template: res.data.template, isCustom: res.data.isCustom };
};

export const saveDocumentTemplate = async (type: string, template: any): Promise<void> => {
  await axios.put(`${API_URL}/api/admin/document-templates/${type}`, { template }, { withCredentials: true });
};

export const resetDocumentTemplate = async (type: string): Promise<any> => {
  const res = await axios.delete(`${API_URL}/api/admin/document-templates/${type}`, { withCredentials: true });
  return res.data.template;
};

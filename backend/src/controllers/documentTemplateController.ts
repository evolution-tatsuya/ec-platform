// ===== 書類テンプレート管理コントローラー（pdfme） =====

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { createError } from '../middleware/errorHandler';

const getStringParam = (p: string | string[] | undefined): string | undefined =>
  Array.isArray(p) ? p[0] : p;

const VALID_TYPES = ['invoice', 'receipt', 'quote'];
const TYPE_TITLES: Record<string, string> = {
  invoice: '納品書',
  receipt: '領収書',
  quote: '見積書',
};

// pdfme用の空A4 PDF（basePdf）
const BLANK_PDF =
  'data:application/pdf;base64,JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXMKICAvTWVkaWFCb3ggWyAwIDAgNTk1IDg0MiBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAgL1Jlc291cmNlcyA8PAogICAgL0ZvbnQgPDwKICAgICAgL0YxIDQgMCBSIAogICAgPj4KICA+PgogIC9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKCjQgMCBvYmoKPDwKICAvVHlwZSAvRm9udAogIC9TdWJ0eXBlIC9UeXBlMQogIC9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iagoKNSAwIG9iaiAgJSBwYWdlIGNvbnRlbnQKPDwKICAvTGVuZ3RoIDAKPj4Kc3RyZWFtCmVuZHN0cmVhbQplbmRvYmoKCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxMCAwMDAwMCBuIAowMDAwMDAwMDc5IDAwMDAwIG4gCjAwMDAwMDAxNzYgMDAwMDAgbiAKMDAwMDAwMDI5NSAwMDAwMCBuIAowMDAwMDAwMzY2IDAwMDAwIG4gCnRyYWlsZXIKPDwKICAvU2l6ZSA2CiAgL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjQxNQolJUVPRgo=';

// デフォルトテンプレート（named fieldsをorderデータで差し込む）
const defaultTemplate = (type: string) => ({
  basePdf: BLANK_PDF,
  schemas: [
    [
      { name: 'title', type: 'text', position: { x: 20, y: 20 }, width: 100, height: 12, fontSize: 22, fontName: 'NotoSansJP-Regular' },
      { name: 'companyName', type: 'text', position: { x: 130, y: 20 }, width: 60, height: 8, fontSize: 12, fontName: 'NotoSansJP-Regular' },
      { name: 'orderNumber', type: 'text', position: { x: 20, y: 40 }, width: 90, height: 8, fontSize: 10, fontName: 'NotoSansJP-Regular' },
      { name: 'date', type: 'text', position: { x: 20, y: 50 }, width: 90, height: 8, fontSize: 10, fontName: 'NotoSansJP-Regular' },
      { name: 'customerName', type: 'text', position: { x: 20, y: 65 }, width: 120, height: 10, fontSize: 14, fontName: 'NotoSansJP-Regular' },
      { name: 'address', type: 'text', position: { x: 20, y: 78 }, width: 120, height: 16, fontSize: 10, fontName: 'NotoSansJP-Regular' },
      { name: 'itemsHeader', type: 'text', position: { x: 20, y: 105 }, width: 170, height: 8, fontSize: 11, fontName: 'NotoSansJP-Regular', backgroundColor: '#eeeeee' },
      { name: 'items', type: 'text', position: { x: 20, y: 115 }, width: 170, height: 80, fontSize: 10, fontName: 'NotoSansJP-Regular' },
      { name: 'total', type: 'text', position: { x: 120, y: 205 }, width: 70, height: 12, fontSize: 14, fontName: 'NotoSansJP-Regular' },
    ],
  ],
  // 初期プレビュー用サンプル
  sampledata: [
    {
      title: TYPE_TITLES[type] || '書類',
      companyName: '（会社名）',
      orderNumber: '注文番号: ORD-XXXX',
      date: '発行日: 2026/01/01',
      customerName: 'お客様 様',
      address: '〒000-0000\nご住所',
      itemsHeader: '商品名                       数量        金額',
      items: '商品A                          1        ¥1,000',
      total: '合計: ¥1,000',
    },
  ],
});

/**
 * 書類テンプレート取得（無ければデフォルト）
 * GET /api/admin/document-templates/:type
 */
export const getDocumentTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = getStringParam(req.params.type);
    if (!type || !VALID_TYPES.includes(type)) {
      return next(createError('不正な書類種別です', 400));
    }
    const saved = await prisma.documentTemplate.findUnique({ where: { type } });
    const template = saved ? JSON.parse(saved.template) : defaultTemplate(type);
    return res.json({ success: true, type, template, isCustom: !!saved });
  } catch (error) {
    return next(error);
  }
};

/**
 * 書類テンプレート保存
 * PUT /api/admin/document-templates/:type  Body: { template }
 */
export const saveDocumentTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = getStringParam(req.params.type);
    if (!type || !VALID_TYPES.includes(type)) {
      return next(createError('不正な書類種別です', 400));
    }
    const { template } = req.body;
    if (!template) return next(createError('テンプレートが必要です', 400));

    const templateStr = typeof template === 'string' ? template : JSON.stringify(template);

    await prisma.documentTemplate.upsert({
      where: { type },
      create: { type, template: templateStr },
      update: { template: templateStr },
    });

    return res.json({ success: true, message: 'テンプレートを保存しました' });
  } catch (error) {
    return next(error);
  }
};

/**
 * 書類テンプレートをデフォルトに戻す
 * DELETE /api/admin/document-templates/:type
 */
export const resetDocumentTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = getStringParam(req.params.type);
    if (!type || !VALID_TYPES.includes(type)) {
      return next(createError('不正な書類種別です', 400));
    }
    await prisma.documentTemplate.deleteMany({ where: { type } });
    return res.json({ success: true, message: 'デフォルトに戻しました', template: defaultTemplate(type) });
  } catch (error) {
    return next(error);
  }
};

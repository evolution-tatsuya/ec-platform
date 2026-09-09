// ===== メールテンプレート管理コントローラー（管理者） =====

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { createError } from '../middleware/errorHandler';
import { renderTemplate, sendGenericEmail } from '../utils/emailService';

const getStringParam = (p: string | string[] | undefined): string | undefined =>
  Array.isArray(p) ? p[0] : p;

// デフォルトテンプレート（初回に自動作成）
const DEFAULT_TEMPLATES: { type: string; name: string; subject: string; body: string }[] = [
  {
    type: 'order_confirm',
    name: '注文受付・振込案内',
    subject: '【ご注文ありがとうございます】注文番号 {{orderNumber}}',
    body: `{{customerName}} 様

この度はご注文いただき誠にありがとうございます。
下記の内容でご注文を承りました。

■注文番号: {{orderNumber}}
■ご注文金額: ¥{{totalAmount}}

【お振込先】
{{bankInfo}}

お振込確認後、商品の準備を進めさせていただきます。
恐れ入りますが、お振込の際は注文番号をご記載ください。

引き続きよろしくお願いいたします。`,
  },
  {
    type: 'payment_received',
    name: '入金確認',
    subject: '【入金確認】ご入金ありがとうございます（注文番号 {{orderNumber}}）',
    body: `{{customerName}} 様

ご注文番号 {{orderNumber}} につきまして、ご入金を確認いたしました。
誠にありがとうございます。

これより商品の発送準備を進めさせていただきます。
発送が完了しましたら、改めてご連絡いたします。

今しばらくお待ちくださいませ。`,
  },
  {
    type: 'shipped',
    name: '発送連絡',
    subject: '【発送完了】商品を発送いたしました（注文番号 {{orderNumber}}）',
    body: `{{customerName}} 様

ご注文番号 {{orderNumber}} の商品を発送いたしました。

商品の到着まで今しばらくお待ちくださいませ。
この度はご利用いただき誠にありがとうございました。`,
  },
  {
    type: 'delivery_notice',
    name: '納期案内（長期納期）',
    subject: '【納期のご案内】注文番号 {{orderNumber}}',
    body: `{{customerName}} 様

ご注文番号 {{orderNumber}} の納期についてご案内いたします。

ご注文の商品は、現在下記の納期を予定しております。

■お届け予定: （ここに納期を記入してください）

ご不便をおかけいたしますが、何卒ご了承くださいますようお願い申し上げます。
ご不明な点がございましたらお気軽にお問い合わせください。`,
  },
  {
    type: 'other',
    name: 'その他（自由入力）',
    subject: '【ご連絡】注文番号 {{orderNumber}}',
    body: `{{customerName}} 様

（こちらに連絡内容を入力してください）

よろしくお願いいたします。`,
  },
];

/** テンプレート一覧取得（無ければデフォルト作成） */
export const getEmailTemplates = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    let templates = await prisma.emailTemplate.findMany({ orderBy: { createdAt: 'asc' } });
    if (templates.length === 0) {
      await prisma.emailTemplate.createMany({ data: DEFAULT_TEMPLATES });
      templates = await prisma.emailTemplate.findMany({ orderBy: { createdAt: 'asc' } });
    }
    return res.json({ success: true, templates });
  } catch (error) {
    return next(error);
  }
};

/** テンプレート更新 */
export const updateEmailTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req.params.id);
    if (!id) return next(createError('IDが必要です', 400));
    const { name, subject, body, isActive } = req.body;

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(subject !== undefined && { subject }),
        ...(body !== undefined && { body }),
        ...(typeof isActive === 'boolean' && { isActive }),
      },
    });
    return res.json({ success: true, template, message: 'テンプレートを更新しました' });
  } catch (error) {
    return next(error);
  }
};

/**
 * 注文に対してメールを送信
 * POST /api/admin/orders/:orderId/send-email  Body: { type, subject?, body? }
 * subject/bodyが指定されればそれを使用（その場編集）、無ければテンプレートを使用。
 */
export const sendOrderEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = getStringParam(req.params.orderId);
    if (!orderId) return next(createError('注文IDが必要です', 400));
    const { type, subject: overrideSubject, body: overrideBody } = req.body;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return next(createError('注文が見つかりません', 404));
    if (!order.customerEmail) return next(createError('この注文にはメールアドレスがありません', 400));

    // テンプレート取得
    let subject = overrideSubject;
    let body = overrideBody;
    if (!subject || !body) {
      const tpl = await prisma.emailTemplate.findUnique({ where: { type: type || 'other' } });
      if (!tpl) return next(createError('テンプレートが見つかりません', 404));
      subject = subject || tpl.subject;
      body = body || tpl.body;
    }

    // 銀行振込先情報（設定から）
    const settings = await prisma.siteSettings.findFirst();
    const bankInfo = settings
      ? [
          settings.bankName && `銀行名: ${settings.bankName}`,
          settings.bankBranch && `支店名: ${settings.bankBranch}`,
          settings.bankAccountType && `口座種別: ${settings.bankAccountType}`,
          settings.bankAccountNumber && `口座番号: ${settings.bankAccountNumber}`,
          settings.bankAccountHolder && `口座名義: ${settings.bankAccountHolder}`,
        ]
          .filter(Boolean)
          .join('\n')
      : '（振込先情報が未設定です）';

    // 変数置換
    const vars: Record<string, string> = {
      customerName: order.customerName || 'お客様',
      orderNumber: order.orderNumber || '',
      totalAmount: (order.totalAmount ?? 0).toLocaleString(),
      bankInfo,
    };

    await sendGenericEmail({
      to: order.customerEmail,
      subject: renderTemplate(subject, vars),
      body: renderTemplate(body, vars),
    });

    return res.json({ success: true, message: 'メールを送信しました' });
  } catch (error: any) {
    console.error('メール送信エラー:', error);
    return next(createError(error?.message || 'メール送信に失敗しました', 500));
  }
};

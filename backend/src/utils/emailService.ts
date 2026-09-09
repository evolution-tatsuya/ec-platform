/**
 * メール送信サービス（Resend SDK）
 *
 * 機能:
 * - 発送完了メール送信
 * - 注文確認メール送信
 * - パスワードリセットメール送信
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@example.com';

/**
 * 発送完了メール送信
 */
export async function sendShippingNotificationEmail(data: {
  to: string;
  customerName: string;
  orderNumber: string;
  carrier: string;
  trackingNumber: string;
  shippedAt: Date;
}): Promise<void> {
  const carrierNames: Record<string, string> = {
    yamato: 'ヤマト運輸',
    sagawa: '佐川急便',
    japan_post: '日本郵便',
  };

  const carrierName = carrierNames[data.carrier] || data.carrier;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: `【発送完了】ご注文商品を発送いたしました（注文番号: ${data.orderNumber}）`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .info-box { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #4CAF50; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>商品を発送いたしました</h1>
    </div>

    <div class="content">
      <p>${data.customerName} 様</p>

      <p>いつもご利用いただきありがとうございます。<br>
      ご注文いただいた商品を発送いたしましたのでお知らせいたします。</p>

      <div class="info-box">
        <h3>発送情報</h3>
        <p><strong>注文番号:</strong> ${data.orderNumber}</p>
        <p><strong>発送日時:</strong> ${data.shippedAt.toLocaleString('ja-JP')}</p>
        <p><strong>配送業者:</strong> ${carrierName}</p>
        <p><strong>追跡番号:</strong> ${data.trackingNumber}</p>
      </div>

      <p>商品の到着まで今しばらくお待ちください。</p>

      <p>追跡番号を使用して、配送状況をご確認いただけます。</p>
    </div>

    <div class="footer">
      <p>このメールは自動送信されています。<br>
      ご不明な点がございましたら、お問い合わせください。</p>
    </div>
  </div>
</body>
</html>
    `,
  });
}

/**
 * 注文確認メール送信
 */
export async function sendOrderConfirmationEmail(data: {
  to: string;
  customerName: string;
  orderNumber: string;
  totalAmount: number;
  items: Array<{ productName: string; quantity: number; price: number }>;
}): Promise<void> {
  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.productName}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">¥${item.price.toLocaleString()}</td>
      </tr>
    `
    )
    .join('');

  await resend.emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: `【注文確認】ご注文を承りました（注文番号: ${data.orderNumber}）`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .info-box { background-color: white; padding: 15px; margin: 15px 0; }
    table { width: 100%; border-collapse: collapse; background-color: white; }
    th { background-color: #f0f0f0; padding: 10px; text-align: left; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ご注文ありがとうございます</h1>
    </div>

    <div class="content">
      <p>${data.customerName} 様</p>

      <p>ご注文を承りました。<br>
      以下の内容でご注文を確定いたしました。</p>

      <div class="info-box">
        <h3>注文情報</h3>
        <p><strong>注文番号:</strong> ${data.orderNumber}</p>
        <p><strong>合計金額:</strong> ¥${data.totalAmount.toLocaleString()}</p>
      </div>

      <h3>ご注文内容</h3>
      <table>
        <thead>
          <tr>
            <th>商品名</th>
            <th style="text-align: center;">数量</th>
            <th style="text-align: right;">金額</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <p style="margin-top: 20px;">商品の準備が整い次第、発送いたします。<br>
      今しばらくお待ちください。</p>
    </div>

    <div class="footer">
      <p>このメールは自動送信されています。<br>
      ご不明な点がございましたら、お問い合わせください。</p>
    </div>
  </div>
</body>
</html>
    `,
  });
}

/**
 * パスワードリセットメール送信
 */
export async function sendPasswordResetEmail(data: {
  to: string;
  name: string;
  resetUrl: string;
}): Promise<void> {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: 'パスワード再設定のご案内',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .button { display: inline-block; padding: 12px 24px; background-color: #FF9800; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>パスワード再設定</h1>
    </div>

    <div class="content">
      <p>${data.name} 様</p>

      <p>パスワード再設定のリクエストを受け付けました。</p>

      <p>以下のボタンをクリックして、新しいパスワードを設定してください。</p>

      <div style="text-align: center;">
        <a href="${data.resetUrl}" class="button">パスワードを再設定する</a>
      </div>

      <p style="font-size: 12px; color: #666;">
        このリンクの有効期限は1時間です。<br>
        リクエストに覚えがない場合は、このメールを無視してください。
      </p>
    </div>

    <div class="footer">
      <p>このメールは自動送信されています。</p>
    </div>
  </div>
</body>
</html>
    `,
  });
}

/**
 * テンプレートの{{変数}}を値で置換
 */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? '');
}

/**
 * 汎用メール送信（件名・本文を指定）。本文の改行は<br>に変換。
 */
export async function sendGenericEmail(data: {
  to: string;
  subject: string;
  body: string;
}): Promise<void> {
  const htmlBody = data.body.replace(/\n/g, '<br>');
  await resend.emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: data.subject,
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="font-family: sans-serif; line-height: 1.7; color: #333;">
<div style="max-width: 600px; margin: 0 auto; padding: 24px;">${htmlBody}</div>
</body></html>`,
  });
}

/**
 * PDF生成ユーティリティ
 * pdfmeを使用して納品書、領収書、送り状を生成
 */

import { generate } from '@pdfme/generator';
import { Font, Template } from '@pdfme/common';

// 日本語フォント設定（Noto Sans JP）
const font: Font = {
  'NotoSansJP-Regular': {
    data: 'https://fonts.gstatic.com/s/notosansjp/v52/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEi75vY0rw-oME.ttf',
    fallback: true,
  },
};

/**
 * 納品書PDF生成
 */
export async function generateInvoicePDF(orderData: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string | null;
  shippingPostalCode: string | null;
  createdAt: Date;
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
}): Promise<Uint8Array> {
  const template: Template = {
    schemas: [
      {
        title: {
          type: 'text',
          position: { x: 20, y: 20 },
          width: 100,
          height: 10,
          fontSize: 24,
          fontName: 'NotoSansJP-Regular',
        },
        orderNumber: {
          type: 'text',
          position: { x: 20, y: 35 },
          width: 170,
          height: 8,
          fontSize: 12,
          fontName: 'NotoSansJP-Regular',
        },
        date: {
          type: 'text',
          position: { x: 20, y: 45 },
          width: 170,
          height: 8,
          fontSize: 12,
          fontName: 'NotoSansJP-Regular',
        },
        customerInfo: {
          type: 'text',
          position: { x: 20, y: 60 },
          width: 170,
          height: 40,
          fontSize: 11,
          fontName: 'NotoSansJP-Regular',
        },
        itemsHeader: {
          type: 'text',
          position: { x: 20, y: 110 },
          width: 170,
          height: 8,
          fontSize: 10,
          fontName: 'NotoSansJP-Regular',
        },
        itemsList: {
          type: 'text',
          position: { x: 20, y: 120 },
          width: 170,
          height: 100,
          fontSize: 10,
          fontName: 'NotoSansJP-Regular',
        },
        total: {
          type: 'text',
          position: { x: 20, y: 230 },
          width: 170,
          height: 10,
          fontSize: 14,
          fontName: 'NotoSansJP-Regular',
        },
      },
    ],
    basePdf: 'data:application/pdf;base64,JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXMKICAvTWVkaWFCb3ggWyAwIDAgMjEwIDI5NyBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAgL1Jlc291cmNlcyA8PAogICAgL0ZvbnQgPDwKICAgICAgL0YxIDQgMCBSIAogICAgPj4KICA+PgogIC9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKCjQgMCBvYmoKPDwKICAvVHlwZSAvRm9udAogIC9TdWJ0eXBlIC9UeXBlMQogIC9CYXNlRm9udCAvVGltZXMtUm9tYW4KPj4KZW5kb2JqCgo1IDAgb2JqICAlIHBhZ2UgY29udGVudAo8PAogIC9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCjcwIDUwIFRkCi9GMSA4IFRmCihIZWxsbywgd29ybGQhKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCgp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTAgMDAwMDAgbiAKMDAwMDAwMDA3OSAwMDAwMCBuIAowMDAwMDAwMTczIDAwMDAwIG4gCjAwMDAwMDAzMDEgMDAwMDAgbiAKMDAwMDAwMDM4MCAwMDAwMCBuIAp0cmFpbGVyCjw8CiAgL1NpemUgNgogIC9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgo0OTIKJSVFT0YK',
  };

  const itemsText = orderData.items
    .map(
      (item, index) =>
        `${index + 1}. ${item.productName}\n   数量: ${item.quantity} × ¥${item.price.toLocaleString()} = ¥${(item.quantity * item.price).toLocaleString()}`
    )
    .join('\n\n');

  const inputs = [
    {
      title: '納品書',
      orderNumber: `注文番号: ${orderData.orderNumber}`,
      date: `発行日: ${orderData.createdAt.toLocaleDateString('ja-JP')}`,
      customerInfo: `お客様情報:\n${orderData.customerName}\n${orderData.customerEmail}\n${orderData.customerPhone}\n〒${orderData.shippingPostalCode || ''}\n${orderData.shippingAddress || ''}`,
      itemsHeader: '商品明細:',
      itemsList: itemsText,
      total: `合計金額: ¥${orderData.totalAmount.toLocaleString()}`,
    },
  ];

  return await generate({ template, inputs, options: { font } });
}

/**
 * 領収書PDF生成
 */
export async function generateReceiptPDF(orderData: {
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  createdAt: Date;
  paymentMethod: string;
}): Promise<Uint8Array> {
  const template: Template = {
    schemas: [
      {
        title: {
          type: 'text',
          position: { x: 20, y: 20 },
          width: 100,
          height: 10,
          fontSize: 24,
          fontName: 'NotoSansJP-Regular',
        },
        orderNumber: {
          type: 'text',
          position: { x: 20, y: 35 },
          width: 170,
          height: 8,
          fontSize: 12,
          fontName: 'NotoSansJP-Regular',
        },
        date: {
          type: 'text',
          position: { x: 20, y: 45 },
          width: 170,
          height: 8,
          fontSize: 12,
          fontName: 'NotoSansJP-Regular',
        },
        customerName: {
          type: 'text',
          position: { x: 20, y: 60 },
          width: 170,
          height: 10,
          fontSize: 14,
          fontName: 'NotoSansJP-Regular',
        },
        amount: {
          type: 'text',
          position: { x: 20, y: 80 },
          width: 170,
          height: 15,
          fontSize: 18,
          fontName: 'NotoSansJP-Regular',
        },
        paymentMethod: {
          type: 'text',
          position: { x: 20, y: 100 },
          width: 170,
          height: 8,
          fontSize: 12,
          fontName: 'NotoSansJP-Regular',
        },
        note: {
          type: 'text',
          position: { x: 20, y: 120 },
          width: 170,
          height: 20,
          fontSize: 10,
          fontName: 'NotoSansJP-Regular',
        },
      },
    ],
    basePdf: 'data:application/pdf;base64,JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXMKICAvTWVkaWFCb3ggWyAwIDAgMjEwIDI5NyBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAgL1Jlc291cmNlcyA8PAogICAgL0ZvbnQgPDwKICAgICAgL0YxIDQgMCBSIAogICAgPj4KICA+PgogIC9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKCjQgMCBvYmoKPDwKICAvVHlwZSAvRm9udAogIC9TdWJ0eXBlIC9UeXBlMQogIC9CYXNlRm9udCAvVGltZXMtUm9tYW4KPj4KZW5kb2JqCgo1IDAgb2JqICAlIHBhZ2UgY29udGVudAo8PAogIC9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCjcwIDUwIFRkCi9GMSA4IFRmCihIZWxsbywgd29ybGQhKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCgp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTAgMDAwMDAgbiAKMDAwMDAwMDA3OSAwMDAwMCBuIAowMDAwMDAwMTczIDAwMDAwIG4gCjAwMDAwMDAzMDEgMDAwMDAgbiAKMDAwMDAwMDM4MCAwMDAwMCBuIAp0cmFpbGVyCjw8CiAgL1NpemUgNgogIC9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgo0OTIKJSVFT0YK',
  };

  const paymentMethodText =
    orderData.paymentMethod === 'bank_transfer' ? '銀行振込' : 'クレジットカード';

  const inputs = [
    {
      title: '領収書',
      orderNumber: `注文番号: ${orderData.orderNumber}`,
      date: `発行日: ${orderData.createdAt.toLocaleDateString('ja-JP')}`,
      customerName: `${orderData.customerName} 様`,
      amount: `¥${orderData.totalAmount.toLocaleString()}`,
      paymentMethod: `支払い方法: ${paymentMethodText}`,
      note: '上記の金額を正に領収いたしました。\n本書をもって領収書に代えさせていただきます。',
    },
  ];

  return await generate({ template, inputs, options: { font } });
}

/**
 * 送り状PDF生成
 */
export async function generateShippingLabelPDF(orderData: {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string | null;
  shippingPostalCode: string | null;
  carrier: string | null;
  trackingNumber: string | null;
}): Promise<Uint8Array> {
  const template: Template = {
    schemas: [
      {
        title: {
          type: 'text',
          position: { x: 20, y: 20 },
          width: 100,
          height: 10,
          fontSize: 24,
          fontName: 'NotoSansJP-Regular',
        },
        orderNumber: {
          type: 'text',
          position: { x: 20, y: 35 },
          width: 170,
          height: 8,
          fontSize: 12,
          fontName: 'NotoSansJP-Regular',
        },
        carrier: {
          type: 'text',
          position: { x: 20, y: 45 },
          width: 170,
          height: 8,
          fontSize: 12,
          fontName: 'NotoSansJP-Regular',
        },
        trackingNumber: {
          type: 'text',
          position: { x: 20, y: 55 },
          width: 170,
          height: 8,
          fontSize: 12,
          fontName: 'NotoSansJP-Regular',
        },
        customerInfo: {
          type: 'text',
          position: { x: 20, y: 70 },
          width: 170,
          height: 40,
          fontSize: 14,
          fontName: 'NotoSansJP-Regular',
        },
      },
    ],
    basePdf: 'data:application/pdf;base64,JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXMKICAvTWVkaWFCb3ggWyAwIDAgMjEwIDI5NyBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAgL1Jlc291cmNlcyA8PAogICAgL0ZvbnQgPDwKICAgICAgL0YxIDQgMCBSIAogICAgPj4KICA+PgogIC9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKCjQgMCBvYmoKPDwKICAvVHlwZSAvRm9udAogIC9TdWJ0eXBlIC9UeXBlMQogIC9CYXNlRm9udCAvVGltZXMtUm9tYW4KPj4KZW5kb2JqCgo1IDAgb2JqICAlIHBhZ2UgY29udGVudAo8PAogIC9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCjcwIDUwIFRkCi9GMSA4IFRmCihIZWxsbywgd29ybGQhKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCgp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTAgMDAwMDAgbiAKMDAwMDAwMDA3OSAwMDAwMCBuIAowMDAwMDAwMTczIDAwMDAwIG4gCjAwMDAwMDAzMDEgMDAwMDAgbiAKMDAwMDAwMDM4MCAwMDAwMCBuIAp0cmFpbGVyCjw8CiAgL1NpemUgNgogIC9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgo0OTIKJSVFT0YK',
  };

  const carrierText = orderData.carrier
    ? orderData.carrier === 'yamato'
      ? 'ヤマト運輸'
      : orderData.carrier === 'sagawa'
        ? '佐川急便'
        : orderData.carrier === 'japan_post'
          ? '日本郵便'
          : orderData.carrier
    : '未設定';

  const inputs = [
    {
      title: '送り状',
      orderNumber: `注文番号: ${orderData.orderNumber}`,
      carrier: `配送業者: ${carrierText}`,
      trackingNumber: `追跡番号: ${orderData.trackingNumber || '未設定'}`,
      customerInfo: `お届け先:\n〒${orderData.shippingPostalCode || ''}\n${orderData.shippingAddress || ''}\n${orderData.customerName} 様\n${orderData.customerPhone}`,
    },
  ];

  return await generate({ template, inputs, options: { font } });
}

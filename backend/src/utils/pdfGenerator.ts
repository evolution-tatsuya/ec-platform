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

// 空白のA4 PDFベース
const BLANK_PDF = 'data:application/pdf;base64,JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXMKICAvTWVkaWFCb3ggWyAwIDAgNTk1IDg0MiBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAgL1Jlc291cmNlcyA8PAogICAgL0ZvbnQgPDwKICAgICAgL0YxIDQgMCBSIAogICAgPj4KICA+PgogIC9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKCjQgMCBvYmoKPDwKICAvVHlwZSAvRm9udAogIC9TdWJ0eXBlIC9UeXBlMQogIC9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iagoKNSAwIG9iaiAgJSBwYWdlIGNvbnRlbnQKPDwKICAvTGVuZ3RoIDAKPj4Kc3RyZWFtCmVuZHN0cmVhbQplbmRvYmoKCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxMCAwMDAwMCBuIAowMDAwMDAwMDc5IDAwMDAwIG4gCjAwMDAwMDAxNzYgMDAwMDAgbiAKMDAwMDAwMDI5NSAwMDAwMCBuIAowMDAwMDAwMzY2IDAwMDAwIG4gCnRyYWlsZXIKPDwKICAvU2l6ZSA2CiAgL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjQxNQolJUVPRgo=';

/**
 * 納品書PDF生成（Amazonスタイル・改善版）
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
  shippingFee?: number;
  paymentMethod?: string;
}): Promise<Uint8Array> {
  const shippingFee = orderData.shippingFee || 0;
  const subtotal = orderData.totalAmount - shippingFee;

  // 日付フォーマット
  const dateStr = orderData.createdAt.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  // スキーマを動的に構築
  const schema: any = {
    // ========== 発送先セクション（上部） ==========
    shippingLabel: {
      type: 'text',
      position: { x: 20, y: 15 },
      width: 100,
      height: 8,
      fontSize: 11,
    },
    postalCode: {
      type: 'text',
      position: { x: 20, y: 25 },
      width: 100,
      height: 10,
      fontSize: 18,
    },
    address: {
      type: 'text',
      position: { x: 20, y: 38 },
      width: 150,
      height: 8,
      fontSize: 12,
    },
    customerName: {
      type: 'text',
      position: { x: 20, y: 48 },
      width: 150,
      height: 8,
      fontSize: 13,
    },
    divider1: {
      type: 'text',
      position: { x: 20, y: 60 },
      width: 170,
      height: 5,
      fontSize: 8,
    },
    orderNumber: {
      type: 'text',
      position: { x: 20, y: 68 },
      width: 170,
      height: 6,
      fontSize: 11,
    },
    thankYou: {
      type: 'text',
      position: { x: 20, y: 76 },
      width: 170,
      height: 10,
      fontSize: 9,
    },
    detailBoxTitle: {
      type: 'text',
      position: { x: 20, y: 90 },
      width: 80,
      height: 6,
      fontSize: 9,
    },
    detailPostal: {
      type: 'text',
      position: { x: 20, y: 97 },
      width: 80,
      height: 6,
      fontSize: 8,
    },
    detailAddress: {
      type: 'text',
      position: { x: 20, y: 104 },
      width: 80,
      height: 6,
      fontSize: 8,
    },
    detailName: {
      type: 'text',
      position: { x: 20, y: 111 },
      width: 80,
      height: 10,
      fontSize: 8,
    },
    detailDate: {
      type: 'text',
      position: { x: 20, y: 121 },
      width: 80,
      height: 6,
      fontSize: 8,
    },
    detailShipping: {
      type: 'text',
      position: { x: 20, y: 128 },
      width: 80,
      height: 6,
      fontSize: 8,
    },
    detailBuyer: {
      type: 'text',
      position: { x: 20, y: 135 },
      width: 80,
      height: 6,
      fontSize: 8,
    },
    detailSeller: {
      type: 'text',
      position: { x: 20, y: 142 },
      width: 80,
      height: 6,
      fontSize: 8,
    },
    tableHeaderQty: {
      type: 'text',
      position: { x: 20, y: 155 },
      width: 20,
      height: 6,
      fontSize: 9,
    },
    tableHeaderName: {
      type: 'text',
      position: { x: 42, y: 155 },
      width: 80,
      height: 6,
      fontSize: 9,
    },
    tableHeaderPrice: {
      type: 'text',
      position: { x: 125, y: 155 },
      width: 30,
      height: 6,
      fontSize: 9,
    },
    tableHeaderTotal: {
      type: 'text',
      position: { x: 158, y: 155 },
      width: 32,
      height: 6,
      fontSize: 9,
    },
    divider2: {
      type: 'text',
      position: { x: 20, y: 162 },
      width: 170,
      height: 4,
      fontSize: 8,
    },
  };

  // 商品行を動的に追加（最大10個）
  let itemY = 170;
  for (let i = 0; i < 10; i++) {
    schema[`itemQty${i}`] = {
      type: 'text',
      position: { x: 20, y: itemY },
      width: 20,
      height: 6,
      fontSize: 8,
    };
    schema[`itemName${i}`] = {
      type: 'text',
      position: { x: 42, y: itemY },
      width: 80,
      height: 6,
      fontSize: 8,
    };
    schema[`itemPrice${i}`] = {
      type: 'text',
      position: { x: 125, y: itemY },
      width: 30,
      height: 6,
      fontSize: 8,
    };
    schema[`itemTotal${i}`] = {
      type: 'text',
      position: { x: 158, y: itemY },
      width: 32,
      height: 6,
      fontSize: 8,
    };
    itemY += 8;
  }

  // 金額内訳（商品数に応じて位置調整）
  const summaryY = 170 + (Math.min(orderData.items.length, 10) * 8) + 10;

  schema['divider3'] = {
    type: 'text',
    position: { x: 110, y: summaryY },
    width: 80,
    height: 4,
    fontSize: 8,
  };
  schema['subtotalLine'] = {
    type: 'text',
    position: { x: 110, y: summaryY + 7 },
    width: 80,
    height: 6,
    fontSize: 9,
  };
  schema['shippingLine'] = {
    type: 'text',
    position: { x: 110, y: summaryY + 15 },
    width: 80,
    height: 6,
    fontSize: 9,
  };
  schema['totalLine'] = {
    type: 'text',
    position: { x: 110, y: summaryY + 25 },
    width: 80,
    height: 7,
    fontSize: 11,
  };

  const template: Template = {
    schemas: [schema],
    basePdf: BLANK_PDF,
  };

  // 入力データを作成
  const inputs: any = {
    shippingLabel: '発送先:',
    postalCode: orderData.shippingPostalCode || '',
    address: orderData.shippingAddress || '',
    customerName: `${orderData.customerName} 様`,
    divider1: '──────────────────────────────────────────────────────',
    orderNumber: `注文番号：${orderData.orderNumber}`,
    thankYou: '（それぞれの管理者ショップ名）より商品をお買い上げいただき、\nありがとうございました。',
    detailBoxTitle: 'お届け先：',
    detailPostal: orderData.shippingPostalCode || '',
    detailAddress: orderData.shippingAddress || '',
    detailName: `${orderData.customerName} 様\n`,
    detailDate: `注文日：${dateStr}`,
    detailShipping: '配送方法：標準',
    detailBuyer: `購入者の名前：${orderData.customerName}`,
    detailSeller: '出品者の名前：ECプラットフォーム',
    tableHeaderQty: '数量',
    tableHeaderName: '商品の詳細',
    tableHeaderPrice: '単価',
    tableHeaderTotal: '注文金額',
    divider2: '──────────────────────────────────────────────────────',
  };

  // 商品行データ
  for (let i = 0; i < 10; i++) {
    if (i < orderData.items.length) {
      const item = orderData.items[i];
      const itemTotal = item.quantity * item.price;
      inputs[`itemQty${i}`] = `${item.quantity}個`;
      inputs[`itemName${i}`] = item.productName.substring(0, 30);
      inputs[`itemPrice${i}`] = `¥${item.price.toLocaleString()}`;
      inputs[`itemTotal${i}`] = `¥${itemTotal.toLocaleString()}`;
    } else {
      inputs[`itemQty${i}`] = '';
      inputs[`itemName${i}`] = '';
      inputs[`itemPrice${i}`] = '';
      inputs[`itemTotal${i}`] = '';
    }
  }

  // 金額内訳
  inputs['divider3'] = '──────────────────────────';
  inputs['subtotalLine'] = `商品の小計：¥${subtotal.toLocaleString()}`;
  inputs['shippingLine'] = `配送料の合計：¥${shippingFee.toLocaleString()}`;
  inputs['totalLine'] = `総計：¥${orderData.totalAmount.toLocaleString()}`;

  return await generate({ template, inputs: [inputs], options: { font } });
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
        },
        orderNumber: {
          type: 'text',
          position: { x: 20, y: 35 },
          width: 170,
          height: 8,
          fontSize: 12,
        },
        date: {
          type: 'text',
          position: { x: 20, y: 45 },
          width: 170,
          height: 8,
          fontSize: 12,
        },
        customerName: {
          type: 'text',
          position: { x: 20, y: 60 },
          width: 170,
          height: 10,
          fontSize: 14,
        },
        amount: {
          type: 'text',
          position: { x: 20, y: 80 },
          width: 170,
          height: 15,
          fontSize: 18,
        },
        paymentMethod: {
          type: 'text',
          position: { x: 20, y: 100 },
          width: 170,
          height: 8,
          fontSize: 12,
        },
        note: {
          type: 'text',
          position: { x: 20, y: 120 },
          width: 170,
          height: 20,
          fontSize: 10,
        },
      },
    ],
    basePdf: BLANK_PDF,
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
        },
        orderNumber: {
          type: 'text',
          position: { x: 20, y: 35 },
          width: 170,
          height: 8,
          fontSize: 12,
        },
        carrier: {
          type: 'text',
          position: { x: 20, y: 45 },
          width: 170,
          height: 8,
          fontSize: 12,
        },
        trackingNumber: {
          type: 'text',
          position: { x: 20, y: 55 },
          width: 170,
          height: 8,
          fontSize: 12,
        },
        customerInfo: {
          type: 'text',
          position: { x: 20, y: 70 },
          width: 170,
          height: 40,
          fontSize: 14,
        },
      },
    ],
    basePdf: BLANK_PDF,
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

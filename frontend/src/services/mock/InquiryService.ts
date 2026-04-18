// ========================================
// @MOCK_TO_API: 問い合わせサービス（モック実装）
// ========================================
// 本番実装時の移行手順:
// 1. backend/src/routes/inquiry-routes.ts を実装
// 2. このファイルを frontend/src/services/InquiryService.ts にリネーム
// 3. fetchInquiry等の関数内をfetch API実装に置き換え
//
// エンドポイント仕様:
// - POST /api/inquiries - 問い合わせ送信（AI回答付き）
// - PUT /api/inquiries/:id/feedback - 満足度フィードバック
// - POST /api/inquiries/:id/escalate - オペレーターエスカレーション
// - GET /api/inquiries/history - 過去の問い合わせ履歴（ログイン必須）
// ========================================

import type {
  Inquiry,
  InquiryRequest,
  InquiryResponse,
  InquiryHistory,
} from '../../types';
import { InquiryStatus } from '../../types';

// ========================================
// モックデータ
// ========================================

const MOCK_INQUIRIES: Inquiry[] = [
  {
    id: 'inq-1',
    userId: 'user-1',
    name: '山田太郎',
    email: 'demo@example.com',
    question: '配送状況を教えてください',
    aiResponse:
      'ご注文の配送状況についてお答えします。注文番号ORD-20251220-0001の商品は現在配送中です。お届け予定日は12月25日となっております。配送業者は佐川急便で、追跡番号は123456789です。最新の配送状況は佐川急便の公式サイトからご確認いただけます。',
    isSatisfied: true,
    isEscalated: false,
    status: 'AI_RESOLVED' as InquiryStatus,
    createdAt: new Date('2025-12-20T14:30:00'),
    updatedAt: new Date('2025-12-20T14:30:30'),
  },
  {
    id: 'inq-2',
    userId: 'user-1',
    name: '山田太郎',
    email: 'demo@example.com',
    question: '返品手続きについて教えてください',
    aiResponse:
      '返品手続きについてご案内します。商品到着後14日以内であれば返品可能です。未使用・未開封の商品に限ります。返品をご希望の場合は、マイページの注文履歴から「返品申請」ボタンをクリックし、必要事項を入力してください。',
    isSatisfied: false,
    isEscalated: true,
    status: 'PENDING' as InquiryStatus,
    createdAt: new Date('2025-12-18T10:15:00'),
    updatedAt: new Date('2025-12-18T10:15:45'),
  },
  {
    id: 'inq-3',
    userId: 'user-1',
    name: '山田太郎',
    email: 'demo@example.com',
    question: '商品の在庫確認をしたい',
    aiResponse:
      '在庫確認についてお答えします。商品詳細ページに在庫数が表示されております。在庫がない場合は「在庫切れ」と表示されます。在庫が復活した際にメール通知をご希望の場合は、「入荷通知を受け取る」ボタンをクリックしてください。',
    isSatisfied: true,
    isEscalated: false,
    status: 'AI_RESOLVED' as InquiryStatus,
    createdAt: new Date('2025-12-15T16:45:00'),
    updatedAt: new Date('2025-12-15T16:45:20'),
  },
];

// AI回答候補（モック用）
const AI_MOCK_RESPONSES = [
  {
    keywords: ['配送', '配達', '届く', '到着', '発送'],
    response:
      'ご注文の配送状況についてお答えします。注文番号{orderNumber}の商品は現在配送中です。お届け予定日は{deliveryDate}となっております。配送業者は佐川急便で、追跡番号は{trackingNumber}です。最新の配送状況は佐川急便の公式サイトからご確認いただけます。',
    model: 'Gemini 2.0 Flash',
  },
  {
    keywords: ['返品', '返金', 'キャンセル'],
    response:
      '返品手続きについてご案内します。商品到着後14日以内であれば返品可能です。未使用・未開封の商品に限ります。返品をご希望の場合は、マイページの注文履歴から「返品申請」ボタンをクリックし、必要事項を入力してください。送料はお客様負担となりますが、初期不良の場合は弊社で負担いたします。',
    model: 'GPT-4o mini',
  },
  {
    keywords: ['在庫', '在庫確認', '入荷'],
    response:
      '在庫確認についてお答えします。商品詳細ページに在庫数が表示されております。在庫がない場合は「在庫切れ」と表示されます。在庫が復活した際にメール通知をご希望の場合は、「入荷通知を受け取る」ボタンをクリックしてください。入荷予定がある場合は、商品詳細ページに予定日が表示されます。',
    model: 'Gemini 2.0 Flash',
  },
  {
    keywords: ['支払い', '決済', 'クレジットカード', '銀行振込'],
    response:
      'お支払い方法についてご案内します。当サイトでは銀行振込、クレジットカード、PayPayをご利用いただけます。銀行振込の場合は注文確定後3日以内にお振込みください。振込手数料はお客様負担となります。クレジットカードは商品発送時に決済されます。',
    model: 'Gemini 2.0 Flash',
  },
];

// ========================================
// API関数
// ========================================

/**
 * 問い合わせ送信（AI回答付き）
 * @MOCK_TO_API
 * @param data 問い合わせデータ
 * @param isAuthenticated ログイン状態（true: AI回答あり、false: AI回答なし）
 */
export const submitInquiry = async (
  data: InquiryRequest,
  isAuthenticated: boolean = true
): Promise<InquiryResponse> => {
  // モック遅延
  await new Promise((resolve) => setTimeout(resolve, 1500));

  let aiResponse: string | undefined = undefined;
  let aiModel: string | undefined = undefined;
  let isEscalated = false;
  let status: InquiryStatus = InquiryStatus.AI_RESOLVED;

  // ログイン時のみAI回答を生成
  if (isAuthenticated) {
    // AIモック回答を生成
    const matchedResponse = AI_MOCK_RESPONSES.find((r) =>
      r.keywords.some((keyword) => data.question.includes(keyword))
    );

    aiResponse = matchedResponse
      ? matchedResponse.response
          .replace('{orderNumber}', 'ORD-20251223-XXXX')
          .replace('{deliveryDate}', '12月25日')
          .replace('{trackingNumber}', '123456789')
      : '申し訳ございません。この質問は自動回答できませんでした。オペレーターにおつなぎします。';

    aiModel = matchedResponse ? matchedResponse.model : undefined;
    isEscalated = !matchedResponse; // AI回答できない場合は自動エスカレーション
    if (isEscalated) {
      status = InquiryStatus.PENDING;
    }
  } else {
    // ゲストの場合は即座にオペレーターにエスカレーション
    isEscalated = true;
    status = InquiryStatus.PENDING;
  }

  const newInquiry: Inquiry = {
    id: `inq-${Date.now()}`,
    userId: undefined, // ゲスト可
    name: data.name,
    email: data.email,
    question: data.question,
    aiResponse: aiResponse,
    isSatisfied: undefined,
    isEscalated: isEscalated,
    status: status,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // モックストレージに保存（sessionStorage）
  const inquiries = JSON.parse(
    sessionStorage.getItem('mock_inquiries') || '[]'
  ) as Inquiry[];
  inquiries.push(newInquiry);
  sessionStorage.setItem('mock_inquiries', JSON.stringify(inquiries));

  return {
    success: true,
    message: '問い合わせを送信しました',
    inquiry: newInquiry,
    aiResponse: aiResponse,
    aiModel: aiModel,
  };
};

/**
 * 満足度フィードバック送信
 * @MOCK_TO_API
 */
export const submitFeedback = async (
  inquiryId: string,
  isSatisfied: boolean
): Promise<void> => {
  // モック遅延
  await new Promise((resolve) => setTimeout(resolve, 500));

  // モックストレージから取得
  const inquiries = JSON.parse(
    sessionStorage.getItem('mock_inquiries') || '[]'
  ) as Inquiry[];
  const inquiry = inquiries.find((i) => i.id === inquiryId);

  if (inquiry) {
    inquiry.isSatisfied = isSatisfied;
    inquiry.status = isSatisfied
      ? ('AI_RESOLVED' as InquiryStatus)
      : ('PENDING' as InquiryStatus);
    inquiry.updatedAt = new Date();
    sessionStorage.setItem('mock_inquiries', JSON.stringify(inquiries));
  }
};

/**
 * オペレーターエスカレーション
 * @MOCK_TO_API
 */
export const escalateInquiry = async (inquiryId: string): Promise<void> => {
  // モック遅延
  await new Promise((resolve) => setTimeout(resolve, 500));

  // モックストレージから取得
  const inquiries = JSON.parse(
    sessionStorage.getItem('mock_inquiries') || '[]'
  ) as Inquiry[];
  const inquiry = inquiries.find((i) => i.id === inquiryId);

  if (inquiry) {
    inquiry.isEscalated = true;
    inquiry.status = 'PENDING' as InquiryStatus;
    inquiry.updatedAt = new Date();
    sessionStorage.setItem('mock_inquiries', JSON.stringify(inquiries));
  }
};

/**
 * 過去の問い合わせ履歴取得（ログイン必須）
 * @MOCK_TO_API
 */
export const getInquiryHistory = async (
  userId: string
): Promise<InquiryHistory[]> => {
  // モック遅延
  await new Promise((resolve) => setTimeout(resolve, 800));

  // モックデータ + sessionStorageのデータ
  const sessionInquiries = JSON.parse(
    sessionStorage.getItem('mock_inquiries') || '[]'
  ) as Inquiry[];

  const allInquiries = [
    ...MOCK_INQUIRIES.filter((i) => i.userId === userId),
    ...sessionInquiries.filter((i) => i.userId === userId),
  ];

  return allInquiries.map((i) => ({
    id: i.id,
    userId: i.userId,
    name: i.name,
    email: i.email,
    question: i.question,
    aiResponse: i.aiResponse,
    isSatisfied: i.isSatisfied,
    isEscalated: i.isEscalated,
    status: i.status,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  }));
};

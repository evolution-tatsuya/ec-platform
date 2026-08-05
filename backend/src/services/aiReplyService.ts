// ===== AI自動返答サービス =====
// 目的: 問い合わせに対する自動返答を生成する。
// 3段階エスカレーション:
//   1. FAQマッチング（無料、キーワードベース、40-50%対応）
//   2. Gemini 2.0 Flash（無料、1日20回まで、30-40%対応）
//   3. GPT-4o mini（有料、10-20%対応）
// クレーム・返金要求などは人間オペレーターへエスカレーション。
//
// 各AI呼び出しは AiUsageLog に記録し、日次レート制限と管理画面の使用量統計に利用する。

import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { config } from '../config';
import { prisma } from '../config/prisma';

export interface AutoReplyResult {
  /** 返答本文（エスカレーション時も定型メッセージを返す） */
  response: string;
  /** 使用したモデル: 'faq' | 'gemini' | 'gpt-4o-mini' | null（エスカレーション） */
  model: string | null;
  /** 人間オペレーターへのエスカレーションが必要か */
  escalate: boolean;
}

/** Geminiの1日あたり呼び出し上限（無料枠の運用制限） */
const GEMINI_DAILY_LIMIT = 20;

/** AI回答の最大文字数（プロンプトで指示 + 保険で切り詰め） */
const MAX_RESPONSE_LENGTH = 200;

/**
 * クレーム・返金・キャンセルなど、人間対応が望ましいキーワード。
 * これらを含む場合はAIを介さず即エスカレーションする。
 */
const ESCALATION_KEYWORDS = [
  'クレーム',
  '苦情',
  '返金',
  '払い戻し',
  '解約',
  'キャンセル',
  '訴え',
  '弁護士',
  '責任者',
  '最悪',
  '詐欺',
];

/**
 * FAQナレッジベース（キーワード → 回答）。
 * フロントのFAQ（ContactPage.tsx）と整合する内容。
 */
const FAQ_ENTRIES: { keywords: string[]; answer: string }[] = [
  {
    keywords: ['配送', '届く', '発送', 'いつ', '何日'],
    answer:
      '通常、ご注文から2〜3営業日で発送いたします。お届けまでは発送後1〜2日程度です。発送完了メールに配送業者と追跡番号を記載しております。',
  },
  {
    keywords: ['住所', '変更', '配送先'],
    answer:
      '発送前であればマイページの「注文履歴」から配送先を変更できます。発送済みの場合は変更できませんのでご了承ください。',
  },
  {
    keywords: ['返品', '交換'],
    answer:
      '商品到着後7日以内であれば、未開封・未使用に限り返品・交換が可能です。マイページの「注文履歴」から返品申請を行ってください。',
  },
  {
    keywords: ['支払', '決済', 'カード', '振込', 'コンビニ'],
    answer:
      'クレジットカード、銀行振込、コンビニ払いがご利用いただけます。銀行振込の場合は3.6%の割引が適用されます。',
  },
  {
    keywords: ['領収書', 'レシート'],
    answer:
      'マイページの「注文履歴」から該当注文を選択し、「領収書発行」ボタンよりPDFでダウンロードいただけます。',
  },
  {
    keywords: ['会員', '登録', 'アカウント'],
    answer:
      '会員登録なしでもゲスト購入が可能です。会員登録いただくと、注文履歴の確認、ポイント利用、お気に入り機能がご利用いただけます。',
  },
  {
    keywords: ['パスワード', 'ログインできない', 'ログイン'],
    answer:
      'ログインページの「パスワードを忘れた方」リンクから、登録メールアドレスを入力してください。パスワード再設定用のメールをお送りします。',
  },
  {
    keywords: ['ポイント'],
    answer:
      '購入金額の1%がポイントとして付与されます。1ポイント=1円として次回以降のお買い物にご利用いただけます。有効期限は最終購入日から1年間です。',
  },
  {
    keywords: ['メール', '届かない', '迷惑メール'],
    answer:
      '迷惑メールフォルダをご確認ください。携帯キャリアメールの場合は、ドメイン指定受信で「@ec-platform.com」を許可設定してください。',
  },
];

const ESCALATION_MESSAGE =
  '恐れ入りますが、こちらのお問い合わせはオペレーターが確認いたします。担当者より改めてご連絡いたしますので、少々お待ちください。';

/** ECサイト専用のシステムプロンプト（Gemini / GPT共通） */
const SYSTEM_PROMPT = `あなたはECサイト「多機能ECプラットフォーム」のカスタマーサポート担当です。
以下のルールに従って、お客様の問い合わせに丁寧な日本語で回答してください。
- 回答は${MAX_RESPONSE_LENGTH}文字以内で簡潔に。
- 分からないこと、注文個別の状況、返金・クレーム対応は「オペレーターにおつなぎします」と案内する。
- 敬語を使い、親切で誠実な対応を心がける。
- サイトの一般的な案内（配送、支払い、返品、会員、ポイント等）には具体的に回答する。`;

/**
 * 文字数上限で切り詰める（末尾に句点を残す簡易処理）。
 */
const truncate = (text: string): string => {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_RESPONSE_LENGTH) return trimmed;
  return trimmed.slice(0, MAX_RESPONSE_LENGTH - 1) + '…';
};

/**
 * AI呼び出しをログに記録する（失敗しても返答フローは止めない）。
 */
const logUsage = async (model: string, inquiryId?: string): Promise<void> => {
  try {
    await prisma.aiUsageLog.create({ data: { model, inquiryId: inquiryId ?? null } });
  } catch (error) {
    // 使用量ログの失敗は致命的ではないため握りつぶす（本番はログ出力のみ）
    if (config.nodeEnv !== 'production') {
      console.error('AI使用量ログの記録に失敗:', error);
    }
  }
};

/**
 * FAQマッチングを試みる。マッチした場合は回答を返し、しなければnull。
 */
const matchFaq = (question: string): string | null => {
  const normalized = question.toLowerCase();
  let bestMatch: { answer: string; score: number } | null = null;

  for (const entry of FAQ_ENTRIES) {
    const score = entry.keywords.filter((kw) =>
      normalized.includes(kw.toLowerCase())
    ).length;
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { answer: entry.answer, score };
    }
  }

  return bestMatch ? bestMatch.answer : null;
};

/**
 * 問い合わせ内容に人間エスカレーションが必要なキーワードが含まれるか判定。
 */
const needsHumanEscalation = (question: string): boolean => {
  return ESCALATION_KEYWORDS.some((kw) => question.includes(kw));
};

/**
 * 本日のGemini呼び出し回数を取得する。
 */
const getTodayGeminiCount = async (): Promise<number> => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return prisma.aiUsageLog.count({
    where: { model: 'gemini', createdAt: { gte: startOfDay } },
  });
};

/**
 * AIが「回答できない/オペレーター案内」と判断したかを検出する。
 * この場合は次段のエスカレーション扱いとする。
 */
const isDeflection = (text: string): boolean => {
  return /オペレーター|担当者|分かりかね|わかりかね|お答えできません/.test(text);
};

/**
 * ステージ2: Gemini 2.0 Flash で回答を試みる。
 * 日次上限超過・APIエラー・回答拒否時はnullを返して次段へフォールバック。
 */
const tryGemini = async (question: string): Promise<string | null> => {
  const key = config.geminiApiKey;
  if (!key) return null;

  // 日次レート制限チェック
  const usedToday = await getTodayGeminiCount();
  if (usedToday >= GEMINI_DAILY_LIMIT) {
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_PROMPT,
    });
    const result = await model.generateContent(question);
    const text = result.response.text();
    if (!text || isDeflection(text)) return null;
    return truncate(text);
  } catch (error) {
    if (config.nodeEnv !== 'production') {
      console.error('Gemini呼び出しエラー:', error);
    }
    return null;
  }
};

/**
 * ステージ3: GPT-4o mini で回答を試みる。
 * APIエラー・回答拒否時はnullを返してエスカレーションへ。
 */
const tryOpenAI = async (question: string): Promise<string | null> => {
  const key = config.openaiApiKey;
  if (!key) return null;

  try {
    const openai = new OpenAI({ apiKey: key });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: question },
      ],
      max_tokens: 300,
      temperature: 0.3,
    });
    const text = completion.choices[0]?.message?.content ?? '';
    if (!text || isDeflection(text)) return null;
    return truncate(text);
  } catch (error) {
    if (config.nodeEnv !== 'production') {
      console.error('OpenAI呼び出しエラー:', error);
    }
    return null;
  }
};

/**
 * 問い合わせに対する自動返答を生成する（3段階エスカレーション）。
 *
 * @param question ユーザーの質問本文
 * @param inquiryId 紐づく問い合わせID（使用量ログ用、任意）
 * @returns 返答結果（response / model / escalate）
 */
export const generateAutoReply = async (
  question: string,
  inquiryId?: string
): Promise<AutoReplyResult> => {
  // 0. 人間対応が望ましいキーワード（クレーム・返金等）は即エスカレーション
  if (needsHumanEscalation(question)) {
    return { response: ESCALATION_MESSAGE, model: null, escalate: true };
  }

  // 1. FAQマッチング（無料）
  const faqAnswer = matchFaq(question);
  if (faqAnswer) {
    await logUsage('faq', inquiryId);
    return { response: faqAnswer, model: 'faq', escalate: false };
  }

  // 2. Gemini 2.0 Flash（無料、日次20回まで）
  const geminiAnswer = await tryGemini(question);
  if (geminiAnswer) {
    await logUsage('gemini', inquiryId);
    return { response: geminiAnswer, model: 'gemini', escalate: false };
  }

  // 3. GPT-4o mini（有料）
  const gptAnswer = await tryOpenAI(question);
  if (gptAnswer) {
    await logUsage('gpt-4o-mini', inquiryId);
    return { response: gptAnswer, model: 'gpt-4o-mini', escalate: false };
  }

  // 4. すべて解決できない場合は人間エスカレーション
  return { response: ESCALATION_MESSAGE, model: null, escalate: true };
};

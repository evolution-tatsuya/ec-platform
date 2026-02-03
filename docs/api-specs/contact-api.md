# 問い合わせAPI仕様書

生成日: 2025-12-23
収集元: frontend/src/services/mock/InquiryService.ts
@MOCK_TO_APIマーク数: 4

## エンドポイント一覧

### 1. 問い合わせ送信（AI回答付き）
- **エンドポイント**: `POST /api/inquiries`
- **APIパス定数**: なし（直接実装）
- **Request**: `InquiryRequest` + `isAuthenticated`（ログイン状態）
- **Response**: `InquiryResponse`
- **説明**: 問い合わせを送信し、ログイン状態に応じてAI回答を生成

#### Request Body
```typescript
{
  name: string;                // 名前（必須）
  email: string;               // メールアドレス（必須）
  orderNumber?: string;        // 注文番号（任意）
  question: string;            // 質問内容（必須）
}
```

#### Request Headers
```typescript
{
  Authorization?: string;      // Bearer token（ログイン時）
}
```

#### Response
```typescript
{
  inquiry: {
    id: string;
    userId?: string;
    name: string;
    email: string;
    orderNumber?: string;
    question: string;
    aiResponse?: string;       // AI回答（ログイン時のみ）
    aiModel?: string;          // 使用AIモデル（Gemini 2.0 Flash/GPT-4o mini）
    isSatisfied?: boolean;
    isEscalated: boolean;
    status: InquiryStatus;     // AI_RESOLVED/PENDING/RESOLVED
    createdAt: Date;
    updatedAt: Date;
  };
  aiResponse?: string;         // AI回答テキスト
  aiModel?: string;            // 使用AIモデル名
}
```

#### ビジネスロジック

##### ログイン時（isAuthenticated = true）
1. FAQマッチング（キーワード検索）
2. マッチした場合: 即座にFAQ回答を返却
3. マッチしない場合:
   - Gemini 2.0 Flash呼び出し（1日20回まで無料）
   - 超過時: GPT-4o mini呼び出し（有料）
4. AI回答を取得・保存
5. 回答不可の場合: 自動エスカレーション（isEscalated = true）

##### 未ログイン時（isAuthenticated = false）
1. AI回答をスキップ
2. 即座にオペレーターにエスカレーション（isEscalated = true）
3. 確認メールを送信（Resend）

#### エラーハンドリング
- 400: バリデーションエラー（必須項目未入力）
- 500: AI API呼び出しエラー
- 503: メール送信エラー

---

### 2. 満足度フィードバック送信
- **エンドポイント**: `PUT /api/inquiries/:id/feedback`
- **APIパス定数**: なし（直接実装）
- **Request**: `{ isSatisfied: boolean }`
- **Response**: `void`
- **説明**: AI回答の満足度フィードバックを送信

#### Request Parameters
```typescript
{
  id: string;                  // 問い合わせID（URLパラメータ）
}
```

#### Request Body
```typescript
{
  isSatisfied: boolean;        // true: 解決した, false: 解決しなかった
}
```

#### Response
```typescript
void
```

#### ビジネスロジック
1. 問い合わせIDで該当データを取得
2. `isSatisfied`フィールドを更新
3. `status`を更新:
   - isSatisfied = true → AI_RESOLVED
   - isSatisfied = false → PENDING
4. `updatedAt`を現在時刻に更新

---

### 3. オペレーターエスカレーション
- **エンドポイント**: `POST /api/inquiries/:id/escalate`
- **APIパス定数**: なし（直接実装）
- **Request**: なし
- **Response**: `void`
- **説明**: 問い合わせをオペレーターにエスカレーション

#### Request Parameters
```typescript
{
  id: string;                  // 問い合わせID（URLパラメータ）
}
```

#### Request Body
なし

#### Response
```typescript
void
```

#### ビジネスロジック
1. 問い合わせIDで該当データを取得
2. `isEscalated`を`true`に更新
3. `status`を`PENDING`に更新
4. 管理者に通知メール送信（Resend）
5. `updatedAt`を現在時刻に更新

---

### 4. 過去の問い合わせ履歴取得
- **エンドポイント**: `GET /api/inquiries/history`
- **APIパス定数**: なし（直接実装）
- **Request**: なし（ユーザーIDはトークンから取得）
- **Response**: `InquiryHistory[]`
- **説明**: ログイン中のユーザーの過去の問い合わせ履歴を取得

#### Request Headers
```typescript
{
  Authorization: string;       // Bearer token（必須）
}
```

#### Response
```typescript
[
  {
    id: string;
    createdAt: Date;
    question: string;
    status: InquiryStatus;     // AI_RESOLVED/PENDING/RESOLVED
    aiResponse?: string;
  }
]
```

#### ビジネスロジック
1. トークンからユーザーIDを取得
2. 該当ユーザーの問い合わせを取得（最新10件）
3. 履歴表示用に変換して返却

---

## 複合API処理

### 複合処理-003: AI自動返答処理
- **エンドポイント**: `POST /api/inquiries`（内部処理）
- **処理タイプ**: @BACKEND_COMPLEX
- **参照**: requirements.md「複合API処理（バックエンド内部処理）」セクション

#### 内部処理フロー
1. **FAQマッチング（キーワード検索）**
   - データベースのFAQテーブルから検索
   - マッチした場合: FAQ回答を即座に返却、処理終了

2. **Gemini 2.0 Flash呼び出し（無料、1日20回まで）**
   - Google AI SDK使用
   - システムプロンプト: ECサイト専用カスタマーサポート
   - 回答文字数制限: 200文字以内
   - エスカレーション条件判定（クレーム、返金要求等）

3. **GPT-4o mini呼び出し（Gemini超過時）**
   - OpenAI SDK使用
   - 同じシステムプロンプト
   - 回答文字数制限: 200文字以内

4. **AI使用量カウント更新**
   - Gemini使用回数を記録（日次リセット）
   - GPT-4o mini使用回数を記録（月次集計）

5. **エスカレーション判定**
   - AI回答に「ESCALATE」フラグが含まれる場合
   - 管理者に通知メール送信（Resend）
   - status = PENDING

6. **問い合わせレコード保存**
   - データベースに保存
   - ログイン時: userIdを紐付け
   - ゲスト時: userIdはnull

#### Request/Response
```typescript
// Request
{
  name: string;
  email: string;
  orderNumber?: string;
  question: string;
}

// Response
{
  inquiry: Inquiry;
  aiResponse?: string;
  aiModel?: string;    // "Gemini 2.0 Flash" | "GPT-4o mini"
}
```

#### エラーハンドリング
- Gemini API失敗 → GPT-4o miniに自動フォールバック
- GPT-4o mini失敗 → 自動エスカレーション（人間対応）

---

## モックサービス参照
```typescript
// 実装時はこのモックサービスの挙動を参考にする
frontend/src/services/mock/InquiryService.ts
```

## 型定義参照
```typescript
// 型定義
frontend/src/types/index.ts

// 主要型
- InquiryRequest: 問い合わせ送信リクエスト
- InquiryResponse: AI回答レスポンス
- InquiryHistory: 問い合わせ履歴
- Inquiry: 問い合わせデータ
- InquiryStatus: 問い合わせステータス（enum）
```

## 外部サービス依存

| サービス | 用途 | 無料枠 | 超過時のコスト |
|---------|------|--------|---------------|
| Gemini 2.0 Flash | AI自動返答 | 1日20回 | 超過時はGPT-4o miniに切替 |
| GPT-4o mini | AI自動返答（Gemini超過時） | なし | 月200-600円（1000問い合わせ想定） |
| Resend | メール送信 | 3,000通/月 | 月$20（10,000通まで） |

## セキュリティ考慮事項

- **入力検証**: XSS対策（サニタイゼーション）
- **レート制限**: 同一IPからの連続送信を制限（5回/分）
- **スパム対策**: reCAPTCHA v3導入検討
- **個人情報保護**: 問い合わせ内容は暗号化して保存

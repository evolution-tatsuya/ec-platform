# プロジェクト設定

## 基本設定
```yaml
プロジェクト名: 多機能ECプラットフォーム
開始日: 2025-12-19
技術スタック:
  frontend:
    - React 18.3+
    - TypeScript 5.x
    - MUI v6
    - Zustand
    - React Query v5
    - React Router v6
    - Vite 5.x
    - Swiper
    - Recharts
    - pdfme
    - qrcode / html5-qrcode
    - React Hook Form + Zod
    - date-fns
  backend:
    - Node.js 20 LTS (TypeScript)
    - Express.js 4.x
    - Prisma ORM 5.x
    - bcrypt
    - express-session
    - sharp
    - pdfme
    - Resend SDK
    - OpenAI SDK
    - Google AI SDK
    - Stripe SDK
  database:
    - PostgreSQL 15+ (Neon)
  storage:
    - Cloudflare R2
```

## 開発環境
```yaml
ポート設定:
  # 複数プロジェクト並行開発のため、一般的でないポートを使用
  frontend: 3247
  backend: 8432

環境変数:
  設定ファイル: .env.local（ルートディレクトリ）
  必須項目:
    - DATABASE_URL (Neon接続文字列)
    - SESSION_SECRET (ランダム文字列、32文字以上推奨)
    - R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
    - STRIPE_PUBLIC_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
    - RESEND_API_KEY, RESEND_FROM_EMAIL
    - OPENAI_API_KEY
    - GEMINI_API_KEY
    - FRONTEND_URL (http://localhost:3247)
    - BACKEND_URL (http://localhost:8432)
```

## テスト認証情報
```yaml
開発用アカウント:
  email: admin@ec-platform.local
  password: TestAdmin2025!

開発用テストデータ:
  商品数: 50点（テスト用）
  会員数: 10名（テスト用）
  注文数: 20件（テスト用）
```

## コーディング規約

### 命名規則
```yaml
ファイル名:
  - コンポーネント: PascalCase.tsx (例: ProductCard.tsx, CartPage.tsx)
  - ユーティリティ: camelCase.ts (例: formatPrice.ts, calculateDiscount.ts)
  - 定数: UPPER_SNAKE_CASE.ts (例: API_ENDPOINTS.ts, PAYMENT_METHODS.ts)
  - API: kebab-case.ts (例: product-routes.ts, order-routes.ts)

変数・関数:
  - 変数: camelCase (例: productList, orderTotal)
  - 関数: camelCase (例: fetchProducts, createOrder)
  - 定数: UPPER_SNAKE_CASE (例: MAX_FILE_SIZE, DEFAULT_DISCOUNT_RATE)
  - 型/インターフェース: PascalCase (例: Product, Order, User)
```

### コード品質
```yaml
必須ルール:
  - TypeScript: strictモード有効
  - 未使用の変数/import禁止
  - console.log本番環境禁止（開発環境のみ許可）
  - エラーハンドリング必須（try-catch, Promise.catch）
  - 非同期処理は必ずasync/await使用
  - 関数行数: 100行以下
  - ファイル行数: 700行以下
  - 複雑度: 10以下
  - 行長: 120文字

フォーマット:
  - インデント: スペース2つ
  - セミコロン: あり
  - クォート: シングル
  - 行末カンマ: あり（trailing comma）
```

### コミットメッセージ
```yaml
形式: [type]: [description]

type:
  - feat: 新機能
  - fix: バグ修正
  - docs: ドキュメント
  - style: フォーマット
  - refactor: リファクタリング
  - test: テスト
  - chore: その他

例:
  - "feat: 動的ナビゲーション軸機能実装"
  - "fix: 在庫チェックのトランザクション処理修正"
  - "docs: API仕様書に決済エンドポイント追加"
```

## プロジェクト固有ルール

### APIエンドポイント
```yaml
命名規則:
  - RESTful形式を厳守
  - 複数形を使用 (/products, /orders)
  - ケバブケース使用 (/event-forms, /navigation-axes)
  - 管理者用は /admin プレフィックス

主要エンドポイント:
  顧客向け:
    - GET /api/products - 商品一覧取得
    - GET /api/products/:id - 商品詳細取得
    - POST /api/cart - カート追加
    - GET /api/cart - カート取得
    - POST /api/orders - 注文作成
    - GET /api/orders/:orderNumber - 注文詳細取得
    - POST /api/inquiries - 問い合わせ送信
    - GET /api/navigation-axes - ナビゲーション軸取得

  管理者向け:
    - POST /api/admin/login - ログイン
    - POST /api/admin/logout - ログアウト
    - GET /api/admin/products - 商品管理
    - POST /api/admin/products - 商品追加
    - PUT /api/admin/orders/:id/ship - 発送処理
    - GET /api/admin/events/participants - 参加者リスト
    - POST /api/admin/tickets/scan - QR読み取り
    - GET /api/admin/navigation-axes - 軸設定取得
    - POST /api/admin/navigation-axes - 軸追加
```

### 型定義
```yaml
配置:
  frontend: src/types/index.ts
  backend: src/types/index.ts

同期ルール:
  - 両ファイルは常に同一内容を保つ
  - 片方を更新したら即座にもう片方も更新
  - 共通型は必ず両方で定義

主要型定義:
  - Product: 商品データ
  - ProductAttribute: 商品属性（動的）
  - CategoryNavigationAxis: ナビゲーション軸定義
  - Order: 注文データ
  - User: 会員データ
  - Admin: 管理者データ
  - EventFormTemplate: イベントフォームテンプレート
  - DigitalTicket: デジタルチケット
  - ProductType: 商品種別（enum）
  - AxisType: 軸種別（enum）
```

### データベース操作
```yaml
ルール:
  - Prisma ORMを使用、生SQLは禁止
  - トランザクション必須の操作:
    - 注文作成（在庫チェック + 在庫減算 + 注文INSERT）
    - 在庫調整（在庫ログ追加）
    - チケット使用（使用済みチェック + UPDATE）
  - イミュータブルデータモデル（在庫ログ）
  - 集計クエリはインデックスを活用

トランザクション例:
  await prisma.$transaction(async (tx) => {
    // 在庫チェック
    const stockSum = await tx.inventoryLog.aggregate({
      where: { productId },
      _sum: { quantity: true },
    });
    const currentStock = stockSum._sum.quantity || 0;
    if (currentStock < quantity) throw new Error('在庫不足');

    // 在庫減算ログ
    await tx.inventoryLog.create({
      data: { productId, quantity: -quantity, type: 'sale' },
    });

    // 注文作成
    return await tx.order.create({ data: orderData });
  });
```

### 画像最適化
```yaml
実装ルール:
  - アップロード時に自動WebP変換（sharp使用）
  - 圧縮品質: 80%（デフォルト、設定変更可能）
  - 複数サイズ生成:
    - サムネイル: 200×200（5-10KB）
    - 一覧用: 400×400（20-30KB）
    - 詳細用: 800×800（50-100KB）
  - Cloudflare R2に保存
  - フロントエンドで遅延読み込み（react-lazy-load-image）

目標:
  - 元画像から88%容量削減
  - 商品50,000点でも無料枠（10GB）内
```

### AI自動返答
```yaml
実装ルール:
  - 3段階エスカレーション:
    1. FAQマッチング（無料、40-50%対応）
    2. Gemini 2.0 Flash（無料、30-40%対応、1日20回まで）
    3. GPT-4o mini（有料、10-20%対応）
  - 人間エスカレーション: クレーム、返金要求等
  - 使用量監視ダッシュボード（管理画面）
  - コスト目標: 月200-600円

プロンプト設計:
  - システムプロンプト: ECサイト専用
  - エスカレーション条件明確化
  - 回答は200文字以内
```

## 🆕 最新技術情報（知識カットオフ対応）

```yaml
Vercel無料プラン（Hobby）:
  - 商用利用: 禁止（本プロジェクトは非商用のため問題なし）
  - サーバーレス関数: 同時実行1000
  - 帯域幅: 100GB/月
  - デプロイ: 無制限

Neon無料プラン:
  - ストレージ: 0.5GB
  - CPU時間: 月190時間
  - 同時接続: 100（Pooled接続で10,000まで）
  - リージョン: シンガポール（ap-southeast-1）が最寄り

Google Cloud Run無料枠:
  - リクエスト: 月200万回
  - CPU時間: 月18万vCPU秒
  - メモリ: 月36万GB秒
  - 自動スケーリング: 0〜1000インスタンス

Cloudflare R2無料枠:
  - ストレージ: 10GB/月
  - Class A操作: 100万リクエスト/月
  - Class B操作: 1,000万リクエスト/月
  - エグレス: 完全無料（最大の利点）

MUI v6:
  - Autocomplete: 商品検索
  - DataGrid: 管理画面の一覧表示
  - DatePicker: 配達日選択
  - Button, TextField, Select等の基本コンポーネント

React Query v5:
  - useQuery: データ取得
  - useMutation: データ更新
  - キャッシング: 5分（デフォルト）
  - リフェッチ: ウィンドウフォーカス時

Stripe最新機能（2025年）:
  - 銀行振込統合（日本市場向け、手数料1.5%）
  - Dynamic Payment Methods（決済手段の動的切替）
  - Payment Method Rules（条件付き表示制御）
```

## ⚠️ プロジェクト固有の注意事項

```yaml
在庫管理:
  - イミュータブルデータモデル採用
  - 在庫数 = 入庫ログ合計 - 出庫ログ合計
  - 同時購入時のロック競合を回避
  - トランザクション必須

決済方法:
  - 銀行振込（メイン）: 手数料1.5%
  - クレジットカード: 手数料3.6%
  - 銀行振込割引: デフォルト3.6%（管理画面で変更可能）
  - 決済方法の表示/非表示: 管理画面で切替可能

画像ストレージ:
  - Cloudflare R2使用
  - WebP自動変換、88%容量削減
  - 10GB無料枠で50,000商品対応可能

動的ナビゲーション軸:
  - 管理画面で自由に追加・編集・削除
  - 2軸～5軸程度まで対応
  - カテゴリーごとに最適な軸を設定可能
  - 車パーツ: メーカー → 車種 → 型式 → パーツ種類（4軸）
  - イベント: イベント種類 → 開催月 → 開催地（3軸）
  - デジタル: 商品種類 → ジャンル（2軸）

イベント・チケット:
  - カスタムフォームビルダー（19項目以上対応可能）
  - 条件分岐機能（「その他」選択時のみ表示等）
  - QR受付機能（html5-qrcode使用）
  - 参加者リスト（CSV/Excel出力）

デジタル商品:
  - Cloudflare R2に保存
  - 署名付きURL（24時間有効）
  - ダウンロード回数制限（最大5回）
  - 不正ダウンロード防止

セキュリティ:
  - パスワード: bcryptでハッシュ化
  - セッション: express-session + PostgreSQL
  - ブルートフォース対策: 5回失敗で15分ロック
  - CORS: フロントエンドURLのみ許可
  - 環境変数: .env.localで管理、Gitにコミットしない
```

## 📝 作業ログ（最新5件）

```yaml
- 2025-12-19: 要件定義完了（Phase 1: 要件定義）
- 2025-12-19: 技術スタック決定（React, Express, Prisma, Neon, R2）
- 2025-12-19: ページ構成確定（顧客向け12ページ、管理画面8ページ）
- 2025-12-19: CLAUDE.md作成完了
- 2025-12-19: SCOPE_PROGRESS作成完了
```

## 🎯 次のアクション

```yaml
優先度: 高
  1. GitHubリポジトリ作成
  2. Neonプロジェクト作成・接続
  3. Cloudflare R2バケット作成
  4. Stripeアカウント作成・API取得
  5. Prismaスキーマ定義
  6. データベースマイグレーション実行

優先度: 中
  7. バックエンドAPI基盤構築（Express + Prisma）
  8. 認証機能実装（bcrypt + express-session）
  9. フロントエンド基盤構築（React + MUI + Vite）

優先度: 低
  10. 顧客向けページ実装（P-001～P-012）
  11. 管理画面実装（A-001～A-008）
  12. AI自動返答実装（Gemini + GPT-4o mini）
```

## 🔗 参考リンク

```yaml
ドキュメント:
  - 要件定義書: docs/requirements.md
  - 進捗管理: SCOPE_PROGRESS.md
  - このファイル: CLAUDE.md

外部サービス:
  - GitHub: https://github.com
  - Neon: https://neon.tech
  - Cloudflare: https://dash.cloudflare.com
  - Stripe: https://stripe.com/jp
  - Resend: https://resend.com
  - OpenAI: https://platform.openai.com
  - Google AI: https://aistudio.google.com
  - Vercel: https://vercel.com
  - Google Cloud: https://cloud.google.com/run

技術ドキュメント:
  - React: https://react.dev
  - MUI: https://mui.com
  - Prisma: https://www.prisma.io
  - Stripe: https://stripe.com/docs
  - pdfme: https://pdfme.com
```

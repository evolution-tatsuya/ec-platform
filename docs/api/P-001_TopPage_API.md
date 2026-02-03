# P-001 トップページ API仕様書

## 概要
トップページで使用するデータを取得するAPIの仕様書です。

## エンドポイント

### GET /api/top-page

トップページに表示するすべてのデータを一括取得します。

#### リクエスト
- メソッド: `GET`
- URL: `/api/top-page`
- 認証: 不要（ゲストアクセス可）
- パラメータ: なし

#### レスポンス

**成功時 (200 OK)**

```json
{
  "heroSlides": [
    {
      "id": "string",
      "imageUrl": "string",
      "title": "string (optional)",
      "description": "string (optional)",
      "linkUrl": "string (optional)",
      "order": "number",
      "isActive": "boolean",
      "createdAt": "string (ISO 8601)",
      "updatedAt": "string (ISO 8601)"
    }
  ],
  "megaCategories": [
    {
      "id": "string",
      "categoryType": "CARS | EVENTS | DIGITAL",
      "name": "string",
      "description": "string",
      "backgroundImageUrl": "string",
      "linkUrl": "string",
      "order": "number",
      "isActive": "boolean",
      "createdAt": "string (ISO 8601)",
      "updatedAt": "string (ISO 8601)"
    }
  ],
  "pickupProducts": [
    {
      "id": "string",
      "name": "string",
      "price": "number",
      "imageUrl": "string",
      "categoryType": "CARS | EVENTS | DIGITAL",
      "isActive": "boolean",
      "stockQuantity": "number",
      "createdAt": "string (ISO 8601)",
      "updatedAt": "string (ISO 8601)"
    }
  ],
  "newProducts": [
    {
      "id": "string",
      "name": "string",
      "price": "number",
      "imageUrl": "string",
      "categoryType": "CARS | EVENTS | DIGITAL",
      "isActive": "boolean",
      "stockQuantity": "number",
      "createdAt": "string (ISO 8601)",
      "updatedAt": "string (ISO 8601)"
    }
  ],
  "saleProducts": [
    {
      "id": "string",
      "name": "string",
      "price": "number",
      "imageUrl": "string",
      "categoryType": "CARS | EVENTS | DIGITAL",
      "isActive": "boolean",
      "stockQuantity": "number",
      "createdAt": "string (ISO 8601)",
      "updatedAt": "string (ISO 8601)"
    }
  ],
  "popularProducts": [
    {
      "id": "string",
      "name": "string",
      "price": "number",
      "imageUrl": "string",
      "categoryType": "CARS | EVENTS | DIGITAL",
      "isActive": "boolean",
      "stockQuantity": "number",
      "createdAt": "string (ISO 8601)",
      "updatedAt": "string (ISO 8601)"
    }
  ],
  "news": [
    {
      "id": "string",
      "date": "string (YYYY年MM月DD日)",
      "title": "string",
      "content": "string (optional)",
      "isActive": "boolean",
      "createdAt": "string (ISO 8601)",
      "updatedAt": "string (ISO 8601)"
    }
  ]
}
```

**エラー時**

- `500 Internal Server Error`: サーバーエラー

```json
{
  "error": "string",
  "message": "string"
}
```

## データ仕様

### HeroSlide
- `id`: スライドの一意識別子
- `imageUrl`: スライド画像のURL（Cloudflare R2）
- `title`: スライドタイトル（省略可）
- `description`: スライド説明文（省略可）
- `linkUrl`: クリック時の遷移先URL（省略可）
- `order`: 表示順序（昇順）
- `isActive`: 表示/非表示フラグ
- `createdAt`: 作成日時
- `updatedAt`: 更新日時

**表示ルール:**
- `isActive: true` のスライドのみ表示
- `order` の昇順でソート
- 自動再生: 6秒間隔
- フェードエフェクト使用

### MegaCategory
- `id`: カテゴリーの一意識別子
- `categoryType`: カテゴリー種別（CARS: 車パーツ、EVENTS: イベント、DIGITAL: デジタル商品）
- `name`: カテゴリー名
- `description`: カテゴリー説明文（改行含む）
- `backgroundImageUrl`: 背景画像URL（UnsplashまたはCloudflare R2）
- `linkUrl`: クリック時の遷移先URL
- `order`: 表示順序（昇順）
- `isActive`: 表示/非表示フラグ
- `createdAt`: 作成日時
- `updatedAt`: 更新日時

**表示ルール:**
- `isActive: true` のカテゴリーのみ表示
- `order` の昇順でソート（通常: 車パーツ → イベント → デジタル）
- ホバー時に背景画像拡大エフェクト

### PickupProduct
ピックアップ商品（管理者が選定した注目商品）

- `id`: 商品の一意識別子
- `name`: 商品名
- `price`: 価格（整数、単位: 円）
- `imageUrl`: 商品画像URL（Cloudflare R2）
- `categoryType`: カテゴリー種別
- `isActive`: 表示/非表示フラグ
- `stockQuantity`: 在庫数
- `createdAt`: 作成日時
- `updatedAt`: 更新日時

**表示ルール:**
- `isActive: true` かつ `stockQuantity > 0` の商品のみ表示
- 横スクロール対応（Swiper使用）
- レスポンシブ: モバイル1列、タブレット3列、デスクトップ4列

### NewProducts, SaleProducts, PopularProducts
新着商品、セール商品、人気商品の仕様は `PickupProduct` と同じです。

**抽出ロジック（バックエンド側）:**
- `newProducts`: `createdAt` が新しい順に4件
- `saleProducts`: 割引率が高い順に4件（割引情報は別途管理）
- `popularProducts`: 購入回数が多い順に4件

### NewsItem
- `id`: ニュースの一意識別子
- `date`: 公開日（表示用文字列: "YYYY年MM月DD日"）
- `title`: ニュースタイトル
- `content`: ニュース本文（省略可、詳細ページで使用）
- `isActive`: 表示/非表示フラグ
- `createdAt`: 作成日時
- `updatedAt`: 更新日時

**表示ルール:**
- `isActive: true` のニュースのみ表示
- `createdAt` の降順でソート
- トップページでは最新5件のみ表示

## 実装メモ

### フロントエンド
- ファイル: `src/pages/TopPage.tsx`
- データ取得: React Query の `useQuery` を使用
- キャッシュ: 5分間（デフォルト）
- エラー時: エラーメッセージ表示

### バックエンド（Phase 5で実装予定）
- ファイル: `backend/src/routes/top-page.ts`
- データベース: Prisma経由でPostgreSQL（Neon）から取得
- キャッシュ: Redis（オプション、高負荷時のみ）
- 画像URL: Cloudflare R2の署名付きURL生成

## 関連ドキュメント
- [要件定義書](../requirements.md) - P-001トップページ
- [型定義](../../frontend/src/types/index.ts) - TopPageData型
- [進捗管理](../../SCOPE_PROGRESS.md)

## 変更履歴
- 2025-12-22: 初版作成（Phase 4: フロントエンド実装完了時）

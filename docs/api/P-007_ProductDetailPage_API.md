# P-007 商品詳細ページ API仕様書

## 概要
商品詳細ページで使用するデータを取得するAPIの仕様書です。

## エンドポイント

### GET /api/products/:id

指定された商品IDの詳細情報を取得します。

#### リクエスト
- メソッド: `GET`
- URL: `/api/products/:id`
- 認証: 不要（ゲストアクセス可）
- パラメータ:
  - `id` (path parameter): 商品ID（string）

#### レスポンス

**成功時 (200 OK)**

```json
{
  "product": {
    "id": "string",
    "name": "string",
    "price": "number",
    "salePrice": "number (optional)",
    "description": "string",
    "productType": "PHYSICAL | DIGITAL | DIGITAL_TICKET | EXTERNAL_LINK",
    "categoryType": "cars | events | digital",
    "images": ["string"],
    "stockQuantity": "number",
    "externalUrl": "string (optional)",
    "shippingSettings": {
      "allowWeekendDelivery": "boolean",
      "allowDateSelection": "boolean",
      "allowTimeSelection": "boolean",
      "preparationDays": "number"
    },
    "createdAt": "string (ISO 8601)",
    "updatedAt": "string (ISO 8601)",
    "attributes": [
      {
        "id": "string",
        "productId": "string",
        "axisKey": "string",
        "value": "string"
      }
    ],
    "tags": [
      {
        "id": "string",
        "name": "string"
      }
    ],
    "relatedProducts": [
      {
        "id": "string",
        "name": "string",
        "price": "number",
        "imageUrl": "string",
        "categoryType": "cars | events | digital"
      }
    ]
  },
  "breadcrumb": [
    {
      "label": "string",
      "url": "string (optional)"
    }
  ]
}
```

**エラー時**

- `404 Not Found`: 商品が見つからない

```json
{
  "error": "NOT_FOUND",
  "message": "商品が見つかりません"
}
```

- `500 Internal Server Error`: サーバーエラー

```json
{
  "error": "INTERNAL_ERROR",
  "message": "string"
}
```

## データ仕様

### ProductDetail
商品詳細データ（Product型を拡張）

- `id`: 商品の一意識別子
- `name`: 商品名
- `price`: 通常価格（整数、単位: 円）
- `salePrice`: セール価格（省略可、設定時はpriceより低い値）
- `description`: 商品詳細説明（改行含む）
- `productType`: 商品種別
  - `PHYSICAL`: 通常商品（配送あり）
  - `DIGITAL`: デジタル商品（ダウンロード）
  - `DIGITAL_TICKET`: デジタルチケット（QRコード）
  - `EXTERNAL_LINK`: 外部申し込み
- `categoryType`: カテゴリー種別（`cars` | `events` | `digital`）
- `images`: 商品画像URLの配列（Cloudflare R2、最大10枚）
- `stockQuantity`: 在庫数（イミュータブルログから計算）
- `externalUrl`: 外部申し込みURL（productType=EXTERNAL_LINKの場合のみ）
- `shippingSettings`: 配送設定（productType=PHYSICALの場合のみ）
  - `allowWeekendDelivery`: 土日配達可否
  - `allowDateSelection`: 日時指定可否
  - `allowTimeSelection`: 時間帯指定可否
  - `preparationDays`: 出荷準備日数
- `createdAt`: 作成日時
- `updatedAt`: 更新日時
- `attributes`: 商品属性（動的ナビゲーション軸の値）
- `tags`: タグ一覧
- `relatedProducts`: 関連商品（4件程度）

### RelatedProduct
関連商品データ（軽量版）

- `id`: 商品ID
- `name`: 商品名
- `price`: 価格
- `imageUrl`: サムネイル画像URL（1枚目の画像）
- `categoryType`: カテゴリー種別

**関連商品の抽出ロジック（バックエンド側）:**
1. 同じカテゴリー（categoryType）の商品
2. 同じタグを持つ商品を優先
3. 在庫あり（stockQuantity > 0）の商品のみ
4. ランダムに4件取得

### BreadcrumbItem
パンくずリストアイテム

- `label`: 表示テキスト
- `url`: リンク先URL（最後のアイテムはリンクなし = urlなし）

**パンくずリスト生成ロジック（バックエンド側）:**
1. トップ（`/`）
2. カテゴリー（`/cars`, `/events`, `/digital`）
3. 商品属性に応じた中間階層（例: `/cars/toyota`）
4. 現在の商品名（リンクなし）

## 在庫数の計算

在庫数はイミュータブルデータモデルで管理されます。

```sql
SELECT SUM(quantity) as stockQuantity
FROM inventory_logs
WHERE product_id = :productId
```

- 入庫: `quantity` が正の値
- 出庫（販売）: `quantity` が負の値
- 現在在庫 = 入庫合計 - 出庫合計

## 実装メモ

### フロントエンド
- ファイル: `src/pages/ProductDetailPage.tsx`
- データ取得: React Query の `useQuery` を使用
- キャッシュ: 5分間（デフォルト）
- エラー時: 404エラーページへリダイレクト
- 画像: 遅延読み込み（react-lazy-load-image）

### バックエンド（Phase 5で実装予定）
- ファイル: `backend/src/routes/products.ts`
- データベース: Prisma経由でPostgreSQL（Neon）から取得
- トランザクション: 在庫計算時は読み取りのみ
- 画像URL: Cloudflare R2の署名付きURL生成
- 関連商品: タグベースのレコメンデーション

### パフォーマンス最適化
- 商品詳細、在庫数、関連商品を並列取得
- 画像URLは事前に生成（署名付きURL、24時間有効）
- 関連商品はキャッシュ可能（1時間）

## カートへの追加

商品詳細ページからカートに追加する際は、別途APIを呼び出します。

### POST /api/cart

カートに商品を追加します。

#### リクエスト
- メソッド: `POST`
- URL: `/api/cart`
- 認証: 必須（ログインユーザーのみ）
- Body:

```json
{
  "productId": "string",
  "quantity": "number"
}
```

#### レスポンス

**成功時 (200 OK)**

```json
{
  "cart": {
    "items": [
      {
        "id": "string",
        "productId": "string",
        "productName": "string",
        "price": "number",
        "quantity": "number",
        "imageUrl": "string"
      }
    ],
    "totalAmount": "number",
    "itemCount": "number"
  }
}
```

**エラー時**

- `400 Bad Request`: 在庫不足

```json
{
  "error": "INSUFFICIENT_STOCK",
  "message": "在庫が不足しています",
  "availableStock": "number"
}
```

- `401 Unauthorized`: 未ログイン

```json
{
  "error": "UNAUTHORIZED",
  "message": "ログインが必要です"
}
```

## 関連ドキュメント
- [要件定義書](../requirements.md) - P-007商品詳細ページ
- [型定義](../../frontend/src/types/index.ts) - ProductDetail型
- [進捗管理](../../SCOPE_PROGRESS.md)

## 変更履歴
- 2025-12-22: 初版作成（Phase 4: フロントエンド実装完了時）

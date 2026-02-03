# P-009: カートページ API仕様書

## 概要
カートページで使用するAPI仕様を定義します。

---

## 1. カート取得 API

### エンドポイント
```
GET /api/cart
```

### 説明
ログインユーザーのカート内容を取得します。

### リクエストヘッダー
```
Authorization: Bearer {token}
Cookie: session_id={session_id}
```

### レスポンス
#### 成功時 (200 OK)
```json
{
  "items": [
    {
      "productId": "1",
      "quantity": 2,
      "product": {
        "id": "1",
        "name": "86用 高性能ブレーキパッド - スタンダード（フロント）",
        "price": 15800,
        "description": "トヨタ86専用に開発された高性能ブレーキパッドです。",
        "productType": "PHYSICAL",
        "categoryType": "cars",
        "images": ["https://r2.example.com/product1-1.webp"],
        "stockQuantity": 20,
        "shippingSettings": {
          "allowWeekendDelivery": true,
          "allowDateSelection": true,
          "allowTimeSelection": true,
          "preparationDays": 2
        },
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-01T00:00:00.000Z",
        "attributes": [],
        "tags": [
          { "id": "1", "name": "人気" }
        ]
      }
    }
  ],
  "totalAmount": 31600,
  "bankTransferDiscount": 1137,
  "finalAmount": 30463
}
```

#### エラー時 (401 Unauthorized)
```json
{
  "error": "認証が必要です"
}
```

---

## 2. カート追加 API

### エンドポイント
```
POST /api/cart
```

### 説明
カートに商品を追加します。

### リクエストヘッダー
```
Authorization: Bearer {token}
Cookie: session_id={session_id}
Content-Type: application/json
```

### リクエストボディ
```json
{
  "productId": "1",
  "quantity": 2,
  "product": {
    "id": "1",
    "name": "86用 高性能ブレーキパッド - スタンダード（フロント）",
    "price": 15800,
    "stockQuantity": 20
  }
}
```

### バリデーション
- `productId`: 必須、文字列
- `quantity`: 必須、整数、1〜99の範囲
- `product.stockQuantity`: 在庫数チェック（quantity <= stockQuantity）

### レスポンス
#### 成功時 (201 Created)
```json
{
  "message": "カートに追加しました",
  "cartItem": {
    "productId": "1",
    "quantity": 2,
    "product": { /* 商品情報 */ }
  }
}
```

#### エラー時 (400 Bad Request)
```json
{
  "error": "在庫が不足しています"
}
```

#### エラー時 (404 Not Found)
```json
{
  "error": "商品が見つかりません"
}
```

---

## 3. カート数量変更 API

### エンドポイント
```
PUT /api/cart/:cartItemKey
```

### 説明
カート内の商品数量を変更します。

### パスパラメータ
- `cartItemKey`: カートアイテムの一意キー（`{productId}::{productName}`形式）

### リクエストヘッダー
```
Authorization: Bearer {token}
Cookie: session_id={session_id}
Content-Type: application/json
```

### リクエストボディ
```json
{
  "quantity": 3
}
```

### バリデーション
- `quantity`: 必須、整数、1〜min(在庫数, 99)の範囲

### レスポンス
#### 成功時 (200 OK)
```json
{
  "message": "数量を更新しました",
  "cartItem": {
    "productId": "1",
    "quantity": 3,
    "product": { /* 商品情報 */ }
  }
}
```

#### エラー時 (400 Bad Request)
```json
{
  "error": "在庫が不足しています"
}
```

#### エラー時 (404 Not Found)
```json
{
  "error": "カートアイテムが見つかりません"
}
```

---

## 4. カート削除 API

### エンドポイント
```
DELETE /api/cart/:cartItemKey
```

### 説明
カートから商品を削除します。

### パスパラメータ
- `cartItemKey`: カートアイテムの一意キー（`{productId}::{productName}`形式）

### リクエストヘッダー
```
Authorization: Bearer {token}
Cookie: session_id={session_id}
```

### レスポンス
#### 成功時 (200 OK)
```json
{
  "message": "カートから削除しました"
}
```

#### エラー時 (404 Not Found)
```json
{
  "error": "カートアイテムが見つかりません"
}
```

---

## 5. カートクリア API

### エンドポイント
```
DELETE /api/cart
```

### 説明
カート内のすべての商品を削除します。

### リクエストヘッダー
```
Authorization: Bearer {token}
Cookie: session_id={session_id}
```

### レスポンス
#### 成功時 (200 OK)
```json
{
  "message": "カートをクリアしました"
}
```

---

## データモデル

### CartItem
```typescript
interface CartItem {
  productId: string;        // 商品ID
  quantity: number;         // 数量
  product: Product;         // 商品情報（stockQuantityを含む）
}
```

### Cart
```typescript
interface Cart {
  items: CartItem[];        // カートアイテム一覧
  totalAmount: number;      // 小計
  bankTransferDiscount: number; // 銀行振込割引額（3.6%）
  finalAmount: number;      // 合計（割引後）
}
```

---

## ビジネスロジック

### 1. バリエーション対応
- カートアイテムは「商品ID + 商品名」の組み合わせで一意に識別
- 同じ商品でも異なるバリエーションは別々のカートアイテムとして扱う
- 例: 「ブレーキパッド - スタンダード/フロント」と「ブレーキパッド - ハイグリップ/フロント」は別アイテム

### 2. 在庫チェック
- カート追加時: `quantity <= product.stockQuantity` をチェック
- 数量変更時: `newQuantity <= product.stockQuantity` をチェック
- 在庫不足の場合はエラーを返す

### 3. 銀行振込割引
- 割引率: 3.6%（デフォルト、管理画面で変更可能）
- 計算式: `Math.floor(totalAmount * 0.036)`
- 小数点以下は切り捨て

### 4. カートの永続化
- フロントエンド: Zustand + localStorage（ゲストユーザー対応）
- バックエンド: PostgreSQL（ログインユーザーのみ）
- ログイン時: localStorageのカートをDBにマージ

---

## エラーハンドリング

| HTTPステータス | エラーメッセージ | 発生条件 |
|---------------|----------------|---------|
| 400 Bad Request | "在庫が不足しています" | quantity > stockQuantity |
| 400 Bad Request | "数量は1〜99の範囲で指定してください" | quantity < 1 または quantity > 99 |
| 401 Unauthorized | "認証が必要です" | セッションが無効または期限切れ |
| 404 Not Found | "商品が見つかりません" | 指定されたproductIdが存在しない |
| 404 Not Found | "カートアイテムが見つかりません" | 指定されたcartItemKeyが存在しない |
| 500 Internal Server Error | "サーバーエラーが発生しました" | DBエラー等 |

---

## フロントエンド実装状況

### 実装済み
- ✅ Zustandでのカート状態管理（useCartStore）
- ✅ localStorageへの永続化
- ✅ カートアイテムの追加・削除・数量変更
- ✅ バリエーション対応（商品ID + 商品名で識別）
- ✅ 在庫数チェック（商品詳細ページ・カートページ）
- ✅ 銀行振込割引の計算・表示
- ✅ カート→商品詳細への遷移
- ✅ 空カート時の表示

### 未実装（バックエンド連携時に実装）
- ❌ API呼び出し（現在はモック）
- ❌ ログイン時のカートマージ
- ❌ リアルタイム在庫同期
- ❌ エラーハンドリング（トースト通知）

---

## テストケース

### 1. カート追加
- [ ] 商品詳細ページから商品を追加できる
- [ ] バリエーション選択後に追加できる
- [ ] 同じバリエーションを再度追加すると数量が増える
- [ ] 異なるバリエーションは別アイテムとして追加される
- [ ] 在庫数を超えて追加できない

### 2. 数量変更
- [ ] 商品詳細ページで数量を変更できる（1〜在庫数または99）
- [ ] カートページで数量を変更できる（1〜在庫数）
- [ ] 在庫数を超えて増やそうとするとアラートが表示される
- [ ] 1未満に減らせない

### 3. カート削除
- [ ] カートページから商品を削除できる
- [ ] 削除時に確認ダイアログが表示される
- [ ] 削除後、カートが空の場合は空カート表示になる

### 4. カート表示
- [ ] カートアイテムが正しく表示される（商品名、価格、数量、小計）
- [ ] 小計、割引額、合計が正しく計算される
- [ ] 銀行振込割引（3.6%）が表示される
- [ ] カートアイテムをクリックすると商品詳細ページに遷移する

### 5. 在庫チェック
- [ ] 商品詳細ページで在庫数が表示される
- [ ] 在庫切れの商品はカートに追加できない
- [ ] カートページで在庫数を超えて数量を増やせない

---

## 備考

### バリエーション対応について
- カートアイテムキー: `{productId}::{productName}`
- 例: `1::86用 高性能ブレーキパッド - スタンダード（フロント）`
- このキーでカートアイテムを一意に識別

### 在庫管理について
- フロントエンド: `product.stockQuantity` で在庫数を保持
- バックエンド: イミュータブルデータモデル（在庫ログ）で在庫を管理
- 注文確定時にトランザクションで在庫チェック + 在庫減算

### 今後の拡張
- クーポン機能
- ポイント利用
- 複数配送先対応
- ギフト包装オプション

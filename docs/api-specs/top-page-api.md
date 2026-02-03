# トップページAPI仕様書

## 概要

トップページに必要な全てのデータを一度に取得するAPIです。
ヒーロースライド、メガカテゴリー、ピックアップ商品、新着商品、人気商品、ニュースなどを並列で取得し、パフォーマンスを最適化しています。

---

## エンドポイント一覧

### 1. トップページデータ取得

トップページに表示する全てのコンテンツを取得します。

**エンドポイント**: `GET /api/top-page`

**認証**: 不要（ゲスト可）

**リクエスト**:

なし

**レスポンス** (200 OK):

```json
{
  "success": true,
  "data": {
    "heroSlides": [
      {
        "id": "cml2b8qfa0000vp77ed75pm71",
        "imageUrl": "https://example.com/hero1.jpg",
        "title": "新春セール開催中",
        "description": "全商品10%OFF！期間限定のお得なキャンペーン",
        "linkUrl": "/products",
        "order": 1,
        "isActive": true,
        "createdAt": "2026-01-31T12:50:54.791Z",
        "updatedAt": "2026-01-31T12:50:54.791Z"
      }
    ],
    "megaCategories": [
      {
        "id": "cml2b8qfa0002vp77f1d9x3kl",
        "categoryType": "cars",
        "name": "車パーツ",
        "description": "豊富な車種対応のパーツを取り揃えています",
        "backgroundImageUrl": "https://example.com/cars-bg.jpg",
        "linkUrl": "/cars",
        "order": 1,
        "isActive": true,
        "createdAt": "2026-01-31T12:50:54.791Z",
        "updatedAt": "2026-01-31T12:50:54.791Z"
      }
    ],
    "pickupProducts": [
      {
        "id": "cml2b8qfa0003vp77g2e8y4lm",
        "productId": "prod123",
        "order": 1,
        "isActive": true,
        "createdAt": "2026-01-31T12:50:54.791Z",
        "updatedAt": "2026-01-31T12:50:54.791Z",
        "product": {
          "id": "prod123",
          "name": "スポーツマフラー",
          "slug": "sports-muffler",
          "description": "高性能スポーツマフラー",
          "price": 45000,
          "categoryId": "cat123",
          "isActive": true,
          "productType": "physical",
          "createdAt": "2026-01-30T12:00:00.000Z",
          "updatedAt": "2026-01-30T12:00:00.000Z",
          "category": {
            "id": "cat123",
            "name": "マフラー・排気系",
            "slug": "muffler",
            "description": "マフラーと排気系パーツ",
            "parentId": null,
            "createdAt": "2026-01-15T12:00:00.000Z",
            "updatedAt": "2026-01-15T12:00:00.000Z"
          }
        }
      }
    ],
    "newProducts": [
      {
        "id": "prod123",
        "name": "スポーツマフラー",
        "slug": "sports-muffler",
        "description": "高性能スポーツマフラー",
        "price": 45000,
        "categoryId": "cat123",
        "isActive": true,
        "productType": "physical",
        "createdAt": "2026-01-30T12:00:00.000Z",
        "updatedAt": "2026-01-30T12:00:00.000Z",
        "category": {
          "id": "cat123",
          "name": "マフラー・排気系",
          "slug": "muffler",
          "description": "マフラーと排気系パーツ",
          "parentId": null,
          "createdAt": "2026-01-15T12:00:00.000Z",
          "updatedAt": "2026-01-15T12:00:00.000Z"
        }
      }
    ],
    "saleProducts": [],
    "popularProducts": [
      {
        "id": "prod456",
        "name": "LEDヘッドライト",
        "slug": "led-headlight",
        "description": "高輝度LEDヘッドライト",
        "price": 28000,
        "categoryId": "cat456",
        "isActive": true,
        "productType": "physical",
        "createdAt": "2026-01-28T12:00:00.000Z",
        "updatedAt": "2026-01-28T12:00:00.000Z",
        "category": {
          "id": "cat456",
          "name": "ライト・ランプ",
          "slug": "lights",
          "description": "ヘッドライトやテールランプ",
          "parentId": null,
          "createdAt": "2026-01-15T12:00:00.000Z",
          "updatedAt": "2026-01-15T12:00:00.000Z"
        }
      }
    ],
    "news": [
      {
        "id": "news123",
        "title": "サイトリニューアルのお知らせ",
        "content": "当サイトをリニューアルいたしました。",
        "publishedAt": "2026-01-30T12:00:00.000Z",
        "isPublished": true,
        "createdAt": "2026-01-30T12:00:00.000Z",
        "updatedAt": "2026-01-30T12:00:00.000Z"
      }
    ]
  }
}
```

**フィールド説明**:

| フィールド | 型 | 説明 |
|----------|---|------|
| `heroSlides` | `HeroSlide[]` | ヒーロースライド一覧（order順、アクティブのみ） |
| `megaCategories` | `MegaCategory[]` | メガカテゴリー一覧（order順、アクティブのみ） |
| `pickupProducts` | `PickupProduct[]` | ピックアップ商品一覧（order順、アクティブのみ、商品情報含む） |
| `newProducts` | `Product[]` | 新着商品一覧（createdAt降順、最大6件） |
| `saleProducts` | `Product[]` | セール商品一覧（現時点では常に空配列） |
| `popularProducts` | `Product[]` | 人気商品一覧（注文数降順、最大6件） |
| `news` | `NewsItem[]` | ニュース一覧（publishedAt降順、公開済みのみ、最大5件） |

**エラーレスポンス** (500 Internal Server Error):

```json
{
  "success": false,
  "message": "サーバーエラーが発生しました"
}
```

---

## データ型定義

### HeroSlide

```typescript
interface HeroSlide {
  id: string;
  imageUrl: string;          // ヒーロー画像URL
  title?: string;            // タイトル（オプション）
  description?: string;      // 説明文（オプション）
  linkUrl?: string;          // クリック時のリンク先（オプション）
  order: number;             // 表示順序
  isActive: boolean;         // 表示/非表示
  createdAt: Date;
  updatedAt: Date;
}
```

### MegaCategory

```typescript
interface MegaCategory {
  id: string;
  categoryType: 'cars' | 'events' | 'digital';  // カテゴリータイプ
  name: string;                                  // カテゴリー名
  description?: string;                          // 説明文（オプション）
  backgroundImageUrl: string;                    // 背景画像URL
  linkUrl: string;                               // クリック時のリンク先
  order: number;                                 // 表示順序
  isActive: boolean;                             // 表示/非表示
  createdAt: Date;
  updatedAt: Date;
}
```

### PickupProduct

```typescript
interface PickupProduct {
  id: string;
  productId: string;
  order: number;             // 表示順序
  isActive: boolean;         // 表示/非表示
  createdAt: Date;
  updatedAt: Date;
  product: Product;          // 商品情報（カテゴリー含む）
}
```

### Product

```typescript
interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;             // 円単位
  categoryId: string;
  isActive: boolean;
  productType: 'physical' | 'digital' | 'event' | 'external';
  createdAt: Date;
  updatedAt: Date;
  category: Category;
}
```

### NewsItem

```typescript
interface NewsItem {
  id: string;
  title: string;
  content?: string;
  publishedAt: Date;         // 公開日時
  isPublished: boolean;      // 公開/非公開
  createdAt: Date;
  updatedAt: Date;
}
```

---

## パフォーマンス最適化

このAPIは以下の最適化を実施しています：

1. **並列データ取得**: `Promise.all`を使用して、全てのデータを並列で取得
2. **必要最小限のデータ**: フロントエンドで表示に必要なデータのみを取得
3. **インデックス活用**: `order`、`isActive`、`createdAt`、`publishedAt`にインデックスを設定
4. **キャッシング推奨**: フロントエンド側でReact Queryなどを使用して5分程度キャッシュすることを推奨

---

## 使用例

### JavaScript (Fetch API)

```javascript
const response = await fetch('http://localhost:8432/api/top-page');
const data = await response.json();

if (data.success) {
  console.log('ヒーロースライド:', data.data.heroSlides);
  console.log('メガカテゴリー:', data.data.megaCategories);
  console.log('ピックアップ商品:', data.data.pickupProducts);
  console.log('新着商品:', data.data.newProducts);
  console.log('人気商品:', data.data.popularProducts);
  console.log('ニュース:', data.data.news);
}
```

### React Query

```typescript
import { useQuery } from '@tanstack/react-query';

function TopPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['top-page'],
    queryFn: async () => {
      const res = await fetch('http://localhost:8432/api/top-page');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
  });

  if (isLoading) return <div>読み込み中...</div>;

  return (
    <div>
      <HeroSlider slides={data.data.heroSlides} />
      <MegaCategories categories={data.data.megaCategories} />
      <PickupProducts products={data.data.pickupProducts} />
      <NewProducts products={data.data.newProducts} />
      <PopularProducts products={data.data.popularProducts} />
      <News items={data.data.news} />
    </div>
  );
}
```

---

## テスト

統合テストが用意されています：

```bash
npx ts-node tests/integration/top-page.test.ts
```

テストは以下の項目を検証します：

- トップページデータの取得
- ヒーロースライドの構造とソート順
- メガカテゴリーの構造とcategoryType検証
- ピックアップ商品の構造と商品情報の取得
- 新着商品のソート順と最大件数
- ニュースのソート順、公開状態、最大件数

---

## 注意事項

1. **セール商品**: 現時点では`saleProducts`は常に空配列です。将来的に`Product`モデルに`salePrice`フィールドを追加する予定です。

2. **人気商品の算出**: 注文数（`OrderItem.quantity`の合計）で算出しています。注文が少ない場合、新着商品と同じ商品が表示される可能性があります。

3. **キャッシング**: このAPIはデータ量が多いため、フロントエンド側で適切にキャッシュすることを強く推奨します。

4. **画像URL**: テストデータでは`placehold.co`を使用していますが、本番環境ではCloudflare R2にアップロードした画像URLを使用してください。

---

## 更新履歴

| 日付 | バージョン | 変更内容 |
|------|----------|---------|
| 2026-01-31 | 1.0.0 | 初版作成 |

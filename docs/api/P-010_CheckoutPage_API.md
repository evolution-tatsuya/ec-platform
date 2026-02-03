# P-010: 購入手続きページ API仕様書

## 概要
購入手続き（チェックアウト）ページで使用するAPIエンドポイントの仕様書です。

## エンドポイント一覧

### 1. 注文作成API

#### **POST /api/orders**

カート内商品を基に注文を作成します。

**リクエストヘッダー**
```
Content-Type: application/json
Authorization: Bearer {token} (会員ログイン必須)
```

**リクエストボディ**
```typescript
{
  // 配送先情報
  shippingAddress: string;        // 住所（必須）例: "東京都渋谷区神宮前1-2-3"
  shippingPostalCode: string;     // 郵便番号（必須）例: "150-0001"
  shippingPhone: string;          // 電話番号（必須）例: "090-1234-5678"
  recipientName: string;          // 受取人名（必須）例: "山田 太郎"
  building?: string;              // 建物名・部屋番号（任意）例: "サンプルマンション101"
  isDefaultAddress: boolean;      // デフォルト住所として保存するか（必須）例: true

  // 配送オプション
  shippingOptions: {
    weekendDelivery: boolean;     // 土日配送希望（必須）例: false
    preferredDate?: string;       // 配達希望日（任意）例: "2025-12-25"
    preferredTimeSlot?: string;   // 配達希望時間帯（任意）例: "14:00-16:00"
  };

  // 決済情報
  paymentMethod: 'BANK_TRANSFER' | 'PAYPAY' | 'CREDIT_CARD'; // 決済方法（必須）

  // その他
  notes?: string;                 // 備考（任意、500文字以内）例: "不在時は宅配ボックスへ"
}
```

**レスポンス（成功: 201 Created）**
```typescript
{
  success: true;
  data: {
    order: {
      id: string;                 // 注文ID 例: "ord_abc123"
      orderNumber: string;        // 注文番号 例: "ORD-20251223-0001"
      userId: string;             // ユーザーID
      totalAmount: number;        // 合計金額（割引後）例: 24120
      status: 'PENDING_PAYMENT';  // 注文ステータス
      paymentMethod: string;      // 決済方法
      paymentStatus: 'PENDING';   // 決済ステータス

      // 配送先情報
      shippingAddress: string;
      shippingPostalCode: string;
      shippingPhone: string;
      recipientName: string;
      building?: string;
      isDefaultAddress: boolean;

      // 配送オプション
      shippingOptions: {
        weekendDelivery: boolean;
        preferredDate?: string;
        preferredTimeSlot?: string;
      };

      notes?: string;
      createdAt: string;          // ISO 8601形式 例: "2025-12-23T10:30:00Z"
      updatedAt: string;

      // 注文商品
      items: [
        {
          id: string;             // 注文商品ID
          orderId: string;
          productId: string;
          quantity: number;
          price: number;          // 購入時の単価
          product: {
            id: string;
            name: string;
            images: string[];
            productType: string;
          };
        }
      ];
    };

    // 決済URL（PAYPAY/CREDIT_CARDの場合のみ）
    paymentUrl?: string;          // 例: "https://checkout.stripe.com/..."

    // 銀行振込情報（BANK_TRANSFERの場合のみ）
    bankTransferInfo?: {
      bankName: string;           // 銀行名 例: "三菱UFJ銀行"
      branchName: string;         // 支店名 例: "渋谷支店"
      accountType: string;        // 口座種別 例: "普通"
      accountNumber: string;      // 口座番号 例: "1234567"
      accountHolder: string;      // 口座名義 例: "カ)サンプル"
      transferAmount: number;     // 振込金額 例: 24120
      transferDeadline: string;   // 振込期限 例: "2025-12-30T23:59:59Z"
    };
  };
  message: string;                // 例: "注文を作成しました"
}
```

**レスポンス（エラー: 400 Bad Request）**
```typescript
{
  success: false;
  error: {
    code: 'VALIDATION_ERROR' | 'INSUFFICIENT_STOCK' | 'CART_EMPTY';
    message: string;
    details?: {
      field: string;              // エラーが発生したフィールド名
      message: string;            // 詳細メッセージ
    }[];
  };
}
```

**エラーケース**
- `VALIDATION_ERROR`: 必須項目未入力、形式エラー
- `INSUFFICIENT_STOCK`: 在庫不足（カート内商品の在庫が変動した場合）
- `CART_EMPTY`: カートが空
- `UNAUTHORIZED`: 未ログイン
- `INTERNAL_SERVER_ERROR`: サーバーエラー

**処理フロー**
1. ユーザー認証確認
2. カート内商品取得
3. 在庫チェック（トランザクション開始）
4. 在庫減算（InventoryLogにマイナス記録）
5. 注文作成（Order + OrderItem）
6. デフォルト住所として保存する場合、Userテーブル更新
7. カートクリア
8. 決済方法に応じた処理:
   - `BANK_TRANSFER`: 銀行振込情報生成、メール送信
   - `PAYPAY`: PayPay決済URL生成
   - `CREDIT_CARD`: Stripe Checkout Session作成
9. トランザクションコミット
10. レスポンス返却

**使用例**
```typescript
// フロントエンド（CheckoutPage.tsx）
const handleSubmit = async () => {
  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        shippingAddress: address,
        shippingPostalCode: postalCode,
        shippingPhone: phone,
        recipientName: name,
        building: building || undefined,
        isDefaultAddress: useDefaultAddress,
        shippingOptions: {
          weekendDelivery,
          preferredDate: deliveryDate || undefined,
          preferredTimeSlot: deliveryTime || undefined,
        },
        paymentMethod,
        notes: notes || undefined,
      }),
    });

    const result = await response.json();

    if (result.success) {
      if (result.data.paymentUrl) {
        // 決済画面へリダイレクト
        window.location.href = result.data.paymentUrl;
      } else {
        // 注文完了ページへ遷移
        navigate(`/orders/${result.data.order.orderNumber}`);
      }
    } else {
      alert(result.error.message);
    }
  } catch (error) {
    console.error('注文作成エラー:', error);
    alert('注文作成に失敗しました');
  }
};
```

---

### 2. デフォルト住所取得API

#### **GET /api/users/default-address**

ログイン中ユーザーのデフォルト住所情報を取得します。

**リクエストヘッダー**
```
Authorization: Bearer {token}
```

**レスポンス（成功: 200 OK）**
```typescript
{
  success: true;
  data: {
    defaultAddress?: string;      // デフォルト住所 例: "東京都渋谷区神宮前1-2-3"
    defaultPostalCode?: string;   // デフォルト郵便番号 例: "150-0001"
    defaultPhone?: string;        // デフォルト電話番号 例: "090-1234-5678"
    name: string;                 // ユーザー名 例: "山田 太郎"
  };
}
```

**レスポンス（エラー: 401 Unauthorized）**
```typescript
{
  success: false;
  error: {
    code: 'UNAUTHORIZED';
    message: string;
  };
}
```

**使用例**
```typescript
// チェックアウトページ初期表示時にデフォルト住所を取得
useEffect(() => {
  const fetchDefaultAddress = async () => {
    const response = await fetch('/api/users/default-address', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const result = await response.json();

    if (result.success && result.data.defaultAddress) {
      setAddress(result.data.defaultAddress);
      setPostalCode(result.data.defaultPostalCode || '');
      setPhone(result.data.defaultPhone || '');
      setName(result.data.name);
    }
  };

  fetchDefaultAddress();
}, []);
```

---

### 3. 配送日選択肢取得API

#### **GET /api/shipping/available-dates**

配達可能な日付リストを取得します。

**クエリパラメータ**
```
productIds: string[]  // カート内の商品IDリスト（カンマ区切り）
```

**レスポンス（成功: 200 OK）**
```typescript
{
  success: true;
  data: {
    availableDates: string[];     // 配達可能日リスト（ISO 8601形式）
                                  // 例: ["2025-12-25", "2025-12-26", "2025-12-27"]
    minPreparationDays: number;   // 最小準備日数 例: 3
    allowWeekendDelivery: boolean; // 土日配送可能か 例: true
  };
}
```

**処理ロジック**
1. カート内全商品の `shippingSettings.preparationDays` の最大値を取得
2. 今日 + preparationDays 日後から30日分の日付を生成
3. `allowWeekendDelivery: false` の商品がある場合、土日を除外
4. 返却

**使用例**
```typescript
useEffect(() => {
  const fetchAvailableDates = async () => {
    const productIds = items.map(item => item.productId).join(',');
    const response = await fetch(`/api/shipping/available-dates?productIds=${productIds}`);
    const result = await response.json();

    if (result.success) {
      setAvailableDates(result.data.availableDates);
    }
  };

  fetchAvailableDates();
}, [items]);
```

---

### 4. 配送時間帯取得API

#### **GET /api/shipping/time-slots**

配達時間帯の選択肢を取得します。

**レスポンス（成功: 200 OK）**
```typescript
{
  success: true;
  data: {
    timeSlots: [
      { value: '08:00-12:00', label: '午前中 (8:00-12:00)' },
      { value: '12:00-14:00', label: '12:00-14:00' },
      { value: '14:00-16:00', label: '14:00-16:00' },
      { value: '16:00-18:00', label: '16:00-18:00' },
      { value: '18:00-20:00', label: '18:00-20:00' },
      { value: '19:00-21:00', label: '19:00-21:00' }
    ];
  };
}
```

**使用例**
```typescript
const [timeSlots, setTimeSlots] = useState([]);

useEffect(() => {
  const fetchTimeSlots = async () => {
    const response = await fetch('/api/shipping/time-slots');
    const result = await response.json();

    if (result.success) {
      setTimeSlots(result.data.timeSlots);
    }
  };

  fetchTimeSlots();
}, []);
```

---

### 5. 割引率設定取得API

#### **GET /api/settings/discount-rates**

決済方法ごとの割引率を取得します（管理画面で設定可能）。

**レスポンス（成功: 200 OK）**
```typescript
{
  success: true;
  data: {
    bankTransferDiscount: number;  // 銀行振込割引率 例: 0.036 (3.6%)
    paypayDiscount: number;        // PayPay割引率 例: 0 (0%)
    creditCardDiscount: number;    // クレカ割引率 例: 0 (0%)
  };
}
```

**使用例**
```typescript
// CheckoutPage.tsx で動的に割引率を取得
const [discountRates, setDiscountRates] = useState({
  BANK_TRANSFER: 0.036,
  PAYPAY: 0,
  CREDIT_CARD: 0,
});

useEffect(() => {
  const fetchDiscountRates = async () => {
    const response = await fetch('/api/settings/discount-rates');
    const result = await response.json();

    if (result.success) {
      setDiscountRates({
        BANK_TRANSFER: result.data.bankTransferDiscount,
        PAYPAY: result.data.paypayDiscount,
        CREDIT_CARD: result.data.creditCardDiscount,
      });
    }
  };

  fetchDiscountRates();
}, []);

// 注文サマリーで使用
const discount = Math.floor(subtotal * discountRates[paymentMethod]);
```

---

### 6. 決済プロバイダー設定取得API

#### **GET /api/settings/payment-providers**

決済プロバイダーの設定を取得します（管理画面で設定可能）。

**レスポンス（成功: 200 OK）**
```typescript
{
  success: true;
  data: {
    creditCardProvider: 'STRIPE' | 'SUBSCPAY' | 'ROBOT_PAYMENT'; // 使用中のプロバイダー
    paypayEnabled: boolean;       // PayPay有効/無効
    bankTransferEnabled: boolean; // 銀行振込有効/無効
    creditCardEnabled: boolean;   // クレカ有効/無効
  };
}
```

**使用例**
```typescript
// CheckoutPage.tsx で有効な決済方法のみ表示
const [enabledPaymentMethods, setEnabledPaymentMethods] = useState({
  BANK_TRANSFER: true,
  PAYPAY: true,
  CREDIT_CARD: true,
});

useEffect(() => {
  const fetchPaymentProviders = async () => {
    const response = await fetch('/api/settings/payment-providers');
    const result = await response.json();

    if (result.success) {
      setEnabledPaymentMethods({
        BANK_TRANSFER: result.data.bankTransferEnabled,
        PAYPAY: result.data.paypayEnabled,
        CREDIT_CARD: result.data.creditCardEnabled,
      });
    }
  };

  fetchPaymentProviders();
}, []);

// UIで無効な決済方法を非表示
{Object.entries(PAYMENT_INFO)
  .filter(([method]) => enabledPaymentMethods[method])
  .map(([method, info]) => (
    // Radio button rendering
  ))}
```

---

## データベーストランザクション

### 注文作成処理のトランザクション

```typescript
// backend/src/routes/order-routes.ts
app.post('/api/orders', async (req, res) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. カート取得
      const cartItems = await getCartItems(userId);

      if (cartItems.length === 0) {
        throw new Error('CART_EMPTY');
      }

      // 2. 在庫チェック
      for (const item of cartItems) {
        const stockSum = await tx.inventoryLog.aggregate({
          where: { productId: item.productId },
          _sum: { quantity: true },
        });

        const currentStock = stockSum._sum.quantity || 0;

        if (currentStock < item.quantity) {
          throw new Error(`INSUFFICIENT_STOCK: ${item.product.name}`);
        }
      }

      // 3. 在庫減算
      for (const item of cartItems) {
        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            quantity: -item.quantity,
            type: 'sale',
            reason: `注文: ${orderNumber}`,
          },
        });
      }

      // 4. 注文作成
      const order = await tx.order.create({
        data: {
          userId,
          orderNumber,
          totalAmount,
          status: 'PENDING_PAYMENT',
          paymentMethod: req.body.paymentMethod,
          paymentStatus: 'PENDING',
          shippingAddress: req.body.shippingAddress,
          shippingPostalCode: req.body.shippingPostalCode,
          shippingPhone: req.body.shippingPhone,
          shippingOptions: req.body.shippingOptions,
          notes: req.body.notes,
          isDefaultAddress: req.body.isDefaultAddress,
          items: {
            create: cartItems.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.product.price,
            })),
          },
        },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      // 5. デフォルト住所更新
      if (req.body.isDefaultAddress) {
        await tx.user.update({
          where: { id: userId },
          data: {
            defaultAddress: req.body.shippingAddress,
            defaultPostalCode: req.body.shippingPostalCode,
            defaultPhone: req.body.shippingPhone,
          },
        });
      }

      // 6. カートクリア
      await clearCart(userId);

      return order;
    });

    // 7. 決済処理（トランザクション外）
    let paymentUrl;
    let bankTransferInfo;

    if (req.body.paymentMethod === 'CREDIT_CARD') {
      paymentUrl = await createStripeCheckoutSession(result);
    } else if (req.body.paymentMethod === 'PAYPAY') {
      paymentUrl = await createPayPayPayment(result);
    } else if (req.body.paymentMethod === 'BANK_TRANSFER') {
      bankTransferInfo = generateBankTransferInfo(result);
      await sendBankTransferEmail(result, bankTransferInfo);
    }

    res.status(201).json({
      success: true,
      data: {
        order: result,
        paymentUrl,
        bankTransferInfo,
      },
      message: '注文を作成しました',
    });
  } catch (error) {
    console.error('注文作成エラー:', error);
    res.status(400).json({
      success: false,
      error: {
        code: error.message.startsWith('INSUFFICIENT_STOCK')
          ? 'INSUFFICIENT_STOCK'
          : error.message === 'CART_EMPTY'
          ? 'CART_EMPTY'
          : 'INTERNAL_SERVER_ERROR',
        message: error.message,
      },
    });
  }
});
```

---

## セキュリティ

### 認証・認可
- **必須認証**: 全エンドポイントで会員ログイン必須
- **トークン検証**: JWT Bearer Token検証
- **セッション管理**: express-session使用

### バリデーション
- **必須項目チェック**: 住所、郵便番号、電話番号、決済方法
- **形式チェック**:
  - 郵便番号: `/^\d{3}-\d{4}$/`
  - 電話番号: `/^0\d{1,4}-\d{1,4}-\d{4}$/`
  - 備考: 500文字以内
- **在庫チェック**: トランザクション内で最新在庫を確認

### エラーハンドリング
- **在庫不足**: 商品名を含むエラーメッセージ
- **トランザクション失敗**: 自動ロールバック
- **決済エラー**: 注文はロールバック、再試行促す

---

## 管理画面との連携

### A-007: システム設定ページで設定可能な項目

1. **割引率設定**
   - 銀行振込割引率（デフォルト: 3.6%）
   - PayPay割引率（デフォルト: 0%）
   - クレカ割引率（デフォルト: 0%）

2. **決済プロバイダー設定**
   - クレカ: Stripe / SubscPay / RobotPayment 切替
   - 各決済方法の有効/無効切替

3. **配送設定**
   - 配送方法の案内文カスタマイズ
   - 配送時間帯の選択肢カスタマイズ

4. **銀行振込設定**
   - 振込先銀行情報
   - 振込期限（デフォルト: 注文日から7日間）

---

## テストケース

### 正常系
1. ✅ 銀行振込で注文作成 → 注文完了、振込情報メール送信
2. ✅ PayPayで注文作成 → PayPay決済URLへリダイレクト
3. ✅ クレカで注文作成 → Stripe決済URLへリダイレクト
4. ✅ デフォルト住所として保存 → Userテーブル更新
5. ✅ 配達希望日・時間帯指定 → shippingOptionsに保存
6. ✅ 備考入力 → notesに保存

### 異常系
1. ❌ 未ログイン → 401 Unauthorized
2. ❌ カートが空 → 400 CART_EMPTY
3. ❌ 在庫不足 → 400 INSUFFICIENT_STOCK
4. ❌ 必須項目未入力 → 400 VALIDATION_ERROR
5. ❌ 不正な郵便番号 → 400 VALIDATION_ERROR
6. ❌ 不正な電話番号 → 400 VALIDATION_ERROR
7. ❌ 備考501文字以上 → 400 VALIDATION_ERROR

---

## パフォーマンス最適化

### データベース
- **インデックス**:
  - `Order.orderNumber` (UNIQUE)
  - `Order.userId` + `createdAt` (複合)
  - `InventoryLog.productId` + `createdAt` (複合)

### トランザクション
- **分離レベル**: READ COMMITTED
- **ロック**: 在庫チェック時に楽観的ロック使用
- **タイムアウト**: 30秒

### API応答時間目標
- デフォルト住所取得: < 100ms
- 配送日取得: < 200ms
- 注文作成: < 2秒（決済URL生成含む）

---

## 今後の拡張予定

### Phase 2で実装予定
1. **ポイント・クーポン機能**
   - 注文作成時にポイント使用・クーポン適用
2. **ギフト配送機能**
   - 送り主情報と別の配送先指定
3. **定期購入機能**
   - Stripe Subscriptionとの連携
4. **領収書発行機能**
   - PDF自動生成（pdfme使用）

---

**作成日**: 2025-12-23
**最終更新**: 2025-12-23
**関連ドキュメント**:
- [P-009: カートページAPI仕様書](./P-009_CartPage_API.md)
- [P-007: 商品詳細ページAPI仕様書](./P-007_ProductDetailPage_API.md)
- [CLAUDE.md](../../CLAUDE.md)

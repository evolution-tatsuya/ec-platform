# P-011: マイページ API仕様書

## 概要
マイページで使用するAPIエンドポイントの仕様書です。購入履歴、デジタルチケット、アカウント設定の管理機能を提供します。

## エンドポイント一覧

### 1. 購入履歴取得API

#### **GET /api/orders**

ログイン中ユーザーの購入履歴を取得します。

**リクエストヘッダー**
```
Authorization: Bearer {token} (会員ログイン必須)
```

**クエリパラメータ**
```
page?: number         // ページ番号（デフォルト: 1）
limit?: number        // 1ページあたりの件数（デフォルト: 10、最大: 50）
status?: string       // ステータスフィルター（PENDING_PAYMENT, PREPARING, SHIPPED, DELIVERED, CANCELLED）
```

**レスポンス（成功: 200 OK）**
```typescript
{
  success: true;
  data: {
    orders: [
      {
        id: string;                   // 注文ID 例: "ord_abc123"
        orderNumber: string;          // 注文番号 例: "ORD-20251220-0001"
        userId: string;               // ユーザーID
        totalAmount: number;          // 合計金額 例: 19000
        status: OrderStatus;          // 注文ステータス
        paymentMethod: PaymentMethod; // 決済方法
        paymentStatus: PaymentStatus; // 決済ステータス
        createdAt: string;            // 注文日時（ISO 8601形式）
        updatedAt: string;

        // 注文商品
        items: [
          {
            id: string;               // 注文商品ID
            orderId: string;
            productId: string;
            quantity: number;         // 数量
            price: number;            // 購入時の単価
            product: {
              id: string;
              name: string;           // 商品名
              images: string[];       // 画像URL配列
              productType: ProductType;
            };
          }
        ];

        // 配送情報
        shippingAddress?: string;
        shippingPostalCode?: string;
        shippingPhone?: string;

        // 発送履歴（最新1件のみ）
        shipmentHistory?: {
          id: string;
          status: OrderStatus;
          trackingNumber?: string;  // 追跡番号
          carrier?: string;         // 配送業者
          createdAt: string;
        };
      }
    ];

    // ページネーション情報
    pagination: {
      currentPage: number;          // 現在のページ 例: 1
      totalPages: number;           // 総ページ数 例: 5
      totalOrders: number;          // 総注文数 例: 42
      hasMore: boolean;             // 次のページがあるか 例: true
    };
  };
  message: string;                  // 例: "購入履歴を取得しました"
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
// MyPage.tsx
const fetchOrders = async (page: number = 1) => {
  const response = await fetch(`/api/orders?page=${page}&limit=10`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const result = await response.json();

  if (result.success) {
    setOrders(result.data.orders);
    setPagination(result.data.pagination);
  }
};
```

---

### 2. 注文詳細取得API

#### **GET /api/orders/:orderNumber**

特定の注文の詳細情報を取得します。

**リクエストヘッダー**
```
Authorization: Bearer {token}
```

**パスパラメータ**
```
orderNumber: string  // 注文番号 例: "ORD-20251220-0001"
```

**レスポンス（成功: 200 OK）**
```typescript
{
  success: true;
  data: {
    order: {
      id: string;
      orderNumber: string;
      userId: string;
      totalAmount: number;
      status: OrderStatus;
      paymentMethod: PaymentMethod;
      paymentStatus: PaymentStatus;
      shippingAddress?: string;
      shippingPostalCode?: string;
      shippingPhone?: string;
      shippingOptions?: ShippingOptions;
      notes?: string;
      isDefaultAddress: boolean;
      createdAt: string;
      updatedAt: string;

      // 注文商品（全て）
      items: OrderItem[];

      // 発送履歴（全て）
      shipmentHistory: ShipmentHistory[];

      // デジタルチケット（イベント商品の場合）
      digitalTickets?: DigitalTicket[];

      // デジタルダウンロード（デジタル商品の場合）
      digitalDownloads?: DigitalDownload[];
    };
  };
  message: string;
}
```

**使用例**
```typescript
const handleViewDetails = async (orderNumber: string) => {
  const response = await fetch(`/api/orders/${orderNumber}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const result = await response.json();

  if (result.success) {
    // 詳細モーダル表示
    setSelectedOrder(result.data.order);
    setShowDetailsModal(true);
  }
};
```

---

### 3. 再注文API

#### **POST /api/orders/:orderId/reorder**

過去の注文と同じ商品をカートに追加します。

**リクエストヘッダー**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**パスパラメータ**
```
orderId: string  // 注文ID 例: "ord_abc123"
```

**レスポンス（成功: 200 OK）**
```typescript
{
  success: true;
  data: {
    addedItems: number;           // カートに追加された商品数 例: 2
    unavailableItems: {           // 在庫切れ等で追加できなかった商品
      productId: string;
      productName: string;
      reason: string;             // 例: "在庫切れ", "販売終了"
    }[];
  };
  message: string;                // 例: "2点をカートに追加しました"
}
```

**レスポンス（エラー: 400 Bad Request）**
```typescript
{
  success: false;
  error: {
    code: 'ALL_ITEMS_UNAVAILABLE';
    message: string;              // 例: "すべての商品が購入できません"
    details: {
      productId: string;
      productName: string;
      reason: string;
    }[];
  };
}
```

**使用例**
```typescript
const handleReorder = async (orderId: string) => {
  const response = await fetch(`/api/orders/${orderId}/reorder`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const result = await response.json();

  if (result.success) {
    alert(`${result.data.addedItems}点をカートに追加しました`);
    navigate('/cart');
  } else {
    alert(result.error.message);
  }
};
```

---

### 4. デジタルチケット一覧取得API

#### **GET /api/tickets**

ログイン中ユーザーのデジタルチケットを取得します。

**リクエストヘッダー**
```
Authorization: Bearer {token}
```

**クエリパラメータ**
```
status?: 'unused' | 'used' | 'all'  // フィルター（デフォルト: 'all'）
```

**レスポンス（成功: 200 OK）**
```typescript
{
  success: true;
  data: {
    tickets: [
      {
        id: string;                 // チケットID
        orderId: string;            // 注文ID
        productId: string;          // 商品ID
        ticketCode: string;         // チケットコード 例: "TICKET-CM2025-0042"
        qrCodeData: string;         // QRコード用データ（Base64エンコード）
        isUsed: boolean;            // 使用済みフラグ
        usedAt?: string;            // 使用日時（ISO 8601形式）
        createdAt: string;

        // 関連商品情報
        product: {
          id: string;
          name: string;             // イベント名 例: "カーミーティング2025"
          images: string[];
        };

        // イベント情報（ProductAttributesから取得）
        eventDate?: string;         // イベント日時
        eventLocation?: string;     // 開催場所
      }
    ];

    // 統計
    stats: {
      total: number;                // 総チケット数
      unused: number;               // 未使用チケット数
      used: number;                 // 使用済みチケット数
    };
  };
  message: string;
}
```

**使用例**
```typescript
const fetchTickets = async () => {
  const response = await fetch('/api/tickets?status=all', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const result = await response.json();

  if (result.success) {
    setTickets(result.data.tickets);
    setTicketStats(result.data.stats);
  }
};
```

---

### 5. QRコードデータ取得API

#### **GET /api/tickets/:ticketId/qr**

特定のチケットのQRコードデータを取得します（未使用チケットのみ）。

**リクエストヘッダー**
```
Authorization: Bearer {token}
```

**パスパラメータ**
```
ticketId: string  // チケットID
```

**レスポンス（成功: 200 OK）**
```typescript
{
  success: true;
  data: {
    ticketId: string;
    ticketCode: string;
    qrCodeDataUrl: string;        // QRコード画像（Data URL形式）
                                  // 例: "data:image/png;base64,iVBORw0KGg..."
    productName: string;
    eventDate?: string;
    expiresAt: string;            // QRコードの有効期限（5分後）
  };
  message: string;
}
```

**レスポンス（エラー: 400 Bad Request）**
```typescript
{
  success: false;
  error: {
    code: 'TICKET_ALREADY_USED';
    message: string;
    usedAt: string;
  };
}
```

**使用例**
```typescript
const handleShowQR = async (ticketId: string) => {
  const response = await fetch(`/api/tickets/${ticketId}/qr`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const result = await response.json();

  if (result.success) {
    // 全画面モーダルでQRコード表示
    setQrData(result.data);
    setShowQrModal(true);
  } else {
    alert(result.error.message);
  }
};
```

---

### 6. アカウント情報取得API

#### **GET /api/users/me**

ログイン中ユーザーのアカウント情報を取得します。

**リクエストヘッダー**
```
Authorization: Bearer {token}
```

**レスポンス（成功: 200 OK）**
```typescript
{
  success: true;
  data: {
    user: {
      id: string;
      email: string;
      name: string;
      defaultAddress?: string;
      defaultPostalCode?: string;
      defaultPhone?: string;
      createdAt: string;
      updatedAt: string;

      // 統計情報
      stats: {
        totalOrders: number;      // 総注文数
        totalSpent: number;       // 総購入金額
        memberSince: string;      // 会員登録日
      };
    };
  };
  message: string;
}
```

**使用例**
```typescript
useEffect(() => {
  const fetchUserInfo = async () => {
    const response = await fetch('/api/users/me', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const result = await response.json();

    if (result.success) {
      setName(result.data.user.name);
      setEmail(result.data.user.email);
      setDefaultAddress(result.data.user.defaultAddress || '');
      // ...
    }
  };

  fetchUserInfo();
}, []);
```

---

### 7. アカウント情報更新API

#### **PUT /api/users/me**

ログイン中ユーザーのアカウント情報を更新します。

**リクエストヘッダー**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**リクエストボディ**
```typescript
{
  name?: string;              // 氏名
  email?: string;             // メールアドレス
  defaultAddress?: string;    // デフォルト住所
  defaultPostalCode?: string; // デフォルト郵便番号
  defaultPhone?: string;      // デフォルト電話番号
}
```

**レスポンス（成功: 200 OK）**
```typescript
{
  success: true;
  data: {
    user: {
      id: string;
      email: string;
      name: string;
      defaultAddress?: string;
      defaultPostalCode?: string;
      defaultPhone?: string;
      updatedAt: string;
    };
  };
  message: string;            // 例: "アカウント情報を更新しました"
}
```

**レスポンス（エラー: 400 Bad Request）**
```typescript
{
  success: false;
  error: {
    code: 'VALIDATION_ERROR' | 'EMAIL_ALREADY_EXISTS';
    message: string;
    details?: {
      field: string;
      message: string;
    }[];
  };
}
```

**使用例**
```typescript
const handleSaveSettings = async () => {
  const response = await fetch('/api/users/me', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      email,
      defaultAddress: address,
      defaultPostalCode: postalCode,
      defaultPhone: phone,
    }),
  });

  const result = await response.json();

  if (result.success) {
    alert('アカウント情報を保存しました！');
  } else {
    alert(result.error.message);
  }
};
```

---

### 8. パスワード変更API

#### **PUT /api/users/me/password**

ログイン中ユーザーのパスワードを変更します。

**リクエストヘッダー**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**リクエストボディ**
```typescript
{
  currentPassword: string;    // 現在のパスワード（必須）
  newPassword: string;        // 新しいパスワード（必須、8文字以上）
}
```

**レスポンス（成功: 200 OK）**
```typescript
{
  success: true;
  message: string;            // 例: "パスワードを変更しました"
}
```

**レスポンス（エラー: 400 Bad Request）**
```typescript
{
  success: false;
  error: {
    code: 'INVALID_PASSWORD' | 'PASSWORD_TOO_SHORT';
    message: string;
  };
}
```

**使用例**
```typescript
const handleChangePassword = async () => {
  if (newPassword !== confirmPassword) {
    alert('新しいパスワードが一致しません');
    return;
  }

  if (newPassword.length < 8) {
    alert('パスワードは8文字以上で入力してください');
    return;
  }

  const response = await fetch('/api/users/me/password', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  });

  const result = await response.json();

  if (result.success) {
    alert('パスワードを変更しました');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  } else {
    alert(result.error.message);
  }
};
```

---

### 9. デジタル商品ダウンロードURL取得API

#### **GET /api/orders/:orderId/downloads**

デジタル商品のダウンロードURLを取得します。

**リクエストヘッダー**
```
Authorization: Bearer {token}
```

**パスパラメータ**
```
orderId: string  // 注文ID
```

**レスポンス（成功: 200 OK）**
```typescript
{
  success: true;
  data: {
    downloads: [
      {
        id: string;               // ダウンロードID
        orderId: string;
        digitalProductId: string;
        downloadUrl: string;      // 署名付きURL（24時間有効）
        urlExpiresAt: string;     // URL有効期限
        downloadCount: number;    // ダウンロード済み回数
        maxDownloads: number;     // 最大ダウンロード回数（デフォルト: 5）
        lastDownloadAt?: string;

        // 商品情報
        digitalProduct: {
          id: string;
          fileName: string;       // ファイル名 例: "manual.pdf"
          fileSize: number;       // ファイルサイズ（バイト）
          product: {
            id: string;
            name: string;
          };
        };
      }
    ];
  };
  message: string;
}
```

**レスポンス（エラー: 400 Bad Request）**
```typescript
{
  success: false;
  error: {
    code: 'DOWNLOAD_LIMIT_EXCEEDED';
    message: string;
  };
}
```

**使用例**
```typescript
const handleDownload = async (orderId: string) => {
  const response = await fetch(`/api/orders/${orderId}/downloads`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const result = await response.json();

  if (result.success) {
    // ダウンロード可能なファイル一覧を表示
    setDownloads(result.data.downloads);
    setShowDownloadModal(true);
  } else {
    alert(result.error.message);
  }
};
```

---

## データベーストランザクション

### 再注文処理のトランザクション

```typescript
// backend/src/routes/order-routes.ts
app.post('/api/orders/:orderId/reorder', async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. 元の注文取得
      const originalOrder = await tx.order.findUnique({
        where: { id: orderId, userId },
        include: { items: { include: { product: true } } },
      });

      if (!originalOrder) {
        throw new Error('ORDER_NOT_FOUND');
      }

      const addedItems: string[] = [];
      const unavailableItems: { productId: string; productName: string; reason: string }[] = [];

      // 2. 各商品の在庫チェック & カート追加
      for (const item of originalOrder.items) {
        // 商品が販売中か確認
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          unavailableItems.push({
            productId: item.productId,
            productName: item.product.name,
            reason: '販売終了',
          });
          continue;
        }

        // 在庫チェック
        const stockSum = await tx.inventoryLog.aggregate({
          where: { productId: item.productId },
          _sum: { quantity: true },
        });

        const currentStock = stockSum._sum.quantity || 0;

        if (currentStock < item.quantity) {
          unavailableItems.push({
            productId: item.productId,
            productName: item.product.name,
            reason: currentStock === 0 ? '在庫切れ' : `在庫不足（残り${currentStock}個）`,
          });
          continue;
        }

        // カートに追加（既存カートアイテムがあれば数量更新）
        await tx.cartItem.upsert({
          where: {
            userId_productId: {
              userId,
              productId: item.productId,
            },
          },
          create: {
            userId,
            productId: item.productId,
            quantity: item.quantity,
          },
          update: {
            quantity: { increment: item.quantity },
          },
        });

        addedItems.push(item.productId);
      }

      return { addedItems, unavailableItems };
    });

    if (result.addedItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALL_ITEMS_UNAVAILABLE',
          message: 'すべての商品が購入できません',
          details: result.unavailableItems,
        },
      });
    }

    res.json({
      success: true,
      data: {
        addedItems: result.addedItems.length,
        unavailableItems: result.unavailableItems,
      },
      message: `${result.addedItems.length}点をカートに追加しました`,
    });
  } catch (error) {
    console.error('再注文エラー:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '再注文処理に失敗しました',
      },
    });
  }
});
```

---

## セキュリティ

### 認証・認可
- **必須認証**: 全エンドポイントで会員ログイン必須
- **ユーザー検証**: リクエストユーザーとリソース所有者の一致確認
- **トークン検証**: JWT Bearer Token検証

### データアクセス制御
- **注文データ**: 自分の注文のみ取得可能
- **チケットデータ**: 自分のチケットのみ取得可能
- **QRコード**: 未使用チケットのみ取得可能、5分間の有効期限

### バリデーション
- **メールアドレス**: 形式チェック、重複チェック
- **パスワード**: 8文字以上、現在のパスワード確認
- **住所情報**: 必須項目チェック、文字数制限

---

## パフォーマンス最適化

### データベース
- **インデックス**:
  - `Order.userId` + `createdAt` (複合インデックス)
  - `DigitalTicket.orderId` + `isUsed` (複合インデックス)
  - `CartItem.userId` + `productId` (一意制約 + 複合インデックス)

### ページネーション
- **購入履歴**: デフォルト10件、最大50件
- **カーソルベース**: 大量データに対応（将来実装）

### キャッシング
- **QRコード**: 生成後5分間キャッシュ（Redis使用、将来実装）
- **ユーザー情報**: 認証時にキャッシュ

### API応答時間目標
- 購入履歴取得: < 300ms
- チケット一覧取得: < 200ms
- アカウント情報取得: < 100ms
- QRコード生成: < 500ms

---

## 今後の拡張予定

### Phase 2で実装予定
1. **レビュー機能**
   - 購入商品へのレビュー投稿
   - レビュー一覧表示
2. **お気に入り機能**
   - 商品のお気に入り登録
   - お気に入り一覧表示
3. **通知機能**
   - 発送通知、イベント開催通知
   - Web Push通知
4. **ポイント履歴**
   - ポイント獲得・使用履歴
   - ポイント有効期限管理

---

## テストケース

### 正常系
1. ✅ 購入履歴取得 → 自分の注文のみ取得
2. ✅ 注文詳細取得 → 全情報取得
3. ✅ 再注文 → カートに追加成功
4. ✅ デジタルチケット取得 → 未使用・使用済み分類
5. ✅ QRコード表示 → 未使用チケットのみ
6. ✅ アカウント情報更新 → 正常更新
7. ✅ パスワード変更 → 正常変更

### 異常系
1. ❌ 未ログイン → 401 Unauthorized
2. ❌ 他人の注文詳細取得 → 404 Not Found
3. ❌ 再注文（全商品在庫切れ） → 400 ALL_ITEMS_UNAVAILABLE
4. ❌ 使用済みチケットのQRコード取得 → 400 TICKET_ALREADY_USED
5. ❌ 重複メールアドレス → 400 EMAIL_ALREADY_EXISTS
6. ❌ 不正な現在パスワード → 400 INVALID_PASSWORD
7. ❌ 短すぎるパスワード → 400 PASSWORD_TOO_SHORT

---

**作成日**: 2025-12-23
**最終更新**: 2025-12-23
**関連ドキュメント**:
- [P-010: 購入手続きページAPI仕様書](./P-010_CheckoutPage_API.md)
- [P-009: カートページAPI仕様書](./P-009_CartPage_API.md)
- [CLAUDE.md](../../CLAUDE.md)

# P-008: 会員登録・ログインページ API仕様書

## 概要
会員登録、ログイン、パスワードリセット、ソーシャルログイン機能を提供するAPIエンドポイントの仕様書です。

## エンドポイント一覧

### 1. 会員登録API

#### **POST /api/auth/register**

新規ユーザーアカウントを作成します。

**リクエストヘッダー**
```
Content-Type: application/json
```

**リクエストボディ**
```typescript
{
  name: string;         // 氏名（必須）例: "山田 太郎"
  email: string;        // メールアドレス（必須）例: "yamada@example.com"
  password: string;     // パスワード（必須、8文字以上）例: "password123"
}
```

**レスポンス（成功: 201 Created）**
```typescript
{
  success: true;
  data: {
    user: {
      id: string;               // ユーザーID 例: "usr_abc123"
      email: string;            // メールアドレス
      name: string;             // 氏名
      createdAt: string;        // 登録日時（ISO 8601形式）
    };
    token: string;              // JWT認証トークン
  };
  message: string;              // 例: "アカウントを作成しました"
}
```

**レスポンス（エラー: 400 Bad Request）**
```typescript
{
  success: false;
  error: {
    code: 'VALIDATION_ERROR' | 'EMAIL_ALREADY_EXISTS' | 'PASSWORD_TOO_SHORT';
    message: string;
    details?: {
      field: string;            // エラーが発生したフィールド名
      message: string;          // 詳細メッセージ
    }[];
  };
}
```

**エラーケース**
- `VALIDATION_ERROR`: 必須項目未入力、形式エラー
- `EMAIL_ALREADY_EXISTS`: メールアドレスが既に登録済み
- `PASSWORD_TOO_SHORT`: パスワードが8文字未満

**処理フロー**
1. バリデーションチェック
   - 必須項目（name, email, password）
   - メールアドレス形式
   - パスワード長（8文字以上）
2. メールアドレス重複チェック
3. パスワードハッシュ化（bcrypt）
4. ユーザー作成（Userテーブル）
5. JWT トークン生成
6. セッション作成
7. ウェルカムメール送信（バックグラウンド）
8. レスポンス返却

**使用例**
```typescript
// AuthPage.tsx
const handleRegister = async () => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: registerName,
      email: registerEmail,
      password: registerPassword,
    }),
  });

  const result = await response.json();

  if (result.success) {
    // トークン保存
    localStorage.setItem('token', result.data.token);

    // ユーザー情報保存
    setUser(result.data.user);

    // ホームへリダイレクト
    navigate('/');
  } else {
    alert(result.error.message);
  }
};
```

---

### 2. ログインAPI

#### **POST /api/auth/login**

既存ユーザーの認証を行います。

**リクエストヘッダー**
```
Content-Type: application/json
```

**リクエストボディ**
```typescript
{
  email: string;        // メールアドレス（必須）
  password: string;     // パスワード（必須）
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
      createdAt: string;
      updatedAt: string;
    };
    token: string;              // JWT認証トークン
    role: 'USER' | 'ADMIN';     // ユーザーロール
  };
  message: string;              // 例: "ログインしました"
}
```

**レスポンス（エラー: 401 Unauthorized）**
```typescript
{
  success: false;
  error: {
    code: 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED';
    message: string;
    lockUntil?: string;         // アカウントロック解除時刻（ISO 8601形式）
  };
}
```

**エラーケース**
- `INVALID_CREDENTIALS`: メールアドレスまたはパスワードが間違っている
- `ACCOUNT_LOCKED`: ログイン失敗回数超過によるアカウントロック（5回失敗で15分間ロック）

**処理フロー**
1. メールアドレスでユーザー検索
2. アカウントロック確認
3. パスワード検証（bcrypt.compare）
4. ログイン失敗回数リセット（成功時）
5. ログイン失敗回数インクリメント（失敗時）
6. JWTトークン生成
7. セッション作成
8. レスポンス返却

**使用例**
```typescript
// AuthPage.tsx
const handleLogin = async () => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: loginEmail,
      password: loginPassword,
    }),
  });

  const result = await response.json();

  if (result.success) {
    localStorage.setItem('token', result.data.token);
    setUser(result.data.user);
    setRole(result.data.role);
    navigate('/');
  } else {
    alert(result.error.message);
  }
};
```

---

### 3. ログアウトAPI

#### **POST /api/auth/logout**

現在のセッションを終了します。

**リクエストヘッダー**
```
Authorization: Bearer {token}
```

**レスポンス（成功: 200 OK）**
```typescript
{
  success: true;
  message: string;              // 例: "ログアウトしました"
}
```

**処理フロー**
1. セッション削除
2. JWTトークン無効化（ブラックリスト追加、将来実装）
3. レスポンス返却

**使用例**
```typescript
const handleLogout = async () => {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });

  const result = await response.json();

  if (result.success) {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/auth/login');
  }
};
```

---

### 4. セッション検証API

#### **GET /api/auth/session**

現在のセッションが有効かを確認し、ユーザー情報を取得します。

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
    };
    role: 'USER' | 'ADMIN';
    expiresAt: string;          // トークン有効期限（ISO 8601形式）
  };
  message: string;
}
```

**レスポンス（エラー: 401 Unauthorized）**
```typescript
{
  success: false;
  error: {
    code: 'INVALID_TOKEN' | 'TOKEN_EXPIRED';
    message: string;
  };
}
```

**使用例**
```typescript
// AuthContext.tsx - アプリ起動時にセッション復元
useEffect(() => {
  const restoreSession = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const response = await fetch('/api/auth/session', {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const result = await response.json();

    if (result.success) {
      setUser(result.data.user);
      setRole(result.data.role);
    } else {
      localStorage.removeItem('token');
    }
  };

  restoreSession();
}, []);
```

---

### 5. パスワードリセット要求API

#### **POST /api/auth/password-reset/request**

パスワードリセットリンクをメールで送信します。

**リクエストヘッダー**
```
Content-Type: application/json
```

**リクエストボディ**
```typescript
{
  email: string;        // 登録済みメールアドレス（必須）
}
```

**レスポンス（成功: 200 OK）**
```typescript
{
  success: true;
  message: string;      // 例: "パスワードリセットリンクを送信しました"
}
```

**レスポンス（エラー: 404 Not Found）**
```typescript
{
  success: false;
  error: {
    code: 'USER_NOT_FOUND';
    message: string;
  };
}
```

**処理フロー**
1. メールアドレスでユーザー検索
2. リセットトークン生成（ランダム32文字、有効期限1時間）
3. トークンをDBに保存（PasswordResetTokenテーブル）
4. リセットリンク付きメール送信（Resend使用）
   - リンク形式: `https://example.com/auth/password-reset?token={token}`
5. レスポンス返却

**セキュリティ考慮事項**
- ユーザーが存在しない場合でも同じメッセージを返却（メールアドレス列挙攻撃対策）
- リセットトークンは1回限り有効
- 有効期限は1時間
- 同一メールアドレスへのリクエストは5分に1回まで（レート制限）

**使用例**
```typescript
const handleResetPassword = async () => {
  const response = await fetch('/api/auth/password-reset/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: resetEmail }),
  });

  const result = await response.json();

  if (result.success) {
    setResetSuccess(true);
    setResetEmail('');
  } else {
    alert(result.error.message);
  }
};
```

---

### 6. パスワードリセット実行API

#### **POST /api/auth/password-reset/confirm**

リセットトークンを使用して新しいパスワードを設定します。

**リクエストヘッダー**
```
Content-Type: application/json
```

**リクエストボディ**
```typescript
{
  token: string;        // リセットトークン（必須）
  newPassword: string;  // 新しいパスワード（必須、8文字以上）
}
```

**レスポンス（成功: 200 OK）**
```typescript
{
  success: true;
  message: string;      // 例: "パスワードを変更しました"
}
```

**レスポンス（エラー: 400 Bad Request）**
```typescript
{
  success: false;
  error: {
    code: 'INVALID_TOKEN' | 'TOKEN_EXPIRED' | 'PASSWORD_TOO_SHORT';
    message: string;
  };
}
```

**処理フロー**
1. トークン検証（存在確認、有効期限確認）
2. パスワード検証（8文字以上）
3. パスワードハッシュ化（bcrypt）
4. ユーザーのパスワード更新
5. リセットトークン削除（使用済みマーク）
6. パスワード変更通知メール送信
7. レスポンス返却

**使用例**
```typescript
// PasswordResetPage.tsx (別ページで実装)
const handleConfirmReset = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const response = await fetch('/api/auth/password-reset/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      newPassword,
    }),
  });

  const result = await response.json();

  if (result.success) {
    alert('パスワードを変更しました');
    navigate('/auth/login');
  } else {
    alert(result.error.message);
  }
};
```

---

### 7. ソーシャルログイン（Google）API

#### **GET /api/auth/google**

Google OAuth認証フローを開始します。

**クエリパラメータ**
```
redirect_uri?: string  // 認証後のリダイレクト先（デフォルト: '/'）
```

**レスポンス**
- Google認証ページへリダイレクト

**処理フロー**
1. Google OAuth認証URLを生成
2. ユーザーをGoogle認証ページへリダイレクト
3. ユーザーが認証を承認
4. Googleからコールバック受信（/api/auth/google/callback）
5. ユーザー情報取得（Google People API）
6. ユーザー登録 or ログイン
7. JWTトークン生成
8. フロントエンドへリダイレクト

**使用例**
```typescript
const handleGoogleLogin = () => {
  // Google認証ページへリダイレクト
  window.location.href = '/api/auth/google?redirect_uri=/';
};
```

---

### 8. ソーシャルログイン（Facebook）API

#### **GET /api/auth/facebook**

Facebook OAuth認証フローを開始します。

**クエリパラメータ**
```
redirect_uri?: string  // 認証後のリダイレクト先（デフォルト: '/'）
```

**レスポンス**
- Facebook認証ページへリダイレクト

**処理フロー**
1. Facebook OAuth認証URLを生成
2. ユーザーをFacebook認証ページへリダイレクト
3. ユーザーが認証を承認
4. Facebookからコールバック受信（/api/auth/facebook/callback）
5. ユーザー情報取得（Facebook Graph API）
6. ユーザー登録 or ログイン
7. JWTトークン生成
8. フロントエンドへリダイレクト

**使用例**
```typescript
const handleFacebookLogin = () => {
  // Facebook認証ページへリダイレクト
  window.location.href = '/api/auth/facebook?redirect_uri=/';
};
```

---

## データベーススキーマ

### Userテーブル
```prisma
model User {
  id                String    @id @default(cuid())
  email             String    @unique
  name              String
  password          String    // bcryptハッシュ
  defaultAddress    String?
  defaultPostalCode String?
  defaultPhone      String?
  loginFailCount    Int       @default(0)
  lockedUntil       DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // リレーション
  orders            Order[]
  cartItems         CartItem[]
  passwordResetTokens PasswordResetToken[]
}
```

### PasswordResetTokenテーブル
```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  isUsed    Boolean  @default(false)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
}
```

---

## セキュリティ

### パスワードハッシュ化
```typescript
import bcrypt from 'bcrypt';

// 登録時
const hashedPassword = await bcrypt.hash(password, 10);

// ログイン時
const isValid = await bcrypt.compare(password, user.password);
```

### JWTトークン
```typescript
import jwt from 'jsonwebtoken';

// トークン生成
const token = jwt.sign(
  {
    userId: user.id,
    email: user.email,
    role: user.role,
  },
  process.env.JWT_SECRET!,
  { expiresIn: '7d' } // 7日間有効
);

// トークン検証
const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
  userId: string;
  email: string;
  role: string;
};
```

### ログイン失敗対策（ブルートフォース攻撃防止）
```typescript
// ログイン失敗時
await prisma.user.update({
  where: { email },
  data: {
    loginFailCount: { increment: 1 },
    lockedUntil: loginFailCount >= 4
      ? new Date(Date.now() + 15 * 60 * 1000) // 15分後
      : undefined,
  },
});

// ログイン成功時
await prisma.user.update({
  where: { email },
  data: {
    loginFailCount: 0,
    lockedUntil: null,
  },
});
```

### CSRF対策
- SameSite Cookie使用
- CORS設定（フロントエンドURLのみ許可）

---

## パフォーマンス最適化

### データベース
- **インデックス**:
  - `User.email` (UNIQUE)
  - `PasswordResetToken.token` (UNIQUE)
  - `PasswordResetToken.userId`

### レート制限
- パスワードリセット要求: 5分に1回
- ログイン試行: 5回失敗で15分間ロック

### API応答時間目標
- 会員登録: < 500ms
- ログイン: < 300ms
- セッション検証: < 100ms
- パスワードリセット要求: < 200ms

---

## メール送信

### ウェルカムメール（会員登録時）
```typescript
// Resend使用
await resend.emails.send({
  from: 'noreply@example.com',
  to: user.email,
  subject: 'アカウント作成完了',
  html: `
    <h1>ようこそ、${user.name}様</h1>
    <p>アカウントの作成が完了しました。</p>
    <p>お買い物をお楽しみください！</p>
  `,
});
```

### パスワードリセットメール
```typescript
await resend.emails.send({
  from: 'noreply@example.com',
  to: user.email,
  subject: 'パスワードリセットのご案内',
  html: `
    <h1>パスワードリセット</h1>
    <p>以下のリンクからパスワードをリセットしてください。</p>
    <a href="${resetUrl}">パスワードをリセット</a>
    <p>このリンクは1時間有効です。</p>
  `,
});
```

---

## テストケース

### 正常系
1. ✅ 会員登録 → ユーザー作成、トークン発行
2. ✅ ログイン → 認証成功、トークン発行
3. ✅ セッション検証 → ユーザー情報取得
4. ✅ ログアウト → セッション削除
5. ✅ パスワードリセット要求 → メール送信
6. ✅ パスワードリセット実行 → パスワード変更
7. ✅ Googleログイン → OAuth認証成功
8. ✅ Facebookログイン → OAuth認証成功

### 異常系
1. ❌ 重複メールアドレスで登録 → 400 EMAIL_ALREADY_EXISTS
2. ❌ 短すぎるパスワード → 400 PASSWORD_TOO_SHORT
3. ❌ 不正な認証情報でログイン → 401 INVALID_CREDENTIALS
4. ❌ 5回ログイン失敗 → 401 ACCOUNT_LOCKED
5. ❌ 無効なトークンでセッション検証 → 401 INVALID_TOKEN
6. ❌ 期限切れリセットトークン → 400 TOKEN_EXPIRED
7. ❌ 存在しないメールアドレスでリセット要求 → 200（同じメッセージ）

---

## 今後の拡張予定

### Phase 2で実装予定
1. **メール認証**
   - 会員登録時にメール認証リンク送信
   - 認証完了までアカウント無効化
2. **2段階認証（2FA）**
   - TOTPアプリ（Google Authenticator等）対応
   - バックアップコード発行
3. **ソーシャルログイン拡張**
   - Twitter/X
   - Apple
   - LINE
4. **セキュリティログ**
   - ログイン履歴記録
   - 不審なアクティビティ通知

---

**作成日**: 2025-12-23
**最終更新**: 2025-12-23
**関連ドキュメント**:
- [P-011: マイページAPI仕様書](./P-011_MyPage_API.md)
- [CLAUDE.md](../../CLAUDE.md)

# 商品管理ページE2Eテスト結果

## テスト実行日時
2026-04-19

## テスト環境
- ブラウザ: Chrome (Playwright Chromium)
- フロントエンド: http://localhost:3251
- バックエンド: http://localhost:8432
- テストファイル: `frontend/tests/e2e/admin-products-page.spec.ts`

## テスト結果サマリー

### 実装済みテストケース

| テストID | テストケース名 | ステータス | 実行時間 | 試行回数 | 備考 |
|---------|--------------|----------|---------|---------|------|
| TC-001 | ページ表示確認 | **Fail** ❌ | 7.9秒 | 3回 | 認証セッション維持の問題あり |
| TC-002 | 商品一覧の表示確認（DataGrid） | **Fail** ❌ | N/A | 3回 | TC-001と同じ問題 |
| TC-003 | 検索機能（商品名） | **Fail** ❌ | N/A | 3回 | TC-001と同じ問題 |
| TC-004 | 絞り込み機能（カテゴリー） | **Fail** ❌ | N/A | 3回 | TC-001と同じ問題 |
| TC-005 | 絞り込み機能（在庫状況） | **Fail** ❌ | N/A | 3回 | TC-001と同じ問題 |
| TC-006 | 新規商品登録ダイアログの表示 | **Fail** ❌ | N/A | 3回 | TC-001と同じ問題 |
| TC-007 | 商品編集ダイアログの表示 | **Skip** ⏭️ | - | - | DataGridの編集ボタン特定が困難 |
| TC-008 | 商品削除確認 | **Skip** ⏭️ | - | - | DataGridの削除ボタン特定が困難 |
| TC-009 | 在庫管理タブの表示 | **Fail** ❌ | N/A | 3回 | TC-001と同じ問題 |
| TC-010 | 一括操作 | **Skip** ⏭️ | - | - | 時間制約のためスキップ |

### 統計
- **Pass**: 0
- **Fail**: 7
- **Skip**: 3
- **合計**: 10

## 主な課題と原因分析

### 課題1: 認証セッションの維持問題

#### 現象
- `loginAsAdmin()` 関数でログインAPIは成功（200 OK）
- Cookieに `connect.sid` セッションIDが保存される
- しかし、`/admin/products` への遷移後、`/admin/login` にリダイレクトされる

#### 原因仮説
1. **AuthContext の初期化タイミング問題**
   - ログイン後、AuthContextの状態更新に時間がかかる
   - `page.goto('/admin/products')` 実行時、まだ `isAuthenticated` が `false` のままになっている
   - `ProtectedRoute` が認証失敗と判断し、ログインページにリダイレクトする

2. **Cookie の送信問題**
   - Playwright のブラウザコンテキストで Cookie が正しく送信されていない可能性
   - SameSite 属性（'Lax'）が影響している可能性

3. **セッションの検証タイミング**
   - `await page.waitForTimeout(5000)` で待機しているが、まだ不十分な可能性

#### ログからの証拠
```
Login API response: { success: true, message: 'ログインしました', user: {...} }
Session cookie found: s%3AoFpyQRZ6k1WVfJtpW_dbmmb1pDKOkS2y...
Login completed. Session should be ready.
✓ /admin/products に移動、現在のURL: http://localhost:3251/admin/login
❌ 認証失敗または予期しないリダイレクト。
```

上記のログから、ログインは成功しているがページ遷移時に認証が失敗していることがわかる。

### 課題2: DataGrid の操作ボタン特定が困難

#### 現象
- TC-007, TC-008 で編集/削除ボタンをクリックできない

#### 原因
- MUI DataGrid の「操作」列にあるアイコンボタンに `data-testid` 等の識別属性が設定されていない
- `.MuiIconButton-root` で取得すると複数のボタンがヒットし、特定の行のボタンを一意に選択できない

#### 解決策（未実装）
- AdminProductsPage.tsx で、各ボタンに `data-testid` を追加する必要がある
  ```tsx
  <IconButton
    size="small"
    data-testid={`edit-product-${params.row.id}`}
    onClick={() => handleEditProduct(params.row.id)}
  >
    <Edit fontSize="small" />
  </IconButton>
  ```

### 課題3: ダミーデータの不足

#### 現象
- ログに「初期商品件数: 0 件」と表示される
- フィルタリング機能のテストで「プリウス」を含む商品が見つからない

#### 原因
- `AdminProductsPage.tsx` で定義されているダミーデータ（3件）が実際にはレンダリングされていない可能性
- または、ページが正しく読み込まれておらず、ログインページが表示されている

## 推奨される修正方針

### 優先度: 高

#### 1. 認証セッション維持の修正

**方法A: AuthContext の初期化を明示的に待機する**
```typescript
async function loginAsAdmin(page: any) {
  // ... (ログイン処理) ...

  // AuthContextの初期化を明示的に確認
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const checkAuth = () => {
        // グローバルにAuthContextの状態を公開する
        if ((window as any).authReady) {
          resolve();
        } else {
          setTimeout(checkAuth, 100);
        }
      };
      checkAuth();
    });
  });
}
```

**方法B: ページ遷移時にセッション検証を待機する**
```typescript
// ログイン後、直接目的のページに移動
await page.goto('/admin/products');

// ページが正しく読み込まれるまで待機（リダイレクトされないことを確認）
await page.waitForFunction(() => {
  return window.location.pathname === '/admin/products';
}, { timeout: 10000 });
```

**方法C: StorageState を使用した認証状態の保存**
```typescript
// ログイン後、ストレージステートを保存
const storageState = await page.context().storageState();

// 他のテストで再利用
const context = await browser.newContext({ storageState });
```

#### 2. テストデータの準備

- バックエンドに実際のテストデータを投入する
- または、AdminProductsPage.tsx でダミーデータが確実にレンダリングされるように修正する

### 優先度: 中

#### 3. DataGrid 操作ボタンへの識別属性追加

- `AdminProductsPage.tsx` を修正し、編集/削除ボタンに `data-testid` を追加
- これにより TC-007, TC-008 を実装可能にする

### 優先度: 低

#### 4. 一括操作機能のテスト実装

- TC-010 の実装（時間があれば）

## 次のアクション

1. **即座に実施すべき**: 認証セッション維持の問題を解決する（方法A、B、またはCを試す）
2. **短期的に実施**: AdminProductsPage.tsx にテスト用の識別属性を追加
3. **中長期的に実施**: 全テストケースが Pass になるまで反復的に修正

## テストファイルの状態

- **ファイルパス**: `/Users/gainertatsuya/Downloads/ショッピングページ〜決済ページ/frontend/tests/e2e/admin-products-page.spec.ts`
- **行数**: 約650行
- **実装済みテストケース**: 10件（うち3件はSkip）
- **ヘルパー関数**:
  - `loginAsAdmin`: 管理者ログインを実行（問題あり）

## まとめ

商品管理ページのE2Eテストは**基本的な構造は実装完了**していますが、**認証セッションの維持に関する技術的な問題**により、すべてのテストが失敗しています。

この問題を解決すれば、少なくとも**TC-001〜TC-006, TC-009の7つのテストケース**が Pass になる見込みです。

TC-007, TC-008 は、`data-testid` 属性の追加という小さな修正で実装可能になります。

**次のステップ**: 認証セッション維持の問題を解決するため、上記の「方法A、B、またはC」のいずれかを試すことを強く推奨します。

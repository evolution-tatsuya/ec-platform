# Phase 10.5 次のステップ

**作成日**: 2026-04-20
**状況**: 実装準備完了、コード実装は次のセッションで実施

---

## 📊 現在の状況

### ✅ 完了した準備作業

1. **依存関係インストール** ✅
   ```bash
   npm install react-hook-form zod @hookform/resolvers
   ```
   - React Hook Form
   - Zod（バリデーション）
   - @hookform/resolvers

2. **既存リソース確認** ✅
   - API関数: `frontend/src/services/api/products.ts` （全て実装済み）
   - React Query hooks: `frontend/src/hooks/useProducts.ts` （全て実装済み）
   - Dialog UI: `frontend/src/pages/AdminProductsPage.tsx`:419-624 （実装済み）

3. **ドキュメント作成** ✅
   - `docs/PHASE_10_SUMMARY.md` - Phase 10完了サマリー
   - `docs/PHASE_10_5_IMPLEMENTATION_GUIDE.md` - 実装ガイド（完全なコード付き）
   - `docs/SESSION_SUMMARY_2026_04_20.md` - セッション記録
   - `docs/PHASE_10_5_NEXT_STEPS.md` - このファイル

---

## 🎯 次のセッションでやること

### Step 1: 実装ガイドを読む（5分）

```bash
cat docs/PHASE_10_5_IMPLEMENTATION_GUIDE.md
```

このガイドには以下が含まれています：
- Task 1: TC-006 新規商品登録Dialogの実装（完全なコード）
- Task 2: TC-007 商品編集Dialogの実装（完全なコード）
- Task 3: TC-008 商品削除確認Dialogの実装（完全なコード）
- Task 4: TC-009 在庫調整Dialogの実装（完全なコード）
- Task 5: TC-004/005 DataGridカラムフィルターの実装
- Task 6: E2E-ADMIN-DB-008 管理画面ナビゲーションの実装

---

### Step 2: AdminProductsPageのバックアップ作成（必須）

```bash
cd frontend/src/pages
cp AdminProductsPage.tsx AdminProductsPage.tsx.backup
```

**理由**: 628行の大規模ファイルのため、問題が発生した場合に復元できるようにする

---

### Step 3: AdminProductsPageの実装（所要時間: 60-90分）

**ファイル**: `frontend/src/pages/AdminProductsPage.tsx`

#### 3.1 import追加（ファイル冒頭）

```typescript
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useAdminProducts,
  useAdminProductById,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useCreateInventoryLog,
} from '../hooks/useProducts';
```

#### 3.2 バリデーションスキーマ追加（コンポーネント外）

`docs/PHASE_10_5_IMPLEMENTATION_GUIDE.md` の Task 1.1 からコピー

#### 3.3 コンポーネント内にフォームロジック追加

`docs/PHASE_10_5_IMPLEMENTATION_GUIDE.md` の Task 1.2, 1.3 からコピー

#### 3.4 Dialog JSX更新

`docs/PHASE_10_5_IMPLEMENTATION_GUIDE.md` の Task 1.5 からコピー

---

### Step 4: 商品編集・削除・在庫調整の実装（所要時間: 60分）

`docs/PHASE_10_5_IMPLEMENTATION_GUIDE.md` の Task 2, 3, 4 からコピー

---

### Step 5: DataGridカラムフィルターの実装（所要時間: 20分）

`docs/PHASE_10_5_IMPLEMENTATION_GUIDE.md` の Task 5 からコピー

---

### Step 6: 管理画面ナビゲーションの実装（所要時間: 30分）

#### 6.1 AdminLayoutコンポーネント作成

```bash
touch frontend/src/components/AdminLayout.tsx
```

`docs/PHASE_10_5_IMPLEMENTATION_GUIDE.md` の Task 6.1 からコピー

#### 6.2 App.tsxのルート更新

`docs/PHASE_10_5_IMPLEMENTATION_GUIDE.md` の Task 6.2 からコピー

---

### Step 7: TypeScriptエラー修正（所要時間: 10-20分）

```bash
cd frontend
npm run type-check
```

エラーが出た場合は修正

---

### Step 8: E2Eテスト再実行（所要時間: 5分）

```bash
cd frontend
npx playwright test tests/e2e/
```

**期待結果**:
- **Pass**: 36件 (94.7%)
- **Skip**: 2件 (5.3%) - CartPage複雑テスト
- **Fail**: 0件

---

### Step 9: 完了ドキュメント作成（所要時間: 10分）

`docs/PHASE_10_5_COMPLETION_SUMMARY.md` を作成：

```markdown
# Phase 10.5 完了サマリー

**完了日**: YYYY-MM-DD

## 実装内容
- TC-006: 新規商品登録Dialog ✅
- TC-007: 商品編集Dialog ✅
- TC-008: 商品削除確認Dialog ✅
- TC-009: 在庫調整Dialog ✅
- TC-004/005: DataGridカラムフィルター ✅
- E2E-ADMIN-DB-008: 管理画面ナビゲーション ✅

## E2Eテスト結果
- Pass: XX/38
- Skip: XX/38
- Fail: XX/38

## 次のアクション
Phase 11（デプロイ）へ進む
```

---

## 📂 重要なファイルパス

| ファイル | 説明 |
|---------|------|
| `docs/PHASE_10_5_IMPLEMENTATION_GUIDE.md` | 完全な実装ガイド（コード付き） |
| `frontend/src/pages/AdminProductsPage.tsx` | 商品管理ページ（編集対象） |
| `frontend/src/hooks/useProducts.ts` | React Query hooks（参照用） |
| `frontend/src/services/api/products.ts` | API関数（参照用） |
| `frontend/src/components/AdminLayout.tsx` | 新規作成（ナビゲーション） |

---

## ⚠️ 注意事項

### AdminProductsPage.tsx編集時の注意

1. **バックアップ必須**: 628行の大規模ファイルのため
2. **段階的実装**: 一度に全て実装せず、Task 1→2→3と順番に
3. **動作確認**: 各Task完了後に`npm run dev`で動作確認
4. **TypeScriptエラー**: 実装途中でエラーが出ても慌てない

### E2Eテスト実行時の注意

1. **バックエンド起動**: 別ターミナルで`cd backend && npm run dev`
2. **フロントエンド起動**: 別ターミナルで`cd frontend && npm run dev`
3. **テスト実行**: `npx playwright test tests/e2e/`

---

## 🚀 所要時間の目安

| Step | 作業内容 | 所要時間 |
|------|---------|---------|
| 1 | 実装ガイド確認 | 5分 |
| 2 | バックアップ作成 | 1分 |
| 3 | AdminProductsPage実装 | 60-90分 |
| 4 | 編集・削除・在庫調整実装 | 60分 |
| 5 | DataGridフィルター実装 | 20分 |
| 6 | 管理画面ナビゲーション実装 | 30分 |
| 7 | TypeScriptエラー修正 | 10-20分 |
| 8 | E2Eテスト再実行 | 5分 |
| 9 | 完了ドキュメント作成 | 10分 |
| **合計** | | **3-4時間** |

---

## ✅ チェックリスト

次のエージェントが確認すべき項目:

- [ ] このファイル（`PHASE_10_5_NEXT_STEPS.md`）を読んだ
- [ ] `docs/PHASE_10_5_IMPLEMENTATION_GUIDE.md` を読んだ
- [ ] AdminProductsPage.tsxのバックアップを作成した
- [ ] Step 3: AdminProductsPage実装開始
- [ ] Step 4: 編集・削除・在庫調整実装
- [ ] Step 5: DataGridフィルター実装
- [ ] Step 6: 管理画面ナビゲーション実装
- [ ] Step 7: TypeScriptエラー修正
- [ ] Step 8: E2Eテスト再実行（36/38 Pass期待）
- [ ] Step 9: 完了ドキュメント作成
- [ ] Phase 11へ進む準備完了を確認

---

**実装ガイドに全てのコードが記載されています。コピー＆ペーストで実装できます。** 📝

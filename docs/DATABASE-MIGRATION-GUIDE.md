# 本番環境データベースマイグレーション手順書

**作成日**: 2026-05-26
**Phase**: Phase 10 - 本番運用保証
**対象**: Neon PostgreSQL本番環境セットアップ

---

## 📋 概要

本ドキュメントは、開発環境から本番環境へのデータベースマイグレーション手順を記載しています。

### 前提条件
- Neonアカウントが作成済み
- 開発環境でPrismaマイグレーションが正常に動作
- 本番用環境変数が準備済み

### 目標
- ✅ 開発環境と本番環境のデータベース完全分離
- ✅ 本番環境でPrismaスキーマを正常にデプロイ
- ✅ 管理者アカウントの初期セットアップ

---

## 🔧 セクション1: 本番用Neonデータベース作成

### 方法1: Neonブランチ機能（推奨）

Neonのブランチ機能を使用すると、既存のプロジェクト内で本番環境用のデータベースを分離できます。

#### ステップ1.1: Neonダッシュボードにアクセス
1. https://neon.tech にアクセス
2. ログイン
3. 既存プロジェクト（`ec-platform-db`等）を選択

#### ステップ1.2: 本番用ブランチ作成
1. 左サイドバーから **Branches** をクリック
2. **Create branch** ボタンをクリック
3. ブランチ設定:
   - **Branch name**: `production`
   - **Parent branch**: `main` または `development`
   - **Copy data from parent**: ❌ チェックを外す（空のDBを作成）
4. **Create branch** をクリック

#### ステップ1.3: 接続文字列の取得
1. 作成した`production`ブランチを選択
2. **Connection Details** セクションで以下を確認:
   - **Connection String** (Pooled接続を推奨)
   - 形式: `postgresql://[user]:[password]@[host]/[database]?sslmode=require&channel_binding=require`
3. 接続文字列をコピー（後で使用）

**例**:
```
postgresql://neondb_owner:npg_abc123...@ep-prod-branch-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### 方法2: 新規Neonプロジェクト作成（代替案）

既存プロジェクトと完全に分離したい場合は、新規プロジェクトを作成します。

#### ステップ2.1: 新規プロジェクト作成
1. Neonダッシュボード → **New Project**
2. プロジェクト設定:
   - **Project name**: `ec-platform-production`
   - **PostgreSQL version**: 15以上
   - **Region**: Asia Pacific (Singapore) - `ap-southeast-1`
3. **Create project**

#### ステップ2.2: 接続文字列の取得
- 方法1のステップ1.3と同様

---

## 🚀 セクション2: 本番環境へのマイグレーション実行

### 前提条件確認
- [ ] 本番用`DATABASE_URL`を取得済み
- [ ] ローカル環境に`backend`ディレクトリ存在
- [ ] `prisma/schema.prisma`が最新

### ステップ2.1: ローカル環境で本番DBへマイグレーション

本番環境にマイグレーションを適用する前に、ローカル環境から実行します。

```bash
cd /Users/gainertatsuya/Downloads/ショッピングページ〜決済ページ/backend

# 本番用DATABASE_URLを一時的に設定してマイグレーション実行
DATABASE_URL="postgresql://[本番用接続文字列]" npx prisma migrate deploy
```

**注意事項**:
- ❌ `prisma migrate dev` は使用しない（開発用コマンド）
- ✅ `prisma migrate deploy` を使用（本番用コマンド）
- マイグレーション履歴は`prisma/migrations`ディレクトリに保存

**期待される出力**:
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "neondb", schema "public" at "ep-prod-branch-pooler.ap-southeast-1.aws.neon.tech:5432"

15 migrations found in prisma/migrations

Applying migration `20260123123456_init`
Applying migration `20260202123456_add_categories`
...
Applying migration `20260520123456_latest_migration`

The following migrations have been applied:

migrations/
  └─ 20260123123456_init
  └─ 20260202123456_add_categories
  ...
  └─ 20260520123456_latest_migration

All migrations have been successfully applied.
```

### ステップ2.2: マイグレーション確認

```bash
# 本番DBに接続してテーブル一覧を確認
DATABASE_URL="postgresql://[本番用接続文字列]" npx prisma studio
```

**確認項目**:
- [ ] 全てのテーブルが作成されている
- [ ] インデックスが正しく設定されている
- [ ] リレーション（外部キー制約）が正常

### ステップ2.3: Prismaクライアント再生成

```bash
# 本番用DATABASE_URLでPrismaクライアントを生成
DATABASE_URL="postgresql://[本番用接続文字列]" npx prisma generate
```

---

## 👤 セクション3: 管理者アカウント初期セットアップ

本番環境では、初回デプロイ時に管理者アカウントを作成する必要があります。

### 方法1: Prisma Studioを使用（推奨）

#### ステップ3.1: Prisma Studioを開く

```bash
cd /Users/gainertatsuya/Downloads/ショッピングページ〜決済ページ/backend

# 本番DBに接続してPrisma Studioを開く
DATABASE_URL="postgresql://[本番用接続文字列]" npx prisma studio
```

#### ステップ3.2: 管理者アカウント作成

1. ブラウザで`http://localhost:5555`を開く
2. 左サイドバーから **User** テーブルを選択
3. **Add record** をクリック
4. 以下の情報を入力:

| フィールド | 値 | 備考 |
|-----------|-----|------|
| email | `admin@your-domain.com` | 管理者メールアドレス |
| password | `<bcryptハッシュ>` | 後述の方法で生成 |
| name | `管理者` | 任意 |
| isAdmin | `true` | チェックを入れる |

5. **Save 1 change** をクリック

#### ステップ3.3: パスワードハッシュの生成

bcryptハッシュを生成するには、以下のNode.jsスクリプトを実行:

```bash
# backend/scripts/hash-password.js を作成
cat > scripts/hash-password.js << 'EOF'
const bcrypt = require('bcrypt');

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-password.js <password>');
  process.exit(1);
}

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  console.log('Password hash:');
  console.log(hash);
});
EOF

# 実行例（パスワード: AdminPassword2026!）
node scripts/hash-password.js AdminPassword2026!
```

**出力例**:
```
Password hash:
$2b$10$abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567AB
```

このハッシュをPrisma Studioの`password`フィールドにコピー&ペーストします。

### 方法2: Seedスクリプトを使用（自動化）

#### ステップ3.4: Seedスクリプト作成

```bash
cd /Users/gainertatsuya/Downloads/ショッピングページ〜決済ページ/backend

# backend/scripts/seed-admin.ts を作成
cat > scripts/seed-admin.ts << 'EOF'
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding production database with admin account...');

  const email = process.env.ADMIN_EMAIL || 'admin@your-domain.com';
  const password = process.env.ADMIN_PASSWORD || 'AdminPassword2026!';

  // 既存の管理者アカウントを確認
  const existingAdmin = await prisma.user.findUnique({
    where: { email },
  });

  if (existingAdmin) {
    console.log(`✅ Admin account already exists: ${email}`);
    return;
  }

  // パスワードハッシュ化
  const hashedPassword = await bcrypt.hash(password, 10);

  // 管理者アカウント作成
  const admin = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: '管理者',
      isAdmin: true,
    },
  });

  console.log(`✅ Admin account created: ${admin.email}`);
  console.log(`📧 Email: ${email}`);
  console.log(`🔑 Password: ${password}`);
  console.log('');
  console.log('⚠️  本番環境では必ずパスワードを変更してください！');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
EOF
```

#### ステップ3.5: Seedスクリプト実行

```bash
# 本番DBに接続してSeedスクリプトを実行
DATABASE_URL="postgresql://[本番用接続文字列]" \
ADMIN_EMAIL="admin@your-domain.com" \
ADMIN_PASSWORD="AdminPassword2026!" \
npx tsx scripts/seed-admin.ts
```

**期待される出力**:
```
🌱 Seeding production database with admin account...
✅ Admin account created: admin@your-domain.com
📧 Email: admin@your-domain.com
🔑 Password: AdminPassword2026!

⚠️  本番環境では必ずパスワードを変更してください！
```

---

## ✅ セクション4: マイグレーション後の確認

### ステップ4.1: テーブル構造確認

```bash
# Prisma Studioで全テーブルを確認
DATABASE_URL="postgresql://[本番用接続文字列]" npx prisma studio
```

**確認項目**:
- [ ] 全モデルがテーブルとして存在
- [ ] インデックスが正しく設定（`@@index`）
- [ ] リレーションが正常（外部キー制約）

### ステップ4.2: 管理者ログインテスト

1. 本番環境にフロントエンド・バックエンドをデプロイ
2. 管理画面にアクセス: `https://your-domain.vercel.app/admin/login`
3. 作成した管理者アカウントでログイン
4. ダッシュボードが正常に表示されることを確認

### ステップ4.3: データベース接続確認

```bash
# ヘルスチェックエンドポイント
curl https://your-backend-url.run.app/api/health
```

**期待される出力**:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-05-26T12:00:00.000Z"
}
```

---

## 🔄 セクション5: マイグレーション運用

### 新しいマイグレーションの追加（開発環境）

```bash
cd /Users/gainertatsuya/Downloads/ショッピングページ〜決済ページ/backend

# 開発環境でマイグレーション作成
npx prisma migrate dev --name add_new_feature
```

### 本番環境への適用

```bash
# 本番DBに新しいマイグレーションを適用
DATABASE_URL="postgresql://[本番用接続文字列]" npx prisma migrate deploy
```

### ロールバック（必要時）

Prismaは公式にロールバック機能を提供していないため、手動でSQLを実行する必要があります。

```bash
# 1. Neon Consoleにアクセス
# 2. SQL Editorで以下を実行

-- 最後のマイグレーションを取り消す（例）
DROP TABLE IF EXISTS new_table CASCADE;
DELETE FROM _prisma_migrations WHERE migration_name = '20260526123456_add_new_feature';
```

**推奨**: マイグレーション実行前に必ずバックアップを取得

---

## 📊 セクション6: バックアップ・リストア

### Neon自動バックアップ

Neon無料プランでは、自動バックアップが7日間保持されます。

#### リストア方法
1. Neon Console → Branches
2. `production`ブランチを選択
3. **Restore** ボタンをクリック
4. リストアポイント（日時）を選択
5. **Restore** 実行

### 手動バックアップ（pg_dump）

```bash
# 本番DBをローカルにエクスポート
pg_dump "postgresql://[本番用接続文字列]" > backup-$(date +%Y%m%d-%H%M%S).sql

# リストア
psql "postgresql://[本番用接続文字列]" < backup-20260526-120000.sql
```

---

## 🚨 トラブルシューティング

### エラー1: マイグレーション失敗

**エラーメッセージ**:
```
Error: P3009
Migrate found failed migrations in the target database...
```

**原因**: 過去のマイグレーションが失敗した状態で残っている

**解決策**:
```bash
# 失敗したマイグレーションをリセット
DATABASE_URL="postgresql://[本番用接続文字列]" npx prisma migrate resolve --rolled-back 20260526123456_failed_migration
```

### エラー2: 接続タイムアウト

**エラーメッセージ**:
```
Error: P1001
Can't reach database server at `ep-prod-branch-pooler.ap-southeast-1.aws.neon.tech:5432`
```

**原因**: Neon無料プランのCPU時間制限（月190時間）に達した可能性

**解決策**:
1. Neon Console → Usage で使用量確認
2. 無料枠超過時は有料プラン検討（$19/月）

### エラー3: 同時接続数超過

**エラーメッセージ**:
```
Error: P1000
Authentication failed against database server at `ep-prod-branch-pooler.ap-southeast-1.aws.neon.tech`
```

**原因**: Neon無料プランの同時接続数制限（100接続）

**解決策**:
- Pooled接続を使用（接続文字列に`-pooler`が含まれることを確認）
- アプリケーションで接続プーリング実装

---

## ✅ 最終チェックリスト

### 本番環境デプロイ前
- [ ] 本番用Neonブランチ/プロジェクト作成
- [ ] 本番用`DATABASE_URL`取得
- [ ] ローカルから`prisma migrate deploy`実行
- [ ] 管理者アカウント作成（Seed or Prisma Studio）
- [ ] Prisma Studioで全テーブル確認
- [ ] 本番用環境変数に`DATABASE_URL`設定

### 本番環境デプロイ後
- [ ] `/api/health`エンドポイント確認
- [ ] 管理画面ログインテスト
- [ ] 商品一覧が正常に表示
- [ ] 注文作成が正常に動作
- [ ] Neon Consoleで接続数・CPU使用量監視

---

## 🎯 次のステップ

1. **本番用DATABASE_URL取得**: セクション1参照
2. **マイグレーション実行**: セクション2参照
3. **管理者アカウント作成**: セクション3参照
4. **本番環境変数設定**: `docs/PRODUCTION-ENVIRONMENT-VARIABLES.md`参照
5. **デプロイ実行**: `docs/PRODUCTION-READINESS-CHECKLIST.md`参照

---

**作成者**: Claude Code Agent
**最終更新日**: 2026-05-26

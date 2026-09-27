# 本番環境 環境変数設定ガイド

**作成日**: 2026-05-26
**対象**: 本番環境デプロイ（Vercel + Google Cloud Run）
**Phase**: Phase 10 - 本番運用保証

---

## 📋 環境変数設定概要

### 開発環境と本番環境の違い

| カテゴリ | 開発環境 | 本番環境 | 差分の重要度 |
|---------|---------|---------|-------------|
| NODE_ENV | development | **production** | 🔴 必須 |
| DATABASE_URL | development DB | **production DB** | 🔴 必須 |
| SESSION_SECRET | テスト用 | **新規生成** | 🔴 必須 |
| CORS_ORIGIN | localhost複数 | **本番URLのみ** | 🔴 必須 |
| STRIPE_*_KEY | テストモード | **本番モード** | 🔴 必須 |
| RESEND_FROM_EMAIL | onboarding@resend.dev | **独自ドメイン** | 🟡 推奨 |
| R2_BUCKET_NAME | 開発用バケット | **本番用バケット** | 🟡 推奨 |
| AI API Keys | 開発用 | **本番用（使用量制限設定）** | 🟢 任意 |

---

## ✅ 本番環境変数リスト（完全版）

### 1. アプリケーション設定

```bash
# ===== 必須 =====
NODE_ENV=production

# ===== フロントエンドURL =====
FRONTEND_URL=https://your-domain.vercel.app
# 例: https://ec-platform.vercel.app

# ===== バックエンドURL =====
BACKEND_URL=https://your-backend-url.run.app
# 例: https://ec-platform-backend-abc123-an.a.run.app

# ===== CORS設定 =====
CORS_ORIGIN=https://your-domain.vercel.app
# ⚠️ 重要: 本番環境では1つのURLのみ許可（セキュリティ強化）
# 開発環境のように複数のlocalhostを許可しない

# ===== ポート（Cloud Runで自動設定されるため任意） =====
PORT=8080
# Cloud Runはデフォルトで8080を使用
# カスタムポート（8432）を使用する場合は明示的に設定
```

### 2. データベース（Neon PostgreSQL）

```bash
# ===== 本番用データベース接続文字列 =====
DATABASE_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require&channel_binding=require
# 例: postgresql://neondb_owner:npg_xxx...@ep-prod-branch-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# ⚠️ 重要: 開発用DBと必ず分離すること
# 推奨方法1: Neonブランチ機能で "production" ブランチ作成
# 推奨方法2: 新規Neonプロジェクト作成（ec-platform-production）
```

**Neon本番DB設定手順**:
1. Neonダッシュボードにログイン
2. 既存プロジェクトから "production" ブランチを作成
   - または、新規プロジェクト "ec-platform-production" を作成
3. Connection String（Pooled接続）をコピー
4. 上記のDATABASE_URLに設定

### 3. セッション管理

```bash
# ===== セッション秘密鍵（必ず新規生成） =====
SESSION_SECRET=<64文字のランダム文字列>
# 例: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2

# ⚠️ 警告: 開発環境と同じSESSION_SECRETを使用しないこと
```

**SESSION_SECRET生成方法**:
```bash
# Node.jsで64文字のランダム文字列を生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 出力例: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

### 4. Cloudflare R2（画像・デジタル商品ストレージ）

```bash
# ===== R2アカウント情報 =====
R2_ACCOUNT_ID=<CloudflareアカウントID>
R2_ACCESS_KEY_ID=<R2 Access Key ID>
R2_SECRET_ACCESS_KEY=<R2 Secret Access Key>

# ===== R2バケット名（本番用） =====
R2_BUCKET_NAME=ec-platform-production
# ⚠️ 推奨: 開発用バケットと分離（ec-platform-dev と ec-platform-production）
```

**R2本番バケット作成手順**:
1. Cloudflare Dashboard → R2
2. "Create bucket" をクリック
3. バケット名: `ec-platform-production`
4. リージョン: Asia Pacific (APAC) - シンガポール近郊
5. Access Key作成（既存のものを使用可能）

### 5. Stripe決済（本番モード）

```bash
# ===== Stripe本番公開鍵 =====
STRIPE_PUBLIC_KEY=pk_live_<本番公開鍵>
# 例: pk_live_51SrVpGBUVE903zmW...

# ===== Stripe本番秘密鍵 =====
STRIPE_SECRET_KEY=sk_live_<本番秘密鍵>
# 例: sk_live_51SrVpGBUVE903zmW...

# ===== Stripe Webhook署名鍵 =====
STRIPE_WEBHOOK_SECRET=whsec_<Webhook署名鍵>
# 例: whsec_abc123...

# ⚠️ 重要: テストモードキー（pk_test_, sk_test_）は使用不可
```

**Stripe本番モード有効化手順**:
1. Stripe Dashboard → Developers → API keys
2. "View live data" トグルをONに切り替え
3. Publishable key（公開鍵）をコピー → STRIPE_PUBLIC_KEY
4. Secret key（秘密鍵）をコピー → STRIPE_SECRET_KEY
5. Webhooks → Add endpoint
   - URL: `https://your-backend-url.run.app/api/webhooks/stripe`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`
6. Signing secret（署名鍵）をコピー → STRIPE_WEBHOOK_SECRET

### 6. Resend（メール送信）

```bash
# ===== Resend APIキー =====
RESEND_API_KEY=re_<本番APIキー>
# 例: re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ===== 送信元メールアドレス（独自ドメイン推奨） =====
RESEND_FROM_EMAIL=noreply@your-domain.com
# 例: noreply@ec-platform.com

# ⚠️ 推奨: 独自ドメインでSPF/DKIMレコードを設定
# onboarding@resend.devは開発用のみ使用可能
```

**Resend独自ドメイン設定手順**:
1. Resend Dashboard → Domains → Add Domain
2. ドメイン名を入力（例: ec-platform.com）
3. 表示されたDNSレコードを登録:
   - SPFレコード（TXT）
   - DKIMレコード（TXT）
   - DMARCレコード（TXT、任意）
4. Verify Domain で検証完了
5. `noreply@your-domain.com` 等の送信元アドレスを設定

### 7. AI API（問い合わせ自動返答）

```bash
# ===== OpenAI（GPT-4o mini） =====
OPENAI_API_KEY=sk-proj-<本番APIキー>
# 例: sk-proj-abc123...

# ===== Google AI（Gemini 2.0 Flash） =====
GEMINI_API_KEY=<本番APIキー>
# 例: AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# ⚠️ 推奨: OpenAI APIの使用量制限を設定（$10/月）
```

**OpenAI使用量制限設定手順**:
1. OpenAI Dashboard → Settings → Billing
2. Usage limits → Set monthly budget
3. 推奨値: $10/月（約1,500円）
4. アラート設定: 80%使用時にメール通知

**Gemini使用量制限**:
- 無料プラン: 1日20リクエストまで
- 本プロジェクトのAI 3段階エスカレーション実装により、Geminiは2段階目で使用
- 無料枠超過時は自動的にGPT-4o miniにエスカレート

---

## 🔧 環境変数設定方法

### Vercel（フロントエンド）

#### 設定手順
1. Vercel Dashboard にログイン
2. プロジェクトを選択
3. Settings → Environment Variables
4. 以下の変数を追加:

```bash
VITE_API_URL=https://your-backend-url.run.app
VITE_STRIPE_PUBLIC_KEY=pk_live_<本番公開鍵>
```

5. Environment: **Production** を選択
6. Save

#### フロントエンド環境変数一覧
```bash
VITE_API_URL=<バックエンドURL>
VITE_STRIPE_PUBLIC_KEY=<Stripe本番公開鍵>
```

### Google Cloud Run（バックエンド）

#### 方法1: Cloud Console（推奨）

1. Cloud Run Console にアクセス
2. サービスを選択（または新規作成）
3. Edit & Deploy New Revision
4. Container → Variables & Secrets
5. Add Variable で以下を追加:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
SESSION_SECRET=<新規生成>
FRONTEND_URL=https://your-domain.vercel.app
BACKEND_URL=https://your-backend-url.run.app
CORS_ORIGIN=https://your-domain.vercel.app
R2_ACCOUNT_ID=<R2アカウントID>
R2_ACCESS_KEY_ID=<R2 Access Key>
R2_SECRET_ACCESS_KEY=<R2 Secret Key>
R2_BUCKET_NAME=ec-platform-production
STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@your-domain.com
OPENAI_API_KEY=sk-proj-...
GEMINI_API_KEY=AIza...
```

6. Deploy

#### 方法2: gcloud CLI

```bash
gcloud run services update ec-platform-backend \
  --region=asia-northeast1 \
  --update-env-vars "NODE_ENV=production,DATABASE_URL=postgresql://...,SESSION_SECRET=<新規生成>,FRONTEND_URL=https://your-domain.vercel.app,BACKEND_URL=https://your-backend-url.run.app,CORS_ORIGIN=https://your-domain.vercel.app,R2_ACCOUNT_ID=<R2アカウントID>,R2_ACCESS_KEY_ID=<R2 Access Key>,R2_SECRET_ACCESS_KEY=<R2 Secret Key>,R2_BUCKET_NAME=ec-platform-production,STRIPE_PUBLIC_KEY=pk_live_...,STRIPE_SECRET_KEY=sk_live_...,STRIPE_WEBHOOK_SECRET=whsec_...,RESEND_API_KEY=re_...,RESEND_FROM_EMAIL=noreply@your-domain.com,OPENAI_API_KEY=sk-proj-...,GEMINI_API_KEY=AIza..."
```

**注意**: 1行が長すぎる場合は、環境変数を分割して複数回実行:

```bash
# 基本設定
gcloud run services update ec-platform-backend \
  --region=asia-northeast1 \
  --update-env-vars "NODE_ENV=production,DATABASE_URL=postgresql://..."

# Stripe設定
gcloud run services update ec-platform-backend \
  --region=asia-northeast1 \
  --update-env-vars "STRIPE_PUBLIC_KEY=pk_live_...,STRIPE_SECRET_KEY=sk_live_..."

# 以下同様に分割
```

---

## ✅ セキュリティチェックリスト

### 本番環境デプロイ前に必ず確認

- [ ] **NODE_ENV=production** が設定されている
- [ ] **DATABASE_URL** が本番用DBを指している（開発DBと異なる）
- [ ] **SESSION_SECRET** が新規生成されている（開発環境と異なる）
- [ ] **CORS_ORIGIN** が本番フロントエンドURLのみ許可
- [ ] **STRIPE_*_KEY** が本番モード（`pk_live_`, `sk_live_`）
- [ ] **RESEND_FROM_EMAIL** が独自ドメイン（任意、推奨）
- [ ] **OpenAI API** の使用量制限が設定されている（$10/月推奨）
- [ ] **.env.local** がGitにコミットされていない（`.gitignore`確認）
- [ ] **環境変数** がCloud Run/Vercelに正しく設定されている

---

## 🚨 よくある間違い

### 1. テストモードのStripeキーを使用
```bash
# ❌ NG: テストモード
STRIPE_PUBLIC_KEY=pk_test_51SrVpGBUVE903zmW...
STRIPE_SECRET_KEY=sk_test_51SrVpGBUVE903zmW...

# ✅ OK: 本番モード
STRIPE_PUBLIC_KEY=pk_live_51SrVpGBUVE903zmW...
STRIPE_SECRET_KEY=sk_live_51SrVpGBUVE903zmW...
```

### 2. 開発用DBを本番環境で使用
```bash
# ❌ NG: 開発用DB
DATABASE_URL=postgresql://...@ep-dev-branch-pooler.ap-southeast-1.aws.neon.tech/neondb

# ✅ OK: 本番用DB
DATABASE_URL=postgresql://...@ep-prod-branch-pooler.ap-southeast-1.aws.neon.tech/neondb
```

### 3. CORS設定でlocalhost許可
```bash
# ❌ NG: 本番環境でlocalhost許可（セキュリティリスク）
CORS_ORIGIN=http://localhost:3247

# ✅ OK: 本番URLのみ許可
CORS_ORIGIN=https://your-domain.vercel.app
```

### 4. SESSION_SECRETの使い回し
```bash
# ❌ NG: 開発環境と同じSESSION_SECRET
SESSION_SECRET=<dev-and-prod-must-not-share-the-same-secret>

# ✅ OK: 本番環境専用のSESSION_SECRET（新規生成）
SESSION_SECRET=<node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" で生成>
```

---

## 📊 環境変数設定確認方法

### Cloud Run（バックエンド）

```bash
# デプロイ後、設定済み環境変数を確認
gcloud run services describe ec-platform-backend \
  --region=asia-northeast1 \
  --format="value(spec.template.spec.containers[0].env)"
```

### Vercel（フロントエンド）

1. Vercel Dashboard → プロジェクト → Settings → Environment Variables
2. Production タブで設定済み変数を確認

---

## 🎯 次のステップ

1. **本番用DATABASE_URL取得**: Neonで本番ブランチ/プロジェクト作成
2. **SESSION_SECRET生成**: 上記コマンドで新規生成
3. **Stripe本番モード有効化**: Dashboard→Developers→API keys
4. **Resend独自ドメイン設定**: Dashboard→Domains→Add Domain（任意）
5. **環境変数設定**: Cloud Run/Vercelで上記変数を設定
6. **デプロイ実行**: `docs/PRODUCTION-READINESS-CHECKLIST.md` 参照

---

**作成者**: Claude Code Agent
**最終更新日**: 2026-05-26

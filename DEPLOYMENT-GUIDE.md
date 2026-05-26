# 本番環境デプロイ完全ガイド

**作成日**: 2026-05-26
**対象プロジェクト**: 多機能ECプラットフォーム
**想定所要時間**: 90-120分

---

## 📋 目次

1. [事前準備](#事前準備)
2. [データベース準備（Neon）](#データベース準備neon)
3. [バックエンドデプロイ（Google Cloud Run）](#バックエンドデプロイgoogle-cloud-run)
4. [フロントエンドデプロイ（Vercel）](#フロントエンドデプロイvercel)
5. [動作確認](#動作確認)
6. [トラブルシューティング](#トラブルシューティング)

---

## 事前準備

### 必要なアカウント

以下のアカウントを事前に作成してください：

| サービス | 用途 | プラン | URL |
|---------|------|------|-----|
| **Neon** | PostgreSQLデータベース | 無料プラン | https://neon.tech |
| **Google Cloud Platform** | バックエンドホスティング | 無料枠 | https://cloud.google.com |
| **Vercel** | フロントエンドホスティング | Hobby（無料） | https://vercel.com |
| Cloudflare R2 | ストレージ（オプション） | 無料枠 | https://cloudflare.com |
| Stripe | 決済（オプション） | テストモード無料 | https://stripe.com |
| Resend | メール送信（オプション） | 無料枠 | https://resend.com |
| OpenAI | AI機能（オプション） | 従量課金 | https://openai.com |

### 必要なツール

以下のCLIツールをインストールしてください：

```bash
# gcloud CLI（Google Cloud）
brew install google-cloud-sdk

# Vercel CLI
npm install -g vercel

# Docker（既にインストール済みの場合はスキップ）
brew install --cask docker
```

### プロジェクトの確認

```bash
cd /path/to/ショッピングページ〜決済ページ

# Gitの状態確認
git status

# 未コミットの変更があればコミット
git add .
git commit -m "chore: 本番デプロイ準備"
git push origin main
```

---

## データベース準備（Neon）

### Step 1: Neon本番プロジェクトの作成

1. **Neonにログイン**
   - https://console.neon.tech にアクセス
   - GitHubまたはGoogleアカウントでログイン

2. **新規プロジェクトを作成**
   - `New Project` をクリック
   - プロジェクト名: `ec-platform-production`
   - リージョン: `Asia / Singapore (ap-southeast-1)`
   - PostgreSQL version: `15` 以上
   - `Create Project` をクリック

3. **接続文字列を取得**
   - プロジェクトのダッシュボードで `Connection Details` をクリック
   - `Pooled connection` を選択（推奨）
   - 接続文字列をコピー（形式：`postgresql://user:password@host/database?sslmode=require`）

4. **接続文字列を安全に保存**
   ```bash
   # ローカルに一時保存（後で環境変数に設定）
   echo "DATABASE_URL=postgresql://..." > /tmp/production-db-url.txt
   ```

### Step 2: データベースマイグレーション

```bash
cd backend

# 本番用DATABASE_URLを一時的に設定
export DATABASE_URL="postgresql://..." # 先ほど取得した接続文字列

# マイグレーション実行
npx prisma migrate deploy

# 成功メッセージを確認
# ✔ 15 migrations applied successfully
```

### Step 3: 管理者アカウントの作成

```bash
# 管理者アカウント作成スクリプトを実行
npx ts-node src/scripts/createAdmin.ts

# 成功メッセージを確認
# ✅ 管理者アカウントを作成しました！
# 📧 メールアドレス: admin@ec-platform.local
# 🔑 パスワード: TestAdmin2025!
```

**⚠️ 重要**: 本番環境では必ずパスワードを変更してください。

### Step 4: テストデータ投入（任意）

```bash
# テストデータ（商品、注文など）を投入する場合
npx ts-node src/scripts/seedTestData.ts

# ⚠️ 本番環境では実行しないことを推奨
```

---

## バックエンドデプロイ（Google Cloud Run）

### Step 1: Google Cloud プロジェクトの作成

1. **Google Cloud Console にアクセス**
   - https://console.cloud.google.com

2. **新規プロジェクトを作成**
   - プロジェクト名: `ec-platform-backend`
   - プロジェクトIDをメモ（例: `ec-platform-backend-123456`）

3. **APIを有効化**
   - Cloud Run API
   - Cloud Build API
   - Artifact Registry API

### Step 2: gcloud CLIの認証

```bash
# Google アカウントでログイン
gcloud auth login

# プロジェクトを設定
gcloud config set project ec-platform-backend-123456

# 現在の設定を確認
gcloud config list
```

### Step 3: Dockerイメージのビルド

```bash
cd backend

# Dockerイメージをビルド
docker build -t gcr.io/ec-platform-backend-123456/backend:latest .

# ビルド成功を確認
docker images | grep backend
```

### Step 4: イメージをGoogle Container Registryにプッシュ

```bash
# Docker認証設定
gcloud auth configure-docker

# イメージをプッシュ
docker push gcr.io/ec-platform-backend-123456/backend:latest
```

### Step 5: Cloud Runへのデプロイ

```bash
# Cloud Runにデプロイ
gcloud run deploy ec-platform-backend \
  --image gcr.io/ec-platform-backend-123456/backend:latest \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --port 8432 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "DATABASE_URL=postgresql://..." \
  --set-env-vars "SESSION_SECRET=$(openssl rand -base64 32)" \
  --set-env-vars "CORS_ORIGIN=https://your-app.vercel.app"

# デプロイ完了後、URLが表示される
# Service URL: https://ec-platform-backend-xxxxxxxxx-an.a.run.app
```

**⚠️ 重要**: 上記の環境変数を実際の値に置き換えてください。

### Step 6: 環境変数の設定（詳細版）

Cloud Runコンソールで環境変数を設定する場合：

1. Cloud Run サービス一覧から `ec-platform-backend` を選択
2. `編集とデプロイ` をクリック
3. `変数とシークレット` タブを選択
4. 以下の環境変数を追加：

```bash
NODE_ENV=production
DATABASE_URL=postgresql://... # Neonの接続文字列
SESSION_SECRET=... # openssl rand -base64 32 で生成
CORS_ORIGIN=https://your-app.vercel.app # Vercelデプロイ後に更新
PORT=8432

# オプション（使用する機能に応じて）
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
STRIPE_SECRET_KEY=sk_live_... # 本番モード
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
```

### Step 7: バックエンドの動作確認

```bash
# ヘルスチェック
curl https://ec-platform-backend-xxxxxxxxx-an.a.run.app/api/health

# 期待される応答: {"status":"ok","timestamp":"..."}
```

---

## フロントエンドデプロイ（Vercel）

### Step 1: Vercelにログイン

```bash
cd frontend

# Vercelにログイン
vercel login

# ブラウザが開くので、GitHubまたはGoogleアカウントで認証
```

### Step 2: プロジェクトの初期設定

```bash
# Vercel プロジェクトを初期化
vercel

# 質問に回答:
# ? Set up and deploy "frontend"? [Y/n] Y
# ? Which scope? [あなたのアカウント]
# ? Link to existing project? [N]
# ? What's your project's name? ec-platform-frontend
# ? In which directory is your code located? ./
```

### Step 3: 環境変数の設定

Vercelダッシュボードで環境変数を設定：

1. https://vercel.com/dashboard にアクセス
2. `ec-platform-frontend` プロジェクトを選択
3. `Settings` → `Environment Variables` をクリック
4. 以下の環境変数を追加：

```bash
# 本番環境（Production）
VITE_API_URL=https://ec-platform-backend-xxxxxxxxx-an.a.run.app
VITE_STRIPE_PUBLIC_KEY=pk_live_... # 本番モード

# プレビュー環境（Preview）- 同じ値でOK
VITE_API_URL=https://ec-platform-backend-xxxxxxxxx-an.a.run.app
VITE_STRIPE_PUBLIC_KEY=pk_test_... # テストモード

# 開発環境（Development）
VITE_API_URL=http://localhost:8432
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

### Step 4: 本番デプロイ

```bash
# 本番環境にデプロイ
vercel --prod

# デプロイ完了後、URLが表示される
# ✅ Production: https://ec-platform-frontend.vercel.app
```

### Step 5: カスタムドメインの設定（オプション）

1. Vercelダッシュボードで `Domains` をクリック
2. `Add Domain` をクリック
3. ドメイン名を入力（例: `ec-platform.com`）
4. DNS設定の指示に従う

---

## CORSの更新（重要）

フロントエンドのデプロイが完了したら、バックエンドのCORS設定を更新してください。

### Cloud RunでCORS_ORIGINを更新

```bash
# Vercelの本番URLを使用
gcloud run services update ec-platform-backend \
  --region asia-northeast1 \
  --set-env-vars "CORS_ORIGIN=https://ec-platform-frontend.vercel.app"

# または、Cloud Runコンソールで環境変数を更新
```

---

## 動作確認

### 1. バックエンドAPI確認

```bash
# ヘルスチェック
curl https://ec-platform-backend-xxxxxxxxx-an.a.run.app/api/health

# 商品一覧取得（認証不要エンドポイント）
curl https://ec-platform-backend-xxxxxxxxx-an.a.run.app/api/products
```

### 2. フロントエンド確認

ブラウザで以下をテスト：

1. **トップページ**: https://ec-platform-frontend.vercel.app
   - [ ] ページが正常に表示される
   - [ ] ヒーローセクションが表示される
   - [ ] カテゴリーが表示される

2. **管理画面ログイン**: https://ec-platform-frontend.vercel.app/admin/login
   - [ ] ログインフォームが表示される
   - [ ] `admin@ec-platform.local` / `TestAdmin2025!` でログイン可能
   - [ ] ダッシュボードにリダイレクトされる

3. **商品一覧**: https://ec-platform-frontend.vercel.app/admin/products
   - [ ] 商品一覧が表示される
   - [ ] DataGridが正常に動作する

### 3. E2Eテスト実行（ローカルから本番環境に対して）

```bash
cd frontend

# 本番環境のURLを設定
export VITE_API_URL=https://ec-platform-backend-xxxxxxxxx-an.a.run.app

# E2Eテストを実行
npm run test:e2e

# Pass率を確認
# 目標: 97%以上
```

---

## トラブルシューティング

### 問題1: バックエンドが起動しない

**症状**: Cloud Runのサービスがエラーで起動しない

**原因**: 環境変数の設定ミス、DATABASE_URLが無効

**解決策**:
1. Cloud Runのログを確認
   ```bash
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ec-platform-backend" --limit 50 --format json
   ```

2. 環境変数を再確認
   ```bash
   gcloud run services describe ec-platform-backend --region asia-northeast1 --format="value(spec.template.spec.containers[0].env)"
   ```

3. DATABASE_URLをテスト
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

### 問題2: CORSエラー

**症状**: フロントエンドからAPIリクエストが `CORS policy` エラーで失敗する

**原因**: バックエンドのCORS_ORIGINが正しく設定されていない

**解決策**:
1. バックエンドのCORS設定を確認
   ```bash
   curl -I https://ec-platform-backend-xxxxxxxxx-an.a.run.app/api/health
   # Access-Control-Allow-Origin ヘッダーを確認
   ```

2. CORS_ORIGINを更新
   ```bash
   gcloud run services update ec-platform-backend \
     --region asia-northeast1 \
     --set-env-vars "CORS_ORIGIN=https://ec-platform-frontend.vercel.app"
   ```

### 問題3: データベース接続エラー

**症状**: `Can't reach database server` エラー

**原因**: DATABASE_URLが無効、またはNeonプロジェクトが停止している

**解決策**:
1. Neonコンソールでプロジェクトが稼働しているか確認
2. 接続文字列を再確認（Pooled connectionを使用）
3. IPアドレス制限がある場合は、Cloud RunのIPを許可

### 問題4: Vercelビルドエラー

**症状**: Vercelでのビルドが失敗する

**原因**: 環境変数が不足、または依存関係の問題

**解決策**:
1. Vercelのビルドログを確認
2. 必要な環境変数がすべて設定されているか確認
3. `package.json` の dependencies を確認
4. ローカルでビルドテスト
   ```bash
   npm run build
   ```

### 問題5: セッションが維持されない

**症状**: ログイン後すぐにログアウトされる

**原因**: SESSION_SECRETが設定されていない、またはCookieのSecure設定

**解決策**:
1. SESSION_SECRETを確認
   ```bash
   openssl rand -base64 32
   # 生成された値をCloud Runの環境変数に設定
   ```

2. CookieのSecure設定を確認（backend/src/index.ts）
   ```typescript
   secure: config.nodeEnv === 'production', // HTTPSでのみ有効
   ```

---

## 費用見積もり

### 無料枠内での運用（想定アクセス: 月1000ユーザー）

| サービス | 無料枠 | 想定使用量 | 超過時の費用 |
|---------|--------|-----------|------------|
| **Neon** | 0.5GB, 190h CPU | 0.2GB, 50h | $19/月 (超過分) |
| **Cloud Run** | 200万リクエスト | 10万リクエスト | $0 |
| **Vercel** | 100GB帯域 | 10GB | $20/月 (超過分) |
| **Cloudflare R2** | 10GB | 1GB | $0 |
| **合計** | - | - | **$0-39/月** |

### 本番運用時の推奨設定

1. **モニタリング**
   - Google Cloud Monitoring（無料）
   - Vercel Analytics（$10/月）

2. **バックアップ**
   - Neon自動バックアップ（無料プランに含まれる）
   - 週次の手動エクスポート推奨

3. **スケーリング**
   - Cloud Run: 最小0、最大10インスタンス
   - 想定: 1000同時ユーザーまで対応可能

---

## セキュリティチェックリスト

デプロイ前に以下を確認してください：

- [ ] SESSION_SECRETは本番用に新規生成済み
- [ ] DATABASE_URLは本番用（開発環境と別）
- [ ] Stripe APIキーは本番モード（sk_live_）
- [ ] CORS_ORIGINは本番URLのみ許可
- [ ] .env.localはGitにコミットされていない
- [ ] 管理者アカウントのパスワードを変更済み
- [ ] OpenAI APIキーに使用量制限を設定済み
- [ ] エラーログにAPIキーが含まれていない
- [ ] HTTPSが有効（Vercel、Cloud Runは自動）

---

## 次のステップ

デプロイ完了後：

1. **ドメイン設定**: カスタムドメインを設定
2. **モニタリング**: Google Cloud MonitoringとVercel Analyticsを有効化
3. **バックアップ**: 定期的なデータベースバックアップを設定
4. **パフォーマンス**: Lighthouse スコアを確認・改善
5. **SEO対策**: メタタグ、sitemap.xmlの設定

---

## サポート

問題が発生した場合：

1. **ログを確認**
   - Cloud Run: `gcloud logging read`
   - Vercel: ダッシュボードの `Logs` タブ
   - Neon: コンソールの `Monitoring` タブ

2. **ドキュメント参照**
   - `PRODUCTION-READINESS-CHECKLIST.md`
   - `SECURITY-FINAL-CHECK.md`
   - `DATABASE-MIGRATION-GUIDE.md`

3. **公式ドキュメント**
   - Google Cloud Run: https://cloud.google.com/run/docs
   - Vercel: https://vercel.com/docs
   - Neon: https://neon.tech/docs

---

**作成者**: Claude Code
**最終更新**: 2026-05-26

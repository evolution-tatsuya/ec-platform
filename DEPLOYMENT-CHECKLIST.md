# 本番デプロイ チェックリスト

**作成日**: 2026-05-26
**最終確認**: 2026-08-19（実測で現在地を反映）
**使い方**: デプロイ前・デプロイ中・デプロイ後の各段階でチェック

---

## 📍 現在地サマリー（2026-08-19 実測）

デプロイの「準備」はほぼ完了。残るは **実際のデプロイ実行**（Cloud Run / Vercelへのアップロード）。

| 項目 | 状態 |
|------|------|
| コード（品質固め・デザイン統一・機能修正） | ✅ mainにマージ済み・ビルド通過 |
| 外部アカウント（Neon/R2/Vercel/Cloud Run/Resend/Stripe） | ✅ すべて作成済み |
| 環境変数（`backend/env.yaml`） | ✅ 18項目設定済み（R2/Resend/Stripe/Neon/SESSION等） |
| CLIツール（gcloud/vercel/docker/psql） | ✅ すべてインストール済み |
| **開発/本番DB分離** | ✅ 別ホスト（開発=ep-soft-water / 本番=ep-fragrant-sunset）で分離確認済み |
| **決済方針** | 運営初期は**銀行振込のみ**（カード決済=Stripe実装は運営後） |
| **AI方針** | 運営初期は**AIオフ**（OPENAI/GEMINIキーを空に。課金リスク回避） |
| **未確定（デプロイ後に確定）** | FRONTEND_URL / BACKEND_URL（デプロイURL） |
| **本番DBマイグレーション** | ✅ 済み（24テーブル適用済み、商品/注文0件のクリーン状態） |
| **本番管理者アカウント** | ✅ 作成済み（admin@ec-platform.local）※運営前に実メール＋新パスワードへ変更推奨 |
| **実際のデプロイ実行** | ❌ 未実行 ← 次はここ |

> ⚠️ `backend/env.yaml` は全シークレット平文。Git履歴には無く `.gitignore` で保護済み。**絶対にコミットしないこと。**

---

## ✅ デプロイ前の確認（Pre-Deployment）

### コードの準備

- [x] すべての変更がGitにコミット済み（品質固め22コミット + AI任意化）
- [ ] `git status` で未コミットファイルがない（※旧セッション由来の未コミット変更が一部残存）
- [x] mainブランチに最新コードをマージ済み（`c0e479a`）
- [x] ローカルビルド通過（frontend build成功 / backend tsc 0エラー）

### ドキュメントの確認

- [ ] `DEPLOYMENT-GUIDE.md` を通読した
- [ ] `.env.production.template` をコピーして `.env.production` を作成した
- [ ] `PRODUCTION-READINESS-CHECKLIST.md` を確認した
- [ ] `SECURITY-FINAL-CHECK.md` を確認した

### アカウント・認証情報の準備

- [x] Neonアカウントが作成済み（本番DB準備済み）
- [x] Google Cloud Platformアカウントが作成済み
- [x] Vercelアカウントが作成済み
- [x] Cloudflare R2アカウント（バケット `ec-platform-db` + APIトークン作成済み）
- [x] Stripeアカウント（テストキー設定済み。本番モードは運営後）
- [x] Resendアカウント（APIキー設定済み）
- [ ] OpenAI APIキー（運営初期はAIオフのため不要）

### CLIツールのインストール

- [x] `gcloud` CLIがインストール済み
- [x] `vercel` CLIがインストール済み
- [x] `docker` がインストール済み
- [x] `psql`（PostgreSQLクライアント）がインストール済み

---

## ✅ データベース準備（Neon）

### プロジェクト作成

- [ ] Neonで本番用プロジェクトを作成
  - プロジェクト名: `ec-platform-production`
  - リージョン: `Asia / Singapore`
  - PostgreSQL version: 15以上

- [ ] Pooled connectionの接続文字列を取得
  - 形式: `postgresql://user:password@host/database?sslmode=require`

- [ ] 接続文字列を安全に保存
  - `/tmp/production-db-url.txt` にコピー（一時）
  - パスワードマネージャーに保存（永続）

### マイグレーション実行

- [ ] `DATABASE_URL`環境変数を本番用に設定
  ```bash
  export DATABASE_URL="postgresql://..."
  ```

- [ ] マイグレーション実行
  ```bash
  cd backend
  npx prisma migrate deploy
  ```

- [ ] マイグレーション成功を確認
  - 表示: `✔ 15 migrations applied successfully`

- [ ] データベース接続テスト
  ```bash
  psql $DATABASE_URL -c "SELECT 1"
  ```

### 初期データ投入

- [ ] 管理者アカウント作成
  ```bash
  npx ts-node src/scripts/createAdmin.ts
  ```

- [ ] 管理者アカウント情報を安全に保存
  - メール: `admin@ec-platform.local`
  - パスワード: `TestAdmin2025!`（後で変更する）

- [ ] テストデータ投入（任意）
  ```bash
  npx ts-node src/scripts/seedTestData.ts
  ```

---

## ✅ バックエンドデプロイ（Google Cloud Run）

### Google Cloud準備

- [ ] Google Cloud Consoleで新規プロジェクトを作成
  - プロジェクト名: `ec-platform-backend`
  - プロジェクトIDをメモ

- [ ] 必要なAPIを有効化
  - [ ] Cloud Run API
  - [ ] Cloud Build API
  - [ ] Artifact Registry API

- [ ] gcloud CLIで認証
  ```bash
  gcloud auth login
  gcloud config set project ec-platform-backend-123456
  ```

### Dockerイメージ作成

- [ ] Dockerイメージをビルド
  ```bash
  cd backend
  docker build -t gcr.io/PROJECT_ID/backend:latest .
  ```

- [ ] ビルド成功を確認
  ```bash
  docker images | grep backend
  ```

- [ ] ローカルでイメージをテスト（任意）
  ```bash
  docker run -p 8432:8432 --env-file .env.production gcr.io/PROJECT_ID/backend:latest
  ```

### Cloud Runへのデプロイ

- [ ] Docker認証設定
  ```bash
  gcloud auth configure-docker
  ```

- [ ] イメージをプッシュ
  ```bash
  docker push gcr.io/PROJECT_ID/backend:latest
  ```

- [ ] Cloud Runにデプロイ
  ```bash
  gcloud run deploy ec-platform-backend \
    --image gcr.io/PROJECT_ID/backend:latest \
    --platform managed \
    --region asia-northeast1 \
    --allow-unauthenticated \
    --port 8432 \
    --memory 512Mi \
    --cpu 1 \
    --set-env-vars "NODE_ENV=production" \
    --set-env-vars "DATABASE_URL=..." \
    --set-env-vars "SESSION_SECRET=..." \
    --set-env-vars "CORS_ORIGIN=https://your-app.vercel.app"
  ```

- [ ] デプロイ成功を確認
  - Service URLをメモ（例: `https://ec-platform-backend-xxx-an.a.run.app`）

### 環境変数の設定

- [ ] Cloud Runコンソールで環境変数を確認
  - [ ] `NODE_ENV=production`
  - [ ] `DATABASE_URL=postgresql://...`
  - [ ] `SESSION_SECRET=...` (32バイト以上)
  - [ ] `CORS_ORIGIN=https://...`
  - [ ] `PORT=8432`

- [ ] オプション環境変数（使用する場合）
  - [ ] `R2_ACCOUNT_ID`
  - [ ] `R2_ACCESS_KEY_ID`
  - [ ] `R2_SECRET_ACCESS_KEY`
  - [ ] `R2_BUCKET_NAME`
  - [ ] `STRIPE_SECRET_KEY` (sk_live_)
  - [ ] `RESEND_API_KEY`
  - [ ] `RESEND_FROM_EMAIL`
  - [ ] `OPENAI_API_KEY`
  - [ ] `GEMINI_API_KEY`

### 動作確認

- [ ] ヘルスチェックAPI
  ```bash
  curl https://SERVICE_URL/api/health
  ```
  - 期待: `{"status":"ok","timestamp":"..."}`

- [ ] 商品一覧API（認証不要）
  ```bash
  curl https://SERVICE_URL/api/products
  ```
  - 期待: JSON配列（空でも可）

- [ ] CORSヘッダー確認
  ```bash
  curl -I https://SERVICE_URL/api/health
  ```
  - 期待: `Access-Control-Allow-Origin` ヘッダーあり

---

## ✅ フロントエンドデプロイ（Vercel）

### Vercel準備

- [ ] Vercel CLIでログイン
  ```bash
  cd frontend
  vercel login
  ```

- [ ] ブラウザで認証完了

### プロジェクト初期化

- [ ] Vercelプロジェクトを初期化
  ```bash
  vercel
  ```

- [ ] 設定を確認
  - プロジェクト名: `ec-platform-frontend`
  - ビルドコマンド: `npm run build`
  - 出力ディレクトリ: `dist`

### 環境変数の設定

- [ ] Vercelダッシュボードで環境変数を設定
  - https://vercel.com/dashboard → プロジェクト → Settings → Environment Variables

- [ ] Production環境の環境変数
  - [ ] `VITE_API_URL=https://SERVICE_URL`
  - [ ] `VITE_STRIPE_PUBLIC_KEY=pk_live_...` （使用する場合）

- [ ] Preview環境の環境変数（同じ値でOK）
  - [ ] `VITE_API_URL=https://SERVICE_URL`
  - [ ] `VITE_STRIPE_PUBLIC_KEY=pk_test_...`

### 本番デプロイ

- [ ] 本番環境にデプロイ
  ```bash
  vercel --prod
  ```

- [ ] デプロイ成功を確認
  - Production URLをメモ（例: `https://ec-platform-frontend.vercel.app`）

### カスタムドメイン（任意）

- [ ] Vercelダッシュボードでドメインを追加
- [ ] DNS設定を完了
- [ ] SSL証明書が自動発行されることを確認

---

## ✅ CORS設定の更新

### バックエンドのCORS更新

- [ ] Vercelの本番URLを使用してCORS_ORIGINを更新
  ```bash
  gcloud run services update ec-platform-backend \
    --region asia-northeast1 \
    --set-env-vars "CORS_ORIGIN=https://ec-platform-frontend.vercel.app"
  ```

- [ ] 更新完了を確認
  ```bash
  gcloud run services describe ec-platform-backend --region asia-northeast1
  ```

---

## ✅ 動作確認（Post-Deployment）

### バックエンドAPI確認

- [ ] ヘルスチェック
  ```bash
  curl https://SERVICE_URL/api/health
  ```

- [ ] 商品一覧API
  ```bash
  curl https://SERVICE_URL/api/products
  ```

- [ ] 管理者ログインAPI（Postmanまたはcurl）
  ```bash
  curl -X POST https://SERVICE_URL/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@ec-platform.local","password":"TestAdmin2025!"}'
  ```

### フロントエンド確認

- [ ] トップページが表示される
  - URL: https://ec-platform-frontend.vercel.app

- [ ] ヒーローセクションが正常に表示される

- [ ] カテゴリーが表示される

- [ ] 商品一覧が表示される（データがある場合）

### 管理画面確認

- [ ] ログインページにアクセス
  - URL: https://ec-platform-frontend.vercel.app/admin/login

- [ ] 管理者アカウントでログイン
  - メール: `admin@ec-platform.local`
  - パスワード: `TestAdmin2025!`

- [ ] ダッシュボードが表示される

- [ ] 商品管理ページが表示される
  - URL: /admin/products

- [ ] DataGridが正常に動作する

### 認証・セッション確認

- [ ] ログイン後にセッションが維持される

- [ ] ページをリロードしてもログイン状態が保持される

- [ ] ログアウトが正常に動作する

### エラーハンドリング確認

- [ ] 存在しないページにアクセスすると404ページが表示される

- [ ] APIエラー時に適切なエラーメッセージが表示される

### パフォーマンス確認

- [ ] Lighthouseスコアを確認
  - Performance: 90以上
  - Accessibility: 90以上
  - Best Practices: 90以上
  - SEO: 80以上

---

## ✅ セキュリティ最終確認

### 認証情報の変更

- [ ] 管理者アカウントのパスワードを変更
  - 初期パスワード: `TestAdmin2025!`
  - 新しいパスワード: 強力なパスワードに変更

- [ ] SESSION_SECRETが本番用に生成済み
  ```bash
  openssl rand -base64 32
  ```

- [ ] データベースURLが本番用（開発環境と別）

### API キーの確認

- [ ] Stripe APIキーが本番モード（`sk_live_`、`pk_live_`）

- [ ] OpenAI APIキーに使用量制限が設定済み
  - https://platform.openai.com/account/billing/limits

- [ ] Resendが本番ドメインで設定済み

### セキュリティヘッダー確認

- [ ] HTTPSが有効（Vercel、Cloud Runは自動）

- [ ] Helmet.jsが有効（バックエンド）
  ```bash
  curl -I https://SERVICE_URL/api/health | grep -i "x-frame-options"
  ```

- [ ] CORS設定が本番URLのみ許可

### エラーログの確認

- [ ] エラーログにAPIキーが含まれていない

- [ ] エラーログにパスワードが含まれていない

- [ ] Stack traceが本番環境で表示されない

---

## ✅ モニタリング・バックアップ

### モニタリング設定

- [ ] Google Cloud Monitoringが有効
  - https://console.cloud.google.com/monitoring

- [ ] Vercel Analyticsが有効（任意、$10/月）
  - https://vercel.com/docs/analytics

- [ ] エラーアラートが設定済み（任意）

### バックアップ設定

- [ ] Neon自動バックアップが有効
  - Neonコンソールで確認

- [ ] 週次の手動バックアップスケジュールを設定（推奨）
  ```bash
  pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
  ```

---

## ✅ ドキュメント更新

### README更新

- [ ] README.mdに本番環境URLを追加

- [ ] デプロイ日時を記録

### 運用ドキュメント

- [ ] 本番環境の接続情報をドキュメント化（安全な場所に保管）

- [ ] 障害対応手順書を作成（任意）

### チーム共有

- [ ] デプロイ完了をチームに通知

- [ ] 本番環境のアクセス権限を設定

---

## 📊 デプロイ完了レポート

デプロイ完了後、以下の情報を記録してください：

```
デプロイ日時: YYYY-MM-DD HH:MM
デプロイ担当者: [名前]

本番環境URL:
- フロントエンド: https://ec-platform-frontend.vercel.app
- バックエンド: https://ec-platform-backend-xxx-an.a.run.app

データベース:
- Neonプロジェクト: ec-platform-production
- リージョン: ap-southeast-1
- PostgreSQL version: 15

動作確認結果:
- ✅ ヘルスチェックAPI: 正常
- ✅ フロントエンド表示: 正常
- ✅ 管理画面ログイン: 正常
- ✅ セッション維持: 正常
- ✅ CORS: 正常

Lighthouseスコア:
- Performance: XX
- Accessibility: XX
- Best Practices: XX
- SEO: XX

次のアクション:
- [ ] カスタムドメイン設定
- [ ] モニタリング強化
- [ ] パフォーマンス最適化
```

---

## 🎉 完了！

すべてのチェックが完了したら、本番環境デプロイ成功です！

次のステップ:
1. ユーザーに本番環境URLを共有
2. フィードバックを収集
3. 継続的な改善

---

**作成者**: Claude Code
**最終更新**: 2026-05-26

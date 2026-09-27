# ===== Dockerfile for Google Cloud Run =====
# 作成日: 2026-05-26
# 目的: バックエンドの本番環境デプロイ用Dockerイメージ

# Node.js 20 (Debian-based, required for Prisma OpenSSL compatibility)
FROM node:20

# 作業ディレクトリ設定
WORKDIR /app

# package.json と package-lock.json をコピー
COPY package*.json ./

# 全依存関係をインストール（ビルドに必要）
RUN npm ci

# ソースコード、Prismaスキーマ、tsconfig.jsonをコピー
COPY . .

# TypeScriptをビルド
RUN npm run build

# Prismaクライアント生成
RUN npx prisma generate

# 開発依存関係を削除してイメージサイズを削減
RUN npm prune --production

# ポート公開（Cloud Runが環境変数PORTを自動設定）
EXPOSE 8080

# ヘルスチェックはCloud Runが自動的に実行するため、Dockerfileでは不要
# CMD node -e "require('http').get('http://localhost:${process.env.PORT || 8080}/api/health', ...)"

# アプリケーション起動
CMD ["npm", "start"]

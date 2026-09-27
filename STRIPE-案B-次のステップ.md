# Stripe自動継続課金（案B）— 現状と次のステップ

最終更新: 2026-09-25（PC再起動前の区切り）

## ✅ 完了していること（本番稼働・全検証済み・全コミット済み）

案B（サブスクのカード自動継続課金）は **実装完了・本番TESTで全検証済み** です。

- **本番リビジョン**: EC Cloud Run **rev00058** / Vercel（固定エイリアス反映済み） / 本番DBクリーン
- **Stripe**: TESTモード。Webhook登録済み（endpoint「engaging-victory」、4イベント）。署名シークレットはdeploy-env.yaml + password-managerに保管済み
- **コミット**（すべてmainにコミット済み・未pushでOK）:
  - `a0470bb` Phase1: Stripe基盤+DBフィールド
  - `9cd9af1` Phase2-3: Price自動作成+カードCheckout+Webhook
  - `39098af` ゴミ注文防止（決済成功時に注文を作る設計）
  - `03e89fa` カード再購入のデータ引き継ぎ(reactivate)

**検証済みケース（本番TEST・全て✅）**:
1. カード決済→provision（テナント発行）
2. 解約→在庫suspend
3. 課金失敗→ゴミ注文が生まれない
4. 銀行振込（案A）との共存
5. カード再購入→データ引き継ぎ(reactivate)

## 🔜 残っている唯一の作業：LIVE化（あなたのStripe操作が必要）

実際のお金を動かす（本番販売開始）には、以下が必要:

1. **Stripe本番モードを有効化** → LIVEキー取得（sk_live_ / pk_live_）
2. LIVEキーを Claude に渡す → `backend/deploy-env.yaml` の STRIPE_PUBLIC_KEY / STRIPE_SECRET_KEY を差し替え → 再デプロイ
3. **LIVEモードでWebhookを登録**（TESTと同じ手順・同じURL・同じ4イベント）→ 新しい署名シークレット(whsec_)を取得 → deploy-env.yaml の STRIPE_WEBHOOK_SECRET を差し替え
4. LIVEでは Price を作り直す必要あり（TEST/LIVEでprice_idが別）→ **初回購入時に自動作成される仕組みなので手作業不要**

※LIVE化は「販売開始準備が整ったタイミング」でOK。急がない。

## 補足・将来スコープ（急がない）

- **物販カードのStripe化**: 現状はサブスクのカードのみStripe実装。物販カードは今も「即paidダミー」のまま
- **口座振替**: 後から決済手段を1つ足すだけで対応できる設計（Stripe側の有効化申請が別途必要）
- **在庫側への共有**: カード経由でもテナント発行・引き継ぎが動く（連携APIは同じなので在庫側の変更は不要。認識共有だけ）

## 再開時のログイン情報（ローカル/本番共通のテスト用）

- 会員: designtest@example.com / DesignTest2025!
- 管理者: admin@ec-platform.local / TestAdmin2025!
- 本番フロント: https://frontend-tatsuyas-projects-20cab125.vercel.app
- 本番backend: https://ec-platform-backend-production-16645406962.asia-northeast1.run.app
- Stripeテストカード: 成功=4242 4242 4242 4242 / 失敗=4000 0000 0000 0341（有効期限は未来・CVC任意）

## デプロイコマンド（メモ）

- backend: `cd backend && gcloud run deploy ec-platform-backend-production --source . --region=asia-northeast1 --env-vars-file deploy-env.yaml --allow-unauthenticated --quiet`
- frontend: `cd frontend && npx vercel --prod --yes` → 出たURLを固定エイリアスに: `npx vercel alias set <新URL> frontend-tatsuyas-projects-20cab125.vercel.app`

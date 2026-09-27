# EC メール送信 Gmail SMTP 統一 — 完全版実装仕様書

対象リポジトリ: `ショッピングページ〜決済ページ`（Cloud Run: `ec-platform-backend-production` / Vercel: `frontend`）
作成: 2026-09-26 / 在庫管理システムでの Gmail SMTP 本番実績（commit 0f3c85b, Cloud Run rev00055）を踏まえた移植仕様。

---

## 0. この仕様書のゴール（2つある。混同しないこと）

1. **メール送信の下回りを Resend → Gmail SMTP に統一**（送信元を在庫管理と同じ専用アカウントに）
2. **パスワード再発行を「ユーザーが実際に使える」状態にする**（← 現状フロントが切れているので、これが本命）

> ⚠️ 重要: 1だけやっても 2 は達成できない。EC のフロントは申請フォームが `setTimeout` ダミーで、
> リセット画面（`/auth/reset-password`）自体が存在しない。両方やって初めて完成。

---

## 1. 現状の事実（実コード確認済み。ここを誤解すると壊す）

### 1-1. バックエンドのメール送信
- 集約モジュール: `backend/src/utils/emailService.ts`
  - 冒頭で `const resend = new Resend(process.env.RESEND_API_KEY)`、`FROM_EMAIL = process.env.RESEND_FROM_EMAIL`
  - export 関数（すべて `Promise<void>` を返す。**戻り値の型は維持すること**）:
    - `sendShippingNotificationEmail` / `sendOrderConfirmationEmail` / `sendPasswordResetEmail`
    - `sendInquiryReplyEmail` / `sendCancellationNotificationEmail` / `sendGenericEmail`
    - `renderTemplate(template, vars)` … `{{var}}` 置換ヘルパー（**メール送信しない。純粋関数。触るな**）
  - 各関数の中で `await resend.emails.send({ from, to, subject, html })` を呼んでいる（6箇所）

### 1-2. ⚠️ 送信箇所は「集約」されていない — 計7箇所すべて差し替える
> 【重要訂正】当初「全関数が sendGenericEmail に集約されているので1箇所直せば全部Gmail化される」と
> 書いたが、**これは実コードと食い違う誤りだった**。実際は emailService.ts の各関数が
> **それぞれ独立して `resend.emails.send()` を直接呼んでいる**。1箇所だけ直すと残り5種の
> メールが Resend のまま/壊れて静かに配信停止する。

`resend.emails.send()` の実在箇所（`backend/src/utils/emailService.ts`、全6箇所）:
| 関数 | 行 |
|---|---|
| `sendShippingNotificationEmail` | 34 |
| `sendOrderConfirmationEmail` | 110 |
| `sendPasswordResetEmail` | 185 |
| `sendInquiryReplyEmail` | 255 |
| `sendCancellationNotificationEmail` | 328 |
| `sendGenericEmail` | 396 |

これに `authController.ts` のインライン1箇所（1-3参照）を足して **合計7箇所**。すべて差し替える。
`renderTemplate`（383行）は純粋関数で送信しないので**触らない**。

**orderController 内のローカル送信関数（金額直結・触るな）:**
`backend/src/controllers/orderController.ts` に emailService とは別にローカル定義:
- `sendPaymentReceivedEmail(order)` → `Promise<void>`。内部で **`sendGenericEmail()` を呼ぶ**
- `sendLicenseDeliveryEmail(data)` → **`Promise<boolean>`**。内部で `sendGenericEmail()` を呼び `return true`

呼び出し側（同ファイル 1026行付近）:
```ts
const delivered = await sendLicenseDeliveryEmail({ ... });
if (delivered) {
  await prisma.subscription.update({ data: { licenseKeyDelivered: true } });  // ライセンス配送済み証跡
}
```
> この2つは `sendGenericEmail()` 経由なので、**`sendGenericEmail`（396行）を STEP2 の原則どおり
> 「外側I/F不変・中身だけ差し替え」で直せば、boolean 判定ロジックは無傷で保たれる。**
> `sendLicenseDeliveryEmail` / `sendPaymentReceivedEmail` 自体は絶対に触らない。
> （＝ これらは「7箇所」には含まれない。sendGenericEmail の差し替えでカバーされる）

### 1-3. パスワード再発行 API（バックエンドは実装済み・動く）
- ルート（`backend/src/routes/authRoutes.ts`）:
  - `POST /api/auth/password-reset/request`（`authRateLimiter` 付き）→ body `{ email }`
  - `POST /api/auth/password-reset/confirm` → body `{ token, newPassword }`
- コントローラ（`backend/src/controllers/authController.ts`）:
  - `requestPasswordReset`（242行〜）: 現状 **emailService を使わず Resend をインライン直書き**。
    リンク生成 `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`、有効期限1時間。
  - `confirmPasswordReset`（325行〜）: token検証→`bcrypt.hash`→保存→`isUsed`更新。
- DBモデル: `PasswordResetToken`（schema.prisma、`token @unique`/`expiresAt`/`isUsed`/`userId`）。既存。db push不要。

### 1-4. フロント（← 断線箇所。ここが本命の作業）
- `frontend/src/pages/AuthPage.tsx`
  - 申請フォームUIは既にある（`showResetForm`, `resetEmail`(email入力), `resetSuccess`）
  - **但し `handleResetPassword`（137行〜）が `await new Promise(r => setTimeout(r,1000))` のダミー。APIを呼んでいない**
- リセット画面 `/auth/reset-password`（メールのリンク先）は **ファイルもルートも存在しない（要新規作成）**
- ルート定義: `frontend/src/App.tsx` の `<Routes>` 直下（public側、`/admin/*` の外）に追加する

### 1-5. デプロイ（方式を確定させた）
- **方式: `deploy-env.yaml`（平文yaml）**。`backend/deploy-env.yaml` が実在。
  現在キー: NODE_ENV, CORS_ORIGIN, DATABASE_URL, SESSION_SECRET, R2_*, STRIPE_*, **RESEND_API_KEY, RESEND_FROM_EMAIL**, OPENAI_API_KEY, GEMINI_API_KEY, FRONTEND_URL, BACKEND_URL, INVENTORY_*, STRIPE_WEBHOOK_SECRET
- 再デプロイコマンド（`backend/` で実行）:
  ```
  gcloud run deploy ec-platform-backend-production --source . --region asia-northeast1 --env-vars-file deploy-env.yaml
  ```
- フロント再デプロイ: `frontend/` で `vercel --prod`
- ⚠️ deploy-env.yaml は**平文**。git管理されているか要確認。GMAIL_APP_PASSWORD は秘匿情報なので、
  yaml が git 追跡下なら **.gitignore 済みか必ず確認**してから書く。追跡下で公開リポなら Secret Manager 方式に切替を検討。

---

## 共有する認証情報（在庫管理と同じものを使い回す）
- `GMAIL_USER` = `zaiko.system.no.1@gmail.com`
- `GMAIL_APP_PASSWORD` = 16桁アプリパスワード（**値はユーザーから直接受領。この仕様書には書かない**）
- `MAIL_FROM_NAME` = EC用の表示名（例: ショップ名。未設定なら既定名にフォールバック）
- Gmail SMTP は1アドレスを複数システムで共用可。上限1日約500通で在庫管理と併用しても余裕。

---

## 2. 実装手順

### STEP 1. nodemailer 導入
```
cd backend
npm install nodemailer
npm install -D @types/nodemailer
```

### STEP 2. emailService.ts の下回りを Gmail 化（各関数の外側I/Fは不変）

`backend/src/utils/emailService.ts` 冒頭の Resend 初期化を、共通 transporter + `sendMail()` に置換:

```ts
import nodemailer from 'nodemailer';

const gmailUser = process.env.GMAIL_USER;
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, ''); // 表示上のスペース除去
const fromName = process.env.MAIL_FROM_NAME || 'ショップ'; // ←EC用の既定名に変更

const transporter =
  gmailUser && gmailAppPassword
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailAppPassword },
      })
    : null;

// 低レベル送信。未設定なら送信スキップ（安全フォールバック）。
async function sendMail(opts: { to: string; subject: string; html: string }): Promise<void> {
  if (!transporter) {
    console.warn('[mailer] GMAIL_USER / GMAIL_APP_PASSWORD 未設定のため送信スキップ:', {
      to: opts.to, subject: opts.subject,
    });
    return;
  }
  try {
    await transporter.sendMail({ from: `${fromName} <${gmailUser}>`, ...opts });
  } catch (error) {
    console.error('[mailer] メール送信エラー:', error);
    throw new Error('メールの送信に失敗しました');
  }
}
```

次に、**emailService.ts 内の6箇所すべて**の `await resend.emails.send({ from: FROM_EMAIL, to, subject, html })` を
`await sendMail({ to, subject, html })` に機械的に置換する（行番号: 34 / 110 / 185 / 255 / 328 / 396）。
- **6箇所すべて。** 各関数が独立して resend を呼んでいるので、1つでも残すとその種のメールが壊れる。
- **`to` / `subject` / `html` の生成ロジック（テンプレート・HTML本文）は一切変えない。**
- `from` は `sendMail` 内で付与するので各所から削除。
- `import { Resend } from 'resend'` と `const resend` / `const FROM_EMAIL` を削除。
- 関数の戻り値型（`Promise<void>`）はそのまま。
> `renderTemplate`（383行）は純粋関数（送信しない）なので**変更しない**。
> `sendGenericEmail`（396行）は6箇所のうちの1つ。ここを外側I/F不変で直せば、これを経由する
> orderController のローカル関数（ライセンス送付の boolean 判定等）も自動的に正しく動く。
> **ただし「sendGenericEmailだけ直せば他5関数も直る」わけではない。他5関数は個別のresend呼び出しを持つので各自差し替える。**

### STEP 3. authController のインライン Resend を共通化
`backend/src/controllers/authController.ts` の `requestPasswordReset`（242行〜）内で
直書きしている Resend 送信を削除し、emailService の関数呼び出しに置換:
```ts
import { sendPasswordResetEmail } from '../utils/emailService';
// ...
const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;
await sendPasswordResetEmail({ to: user.email, name: user.name ?? '', resetUrl });
```
- トークン生成・保存・列挙防止（存在しなくても同一レスポンス）のロジックは**維持**。
- `import { Resend }` 等 authController 内の Resend 参照を削除。

### STEP 4. 【本命】フロント: 申請フォームの配線

`frontend/src/pages/AuthPage.tsx` の `handleResetPassword`（137行〜）のダミーを実API化。
まず API 関数を用意（既存の api クライアント層に追記。ファイルは他の fetch と同じ場所に合わせる）:
```ts
// services/api（既存のaxios/fetchラッパに合わせて）
export const requestPasswordReset = (email: string) =>
  api.post('/api/auth/password-reset/request', { email });
export const confirmPasswordReset = (token: string, newPassword: string) =>
  api.post('/api/auth/password-reset/confirm', { token, newPassword });
```
`handleResetPassword` を差し替え:
```ts
const handleResetPassword = async (e: React.FormEvent) => {
  e.preventDefault();
  setResetError('');
  setResetLoading(true);
  try {
    await requestPasswordReset(resetEmail);   // ← ダミーsetTimeoutを置換
    setResetSuccess(true);                     // 列挙防止のためAPIは常に成功を返す設計
    setResetEmail('');
  } catch (error) {
    setResetError(error instanceof Error ? error.message : 'リセットメール送信に失敗しました');
  } finally {
    setResetLoading(false);
  }
};
```

### STEP 5. 【本命】フロント: リセット画面を新規作成
新規 `frontend/src/pages/ResetPasswordPage.tsx`:
- URL クエリから `token` を取得（`useSearchParams` の `?token=`）
- 新パスワード + 確認用パスワードの入力（8文字以上のバリデーション。既存パスワードUIに合わせる）
- 送信で `confirmPasswordReset(token, newPassword)` を呼ぶ
- 成功→ログイン画面へ誘導。token 無し/期限切れ（API 400）→エラー表示
- 見た目は AuthPage のリセットフォーム（`showResetForm` ブロック, 160行〜）の Box/Paper/gradient を流用して統一

`frontend/src/App.tsx` の `<Routes>` 直下（public側、`/admin` の外。例: `/admin/login` と同階層）に追加:
```tsx
<Route path="/auth/reset-password" element={<ResetPasswordPage />} />
```

### STEP 6. 環境変数
- `backend/deploy-env.yaml`: `RESEND_API_KEY` / `RESEND_FROM_EMAIL` を削除し、以下を追加:
  ```yaml
  GMAIL_USER: zaiko.system.no.1@gmail.com
  GMAIL_APP_PASSWORD: <16桁アプリPWをスペース無しで>
  MAIL_FROM_NAME: <表示名>
  ```
- `backend/.env.local`（開発）にも同3件を追加、`RESEND_*` は削除。
- `.env.production.template` の `RESEND_*` も GMAIL_* に書き換え（ドキュメント整合）。
- `resend` パッケージは package.json に残しても害なし（参照が消えたら後で削除可）。

---

## 3. 回帰確認（金額・顧客に直結。必須）

差し替え後、**動いている既存メールが全部これまで通り飛ぶか**を確認する。ビルド + 実送信で検証:

1. `cd backend && npm run build`（tsc エラー0件）
2. `cd frontend && npm run build`（tsc/vite エラー0件）
3. ローカル実送信テスト（自分のGmail宛 + 外部アドレス宛の2種で `accepted`/`250 OK` を確認）:
   - 対象関数を最低限それぞれ1通: 注文確認 / 発送通知 / キャンセル通知 / 問い合わせ返信 /
     **入金確認（payment_received テンプレ）** / **ライセンス送付（license_delivery テンプレ）** / パスワードリセット
4. **ライセンス送付の戻り値ロジックを特に確認**: `sendLicenseDeliveryEmail` が `true` を返し、
   `licenseKeyDelivered` が正しく `true` になること（送信成功時）。テンプレ無効時に `false` を返し
   DB更新されないこと（既存挙動の維持）。
5. パスワード再発行のE2E: 申請フォーム→メール受信→リンク→ResetPasswordPage→新PWでログイン、まで通す。

> ⚠️ Hotmail/Outlook 宛は新規Gmailだと初回は迷惑メール/遅延になりやすい。届かない時はまず Junk を確認。

---

## 4. デプロイ & 本番検証

1. `deploy-env.yaml` が git 追跡下でないこと（秘匿PW）を確認 → 問題なければ書く
2. バックエンド: `cd backend && gcloud run deploy ec-platform-backend-production --source . --region asia-northeast1 --env-vars-file deploy-env.yaml`
3. フロント: `cd frontend && vercel --prod`
4. 本番でパスワード再発行を実際に1回通す（申請→メール→リセット→ログイン）
5. 本番で既存メールの1つ（例: 問い合わせ返信 or テスト注文）が届くことも確認

---

## 5. コミット単位（推奨）
- `feat(mail): メール送信をResendからGmail SMTPに統一` … STEP1-3, 6（バックエンド + env）
- `feat(auth): パスワード再発行フォームを実API接続＋リセット画面を新規実装` … STEP4-5（フロント）
- 2コミットに分けると、万一の切り分けが楽。

## チェックリスト（完了判定）
- [ ] emailService の**6箇所すべて**（34/110/185/255/328/396行）が sendMail 化、renderTemplate 不変、各関数の戻り値型不変
- [ ] orderController のローカル2関数は無改修（sendGenericEmail経由で自動的にGmail化される）
- [ ] authController のインラインResend撤去 → sendPasswordResetEmail 呼び出し
- [ ] AuthPage の handleResetPassword が実API（setTimeout撤去）
- [ ] ResetPasswordPage.tsx 新規作成 + App.tsx にルート追加
- [ ] deploy-env.yaml / .env.local の GMAIL_* 追加・RESEND_* 削除
- [ ] backend/frontend 両方 build 成功
- [ ] 既存メール7種の回帰（特に license_delivery の戻り値）確認
- [ ] パスワード再発行 E2E が本番で通る

/**
 * 在庫管理アプリ 発行API連携サービス（P2）
 *
 * EC側が「注文がpaid（入金確定）になった瞬間」に、在庫アプリの発行API
 * (POST /api/integration/provision) を呼んでテナント＋ライセンスキーを発行させる。
 *
 * 責務分担: EC=いつ発行してよいか（paid判断） / 在庫=何を発行するか（テナント+キー・冪等）。
 * 冪等キーは注文ID。同じ注文で再呼び出しされても在庫側が二重発行しない（alreadyProvisioned）。
 *
 * セキュリティ: 認証キーは env INVENTORY_API_KEY。コード/gitに値をハードコードしない。
 */

import axios from 'axios';

// 在庫アプリ発行APIのベースURL（env優先、未設定なら本番既定）
const INVENTORY_API_BASE_URL =
  process.env.INVENTORY_API_BASE_URL ||
  'https://inventory-backend-72579044624.asia-northeast1.run.app';

const PROVISION_TIMEOUT_MS = 15000;

export interface ProvisionRequest {
  orderId: string; // 冪等キー（必須）
  email: string; // 顧客メール（必須）
  plan?: string; // プラン識別子（任意・ラベル用）
  billingType?: string; // monthly | yearly | onetime
  productId?: string; // ECのプラン商品ID（在庫側でecProductIdとして記録）
  limits?: PlanLimits; // プランの上限（3項目必ず送る運用。null=無制限）
}

// プランの上限（EC=マスター、在庫=適用）。null=無制限。
export interface PlanLimits {
  maxParts: number | null;
  maxImageMB: number | null;
  maxUsers: number | null;
}

export interface ProvisionResult {
  success: boolean;
  alreadyProvisioned?: boolean;
  slug?: string;
  licenseKey?: string;
  activationUrl?: string;
  status?: string;
  error?: string; // 失敗時の理由（呼び出し側でログ/note記録に使う）
}

/**
 * 在庫アプリの発行APIを呼ぶ。
 * 例外は投げず、必ず ProvisionResult を返す（呼び出し側でpaid処理を止めないため）。
 */
export async function provisionTenant(
  req: ProvisionRequest
): Promise<ProvisionResult> {
  const apiKey = process.env.INVENTORY_API_KEY;

  if (!apiKey) {
    // 未設定時は発行をスキップ（運用者が手動発行できるようログのみ）
    console.error(
      '[provision] INVENTORY_API_KEY が未設定のため発行APIを呼べません。手動発行が必要です。'
    );
    return { success: false, error: 'INVENTORY_API_KEY 未設定' };
  }

  if (!req.orderId || !req.email) {
    return { success: false, error: 'orderId と email は必須です' };
  }

  try {
    const response = await axios.post(
      `${INVENTORY_API_BASE_URL}/api/integration/provision`,
      {
        orderId: req.orderId,
        email: req.email,
        plan: req.plan,
        billingType: req.billingType,
        productId: req.productId,
        limits: req.limits,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-integration-key': apiKey,
        },
        timeout: PROVISION_TIMEOUT_MS,
        // 2xx以外も例外にせず自前で判定
        validateStatus: () => true,
      }
    );

    const data = response.data || {};

    // 新規発行=201 / 冪等(既存)=200 のいずれかが成功
    if (response.status === 200 || response.status === 201) {
      return {
        success: true,
        alreadyProvisioned: !!data.alreadyProvisioned,
        slug: data.slug,
        licenseKey: data.licenseKey,
        activationUrl: data.activationUrl,
        status: data.status,
      };
    }

    // 400/401/503 等
    const errMsg =
      data.error || data.message || `発行APIエラー (HTTP ${response.status})`;
    console.error('[provision] 発行API失敗:', response.status, errMsg);
    return { success: false, error: errMsg };
  } catch (error: any) {
    const errMsg =
      error?.code === 'ECONNABORTED'
        ? '発行APIタイムアウト'
        : error?.message || '発行API呼び出しに失敗しました';
    console.error('[provision] 発行API例外:', errMsg);
    return { success: false, error: errMsg };
  }
}

export interface ChangePlanRequest {
  orderId: string; // 契約を特定する注文ID（必須）
  productId?: string; // 変更後のプラン商品ID
  limits: PlanLimits; // 新しい上限（渡した項目だけ更新される）
}

export interface ChangePlanResult {
  success: boolean;
  error?: string;
}

/**
 * 在庫アプリのプラン変更API（既存テナントの上限更新）を呼ぶ。
 * 上限（limits）を変えたとき、契約中の各顧客について呼び出す（方法A・EC側でループ）。
 * 例外は投げず結果オブジェクトを返す。
 */
export async function changePlan(
  req: ChangePlanRequest
): Promise<ChangePlanResult> {
  const apiKey = process.env.INVENTORY_API_KEY;
  if (!apiKey) {
    console.error('[plan-change] INVENTORY_API_KEY 未設定のためスキップ');
    return { success: false, error: 'INVENTORY_API_KEY 未設定' };
  }
  if (!req.orderId) {
    return { success: false, error: 'orderId は必須です' };
  }

  try {
    const response = await axios.post(
      `${INVENTORY_API_BASE_URL}/api/integration/plan-change`,
      {
        orderId: req.orderId,
        productId: req.productId,
        limits: req.limits,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-integration-key': apiKey,
        },
        timeout: PROVISION_TIMEOUT_MS,
        validateStatus: () => true,
      }
    );

    if (response.status === 200 || response.status === 201) {
      return { success: true };
    }
    const data = response.data || {};
    const errMsg = data.error || data.message || `プラン変更APIエラー (HTTP ${response.status})`;
    console.error('[plan-change] 失敗:', response.status, errMsg);
    return { success: false, error: errMsg };
  } catch (error: any) {
    const errMsg =
      error?.code === 'ECONNABORTED'
        ? 'プラン変更APIタイムアウト'
        : error?.message || 'プラン変更API呼び出しに失敗しました';
    console.error('[plan-change] 例外:', errMsg);
    return { success: false, error: errMsg };
  }
}

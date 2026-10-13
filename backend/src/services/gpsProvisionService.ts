/**
 * GPSラップタイマー 発行API連携サービス（在庫連携とは完全独立）
 *
 * EC側が「注文がpaid（入金確定）になった瞬間」に、GPSアプリの発行API
 * (POST /api/integration/provision) を呼んで利用権（Grant）を発行させる。
 *
 * 責務分担: EC=いつ発行してよいか（paid判断） / GPS=何を発行するか（利用権・冪等）。
 * 冪等キーは (注文番号 × 系統plan)。GPS側が同一注文でも系統(personal/organizer)違いを
 * 別契約として受理し、同一注文＋同一系統の再送だけを冪等に弾く（カート同時契約に対応）。
 *
 * ⚠️ 在庫管理アプリ連携(inventoryProvisionService.ts)とは一切共有しない:
 *   - 認証キー: env GPS_API_KEY（在庫の INVENTORY_API_KEY とは別物・使い回し禁止）
 *   - ベースURL: env GPS_API_BASE_URL（GPS本番 Cloud Run）
 *   - 送信データ: 在庫の PlanLimits(maxParts等) は送らない。GPSは plan(系統) と until(期限) を送る。
 * 販売時に連携先が混在しないよう、送信先・鍵・データ契約をGPS専用に閉じている。
 *
 * セキュリティ: 認証キーは env GPS_API_KEY。コード/gitに値をハードコードしない。
 */

import axios from 'axios';

// GPSアプリ発行APIのベースURL（env優先、未設定なら本番既定）
const GPS_API_BASE_URL =
  process.env.GPS_API_BASE_URL ||
  'https://gps-lap-timer-563027052499.asia-northeast1.run.app';

const PROVISION_TIMEOUT_MS = 15000;

// GPSサブスクの系統コード。GPS側は大小文字どちらも受理する。
export type GpsPlanCode = 'personal' | 'organizer';

export interface GpsProvisionRequest {
  orderId: string; // 冪等キーの一部（必須・= Order.orderNumber）
  email: string; // 顧客メール（必須・GPS側で正規化して突合）
  plan: GpsPlanCode; // 系統（必須・冪等キーの一部。GPSが系統判定に使う）
  billingType?: string; // monthly | yearly | onetime
  productId?: string; // ECのプラン商品ID（GPS側で記録用）
  features?: string[]; // GPS機能キー（例 ["personal_measurement"] / ["event_hosting"]）
  until?: string | null; // 契約期限 ISO日付（= nextBillingDate）。null=無期限。
}

export interface GpsProvisionResult {
  success: boolean;
  alreadyProvisioned?: boolean;
  slug?: string;
  licenseKey?: string;
  activationUrl?: string;
  status?: string;
  error?: string;
}

/**
 * GPSアプリの発行APIを呼ぶ。
 * 例外は投げず、必ず GpsProvisionResult を返す（呼び出し側でpaid処理を止めないため）。
 */
export async function provisionGpsGrant(
  req: GpsProvisionRequest
): Promise<GpsProvisionResult> {
  const apiKey = process.env.GPS_API_KEY;

  if (!apiKey) {
    console.error(
      '[gps-provision] GPS_API_KEY が未設定のため発行APIを呼べません。手動発行が必要です。'
    );
    return { success: false, error: 'GPS_API_KEY 未設定' };
  }

  if (!req.orderId || !req.email || !req.plan) {
    return { success: false, error: 'orderId / email / plan は必須です' };
  }

  try {
    const response = await axios.post(
      `${GPS_API_BASE_URL}/api/integration/provision`,
      {
        orderId: req.orderId,
        email: req.email,
        plan: req.plan,
        billingType: req.billingType,
        productId: req.productId,
        ...(req.features ? { features: req.features } : {}),
        ...(req.until !== undefined ? { until: req.until } : {}),
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

    const errMsg =
      data.error || data.message || `GPS発行APIエラー (HTTP ${response.status})`;
    console.error('[gps-provision] 発行API失敗:', response.status, errMsg);
    return { success: false, error: errMsg };
  } catch (error: any) {
    const errMsg =
      error?.code === 'ECONNABORTED'
        ? 'GPS発行APIタイムアウト'
        : error?.message || 'GPS発行API呼び出しに失敗しました';
    console.error('[gps-provision] 発行API例外:', errMsg);
    return { success: false, error: errMsg };
  }
}

export interface GpsChangePlanRequest {
  orderId: string; // 契約を特定する注文番号（必須）
  plan?: GpsPlanCode; // 変更後の系統
  billingType?: string;
  productId?: string;
  features?: string[]; // 新しいGPS機能キー
  until?: string | null; // 新しい契約期限 ISO日付。null=無期限。
}

export interface GpsChangePlanResult {
  success: boolean;
  error?: string;
}

/**
 * GPSアプリのプラン変更API（既存契約の系統/機能/期限更新）を呼ぶ。
 * 例外は投げず結果オブジェクトを返す。
 */
export async function changeGpsPlan(
  req: GpsChangePlanRequest
): Promise<GpsChangePlanResult> {
  const apiKey = process.env.GPS_API_KEY;
  if (!apiKey) {
    console.error('[gps-plan-change] GPS_API_KEY 未設定のためスキップ');
    return { success: false, error: 'GPS_API_KEY 未設定' };
  }
  if (!req.orderId) {
    return { success: false, error: 'orderId は必須です' };
  }

  try {
    const response = await axios.post(
      `${GPS_API_BASE_URL}/api/integration/plan-change`,
      {
        orderId: req.orderId,
        ...(req.plan ? { plan: req.plan } : {}),
        billingType: req.billingType,
        productId: req.productId,
        ...(req.features ? { features: req.features } : {}),
        ...(req.until !== undefined ? { until: req.until } : {}),
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
    const errMsg =
      data.error || data.message || `GPSプラン変更APIエラー (HTTP ${response.status})`;
    console.error('[gps-plan-change] 失敗:', response.status, errMsg);
    return { success: false, error: errMsg };
  } catch (error: any) {
    const errMsg =
      error?.code === 'ECONNABORTED'
        ? 'GPSプラン変更APIタイムアウト'
        : error?.message || 'GPSプラン変更API呼び出しに失敗しました';
    console.error('[gps-plan-change] 例外:', errMsg);
    return { success: false, error: errMsg };
  }
}

// ===== 解約/一時停止/再開 連携（suspend / unsuspend） =====

export interface GpsSuspendRequest {
  orderId: string; // 契約を特定する注文番号（provision時と同じ orderNumber）
  reason?: 'cancelled' | 'suspended';
}

export interface GpsSuspendResult {
  success: boolean;
  alreadySuspended?: boolean;
  error?: string;
}

/**
 * GPSアプリの利用権を suspend（利用停止・データ保持）する。
 * GPS側は「同一注文の全契約（個人＋運営など）をまとめて停止」する実装。
 * 冪等。例外は投げず結果を返す。
 */
export async function suspendGpsGrant(
  req: GpsSuspendRequest
): Promise<GpsSuspendResult> {
  const apiKey = process.env.GPS_API_KEY;
  if (!apiKey) {
    console.error('[gps-suspend] GPS_API_KEY 未設定のためスキップ');
    return { success: false, error: 'GPS_API_KEY 未設定' };
  }
  if (!req.orderId) {
    return { success: false, error: 'orderId は必須です' };
  }

  try {
    const response = await axios.post(
      `${GPS_API_BASE_URL}/api/integration/suspend`,
      {
        orderId: req.orderId,
        reason: req.reason,
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

    const data = response.data || {};
    if (response.status === 200 || response.status === 201) {
      return { success: true, alreadySuspended: !!data.alreadySuspended };
    }
    const errMsg =
      data.error || data.message || `GPS suspend APIエラー (HTTP ${response.status})`;
    console.error('[gps-suspend] 失敗:', response.status, errMsg);
    return { success: false, error: errMsg };
  } catch (error: any) {
    const errMsg =
      error?.code === 'ECONNABORTED'
        ? 'GPS suspend APIタイムアウト'
        : error?.message || 'GPS suspend API呼び出しに失敗しました';
    console.error('[gps-suspend] 例外:', errMsg);
    return { success: false, error: errMsg };
  }
}

export interface GpsUnsuspendResult {
  success: boolean;
  error?: string;
}

/**
 * GPSアプリの利用権を unsuspend（停止→再開）する。
 * 停止中の「同じ契約」を再開したとき（同一orderId）に呼ぶ。
 * GPS側は「同一注文の全契約をまとめて再開」する実装。冪等。例外は投げず結果を返す。
 */
export async function unsuspendGpsGrant(
  orderId: string
): Promise<GpsUnsuspendResult> {
  const apiKey = process.env.GPS_API_KEY;
  if (!apiKey) {
    console.error('[gps-unsuspend] GPS_API_KEY 未設定のためスキップ');
    return { success: false, error: 'GPS_API_KEY 未設定' };
  }
  if (!orderId) {
    return { success: false, error: 'orderId は必須です' };
  }

  try {
    const response = await axios.post(
      `${GPS_API_BASE_URL}/api/integration/unsuspend`,
      { orderId },
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
    const errMsg =
      data.error || data.message || `GPS unsuspend APIエラー (HTTP ${response.status})`;
    console.error('[gps-unsuspend] 失敗:', response.status, errMsg);
    return { success: false, error: errMsg };
  } catch (error: any) {
    const errMsg =
      error?.code === 'ECONNABORTED'
        ? 'GPS unsuspend APIタイムアウト'
        : error?.message || 'GPS unsuspend API呼び出しに失敗しました';
    console.error('[gps-unsuspend] 例外:', errMsg);
    return { success: false, error: errMsg };
  }
}

// ===== 解約後の再購入でのデータ引き継ぎ（reactivate） =====

export interface GpsReactivateRequest {
  prevOrderId: string; // 旧契約の注文番号（引き継ぎ元）
  newOrderId: string; // 新規注文の注文番号（付け替え先）
  plan?: GpsPlanCode;
  billingType?: string;
  productId?: string;
  features?: string[];
  until?: string | null;
}

export interface GpsReactivateResult {
  success: boolean;
  slug?: string;
  licenseKey?: string;
  activationUrl?: string;
  status?: string;
  error?: string;
}

/**
 * 解約後に別注文で再購入した顧客の「旧契約（データ入り）」を新orderIdに付け替えて再開する。
 * 冪等（newOrderIdで処理済みなら200）。例外は投げず結果を返す。
 */
export async function reactivateGpsGrant(
  req: GpsReactivateRequest
): Promise<GpsReactivateResult> {
  const apiKey = process.env.GPS_API_KEY;
  if (!apiKey) {
    console.error('[gps-reactivate] GPS_API_KEY 未設定のためスキップ');
    return { success: false, error: 'GPS_API_KEY 未設定' };
  }
  if (!req.prevOrderId || !req.newOrderId) {
    return { success: false, error: 'prevOrderId と newOrderId は必須です' };
  }

  try {
    const response = await axios.post(
      `${GPS_API_BASE_URL}/api/integration/reactivate`,
      {
        prevOrderId: req.prevOrderId,
        newOrderId: req.newOrderId,
        ...(req.plan ? { plan: req.plan } : {}),
        billingType: req.billingType,
        productId: req.productId,
        ...(req.features ? { features: req.features } : {}),
        ...(req.until !== undefined ? { until: req.until } : {}),
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

    const data = response.data || {};
    if (response.status === 200 || response.status === 201) {
      return {
        success: true,
        slug: data.slug,
        licenseKey: data.licenseKey,
        activationUrl: data.activationUrl,
        status: data.status,
      };
    }
    const errMsg =
      data.error || data.message || `GPS reactivate APIエラー (HTTP ${response.status})`;
    console.error('[gps-reactivate] 失敗:', response.status, errMsg);
    return { success: false, error: errMsg };
  } catch (error: any) {
    const errMsg =
      error?.code === 'ECONNABORTED'
        ? 'GPS reactivate APIタイムアウト'
        : error?.message || 'GPS reactivate API呼び出しに失敗しました';
    console.error('[gps-reactivate] 例外:', errMsg);
    return { success: false, error: errMsg };
  }
}

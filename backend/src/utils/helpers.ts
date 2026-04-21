/**
 * ヘルパー関数集
 */

/**
 * クエリパラメータから文字列を取得するヘルパー関数
 * 配列の場合は最初の要素を返す
 * @param value - クエリパラメータの値
 * @returns 文字列またはundefined
 */
export const getStringParam = (value: string | string[] | undefined): string | undefined => {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value[0];
  return value;
};

/**
 * クエリパラメータから数値を取得するヘルパー関数
 * @param value - クエリパラメータの値
 * @param defaultValue - デフォルト値
 * @returns 数値
 */
export const getNumberParam = (value: string | string[] | undefined, defaultValue: number): number => {
  const strValue = getStringParam(value);
  if (!strValue) return defaultValue;
  const num = parseInt(strValue, 10);
  return isNaN(num) ? defaultValue : num;
};

/**
 * クエリパラメータからブール値を取得するヘルパー関数
 * @param value - クエリパラメータの値
 * @returns ブール値またはundefined
 */
export const getBooleanParam = (value: string | string[] | undefined): boolean | undefined => {
  const strValue = getStringParam(value);
  if (strValue === undefined) return undefined;
  return strValue === 'true';
};

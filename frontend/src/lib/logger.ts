// ========================================
// Logger Utility
// ========================================
// 環境に応じてログ出力を制御するロガー

const isDevelopment = import.meta.env.MODE === 'development';
const isE2EMode = import.meta.env.VITE_E2E_MODE === 'true';

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDevelopment && !isE2EMode) {
      // 開発環境のみログ出力（E2Eテスト時は無効）
      // eslint-disable-next-line no-console
      console.log('[DEBUG]', ...args);
    }
  },

  info: (...args: unknown[]) => {
    if (isDevelopment && !isE2EMode) {
      // eslint-disable-next-line no-console
      console.log('[INFO]', ...args);
    }
  },

  warn: (...args: unknown[]) => {
    // 警告は常に出力
    console.warn('[WARN]', ...args);
  },

  error: (...args: unknown[]) => {
    // エラーは常に出力
    console.error('[ERROR]', ...args);
  },
};

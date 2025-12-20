import { createTheme } from '@mui/material/styles';
import type { ThemeOptions } from '@mui/material/styles';
import { palette } from './palette';
import { typography } from './typography';
import { components } from './components';

/**
 * MUIテーマ設定
 *
 * ベースデザイン: Theme 1 (Modern Professional)
 * プライマリーカラー: #7c4dff (Cool Minimalのパープル)
 * セカンダリーカラー: #dc004e (アクセントレッド)
 * 背景: #f5f5f5 (ライトグレー)
 * カード: white
 *
 * 特徴:
 * - ECサイトに最適化されたフォントサイズとスペーシング
 * - レスポンシブ対応（モバイル/タブレット/デスクトップ）
 * - MUI v6に完全対応
 * - TypeScript型安全
 */
const themeOptions: ThemeOptions = {
  palette,
  typography,
  components,
  spacing: 8,
  shape: {
    borderRadius: 8,
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },
  zIndex: {
    mobileStepper: 1000,
    fab: 1050,
    speedDial: 1050,
    appBar: 1100,
    drawer: 1200,
    modal: 1300,
    snackbar: 1400,
    tooltip: 1500,
  },
};

/**
 * アプリケーション全体で使用するMUIテーマ
 * App.tsxでThemeProviderにこのテーマを渡してください
 *
 * 使用例:
 * ```tsx
 * import { ThemeProvider } from '@mui/material/styles';
 * import theme from './theme';
 *
 * function App() {
 *   return (
 *     <ThemeProvider theme={theme}>
 *       <YourApp />
 *     </ThemeProvider>
 *   );
 * }
 * ```
 */
export const theme = createTheme(themeOptions);

export default theme;

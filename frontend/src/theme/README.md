# MUIテーマ設定ガイド

## 概要
このディレクトリには、多機能ECプラットフォームのMUI v6テーマ設定が含まれています。

**選択されたデザイン:**
- ベースデザイン: Theme 1 (Modern Professional)
- プライマリーカラー: #7c4dff (Cool Minimalのパープル)
- セカンダリーカラー: #dc004e (アクセントレッド)
- 背景: #f5f5f5 (ライトグレー)
- カード: white

## ファイル構成

```
theme/
├── index.ts         # メインテーマファイル（エクスポート）
├── palette.ts       # カラーパレット定義
├── typography.ts    # タイポグラフィ設定
├── components.ts    # コンポーネントスタイルオーバーライド
└── README.md        # このファイル
```

## 使用方法

### 基本的な使い方

```tsx
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <YourApp />
    </ThemeProvider>
  );
}
```

### カラーパレット

```tsx
import { Button } from '@mui/material';

// プライマリーカラー（パープル）
<Button variant="contained" color="primary">
  Primary Button
</Button>

// セカンダリーカラー（レッド）
<Button variant="contained" color="secondary">
  Secondary Button
</Button>
```

### タイポグラフィ

```tsx
import { Typography } from '@mui/material';

<Typography variant="h1">見出し1 - 最大サイズ</Typography>
<Typography variant="h2">見出し2 - ページタイトル</Typography>
<Typography variant="h3">見出し3 - セクションタイトル</Typography>
<Typography variant="body1">本文 - メインコンテンツ</Typography>
<Typography variant="body2" color="text.secondary">
  本文2 - サブコンテンツ
</Typography>
```

### レスポンシブ対応

タイポグラフィは自動的にレスポンシブ対応されています。
- デスクトップ: 標準サイズ
- モバイル（600px以下）: 縮小サイズ

```tsx
// 自動的にモバイルで縮小されます
<Typography variant="h1">
  自動レスポンシブ見出し
</Typography>
```

### カスタムスタイル

```tsx
import { Box } from '@mui/material';

<Box
  sx={{
    bgcolor: 'primary.main',
    color: 'primary.contrastText',
    p: 2,
    borderRadius: 2,
  }}
>
  プライマリーカラーのBox
</Box>
```

## カラー定義

### プライマリー（パープル）
- Main: #7c4dff
- Light: #b47cff
- Dark: #3f1dcb
- Contrast Text: #ffffff

### セカンダリー（レッド）
- Main: #dc004e
- Light: #ff5983
- Dark: #9a0036
- Contrast Text: #ffffff

### その他
- Background Default: #f5f5f5
- Background Paper: #ffffff
- Text Primary: rgba(0, 0, 0, 0.87)
- Text Secondary: rgba(0, 0, 0, 0.6)

## コンポーネントカスタマイズ

以下のコンポーネントには、ECサイトに最適化されたスタイルが適用されています：

- **Button**: 角丸8px、ホバー時のシャドウとトランスフォーム
- **TextField**: 角丸8px、フォーカス時の太いボーダー
- **Card**: 角丸12px、ホバー時のシャドウとトランスフォーム
- **Paper**: 角丸12px
- **Dialog**: 角丸16px
- **Chip**: 角丸8px
- **Tab**: テキスト変換なし（lowercase保持）

## カスタマイズ方法

### パレットのカスタマイズ
`palette.ts` を編集：

```typescript
export const palette: PaletteOptions = {
  primary: {
    main: '#YOUR_COLOR', // ここを変更
  },
};
```

### タイポグラフィのカスタマイズ
`typography.ts` を編集：

```typescript
export const typography: TypographyOptions = {
  h1: {
    fontSize: '3rem', // フォントサイズを変更
  },
};
```

### コンポーネントスタイルのカスタマイズ
`components.ts` を編集：

```typescript
export const components: Components<Theme> = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 16, // 角丸を変更
      },
    },
  },
};
```

## ブレークポイント

```typescript
xs: 0,      // モバイル
sm: 600,    // タブレット（縦）
md: 960,    // タブレット（横）
lg: 1280,   // ノートPC
xl: 1920,   // デスクトップ
```

## トランジション

- Shortest: 150ms
- Shorter: 200ms
- Short: 250ms
- Standard: 300ms（推奨）
- Complex: 375ms

## Z-Index

- AppBar: 1100
- Drawer: 1200
- Modal: 1300
- Snackbar: 1400
- Tooltip: 1500

## 参考リンク

- [MUI公式ドキュメント](https://mui.com)
- [MUIカラーパレット](https://mui.com/material-ui/customization/palette/)
- [MUIタイポグラフィ](https://mui.com/material-ui/customization/typography/)
- [MUIテーマカスタマイズ](https://mui.com/material-ui/customization/theming/)

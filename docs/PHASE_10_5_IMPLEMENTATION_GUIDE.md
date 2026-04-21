# Phase 10.5 実装ガイド

**作成日**: 2026-04-20
**作成者**: Claude Code Agent
**目的**: 次のエージェントがPhase 10.5をスムーズに実装できるようにする

---

## 📊 現在の状態

### 準備完了項目 ✅
1. **React Hook Form + Zod**: インストール済み（npm install完了）
2. **API関数**: 全て実装済み（`frontend/src/services/api/products.ts`）
3. **React Query hooks**: 全て実装済み（`frontend/src/hooks/useProducts.ts`）
4. **Dialog UI**: 既に実装済み（`frontend/src/pages/AdminProductsPage.tsx`:419-624）

### 実装必要項目 ❌
1. DialogのフォームロジックとAPI呼び出し
2. DataGridカラムフィルター
3. 管理画面ナビゲーション

---

## 🎯 実装タスク詳細

### Task 1: TC-006 新規商品登録Dialogの実装

**対象ファイル**: `frontend/src/pages/AdminProductsPage.tsx`

**実装内容**:

#### 1.1 React Hook Formセットアップ

```typescript
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// バリデーションスキーマ
const productSchema = z.object({
  name: z.string().min(1, '商品名は必須です').max(200, '200文字以内で入力してください'),
  price: z.number().min(0, '価格は0以上で入力してください'),
  description: z.string().optional(),
  productType: z.enum(['PHYSICAL', 'DIGITAL', 'DIGITAL_TICKET', 'EXTERNAL_LINK']),
  categoryType: z.enum(['CARS', 'EVENTS', 'DIGITAL']),
  initialStock: z.number().min(0, '在庫数は0以上で入力してください').optional(),
  externalUrl: z.string().url('有効なURLを入力してください').optional().or(z.literal('')),
  preparationDays: z.number().min(0).optional(),
  allowWeekendDelivery: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

type ProductFormData = z.infer<typeof productSchema>;
```

#### 1.2 フォーム初期化（AdminProductsPageコンポーネント内）

```typescript
const createProductMutation = useCreateProduct();

const {
  control,
  handleSubmit,
  formState: { errors },
  reset,
} = useForm<ProductFormData>({
  resolver: zodResolver(productSchema),
  defaultValues: {
    name: '',
    price: 0,
    description: '',
    productType: ProductType.PHYSICAL,
    categoryType: CategoryType.CARS,
    initialStock: 0,
    preparationDays: 3,
    allowWeekendDelivery: false,
    tags: [],
  },
});
```

#### 1.3 フォーム送信ハンドラー

```typescript
const onSubmitCreate = async (data: ProductFormData) => {
  try {
    await createProductMutation.mutateAsync({
      name: data.name,
      price: data.price,
      description: data.description,
      productType: data.productType,
      categoryType: data.categoryType,
      initialStock: data.initialStock,
      externalUrl: data.externalUrl,
      preparationDays: data.preparationDays,
      allowWeekendDelivery: data.allowWeekendDelivery,
      tags: data.tags,
      // 画像は別途実装（Task 1.4）
    });

    // 成功時
    setOpenProductDialog(false);
    reset();
    alert('商品を登録しました');
  } catch (error) {
    console.error('商品登録エラー:', error);
    alert('商品登録に失敗しました');
  }
};
```

#### 1.4 画像アップロード処理（簡易版）

```typescript
const [imageFiles, setImageFiles] = useState<File[]>([]);

// ファイル選択ハンドラー
const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  const files = event.target.files;
  if (files) {
    setImageFiles(Array.from(files));
  }
};

// フォーム送信時に画像を含める
const onSubmitCreate = async (data: ProductFormData) => {
  try {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('price', String(data.price));
    // ... 他のフィールド ...

    // 画像を追加
    imageFiles.forEach((file) => {
      formData.append('images', file);
    });

    // API呼び出し
    await createAdminProduct({
      ...data,
      images: imageFiles as any, // FormDataで処理されるため
    });

    // 成功時
    setOpenProductDialog(false);
    reset();
    setImageFiles([]);
    alert('商品を登録しました');
  } catch (error) {
    console.error('商品登録エラー:', error);
    alert('商品登録に失敗しました');
  }
};
```

#### 1.5 DialogのJSX更新（既存のDialogContentを置き換え）

```tsx
<DialogContent dividers>
  <form id="product-form" onSubmit={handleSubmit(onSubmitCreate)}>
    <Grid container spacing={2}>
      {/* 商品名 */}
      <Grid item xs={12}>
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="商品名"
              fullWidth
              required
              error={!!errors.name}
              helperText={errors.name?.message}
            />
          )}
        />
      </Grid>

      {/* 価格 */}
      <Grid item xs={12} sm={6}>
        <Controller
          name="price"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="価格"
              type="number"
              fullWidth
              required
              error={!!errors.price}
              helperText={errors.price?.message}
              onChange={(e) => field.onChange(Number(e.target.value))}
            />
          )}
        />
      </Grid>

      {/* 商品種別 */}
      <Grid item xs={12} sm={6}>
        <Controller
          name="productType"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth required>
              <InputLabel>商品種別</InputLabel>
              <Select {...field} label="商品種別">
                <MenuItem value={ProductType.PHYSICAL}>通常商品</MenuItem>
                <MenuItem value={ProductType.DIGITAL}>デジタル商品</MenuItem>
                <MenuItem value={ProductType.DIGITAL_TICKET}>イベントチケット</MenuItem>
                <MenuItem value={ProductType.EXTERNAL_LINK}>外部申し込み</MenuItem>
              </Select>
            </FormControl>
          )}
        />
      </Grid>

      {/* カテゴリー */}
      <Grid item xs={12} sm={6}>
        <Controller
          name="categoryType"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth required>
              <InputLabel>カテゴリー</InputLabel>
              <Select {...field} label="カテゴリー">
                <MenuItem value={CategoryType.CARS}>車パーツ</MenuItem>
                <MenuItem value={CategoryType.EVENTS}>イベント</MenuItem>
                <MenuItem value={CategoryType.DIGITAL}>デジタル</MenuItem>
              </Select>
            </FormControl>
          )}
        />
      </Grid>

      {/* 初期在庫 */}
      <Grid item xs={12} sm={6}>
        <Controller
          name="initialStock"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="初期在庫数"
              type="number"
              fullWidth
              error={!!errors.initialStock}
              helperText={errors.initialStock?.message}
              onChange={(e) => field.onChange(Number(e.target.value))}
            />
          )}
        />
      </Grid>

      {/* 説明 */}
      <Grid item xs={12}>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="商品説明"
              fullWidth
              multiline
              rows={4}
              error={!!errors.description}
              helperText={errors.description?.message}
            />
          )}
        />
      </Grid>

      {/* 画像アップロード */}
      <Grid item xs={12}>
        <Button
          variant="outlined"
          component="label"
          startIcon={<CloudUpload />}
          fullWidth
        >
          画像をアップロード
          <input
            type="file"
            hidden
            multiple
            accept="image/*"
            onChange={handleImageChange}
          />
        </Button>
        {imageFiles.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            {imageFiles.length}枚選択中
          </Typography>
        )}
      </Grid>
    </Grid>
  </form>
</DialogContent>

<DialogActions>
  <Button onClick={() => { setOpenProductDialog(false); reset(); }}>
    キャンセル
  </Button>
  <Button
    type="submit"
    form="product-form"
    variant="contained"
    disabled={createProductMutation.isPending}
  >
    {createProductMutation.isPending ? '登録中...' : '登録'}
  </Button>
</DialogActions>
```

---

### Task 2: TC-007 商品編集Dialogの実装

**実装内容**:

#### 2.1 既存データの読み込み

```typescript
const { data: editingProductData, isLoading: isLoadingProduct } = useAdminProductById(
  editingProduct || ''
);

// 編集時はフォームに既存データを反映
useEffect(() => {
  if (editingProductData && openProductDialog) {
    reset({
      name: editingProductData.name,
      price: editingProductData.price,
      description: editingProductData.description || '',
      productType: editingProductData.productType,
      categoryType: editingProductData.categoryType,
      // ... 他のフィールド ...
    });
  }
}, [editingProductData, openProductDialog, reset]);
```

#### 2.2 更新ハンドラー

```typescript
const updateProductMutation = useUpdateProduct();

const onSubmitUpdate = async (data: ProductFormData) => {
  if (!editingProduct) return;

  try {
    await updateProductMutation.mutateAsync({
      id: editingProduct,
      data: {
        name: data.name,
        price: data.price,
        description: data.description,
        // ... 他のフィールド ...
      },
    });

    setOpenProductDialog(false);
    reset();
    setEditingProduct(null);
    alert('商品を更新しました');
  } catch (error) {
    console.error('商品更新エラー:', error);
    alert('商品更新に失敗しました');
  }
};
```

#### 2.3 フォーム送信の分岐

```tsx
<form
  id="product-form"
  onSubmit={handleSubmit(editingProduct ? onSubmitUpdate : onSubmitCreate)}
>
  {/* フォームフィールド */}
</form>
```

---

### Task 3: TC-008 商品削除確認Dialogの実装

**実装内容**:

#### 3.1 削除確認Dialog状態

```typescript
const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
  open: boolean;
  productId: string | null;
  productName: string | null;
}>({
  open: false,
  productId: null,
  productName: null,
});
```

#### 3.2 削除ハンドラー

```typescript
const deleteProductMutation = useDeleteProduct();

const handleDeleteProduct = (id: string) => {
  const product = dummyProducts.find((p) => p.id === id);
  setDeleteConfirmDialog({
    open: true,
    productId: id,
    productName: product?.name || '',
  });
};

const executeDelete = async () => {
  if (!deleteConfirmDialog.productId) return;

  try {
    await deleteProductMutation.mutateAsync(deleteConfirmDialog.productId);
    setDeleteConfirmDialog({ open: false, productId: null, productName: null });
    alert('商品を削除しました');
  } catch (error: any) {
    console.error('商品削除エラー:', error);
    if (error.response?.status === 400) {
      alert('この商品は注文に紐付いているため削除できません');
    } else {
      alert('商品削除に失敗しました');
    }
  }
};
```

#### 3.3 削除確認Dialog JSX

```tsx
{/* 削除確認ダイアログ */}
<Dialog
  open={deleteConfirmDialog.open}
  onClose={() => setDeleteConfirmDialog({ open: false, productId: null, productName: null })}
>
  <DialogTitle>商品削除の確認</DialogTitle>
  <DialogContent>
    <Typography>
      以下の商品を削除してもよろしいですか？
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
      {deleteConfirmDialog.productName}
    </Typography>
    <Alert severity="warning" sx={{ mt: 2 }}>
      この操作は取り消せません。注文に紐付いている商品は削除できません。
    </Alert>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setDeleteConfirmDialog({ open: false, productId: null, productName: null })}>
      キャンセル
    </Button>
    <Button
      variant="contained"
      color="error"
      onClick={executeDelete}
      disabled={deleteProductMutation.isPending}
    >
      {deleteProductMutation.isPending ? '削除中...' : '削除'}
    </Button>
  </DialogActions>
</Dialog>
```

---

### Task 4: TC-009 在庫調整Dialogの実装

**実装内容**:

#### 4.1 フォームスキーマ

```typescript
const inventorySchema = z.object({
  productId: z.string().min(1, '商品を選択してください'),
  quantity: z.number().int('整数で入力してください'),
  type: z.enum(['purchase', 'adjustment']),
  reason: z.string().min(1, '理由は必須です').max(200, '200文字以内で入力してください'),
});

type InventoryFormData = z.infer<typeof inventorySchema>;
```

#### 4.2 フォーム初期化とハンドラー

```typescript
const createInventoryLogMutation = useCreateInventoryLog();

const inventoryForm = useForm<InventoryFormData>({
  resolver: zodResolver(inventorySchema),
  defaultValues: {
    productId: '',
    quantity: 0,
    type: 'purchase',
    reason: '',
  },
});

const onSubmitInventory = async (data: InventoryFormData) => {
  try {
    await createInventoryLogMutation.mutateAsync({
      productId: data.productId,
      quantity: data.quantity,
      type: data.type,
      reason: data.reason,
    });

    setOpenInventoryDialog(false);
    inventoryForm.reset();
    alert('在庫を調整しました');
  } catch (error) {
    console.error('在庫調整エラー:', error);
    alert('在庫調整に失敗しました');
  }
};
```

#### 4.3 Dialog JSX（同様にController使用）

---

### Task 5: TC-004/005 DataGridカラムフィルターの実装

**実装内容**:

#### 5.1 DataGridにfilterModelを追加

```tsx
<DataGrid
  rows={dummyProducts}
  columns={columns}
  getRowId={(row) => row.id}
  initialState={{
    pagination: { paginationModel: { pageSize: 10 } },
    filter: {
      filterModel: {
        items: [],
      },
    },
  }}
  pageSizeOptions={[10, 25, 50]}
  autoHeight
  // フィルター機能を有効化
  disableColumnFilter={false}
/>
```

#### 5.2 カラム定義にfilterable追加

```typescript
const columns: GridColDef[] = [
  {
    field: 'categoryType',
    headerName: 'カテゴリー',
    width: 120,
    filterable: true,
    type: 'singleSelect',
    valueOptions: Object.entries(categoryTypeMap).map(([value, label]) => ({
      value,
      label,
    })),
    renderCell: (params: GridRenderCellParams) => categoryTypeMap[params.value as CategoryType],
  },
  {
    field: 'currentStock',
    headerName: '在庫',
    width: 100,
    filterable: true,
    type: 'number',
    renderCell: (params: GridRenderCellParams) => (
      <Chip
        label={params.value}
        color={params.value > 10 ? 'success' : params.value > 0 ? 'warning' : 'error'}
        size="small"
      />
    ),
  },
];
```

---

### Task 6: E2E-ADMIN-DB-008 管理画面ナビゲーションの実装

**対象ファイル**: 新規作成 `frontend/src/components/AdminLayout.tsx`

**実装内容**:

#### 6.1 AdminLayoutコンポーネント作成

```tsx
import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Inventory,
  ShoppingCart,
  Event,
  People,
  ContactMail,
  Settings,
  Navigation as NavigationIcon,
} from '@mui/icons-material';

const drawerWidth = 240;

interface NavItem {
  text: string;
  icon: React.ReactElement;
  path: string;
}

const navItems: NavItem[] = [
  { text: 'ダッシュボード', icon: <Dashboard />, path: '/admin' },
  { text: '商品管理', icon: <Inventory />, path: '/admin/products' },
  { text: '注文管理', icon: <ShoppingCart />, path: '/admin/orders' },
  { text: 'イベント・チケット', icon: <Event />, path: '/admin/events' },
  { text: '顧客管理', icon: <People />, path: '/admin/customers' },
  { text: '問い合わせ管理', icon: <ContactMail />, path: '/admin/inquiries' },
  { text: 'システム設定', icon: <Settings />, path: '/admin/settings' },
  { text: 'ナビゲーション軸', icon: <NavigationIcon />, path: '/admin/navigation' },
];

export default function AdminLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          管理画面
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              component={Link}
              to={item.path}
              selected={location.pathname === item.path}
              onClick={isMobile ? handleDrawerToggle : undefined}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            多機能ECプラットフォーム
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {/* モバイル用ドロワー */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // パフォーマンス向上
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>

        {/* デスクトップ用ドロワー */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar /> {/* AppBarの高さ分のスペース */}
        <Outlet />
      </Box>
    </Box>
  );
}
```

#### 6.2 App.tsxでルートを更新

```tsx
import AdminLayout from './components/AdminLayout';

// ルート設定内
<Route path="/admin" element={<AdminLayout />}>
  <Route index element={<AdminDashboardPage />} />
  <Route path="products" element={<AdminProductsPage />} />
  <Route path="orders" element={<AdminOrdersPage />} />
  {/* ... 他の管理画面ルート ... */}
</Route>
```

---

## 🧪 E2Eテスト再実行

全ての実装完了後：

```bash
cd frontend
npx playwright test tests/e2e/
```

**期待結果**:
- **Pass**: 36件 (94.7%)
- **Skip**: 2件 (5.3%) - CartPage複雑テスト
- **Fail**: 0件

---

## 📝 Phase 10.5完了チェックリスト

- [ ] TC-006: 新規商品登録Dialog実装完了
- [ ] TC-007: 商品編集Dialog実装完了
- [ ] TC-008: 商品削除確認Dialog実装完了
- [ ] TC-009: 在庫調整Dialog実装完了
- [ ] TC-004/005: DataGridカラムフィルター実装完了
- [ ] E2E-ADMIN-DB-008: 管理画面ナビゲーション実装完了
- [ ] E2Eテスト再実行: 36/38 Pass達成
- [ ] TypeScriptエラー: 0件維持
- [ ] Phase 10.5完了ドキュメント作成

---

## 🚀 次のアクションへ

Phase 10.5完了後は **Phase 11（デプロイ）** へ進みます。

詳細は `SCOPE_PROGRESS.md` の「Phase 11」セクションを参照してください。

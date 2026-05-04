import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Alert,
  Stack,
  Tab,
  Tabs,
  InputAdornment,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridRowSelectionModel,
} from '@mui/x-data-grid';
import {
  Add,
  Edit,
  Delete,
  Search,
  CloudUpload,
  Close,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ProductType, CategoryType } from '../types';
import {
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useCreateInventoryLog,
  useAdminProductById,
  useAdminProducts,
} from '../hooks/useProducts';

// バリデーションスキーマ
const productSchema = z.object({
  name: z.string().min(1, '商品名は必須です').max(200, '200文字以内で入力してください'),
  price: z.number().min(0, '価格は0以上で入力してください'),
  description: z.string().optional(),
  productType: z.enum(['PHYSICAL', 'DIGITAL', 'DIGITAL_TICKET', 'EXTERNAL_LINK']),
  categoryType: z.enum(['cars', 'events', 'digital']),
  initialStock: z.number().min(0, '在庫数は0以上で入力してください').optional(),
  externalUrl: z.string().url('有効なURLを入力してください').optional().or(z.literal('')),
  preparationDays: z.number().min(0).optional(),
  allowWeekendDelivery: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

const inventorySchema = z.object({
  productId: z.string().min(1, '商品を選択してください'),
  quantity: z.number().int('整数で入力してください'),
  type: z.enum(['purchase', 'adjustment']),
  reason: z.string().min(1, '理由は必須です').max(200, '200文字以内で入力してください'),
});

type InventoryFormData = z.infer<typeof inventorySchema>;

// ダミー在庫ログ（商品一覧タブでは使用しない）
const dummyInventoryLogs = [
  { id: '1', date: '2026-04-15 10:30', type: '入庫', quantity: 50, reason: '新規仕入れ' },
  { id: '2', date: '2026-04-14 15:20', type: '出庫', quantity: -5, reason: '注文番号 ORD-001' },
  { id: '3', date: '2026-04-13 09:15', type: '調整', quantity: -2, reason: '破損品処分' },
];

// 商品種別の日本語表示
const productTypeMap: Record<ProductType, string> = {
  [ProductType.PHYSICAL]: '通常商品',
  [ProductType.DIGITAL]: 'デジタル商品',
  [ProductType.DIGITAL_TICKET]: 'イベントチケット',
  [ProductType.EXTERNAL_LINK]: '外部申し込み',
};

// カテゴリータイプの日本語表示
const categoryTypeMap: Record<CategoryType, string> = {
  [CategoryType.CARS]: '車パーツ',
  [CategoryType.EVENTS]: 'イベント',
  [CategoryType.DIGITAL]: 'デジタル',
};

export default function AdminProductsPage() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [openProductDialog, setOpenProductDialog] = useState(false);
  const [openInventoryDialog, setOpenInventoryDialog] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<GridRowSelectionModel>({ type: 'include', ids: new Set() });
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    open: boolean;
    productId: string | null;
    productName: string | null;
  }>({
    open: false,
    productId: null,
    productName: null,
  });

  // API接続 - 商品一覧取得
  // useMemoでfiltersオブジェクトを安定化
  const productFilters = React.useMemo(() => ({
    search: searchTerm || undefined,
    categoryType: categoryFilter !== 'all' ? categoryFilter : undefined,
    stockStatus: stockFilter !== 'all' ? (stockFilter as 'in_stock' | 'low_stock' | 'out_of_stock' | 'all') : undefined,
  }), [searchTerm, categoryFilter, stockFilter]);

  const { data: productsData, isLoading: isLoadingProducts, error: productsError, refetch: refetchProducts } = useAdminProducts(productFilters);

  // React Query mutations
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const deleteProductMutation = useDeleteProduct();
  const createInventoryLogMutation = useCreateInventoryLog();

  // QueryClientを直接取得してリフェッチ制御に使用
  // const queryClient = useQueryClient(); // 現在未使用

  // Product form
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      price: 0,
      description: '',
      productType: ProductType.PHYSICAL,
      categoryType: 'cars' as any,
      initialStock: 0,
      externalUrl: '',
      preparationDays: 3,
      allowWeekendDelivery: false,
      tags: [],
    },
  });

  // 商品種別を監視して動的にフィールド表示を制御
  const watchProductType = watch('productType');

  // Inventory form
  const inventoryForm = useForm<InventoryFormData>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      productId: '',
      quantity: 0,
      type: 'purchase',
      reason: '',
    },
  });

  // Load product data for editing
  const { data: editingProductData } = useAdminProductById(
    editingProduct || ''
  );

  useEffect(() => {
    if (editingProductData && openProductDialog) {
      reset({
        name: editingProductData.name,
        price: editingProductData.price,
        description: editingProductData.description || '',
        productType: editingProductData.productType,
        categoryType: editingProductData.categoryType,
        initialStock: 0,
        externalUrl: editingProductData.externalUrl || '',
        preparationDays: editingProductData.preparationDays || 3,
        allowWeekendDelivery: editingProductData.allowWeekendDelivery || false,
        tags: (editingProductData.tags || []).map(tag => typeof tag === 'string' ? tag : tag.name),
      });
    }
  }, [editingProductData, openProductDialog, reset]);

  // Form submit handlers
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
        images: imageFiles as any,
      });

      // 商品一覧を直接リフェッチ
      console.log('=== 商品作成成功、リフェッチ開始 ===');
      try {
        await refetchProducts();
        console.log('refetchProducts完了');
      } catch (refetchError) {
        console.error('リフェッチエラー:', refetchError);
      }

      setOpenProductDialog(false);
      reset();
      setImageFiles([]);
      alert('商品を登録しました');
    } catch (error) {
      console.error('商品登録エラー:', error);
      alert('商品登録に失敗しました');
    }
  };

  const onSubmitUpdate = async (data: ProductFormData) => {
    if (!editingProduct) return;

    try {
      await updateProductMutation.mutateAsync({
        id: editingProduct,
        data: {
          name: data.name,
          price: data.price,
          description: data.description,
          externalUrl: data.externalUrl,
          preparationDays: data.preparationDays,
          allowWeekendDelivery: data.allowWeekendDelivery,
          tags: data.tags,
          images: imageFiles.length > 0 ? (imageFiles as any) : undefined,
        },
      });

      setOpenProductDialog(false);
      reset();
      setEditingProduct(null);
      setImageFiles([]);
      alert('商品を更新しました');
    } catch (error) {
      console.error('商品更新エラー:', error);
      alert('商品更新に失敗しました');
    }
  };

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

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setImageFiles(Array.from(files));
    }
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

  // 商品一覧のカラム定義
  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: '商品名',
      flex: 1,
      minWidth: 250,
    },
    {
      field: 'productType',
      headerName: '種別',
      width: 140,
      renderCell: (params: GridRenderCellParams) => (
        <Chip label={productTypeMap[params.value as ProductType]} size="small" />
      ),
    },
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
      field: 'price',
      headerName: '価格',
      width: 120,
      renderCell: (params: GridRenderCellParams) => `¥${params.value.toLocaleString()}`,
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
          size="small"
          color={params.value === 0 ? 'error' : params.value < 10 ? 'warning' : 'default'}
        />
      ),
    },
    {
      field: 'tags',
      headerName: 'タグ',
      width: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Box display="flex" gap={0.5} flexWrap="wrap">
          {(params.value as string[] | undefined)?.map((tag: string, index: number) => (
            <Chip key={index} label={tag} size="small" variant="outlined" />
          ))}
        </Box>
      ),
    },
    {
      field: 'isActive',
      headerName: 'ステータス',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value ? '公開中' : '非公開'}
          size="small"
          color={params.value ? 'success' : 'default'}
        />
      ),
    },
    {
      field: 'actions',
      headerName: '操作',
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box display="flex" gap={1}>
          <IconButton size="small" onClick={() => handleEditProduct(params.row.id)}>
            <Edit fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => handleDeleteProduct(params.row.id)}>
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  // 在庫ログのカラム定義
  const inventoryColumns: GridColDef[] = [
    { field: 'date', headerName: '日時', width: 180 },
    {
      field: 'type',
      headerName: '種類',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value}
          size="small"
          color={
            params.value === '入庫' ? 'success' : params.value === '出庫' ? 'error' : 'default'
          }
        />
      ),
    },
    {
      field: 'quantity',
      headerName: '数量',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" color={params.value > 0 ? 'success.main' : 'error.main'}>
          {params.value > 0 ? '+' : ''}
          {params.value}
        </Typography>
      ),
    },
    { field: 'reason', headerName: '理由', flex: 1 },
  ];

  const handleEditProduct = (id: string) => {
    setEditingProduct(id);
    setOpenProductDialog(true);
  };

  const handleDeleteProduct = (id: string) => {
    const product = (productsData || []).find((p) => p.id === id);
    setDeleteConfirmDialog({
      open: true,
      productId: id,
      productName: product?.name || '',
    });
  };

  const handleBulkPublish = () => {
    console.log('Bulk publish:', selectedProducts);
  };

  const handleBulkUnpublish = () => {
    console.log('Bulk unpublish:', selectedProducts);
  };

  const handleBulkDelete = () => {
    console.log('Bulk delete:', selectedProducts);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" fontWeight="bold">
            商品管理
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setEditingProduct(null);
              setOpenProductDialog(true);
            }}
          >
            新規商品追加
          </Button>
        </Box>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)}>
              <Tab label="商品一覧" />
              <Tab label="在庫管理" />
            </Tabs>
          </CardContent>
        </Card>

        {selectedTab === 0 && (
          <>
            {/* 検索・絞り込み */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="商品名で検索"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>カテゴリー</InputLabel>
                      <Select
                        value={categoryFilter}
                        label="カテゴリー"
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        data-testid="category-filter"
                      >
                        <MenuItem value="all">すべて</MenuItem>
                        <MenuItem value="cars">車パーツ</MenuItem>
                        <MenuItem value="events">イベント</MenuItem>
                        <MenuItem value="digital">デジタル</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>在庫状況</InputLabel>
                      <Select
                        value={stockFilter}
                        label="在庫状況"
                        onChange={(e) => setStockFilter(e.target.value)}
                      >
                        <MenuItem value="all">すべて</MenuItem>
                        <MenuItem value="in_stock">在庫あり</MenuItem>
                        <MenuItem value="low_stock">在庫少</MenuItem>
                        <MenuItem value="out_of_stock">在庫切れ</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        disabled={selectedProducts.ids.size === 0}
                        onClick={handleBulkPublish}
                        startIcon={<Visibility />}
                      >
                        公開
                      </Button>
                      <Button
                        size="small"
                        disabled={selectedProducts.ids.size === 0}
                        onClick={handleBulkUnpublish}
                        startIcon={<VisibilityOff />}
                      >
                        非公開
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        disabled={selectedProducts.ids.size === 0}
                        onClick={handleBulkDelete}
                        startIcon={<Delete />}
                      >
                        削除
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* 商品一覧テーブル */}
            <Card>
              <CardContent>
                {productsError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    商品一覧の取得に失敗しました: {productsError.message}
                  </Alert>
                )}
                <DataGrid
                  rows={productsData || []}
                  columns={columns}
                  loading={isLoadingProducts}
                  getRowId={(row) => row.id}
                  checkboxSelection
                  onRowSelectionModelChange={(newSelection) => {
                    setSelectedProducts(newSelection);
                  }}
                  rowSelectionModel={selectedProducts}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 20 } },
                    filter: {
                      filterModel: {
                        items: [],
                      },
                    },
                  }}
                  pageSizeOptions={[10, 20, 50]}
                  autoHeight
                  disableColumnFilter={false}
                  sx={{ '& .MuiDataGrid-footerContainer': { display: 'flex' } }}
                />
              </CardContent>
            </Card>
          </>
        )}

        {selectedTab === 1 && (
          <>
            <Alert severity="info" sx={{ mb: 3 }}>
              在庫はイミュータブルログ方式で管理されています。在庫数は入庫ログ合計 - 出庫ログ合計で自動計算されます。
            </Alert>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">在庫ログ</Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setOpenInventoryDialog(true)}
                  >
                    在庫調整
                  </Button>
                </Box>
                <DataGrid
                  rows={dummyInventoryLogs}
                  columns={inventoryColumns}
                  getRowId={(row) => row.id}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 10 } },
                  }}
                  pageSizeOptions={[10, 25, 50]}
                  autoHeight
                  disableRowSelectionOnClick
                />
              </CardContent>
            </Card>
          </>
        )}

        {/* 商品登録・編集ダイアログ */}
        <Dialog
          open={openProductDialog}
          onClose={() => setOpenProductDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">
                {editingProduct ? '商品編集' : '新規商品追加'}
              </Typography>
              <IconButton onClick={() => setOpenProductDialog(false)}>
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            <form id="product-form" noValidate onSubmit={handleSubmit(editingProduct ? onSubmitUpdate : onSubmitCreate)}>
              <Grid container spacing={2}>
                {/* 基本情報 */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    基本情報
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="商品名"
                        required
                        error={!!errors.name}
                        helperText={errors.name?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="price"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="価格（円）"
                        type="number"
                        required
                        error={!!errors.price}
                        helperText={errors.price?.message}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="initialStock"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="初期在庫数"
                        type="number"
                        error={!!errors.initialStock}
                        helperText={errors.initialStock?.message}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="商品説明"
                        multiline
                        rows={4}
                        error={!!errors.description}
                        helperText={errors.description?.message}
                      />
                    )}
                  />
                </Grid>

                {/* 商品種別・カテゴリー */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    種別・カテゴリー
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="productType"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth required error={!!errors.productType}>
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
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="categoryType"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth required error={!!errors.categoryType}>
                        <InputLabel>カテゴリータイプ</InputLabel>
                        <Select {...field} label="カテゴリータイプ">
                          <MenuItem value="cars">車パーツ</MenuItem>
                          <MenuItem value="events">イベント</MenuItem>
                          <MenuItem value="digital">デジタル</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>

                {/* 外部URL（外部申し込みの場合のみ表示） */}
                {watchProductType === ProductType.EXTERNAL_LINK && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        外部リンク設定
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Controller
                        name="externalUrl"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="外部URL"
                            type="url"
                            placeholder="https://example.com"
                            required
                            error={!!errors.externalUrl}
                            helperText={errors.externalUrl?.message || '外部申し込みページのURLを入力してください'}
                          />
                        )}
                      />
                    </Grid>
                  </>
                )}

                {/* 画像アップロード */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    商品画像
                  </Typography>
                </Grid>
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
                    <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                      {imageFiles.length}枚選択中
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                    複数選択可。JPG, PNG形式。自動的にWebP形式に変換され88%圧縮されます。
                  </Typography>
                </Grid>

                {/* 配送設定 */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    配送設定
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="preparationDays"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="準備日数"
                        type="number"
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </form>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setOpenProductDialog(false); reset(); setEditingProduct(null); setImageFiles([]); }}>
              キャンセル
            </Button>
            <Button
              type="submit"
              form="product-form"
              variant="contained"
              disabled={createProductMutation.isPending || updateProductMutation.isPending}
            >
              {createProductMutation.isPending || updateProductMutation.isPending
                ? '処理中...'
                : editingProduct
                ? '更新'
                : '登録'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* 在庫調整ダイアログ */}
        <Dialog
          open={openInventoryDialog}
          onClose={() => setOpenInventoryDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>在庫調整</DialogTitle>
          <DialogContent dividers>
            <form id="inventory-form" noValidate onSubmit={inventoryForm.handleSubmit(onSubmitInventory)}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Controller
                    name="productId"
                    control={inventoryForm.control}
                    render={({ field }) => (
                      <FormControl fullWidth required error={!!inventoryForm.formState.errors.productId}>
                        <InputLabel>商品選択</InputLabel>
                        <Select {...field} label="商品選択" disabled={isLoadingProducts}>
                          {(productsData || []).map((product) => (
                            <MenuItem key={product.id} value={product.id}>
                              {product.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="type"
                    control={inventoryForm.control}
                    render={({ field }) => (
                      <FormControl fullWidth required error={!!inventoryForm.formState.errors.type}>
                        <InputLabel>調整種類</InputLabel>
                        <Select {...field} label="調整種類">
                          <MenuItem value="purchase">入庫</MenuItem>
                          <MenuItem value="adjustment">調整</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="quantity"
                    control={inventoryForm.control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="数量"
                        type="number"
                        required
                        error={!!inventoryForm.formState.errors.quantity}
                        helperText={inventoryForm.formState.errors.quantity?.message}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="reason"
                    control={inventoryForm.control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="理由"
                        multiline
                        rows={3}
                        required
                        placeholder="例: 新規仕入れ、破損品処分"
                        error={!!inventoryForm.formState.errors.reason}
                        helperText={inventoryForm.formState.errors.reason?.message}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </form>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setOpenInventoryDialog(false); inventoryForm.reset(); }}>
              キャンセル
            </Button>
            <Button
              type="submit"
              form="inventory-form"
              variant="contained"
              disabled={createInventoryLogMutation.isPending}
            >
              {createInventoryLogMutation.isPending ? '処理中...' : '調整実行'}
            </Button>
          </DialogActions>
        </Dialog>

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
    </Container>
  );
}

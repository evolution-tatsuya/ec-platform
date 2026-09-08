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
  Snackbar,
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
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ProductType, CategoryType } from '../types';
import type { ProductImage } from '../types';
import {
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useCreateInventoryLog,
  useAdminProductById,
  useAdminProducts,
  useInventoryLogs,
} from '../hooks/useProducts';
import {
  bulkPublishProducts,
  bulkUnpublishProducts,
  bulkDeleteProducts,
} from '../services/api/products';

// バリデーションスキーマ
const productSchema = z.object({
  name: z.string().min(1, '商品名は必須です').max(200, '200文字以内で入力してください'),
  price: z
    .number({ required_error: '金額を入力してください', invalid_type_error: '金額を入力してください' })
    .min(0, '価格は0以上で入力してください'),
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
  // 編集時に「残す」既存画像（並べ替え・削除に対応）。order順で保持。
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    open: boolean;
    productId: string | null;
    productName: string | null;
  }>({
    open: false,
    productId: null,
    productName: null,
  });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
  }>({
    open: false,
    message: '',
  });

  // API接続 - 商品一覧取得
  // useMemoでfiltersオブジェクトを安定化
  const productFilters = React.useMemo(() => ({
    search: searchTerm || undefined,
    categoryType: categoryFilter !== 'all' ? categoryFilter : undefined,
    stockStatus: stockFilter !== 'all' ? (stockFilter as 'in_stock' | 'low_stock' | 'out_of_stock' | 'all') : undefined,
  }), [searchTerm, categoryFilter, stockFilter]);

  const { data: productsData, isLoading: isLoadingProducts, error: productsError, refetch: refetchProducts } = useAdminProducts(productFilters);

  // API接続 - 在庫ログ一覧取得
  const { data: inventoryLogsData = [], isLoading: isLoadingInventoryLogs } = useInventoryLogs();

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
      price: undefined as any, // 空スタート。0だと先頭0が残り手打ちしづらいため
      description: '',
      productType: ProductType.PHYSICAL,
      categoryType: 'cars' as any,
      initialStock: undefined as any,
      externalUrl: '',
      preparationDays: 3,
      allowWeekendDelivery: false,
      tags: [],
    },
  });

  // 数値フィールドにフォーカスした際、既存の値（特に先頭の0）を全選択して
  // 打ち始めたら上書きできるようにする。0199のような入力ミスを防ぐ。
  const handleNumberFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

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
      // 既存画像を order順で読み込む（並べ替え・削除の起点）
      const imgs = (editingProductData.productImages || [])
        .slice()
        .sort((a, b) => a.order - b.order);
      setExistingImages(imgs);
    }
  }, [editingProductData, openProductDialog, reset]);

  // バリデーションエラー時に無反応にならないよう、内容をユーザーに知らせる
  const onInvalidSubmit = (errs: Record<string, { message?: string }>) => {
    const labels: Record<string, string> = {
      name: '商品名', price: '価格', categoryType: 'カテゴリータイプ',
      productType: '商品種別', externalUrl: '外部URL', preparationDays: '準備日数',
    };
    const fields = Object.keys(errs).map((k) => labels[k] || k);
    alert(`入力内容を確認してください：${fields.join('、')} が未入力または不正です`);
  };

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
      setExistingImages([]);
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
          // 残す既存画像を現在の並び順(order)で送信。削除した画像は含めない。
          existingImages: existingImages.map((img, index) => ({ id: img.id, order: index })),
        },
      });

      setOpenProductDialog(false);
      reset();
      setEditingProduct(null);
      setImageFiles([]);
      setExistingImages([]);
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
      setSnackbar({ open: true, message: '在庫を調整しました' });
    } catch (error) {
      console.error('在庫調整エラー:', error);
      setSnackbar({ open: true, message: '在庫調整に失敗しました' });
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      // 既存の選択に追加（複数回に分けて選べるように）
      setImageFiles((prev) => [...prev, ...Array.from(files)]);
    }
    // 同じファイルを再選択できるように input をリセット
    event.target.value = '';
  };

  // 既存画像（保存済み）の並べ替え・削除
  const moveExistingImage = (index: number, dir: -1 | 1) => {
    setExistingImages((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };
  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  // 新規選択画像の削除
  const removeNewImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
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
  // 在庫ログ種別の日本語ラベル
  const inventoryTypeLabel: Record<string, string> = {
    purchase: '入庫',
    sale: '販売（出庫）',
    sale_return: '返品（入庫）',
    adjustment: '調整',
    initial: '初期在庫',
  };

  const inventoryColumns: GridColDef[] = [
    {
      field: 'createdAt',
      headerName: '日時',
      width: 160,
      valueGetter: (value) => format(new Date(value), 'yyyy/MM/dd HH:mm'),
    },
    {
      field: 'productName',
      headerName: '商品名',
      flex: 1,
      minWidth: 180,
      valueGetter: (_value, row) => row.product?.name || '(削除済み商品)',
    },
    {
      field: 'type',
      headerName: '種類',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={inventoryTypeLabel[params.value] || params.value}
          size="small"
          color={
            params.value === 'purchase' || params.value === 'sale_return' || params.value === 'initial'
              ? 'success'
              : params.value === 'adjustment'
              ? 'warning'
              : 'error'
          }
        />
      ),
    },
    {
      field: 'quantity',
      headerName: '数量',
      width: 90,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" color={params.value > 0 ? 'success.main' : 'error.main'}>
          {params.value > 0 ? '+' : ''}
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'note',
      headerName: '理由',
      flex: 1,
      minWidth: 150,
      valueGetter: (_value, row) => row.note || row.reason || '',
    },
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

  const handleBulkPublish = async () => {
    try {
      const ids = Array.from(selectedProducts.ids) as string[];
      await bulkPublishProducts(ids);
      setSnackbar({ open: true, message: `${ids.length}件の商品を公開しました` });
      setSelectedProducts({ type: 'include', ids: new Set() });
      await refetchProducts();
    } catch (error) {
      console.error('一括公開エラー:', error);
      setSnackbar({ open: true, message: '一括公開に失敗しました' });
    }
  };

  const handleBulkUnpublish = async () => {
    try {
      const ids = Array.from(selectedProducts.ids) as string[];
      await bulkUnpublishProducts(ids);
      setSnackbar({ open: true, message: `${ids.length}件の商品を非公開にしました` });
      setSelectedProducts({ type: 'include', ids: new Set() });
      await refetchProducts();
    } catch (error) {
      console.error('一括非公開エラー:', error);
      setSnackbar({ open: true, message: '一括非公開に失敗しました' });
    }
  };

  const handleBulkDelete = async () => {
    try {
      const ids = Array.from(selectedProducts.ids) as string[];
      if (!window.confirm(`${ids.length}件の商品を削除してもよろしいですか？この操作は取り消せません。`)) {
        return;
      }
      await bulkDeleteProducts(ids);
      setSnackbar({ open: true, message: `${ids.length}件の商品を削除しました` });
      setSelectedProducts({ type: 'include', ids: new Set() });
      await refetchProducts();
    } catch (error) {
      console.error('一括削除エラー:', error);
      setSnackbar({ open: true, message: '一括削除に失敗しました' });
    }
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
                        data-testid="stock-filter"
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
                  rows={inventoryLogsData}
                  columns={inventoryColumns}
                  loading={isLoadingInventoryLogs}
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
        disablePortal={false}
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
            <form id="product-form" noValidate onSubmit={handleSubmit(editingProduct ? onSubmitUpdate : onSubmitCreate, onInvalidSubmit)}>
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
                        fullWidth
                        label="価格（円）"
                        type="text"
                        required
                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                        error={!!errors.price}
                        helperText={errors.price?.message || '半角数字で入力'}
                        value={field.value ?? ''}
                        onFocus={handleNumberFocus}
                        onChange={(e) => {
                          // 数字以外を除去。空なら undefined（全消しできる）
                          const digits = e.target.value.replace(/[^0-9]/g, '');
                          field.onChange(digits === '' ? undefined : Number(digits));
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        inputRef={field.ref}
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
                        fullWidth
                        label="初期在庫数"
                        type="number"
                        inputProps={{ min: 0, inputMode: 'numeric' }}
                        error={!!errors.initialStock}
                        helperText={errors.initialStock?.message}
                        value={field.value ?? ''}
                        onFocus={handleNumberFocus}
                        onChange={(e) => {
                          const v = e.target.value;
                          field.onChange(v === '' ? undefined : Number(v));
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        inputRef={field.ref}
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
                    画像を追加
                    <input
                      type="file"
                      hidden
                      multiple
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </Button>
                  <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                    複数選択可。JPG, PNG形式。自動的にWebP形式に変換され88%圧縮されます。左が1枚目（メイン画像）です。
                  </Typography>

                  {/* 既存画像（保存済み）: 並べ替え・削除 */}
                  {existingImages.length > 0 && (
                    <Box mt={2}>
                      <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                        現在の画像（{existingImages.length}枚） — 矢印で並べ替え、ゴミ箱で削除
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={1}>
                        {existingImages.map((img, index) => (
                          <Box
                            key={img.id}
                            sx={{
                              position: 'relative',
                              width: 96,
                              border: '1px solid',
                              borderColor: index === 0 ? 'primary.main' : 'divider',
                              borderRadius: 1,
                              overflow: 'hidden',
                            }}
                          >
                            <Box
                              component="img"
                              src={img.thumbnailUrl || img.listUrl || img.detailUrl}
                              alt={`商品画像${index + 1}`}
                              sx={{ width: '100%', height: 96, objectFit: 'cover', display: 'block' }}
                            />
                            {index === 0 && (
                              <Typography
                                variant="caption"
                                sx={{
                                  position: 'absolute', top: 0, left: 0,
                                  bgcolor: 'primary.main', color: 'white',
                                  px: 0.5, fontSize: 10, borderBottomRightRadius: 4,
                                }}
                              >
                                メイン
                              </Typography>
                            )}
                            <Stack direction="row" justifyContent="center" sx={{ bgcolor: 'rgba(0,0,0,0.04)' }}>
                              <IconButton size="small" disabled={index === 0} onClick={() => moveExistingImage(index, -1)}>
                                <ArrowUpward sx={{ fontSize: 16, transform: 'rotate(-90deg)' }} />
                              </IconButton>
                              <IconButton size="small" disabled={index === existingImages.length - 1} onClick={() => moveExistingImage(index, 1)}>
                                <ArrowDownward sx={{ fontSize: 16, transform: 'rotate(-90deg)' }} />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => removeExistingImage(index)}>
                                <Delete sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Stack>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* 新規選択画像: プレビュー・削除 */}
                  {imageFiles.length > 0 && (
                    <Box mt={2}>
                      <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                        追加する画像（{imageFiles.length}枚） — 保存すると末尾に追加されます
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={1}>
                        {imageFiles.map((file, index) => (
                          <Box
                            key={`${file.name}-${index}`}
                            sx={{ position: 'relative', width: 96, border: '1px dashed', borderColor: 'success.main', borderRadius: 1, overflow: 'hidden' }}
                          >
                            <Box
                              component="img"
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              sx={{ width: '100%', height: 96, objectFit: 'cover', display: 'block' }}
                            />
                            <Stack direction="row" justifyContent="center" sx={{ bgcolor: 'rgba(0,0,0,0.04)' }}>
                              <IconButton size="small" color="error" onClick={() => removeNewImage(index)}>
                                <Delete sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Stack>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
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
                        fullWidth
                        label="準備日数"
                        type="number"
                        inputProps={{ min: 0, inputMode: 'numeric' }}
                        value={field.value ?? ''}
                        onFocus={handleNumberFocus}
                        onChange={(e) => {
                          const v = e.target.value;
                          field.onChange(v === '' ? undefined : Number(v));
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        inputRef={field.ref}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </form>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setOpenProductDialog(false); reset(); setEditingProduct(null); setImageFiles([]); setExistingImages([]); }}>
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
        disablePortal={false}
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
                        fullWidth
                        label="数量"
                        type="number"
                        required
                        inputProps={{ inputMode: 'numeric' }}
                        error={!!inventoryForm.formState.errors.quantity}
                        helperText={inventoryForm.formState.errors.quantity?.message}
                        value={field.value ?? ''}
                        onFocus={handleNumberFocus}
                        onChange={(e) => {
                          const v = e.target.value;
                          field.onChange(v === '' ? undefined : Number(v));
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        inputRef={field.ref}
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
        disablePortal={false}
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

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ open: false, message: '' })}
          message={snackbar.message}
        />
    </Container>
  );
}

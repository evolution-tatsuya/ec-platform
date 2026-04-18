import { useState } from 'react';
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
import { Header } from '../components';
import { ProductType, CategoryType } from '../types';

// ダミーデータ
const dummyProducts = [
  {
    id: '1',
    name: 'トヨタ プリウス ZVW30 ブレーキパッド',
    price: 12800,
    productType: ProductType.PHYSICAL,
    categoryType: CategoryType.CARS,
    currentStock: 25,
    isActive: true,
    tags: ['セール', '送料無料'],
    images: [],
    createdAt: '2026-04-10',
  },
  {
    id: '2',
    name: '車イベント2026 東京 一般チケット',
    price: 5000,
    productType: ProductType.DIGITAL_TICKET,
    categoryType: CategoryType.EVENTS,
    currentStock: 100,
    isActive: true,
    tags: ['受付中'],
    images: [],
    createdAt: '2026-04-12',
  },
  {
    id: '3',
    name: 'カスタムカーマニュアルPDF',
    price: 2980,
    productType: ProductType.DIGITAL,
    categoryType: CategoryType.DIGITAL,
    currentStock: 999,
    isActive: true,
    tags: ['新商品', 'PDF'],
    images: [],
    createdAt: '2026-04-14',
  },
];

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
  const [selectedProducts, setSelectedProducts] = useState<GridRowSelectionModel>([]);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);

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
          {(params.value as string[]).map((tag: string, index: number) => (
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
    console.log('Delete product:', id);
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
    <>
      <Header />
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
                  <Grid size={{ xs: 12, md: 4 }}>
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
                  <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>カテゴリー</InputLabel>
                      <Select
                        value={categoryFilter}
                        label="カテゴリー"
                        onChange={(e) => setCategoryFilter(e.target.value)}
                      >
                        <MenuItem value="all">すべて</MenuItem>
                        <MenuItem value={CategoryType.CARS}>車パーツ</MenuItem>
                        <MenuItem value={CategoryType.EVENTS}>イベント</MenuItem>
                        <MenuItem value={CategoryType.DIGITAL}>デジタル</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 2 }}>
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
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        disabled={(selectedProducts as any[]).length === 0}
                        onClick={handleBulkPublish}
                        startIcon={<Visibility />}
                      >
                        公開
                      </Button>
                      <Button
                        size="small"
                        disabled={(selectedProducts as any[]).length === 0}
                        onClick={handleBulkUnpublish}
                        startIcon={<VisibilityOff />}
                      >
                        非公開
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        disabled={(selectedProducts as any[]).length === 0}
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
                <DataGrid
                  rows={dummyProducts}
                  columns={columns}
                  checkboxSelection
                  onRowSelectionModelChange={setSelectedProducts}
                  rowSelectionModel={selectedProducts}
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
            <Grid container spacing={2}>
              {/* 基本情報 */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  基本情報
                </Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth label="商品名" required />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="価格（円）" type="number" required />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="初期在庫数" type="number" />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="商品説明"
                  multiline
                  rows={4}
                />
              </Grid>

              {/* 商品種別・カテゴリー */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  種別・カテゴリー
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>商品種別</InputLabel>
                  <Select label="商品種別">
                    <MenuItem value={ProductType.PHYSICAL}>通常商品</MenuItem>
                    <MenuItem value={ProductType.DIGITAL}>デジタル商品</MenuItem>
                    <MenuItem value={ProductType.DIGITAL_TICKET}>イベントチケット</MenuItem>
                    <MenuItem value={ProductType.EXTERNAL_LINK}>外部申し込み</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>カテゴリータイプ</InputLabel>
                  <Select label="カテゴリータイプ">
                    <MenuItem value={CategoryType.CARS}>車パーツ</MenuItem>
                    <MenuItem value={CategoryType.EVENTS}>イベント</MenuItem>
                    <MenuItem value={CategoryType.DIGITAL}>デジタル</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* 動的属性入力（例: 車パーツの場合） */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  商品属性
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="メーカー" placeholder="例: トヨタ" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="車種" placeholder="例: プリウス" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="型式" placeholder="例: ZVW30" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="パーツカテゴリー" placeholder="例: ブレーキ" />
              </Grid>

              {/* タグ入力 */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  タグ
                </Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="タグ（カンマ区切り）"
                  placeholder="例: セール, 送料無料, 新商品"
                  helperText="複数のタグはカンマで区切ってください"
                />
              </Grid>

              {/* 画像アップロード */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  商品画像
                </Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUpload />}
                  fullWidth
                >
                  画像をアップロード
                  <input type="file" hidden multiple accept="image/*" />
                </Button>
                <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                  複数選択可。JPG, PNG形式。自動的にWebP形式に変換され88%圧縮されます。
                </Typography>
              </Grid>

              {/* 配送設定 */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  配送設定
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="準備日数" type="number" defaultValue={3} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>配送オプション</InputLabel>
                  <Select label="配送オプション" multiple defaultValue={[]}>
                    <MenuItem value="weekend">土日着可</MenuItem>
                    <MenuItem value="date">日時指定可</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenProductDialog(false)}>キャンセル</Button>
            <Button variant="contained" onClick={() => setOpenProductDialog(false)}>
              {editingProduct ? '更新' : '登録'}
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
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth required>
                  <InputLabel>商品選択</InputLabel>
                  <Select label="商品選択">
                    {dummyProducts.map((product) => (
                      <MenuItem key={product.id} value={product.id}>
                        {product.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth required>
                  <InputLabel>調整種類</InputLabel>
                  <Select label="調整種類">
                    <MenuItem value="purchase">入庫</MenuItem>
                    <MenuItem value="adjustment">調整</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth label="数量" type="number" required />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="理由"
                  multiline
                  rows={3}
                  required
                  placeholder="例: 新規仕入れ、破損品処分"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenInventoryDialog(false)}>キャンセル</Button>
            <Button variant="contained" onClick={() => setOpenInventoryDialog(false)}>
              調整実行
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
}

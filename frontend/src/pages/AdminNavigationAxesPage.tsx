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
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
} from '@mui/x-data-grid';
import {
  Add,
  Edit,
  Delete,
  ArrowUpward,
  ArrowDownward,
  Close,
} from '@mui/icons-material';
import { Header } from '../components';
import { CategoryType, AxisType, DisplayType } from '../types';

// ダミーデータ: ナビゲーション軸
const dummyAxes = [
  {
    id: '1',
    categoryType: CategoryType.CARS,
    axisName: 'メーカー',
    axisKey: 'maker',
    order: 1,
    axisType: AxisType.SELECT,
    displayType: DisplayType.DROPDOWN,
    icon: '🚗',
    options: ['トヨタ', 'ホンダ', '日産', 'マツダ', 'スバル'],
  },
  {
    id: '2',
    categoryType: CategoryType.CARS,
    axisName: '車種',
    axisKey: 'carModel',
    order: 2,
    axisType: AxisType.SEARCH,
    displayType: DisplayType.DROPDOWN,
    icon: '🚙',
    options: ['プリウス', 'フィット', 'ノート', 'デミオ', 'インプレッサ'],
    parentAxisKey: 'maker',
  },
  {
    id: '3',
    categoryType: CategoryType.CARS,
    axisName: 'パーツカテゴリー',
    axisKey: 'partsCategory',
    order: 3,
    axisType: AxisType.SELECT,
    displayType: DisplayType.BUTTON,
    icon: '🔧',
    options: ['ブレーキ', 'サスペンション', 'エアロ', 'マフラー', 'ホイール'],
  },
  {
    id: '4',
    categoryType: CategoryType.EVENTS,
    axisName: 'イベント種類',
    axisKey: 'eventType',
    order: 1,
    axisType: AxisType.SELECT,
    displayType: DisplayType.BUTTON,
    icon: '🎪',
    options: ['車フェス', '音楽フェス', '展示会', 'ワークショップ'],
  },
  {
    id: '5',
    categoryType: CategoryType.DIGITAL,
    axisName: 'ジャンル',
    axisKey: 'genre',
    order: 1,
    axisType: AxisType.MULTI_SELECT,
    displayType: DisplayType.DROPDOWN,
    icon: '📁',
    options: ['マニュアル', '動画', 'ソフトウェア', 'テンプレート'],
  },
];

// カテゴリータイプの日本語表示
const categoryTypeMap: Record<CategoryType, string> = {
  [CategoryType.CARS]: '車パーツ',
  [CategoryType.EVENTS]: 'イベント',
  [CategoryType.DIGITAL]: 'デジタル',
};

// 軸種別の日本語表示
const axisTypeMap: Record<AxisType, string> = {
  [AxisType.SELECT]: '選択式',
  [AxisType.MULTI_SELECT]: '複数選択',
  [AxisType.SEARCH]: '検索',
  [AxisType.RANGE]: '範囲',
};

// 表示形式の日本語表示
const displayTypeMap: Record<DisplayType, string> = {
  [DisplayType.DROPDOWN]: 'ドロップダウン',
  [DisplayType.BUTTON]: 'ボタン',
  [DisplayType.RADIO]: 'ラジオ',
};

export default function AdminNavigationAxesPage() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>(CategoryType.CARS);
  const [openAxisDialog, setOpenAxisDialog] = useState(false);
  const [editingAxis, setEditingAxis] = useState<string | null>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deletingAxisId, setDeletingAxisId] = useState<string | null>(null);

  // 新規軸追加・編集用の状態
  const [axisForm, setAxisForm] = useState({
    axisName: '',
    axisKey: '',
    axisType: AxisType.SELECT,
    displayType: DisplayType.DROPDOWN,
    icon: '',
    options: '',
    parentAxisKey: '',
  });

  // 選択中のカテゴリーの軸のみフィルタリング
  const filteredAxes = dummyAxes.filter((axis) => axis.categoryType === selectedCategory);

  // DataGrid列定義
  const columns: GridColDef[] = [
    {
      field: 'order',
      headerName: '順序',
      width: 80,
      renderCell: (params: GridRenderCellParams) => (
        <Box display="flex" gap={0.5}>
          <IconButton size="small" onClick={() => handleMoveUp(params.row.id)}>
            <ArrowUpward fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => handleMoveDown(params.row.id)}>
            <ArrowDownward fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
    {
      field: 'icon',
      headerName: 'アイコン',
      width: 80,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="h6">{params.value}</Typography>
      ),
    },
    {
      field: 'axisName',
      headerName: '軸名',
      width: 150,
    },
    {
      field: 'axisKey',
      headerName: '軸キー',
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" fontFamily="monospace" color="text.secondary">
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'axisType',
      headerName: '軸種別',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip label={axisTypeMap[params.value as AxisType]} size="small" />
      ),
    },
    {
      field: 'displayType',
      headerName: '表示形式',
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Chip label={displayTypeMap[params.value as DisplayType]} size="small" variant="outlined" />
      ),
    },
    {
      field: 'options',
      headerName: '選択肢数',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2">
          {(params.value as string[]).length}個
        </Typography>
      ),
    },
    {
      field: 'parentAxisKey',
      headerName: '親軸',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        params.value ? (
          <Chip label={params.value as string} size="small" color="secondary" />
        ) : (
          <Typography variant="body2" color="text.secondary">-</Typography>
        )
      ),
    },
    {
      field: 'actions',
      headerName: '操作',
      width: 100,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box display="flex" gap={1}>
          <IconButton size="small" onClick={() => handleEditAxis(params.row.id)}>
            <Edit fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => handleOpenDeleteDialog(params.row.id)}>
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  // 軸の編集
  const handleEditAxis = (id: string) => {
    const axis = dummyAxes.find((a) => a.id === id);
    if (axis) {
      setEditingAxis(id);
      setAxisForm({
        axisName: axis.axisName,
        axisKey: axis.axisKey,
        axisType: axis.axisType,
        displayType: axis.displayType,
        icon: axis.icon || '',
        options: axis.options.join('\n'),
        parentAxisKey: axis.parentAxisKey || '',
      });
      setOpenAxisDialog(true);
    }
  };

  // 軸の追加・更新
  const handleSaveAxis = () => {
    console.log('Save axis:', axisForm);
    setOpenAxisDialog(false);
    setEditingAxis(null);
    resetAxisForm();
  };

  // 軸の削除ダイアログを開く
  const handleOpenDeleteDialog = (id: string) => {
    setDeletingAxisId(id);
    setOpenDeleteDialog(true);
  };

  // 軸の削除
  const handleDeleteAxis = () => {
    console.log('Delete axis:', deletingAxisId);
    setOpenDeleteDialog(false);
    setDeletingAxisId(null);
  };

  // 軸の順序変更（上へ）
  const handleMoveUp = (id: string) => {
    console.log('Move up:', id);
  };

  // 軸の順序変更（下へ）
  const handleMoveDown = (id: string) => {
    console.log('Move down:', id);
  };

  // フォームリセット
  const resetAxisForm = () => {
    setAxisForm({
      axisName: '',
      axisKey: '',
      axisType: AxisType.SELECT,
      displayType: DisplayType.DROPDOWN,
      icon: '',
      options: '',
      parentAxisKey: '',
    });
  };

  // ダイアログを閉じる
  const handleCloseDialog = () => {
    setOpenAxisDialog(false);
    setEditingAxis(null);
    resetAxisForm();
  };

  return (
    <>
      <Header />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" fontWeight="bold">
            ナビゲーション軸設定
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setEditingAxis(null);
              resetAxisForm();
              setOpenAxisDialog(true);
            }}
          >
            軸を追加
          </Button>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          カテゴリーごとに独自のナビゲーション軸を設定できます。商品検索・絞り込み機能で使用されます。
        </Alert>

        {/* カテゴリー選択 */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <FormControl fullWidth>
              <InputLabel>カテゴリー選択</InputLabel>
              <Select
                value={selectedCategory}
                label="カテゴリー選択"
                onChange={(e) => setSelectedCategory(e.target.value as CategoryType)}
              >
                <MenuItem value={CategoryType.CARS}>
                  🚗 {categoryTypeMap[CategoryType.CARS]}
                </MenuItem>
                <MenuItem value={CategoryType.EVENTS}>
                  🎪 {categoryTypeMap[CategoryType.EVENTS]}
                </MenuItem>
                <MenuItem value={CategoryType.DIGITAL}>
                  💾 {categoryTypeMap[CategoryType.DIGITAL]}
                </MenuItem>
              </Select>
            </FormControl>
          </CardContent>
        </Card>

        {/* 軸一覧 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {categoryTypeMap[selectedCategory]} の軸設定
            </Typography>
            {filteredAxes.length === 0 ? (
              <Box py={4} textAlign="center">
                <Typography variant="body1" color="text.secondary">
                  軸が設定されていません
                </Typography>
              </Box>
            ) : (
              <DataGrid
                rows={filteredAxes}
                columns={columns}
                autoHeight
                disableRowSelectionOnClick
                hideFooter
                sx={{ mt: 2 }}
              />
            )}
          </CardContent>
        </Card>

        {/* プレビュー（今後実装） */}
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              プレビュー
            </Typography>
            <Box
              sx={{
                bgcolor: 'grey.100',
                p: 3,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 200,
              }}
            >
              <Typography variant="body1" color="text.secondary">
                実際の顧客画面でのプレビュー機能は後で実装予定
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* 軸追加・編集ダイアログ */}
        <Dialog
          open={openAxisDialog}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">
                {editingAxis ? '軸を編集' : '軸を追加'}
              </Typography>
              <IconButton onClick={handleCloseDialog}>
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
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="軸名"
                  placeholder="例: メーカー"
                  value={axisForm.axisName}
                  onChange={(e) => setAxisForm({ ...axisForm, axisName: e.target.value })}
                  required
                  helperText="表示される名前（日本語）"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="軸キー"
                  placeholder="例: maker"
                  value={axisForm.axisKey}
                  onChange={(e) => setAxisForm({ ...axisForm, axisKey: e.target.value })}
                  required
                  helperText="英数字のみ（システム内部で使用）"
                />
              </Grid>

              {/* 軸設定 */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                  軸設定
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>軸種別</InputLabel>
                  <Select
                    value={axisForm.axisType}
                    label="軸種別"
                    onChange={(e) => setAxisForm({ ...axisForm, axisType: e.target.value as AxisType })}
                  >
                    <MenuItem value={AxisType.SELECT}>選択式（1つ選択）</MenuItem>
                    <MenuItem value={AxisType.MULTI_SELECT}>複数選択</MenuItem>
                    <MenuItem value={AxisType.SEARCH}>検索</MenuItem>
                    <MenuItem value={AxisType.RANGE}>範囲</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>表示形式</InputLabel>
                  <Select
                    value={axisForm.displayType}
                    label="表示形式"
                    onChange={(e) => setAxisForm({ ...axisForm, displayType: e.target.value as DisplayType })}
                  >
                    <MenuItem value={DisplayType.DROPDOWN}>ドロップダウン</MenuItem>
                    <MenuItem value={DisplayType.BUTTON}>ボタン</MenuItem>
                    <MenuItem value={DisplayType.RADIO}>ラジオボタン</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="アイコン（絵文字）"
                  placeholder="例: 🚗"
                  value={axisForm.icon}
                  onChange={(e) => setAxisForm({ ...axisForm, icon: e.target.value })}
                  helperText="絵文字1文字"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>親軸（任意）</InputLabel>
                  <Select
                    value={axisForm.parentAxisKey}
                    label="親軸（任意）"
                    onChange={(e) => setAxisForm({ ...axisForm, parentAxisKey: e.target.value })}
                  >
                    <MenuItem value="">なし</MenuItem>
                    {filteredAxes.map((axis) => (
                      <MenuItem key={axis.id} value={axis.axisKey}>
                        {axis.axisName} ({axis.axisKey})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* 選択肢 */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                  選択肢
                </Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="選択肢（1行に1つ）"
                  placeholder="トヨタ&#10;ホンダ&#10;日産"
                  value={axisForm.options}
                  onChange={(e) => setAxisForm({ ...axisForm, options: e.target.value })}
                  multiline
                  rows={6}
                  required
                  helperText="改行で区切って入力してください"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>キャンセル</Button>
            <Button
              variant="contained"
              onClick={handleSaveAxis}
              disabled={!axisForm.axisName || !axisForm.axisKey || !axisForm.options}
            >
              {editingAxis ? '更新' : '追加'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* 削除確認ダイアログ */}
        <Dialog
          open={openDeleteDialog}
          onClose={() => setOpenDeleteDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>軸を削除</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              この軸を削除すると、関連する商品データも影響を受ける可能性があります。
            </Alert>
            <Typography variant="body1">
              本当に削除しますか？この操作は取り消せません。
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDeleteDialog(false)}>キャンセル</Button>
            <Button variant="contained" color="error" onClick={handleDeleteAxis}>
              削除する
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
}

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
  CircularProgress,
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

import { CategoryType, AxisType, DisplayType } from '../types';
import {
  useNavigationAxesByCategory,
  useCreateNavigationAxis,
  useUpdateNavigationAxis,
  useDeleteNavigationAxis,
  useUpdateNavigationAxisOrder,
} from '../hooks/useNavigationAxes';

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

  // API統合: カテゴリー別軸データ取得
  const { data: axes = [], isLoading, error } = useNavigationAxesByCategory(selectedCategory);
  const createMutation = useCreateNavigationAxis();
  const updateMutation = useUpdateNavigationAxis();
  const deleteMutation = useDeleteNavigationAxis();
  const updateOrderMutation = useUpdateNavigationAxisOrder();

  // フィルタ済み軸データ（APIから取得したものをそのまま使用）
  const filteredAxes = axes;

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
    const axis = axes.find((a) => a.id === id);
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
  const handleSaveAxis = async () => {
    try {
      const optionsArray = axisForm.options.split('\n').filter(Boolean);

      if (editingAxis) {
        // 更新
        await updateMutation.mutateAsync({
          id: editingAxis,
          data: {
            axisName: axisForm.axisName,
            axisKey: axisForm.axisKey,
            axisType: axisForm.axisType,
            displayType: axisForm.displayType,
            icon: axisForm.icon || undefined,
            options: optionsArray,
          },
        });
      } else {
        // 新規作成
        await createMutation.mutateAsync({
          categoryType: selectedCategory,
          axisName: axisForm.axisName,
          axisKey: axisForm.axisKey,
          axisType: axisForm.axisType,
          displayType: axisForm.displayType,
          icon: axisForm.icon || undefined,
          options: optionsArray,
        });
      }

      setOpenAxisDialog(false);
      setEditingAxis(null);
      resetAxisForm();
    } catch (error) {
      console.error('Failed to save axis:', error);
      alert((error as Error).message || '保存に失敗しました');
    }
  };

  // 軸の削除ダイアログを開く
  const handleOpenDeleteDialog = (id: string) => {
    setDeletingAxisId(id);
    setOpenDeleteDialog(true);
  };

  // 軸の削除
  const handleDeleteAxis = async () => {
    if (!deletingAxisId) return;

    try {
      await deleteMutation.mutateAsync(deletingAxisId);
      setOpenDeleteDialog(false);
      setDeletingAxisId(null);
    } catch (error) {
      console.error('Failed to delete axis:', error);
      alert((error as Error).message || '削除に失敗しました');
    }
  };

  // 軸の順序変更（上へ）
  const handleMoveUp = async (id: string) => {
    const currentAxis = axes.find((a) => a.id === id);
    if (!currentAxis || currentAxis.order === 1) return;

    try {
      await updateOrderMutation.mutateAsync({
        id,
        data: { newOrder: currentAxis.order - 1 },
      });
    } catch (error) {
      console.error('Failed to move up:', error);
      alert((error as Error).message || '順序変更に失敗しました');
    }
  };

  // 軸の順序変更（下へ）
  const handleMoveDown = async (id: string) => {
    const currentAxis = axes.find((a) => a.id === id);
    const maxOrder = Math.max(...axes.map((a) => a.order));
    if (!currentAxis || currentAxis.order === maxOrder) return;

    try {
      await updateOrderMutation.mutateAsync({
        id,
        data: { newOrder: currentAxis.order + 1 },
      });
    } catch (error) {
      console.error('Failed to move down:', error);
      alert((error as Error).message || '順序変更に失敗しました');
    }
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

  // ローディング中
  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // エラー時
  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">
          ナビゲーション軸の読み込みに失敗しました: {error.message}
        </Alert>
      </Container>
    );
  }

  return (
    <>

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
              <Grid xs={12}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  基本情報
                </Typography>
              </Grid>
              <Grid xs={12} sm={6}>
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
              <Grid xs={12} sm={6}>
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
              <Grid xs={12}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                  軸設定
                </Typography>
              </Grid>
              <Grid xs={12} sm={6}>
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
              <Grid xs={12} sm={6}>
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
              <Grid xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="アイコン（絵文字）"
                  placeholder="例: 🚗"
                  value={axisForm.icon}
                  onChange={(e) => setAxisForm({ ...axisForm, icon: e.target.value })}
                  helperText="絵文字1文字"
                />
              </Grid>
              <Grid xs={12} sm={6}>
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
              <Grid xs={12}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                  選択肢
                </Typography>
              </Grid>
              <Grid xs={12}>
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

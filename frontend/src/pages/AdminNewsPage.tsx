import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Add, Edit, Delete } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  getAdminNews,
  createNews,
  updateNews,
  deleteNews,
  NEWS_CATEGORY_LABELS,
  type NewsInput,
} from '../services/api/news';
import type { NewsItem, NewsCategory } from '../types';

const emptyForm: NewsInput = {
  title: '',
  content: '',
  category: 'other',
  linkUrl: '',
  publishedAt: '',
  isPublished: true,
};

const AdminNewsPage = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<NewsInput>(emptyForm);
  const [snackbar, setSnackbar] = useState('');

  const { data: news = [], isLoading } = useQuery<NewsItem[]>({
    queryKey: ['adminNews'],
    queryFn: getAdminNews,
    staleTime: 0,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['adminNews'] });
    queryClient.invalidateQueries({ queryKey: ['topPage'] });
    queryClient.invalidateQueries({ queryKey: ['publicNews'] });
  };

  const createMut = useMutation({ mutationFn: createNews, onSuccess: invalidate });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NewsInput> }) => updateNews(id, data),
    onSuccess: invalidate,
  });
  const deleteMut = useMutation({ mutationFn: deleteNews, onSuccess: invalidate });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (item: NewsItem) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      content: item.content || '',
      category: item.category,
      linkUrl: item.linkUrl || '',
      publishedAt: item.publishedAt ? format(new Date(item.publishedAt), "yyyy-MM-dd'T'HH:mm") : '',
      isPublished: item.isPublished,
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setSnackbar('タイトルは必須です');
      return;
    }
    const payload: NewsInput = {
      ...form,
      publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : undefined,
    };
    try {
      if (editingId) {
        await updateMut.mutateAsync({ id: editingId, data: payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      setOpen(false);
      setSnackbar(editingId ? 'お知らせを更新しました' : 'お知らせを作成しました');
    } catch {
      setSnackbar('保存に失敗しました');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`「${title}」を削除しますか？`)) return;
    try {
      await deleteMut.mutateAsync(id);
      setSnackbar('お知らせを削除しました');
    } catch {
      setSnackbar('削除に失敗しました');
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'publishedAt',
      headerName: '公開日',
      width: 150,
      valueGetter: (value) => format(new Date(value), 'yyyy/MM/dd HH:mm'),
    },
    {
      field: 'category',
      headerName: '種別',
      width: 110,
      renderCell: (p: GridRenderCellParams) => (
        <Chip size="small" label={NEWS_CATEGORY_LABELS[p.value as NewsCategory] || p.value} />
      ),
    },
    { field: 'title', headerName: 'タイトル', flex: 1, minWidth: 200 },
    {
      field: 'isPublished',
      headerName: '状態',
      width: 100,
      renderCell: (p: GridRenderCellParams) => (
        <Chip
          size="small"
          label={p.value ? '公開中' : '非公開'}
          color={p.value ? 'success' : 'default'}
        />
      ),
    },
    {
      field: 'actions',
      headerName: '操作',
      width: 110,
      sortable: false,
      renderCell: (p: GridRenderCellParams) => (
        <>
          <IconButton size="small" onClick={() => openEdit(p.row)}>
            <Edit fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => handleDelete(p.row.id, p.row.title)}>
            <Delete fontSize="small" />
          </IconButton>
        </>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          お知らせ管理
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
          新規お知らせ
        </Button>
      </Box>

      <Card>
        <CardContent>
          <DataGrid
            rows={news}
            columns={columns}
            loading={isLoading}
            getRowId={(row) => row.id}
            autoHeight
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
          />
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'お知らせ編集' : '新規お知らせ'}</DialogTitle>
        <DialogContent dividers>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="タイトル"
              required
              fullWidth
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>種別</InputLabel>
              <Select
                label="種別"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as NewsCategory })}
              >
                <MenuItem value="new_product">新商品</MenuItem>
                <MenuItem value="holiday">休業</MenuItem>
                <MenuItem value="shipping">発送案内</MenuItem>
                <MenuItem value="other">その他</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="本文"
              fullWidth
              multiline
              rows={6}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              helperText="改行はそのまま反映されます"
            />
            <TextField
              label="外部リンク（任意）"
              fullWidth
              placeholder="https://... 指定するとクリックでこのURLへ移動します"
              value={form.linkUrl}
              onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
            />
            <TextField
              label="公開日時（任意）"
              type="datetime-local"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={form.publishedAt}
              onChange={(e) => setForm({ ...form, publishedAt: e.target.value })}
              helperText="未指定の場合は現在日時になります"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.isPublished}
                  onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                />
              }
              label={form.isPublished ? '公開する' : '非公開（下書き）'}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>キャンセル</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={createMut.isPending || updateMut.isPending}
          >
            {editingId ? '更新' : '作成'}
          </Button>
        </DialogActions>
      </Dialog>

      {snackbar && (
        <Box
          sx={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            bgcolor: 'grey.900', color: 'white', px: 3, py: 1.5, borderRadius: 1, zIndex: 2000,
            cursor: 'pointer',
          }}
          onClick={() => setSnackbar('')}
        >
          {snackbar}
        </Box>
      )}
    </Box>
  );
};

export default AdminNewsPage;

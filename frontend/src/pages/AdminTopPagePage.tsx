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
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { Add, Delete, ArrowUpward, ArrowDownward, CloudUpload, Edit } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ImageCropDialog from '../components/ImageCropDialog';
import {
  getHeroSlides,
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
  getMegaCategories,
  createMegaCategory,
  updateMegaCategory,
  deleteMegaCategory,
  type HeroSlideAdmin,
  type MegaCategoryAdmin,
} from '../services/api/topPageAdmin';

type EditKind = 'hero' | 'category';

const AdminTopPagePage = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);
  const [snackbar, setSnackbar] = useState('');

  // 編集フォームの状態
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editKind, setEditKind] = useState<EditKind>('hero');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [name, setName] = useState('');
  const [categoryType, setCategoryType] = useState('cars');
  const [isActive, setIsActive] = useState(true);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');

  // トリミングダイアログ
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState('');
  const [originalBlob, setOriginalBlob] = useState<Blob | null>(null);

  const { data: heroSlides = [] } = useQuery<HeroSlideAdmin[]>({
    queryKey: ['adminHeroSlides'],
    queryFn: getHeroSlides,
    staleTime: 0,
  });
  const { data: categories = [] } = useQuery<MegaCategoryAdmin[]>({
    queryKey: ['adminMegaCategories'],
    queryFn: getMegaCategories,
    staleTime: 0,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['adminHeroSlides'] });
    queryClient.invalidateQueries({ queryKey: ['adminMegaCategories'] });
    queryClient.invalidateQueries({ queryKey: ['topPage'] });
  };

  // 画像選択→トリミングへ
  const handlePickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setOriginalBlob(file);
    setCropSrc(URL.createObjectURL(file));
    setCropOpen(true);
  };

  const handleCropped = (blob: Blob) => {
    setCroppedBlob(blob);
    setPreviewUrl(URL.createObjectURL(blob));
    setCropOpen(false);
  };

  const openCreate = (kind: EditKind) => {
    setEditKind(kind);
    setEditingId(null);
    setTitle('');
    setLinkUrl('');
    setName('');
    setCategoryType('cars');
    setIsActive(true);
    setCroppedBlob(null);
    setPreviewUrl('');
    setOriginalBlob(null);
    setDialogOpen(true);
  };

  const openEditHero = (s: HeroSlideAdmin) => {
    setEditKind('hero');
    setEditingId(s.id);
    setTitle(s.title || '');
    setLinkUrl(s.linkUrl || '');
    setIsActive(s.isActive);
    setCroppedBlob(null);
    setPreviewUrl(s.imageDisplayUrl || '');
    setOriginalBlob(null);
    setDialogOpen(true);
  };

  const openEditCategory = (c: MegaCategoryAdmin) => {
    setEditKind('category');
    setEditingId(c.id);
    setName(c.name);
    setCategoryType(c.categoryType);
    setLinkUrl(c.linkUrl || '');
    setIsActive(c.isActive);
    setCroppedBlob(null);
    setPreviewUrl(c.imageDisplayUrl || '');
    setOriginalBlob(null);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editKind === 'hero') {
        if (editingId) {
          await updateHeroSlide(editingId, {
            imageBlob: croppedBlob || undefined,
            originalBlob: originalBlob || undefined,
            title,
            linkUrl,
            isActive,
          });
        } else {
          if (!croppedBlob) throw new Error('画像を選択してください');
          await createHeroSlide({ imageBlob: croppedBlob, originalBlob: originalBlob || undefined, title, linkUrl, isActive });
        }
      } else {
        if (editingId) {
          await updateMegaCategory(editingId, {
            imageBlob: croppedBlob || undefined,
            originalBlob: originalBlob || undefined,
            categoryType,
            name,
            linkUrl,
            isActive,
          });
        } else {
          await createMegaCategory({ imageBlob: croppedBlob || undefined, originalBlob: originalBlob || undefined, categoryType, name, linkUrl, isActive });
        }
      }
    },
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      setSnackbar('保存しました');
    },
    onError: (e: any) => setSnackbar(e.message || '保存に失敗しました'),
  });

  const handleDelete = async (kind: EditKind, id: string) => {
    if (!window.confirm('削除しますか？')) return;
    try {
      if (kind === 'hero') await deleteHeroSlide(id);
      else await deleteMegaCategory(id);
      invalidate();
      setSnackbar('削除しました');
    } catch {
      setSnackbar('削除に失敗しました');
    }
  };

  const handleReorder = async (kind: EditKind, list: any[], index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const a = list[index];
    const b = list[target];
    try {
      if (kind === 'hero') {
        await updateHeroSlide(a.id, { order: b.order });
        await updateHeroSlide(b.id, { order: a.order });
      } else {
        await updateMegaCategory(a.id, { order: b.order });
        await updateMegaCategory(b.id, { order: a.order });
      }
      invalidate();
    } catch {
      setSnackbar('並べ替えに失敗しました');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        トップページ編集
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="ヒーロースライダー" />
        <Tab label="カテゴリー（カテゴリーから探す）" />
      </Tabs>

      {/* ヒーロースライダー */}
      {tab === 0 && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="body2" color="text.secondary">
              一番上で自動的に切り替わるスライダーです。画像は切り抜き・拡大縮小して登録できます（推奨: 横長）。
            </Typography>
            <Button variant="contained" startIcon={<Add />} onClick={() => openCreate('hero')}>
              スライド追加
            </Button>
          </Box>
          <Stack spacing={2}>
            {heroSlides.length === 0 && (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                スライドがありません。「スライド追加」から登録してください。
              </Typography>
            )}
            {heroSlides.map((s, i) => (
              <Card key={s.id} variant="outlined">
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    component="img"
                    src={s.imageDisplayUrl}
                    alt={s.title || ''}
                    sx={{ width: 200, height: 67, objectFit: 'cover', borderRadius: 1, bgcolor: 'grey.100' }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight="bold">{s.title || '(タイトルなし)'}</Typography>
                    <Typography variant="caption" color="text.secondary">{s.linkUrl || 'リンクなし'}</Typography>
                  </Box>
                  <Chip size="small" label={s.isActive ? '公開中' : '非公開'} color={s.isActive ? 'success' : 'default'} />
                  <IconButton size="small" disabled={i === 0} onClick={() => handleReorder('hero', heroSlides, i, -1)}><ArrowUpward /></IconButton>
                  <IconButton size="small" disabled={i === heroSlides.length - 1} onClick={() => handleReorder('hero', heroSlides, i, 1)}><ArrowDownward /></IconButton>
                  <IconButton size="small" onClick={() => openEditHero(s)}><Edit /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete('hero', s.id)}><Delete /></IconButton>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>
      )}

      {/* メガカテゴリー */}
      {tab === 1 && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="body2" color="text.secondary">
              「カテゴリーから探す」に表示されるカードです。
            </Typography>
            <Button variant="contained" startIcon={<Add />} onClick={() => openCreate('category')}>
              カテゴリー追加
            </Button>
          </Box>
          <Stack spacing={2}>
            {categories.length === 0 && (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                カテゴリーがありません。「カテゴリー追加」から登録してください。
              </Typography>
            )}
            {categories.map((c, i) => (
              <Card key={c.id} variant="outlined">
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    component="img"
                    src={c.imageDisplayUrl}
                    alt={c.name}
                    sx={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 1, bgcolor: 'grey.100' }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight="bold">{c.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{c.linkUrl || 'リンクなし'}</Typography>
                  </Box>
                  <Chip size="small" label={c.isActive ? '公開中' : '非公開'} color={c.isActive ? 'success' : 'default'} />
                  <IconButton size="small" disabled={i === 0} onClick={() => handleReorder('category', categories, i, -1)}><ArrowUpward /></IconButton>
                  <IconButton size="small" disabled={i === categories.length - 1} onClick={() => handleReorder('category', categories, i, 1)}><ArrowDownward /></IconButton>
                  <IconButton size="small" onClick={() => openEditCategory(c)}><Edit /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete('category', c.id)}><Delete /></IconButton>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>
      )}

      {/* 編集ダイアログ */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingId ? '編集' : '新規追加'}（{editKind === 'hero' ? 'ヒーロースライド' : 'カテゴリー'}）
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            {/* 画像 */}
            {previewUrl && (
              <Box
                component="img"
                src={previewUrl}
                alt="preview"
                sx={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 1, bgcolor: 'grey.100' }}
              />
            )}
            <Button variant="outlined" component="label" startIcon={<CloudUpload />}>
              {previewUrl ? '画像を変更（トリミング）' : '画像を選択（トリミング）'}
              <input type="file" hidden accept="image/*" onChange={handlePickImage} />
            </Button>

            {editKind === 'hero' ? (
              <TextField label="タイトル（任意）" fullWidth value={title} onChange={(e) => setTitle(e.target.value)} />
            ) : (
              <>
                <TextField label="カテゴリー名" fullWidth value={name} onChange={(e) => setName(e.target.value)} required />
                <FormControl fullWidth>
                  <InputLabel>カテゴリー種別</InputLabel>
                  <Select label="カテゴリー種別" value={categoryType} onChange={(e) => setCategoryType(e.target.value)}>
                    <MenuItem value="cars">車パーツ</MenuItem>
                    <MenuItem value="events">イベント</MenuItem>
                    <MenuItem value="digital">デジタル</MenuItem>
                  </Select>
                </FormControl>
              </>
            )}
            <TextField
              label="リンク先（任意）"
              fullWidth
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="/products?categoryType=cars など"
            />
            <FormControlLabel
              control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
              label={isActive ? '公開する' : '非公開'}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>キャンセル</Button>
          <Button variant="contained" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* トリミングダイアログ */}
      <ImageCropDialog
        open={cropOpen}
        imageSrc={cropSrc}
        aspect={editKind === 'hero' ? 3 : 1.5}
        onClose={() => setCropOpen(false)}
        onCropped={handleCropped}
      />

      {snackbar && (
        <Box
          onClick={() => setSnackbar('')}
          sx={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', bgcolor: 'grey.900', color: 'white', px: 3, py: 1.5, borderRadius: 1, zIndex: 2000, cursor: 'pointer' }}
        >
          {snackbar}
        </Box>
      )}
    </Box>
  );
};

export default AdminTopPagePage;

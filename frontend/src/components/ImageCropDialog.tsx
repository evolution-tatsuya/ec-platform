import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slider,
  Typography,
} from '@mui/material';
import { getCroppedBlob, type Area } from '../utils/cropImage';

interface ImageCropDialogProps {
  open: boolean;
  imageSrc: string; // 元画像(objectURL等)
  aspect?: number; // 縦横比（ヒーロー: 3, カテゴリー: 1 など）
  onClose: () => void;
  onCropped: (blob: Blob) => void; // 切り抜いた画像
}

/**
 * 本格トリミングエディタ
 * - ドラッグで位置調整、スライダーで拡大縮小、アスペクト比固定
 */
const ImageCropDialog = ({ open, imageSrc, aspect = 3, onClose, onCropped }: ImageCropDialogProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleApply = async () => {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels, rotation);
      onCropped(blob);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>画像のトリミング・調整</DialogTitle>
      <DialogContent>
        <Box sx={{ position: 'relative', width: '100%', height: 360, bgcolor: '#333', borderRadius: 1 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            restrictPosition={false}
          />
        </Box>

        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" gutterBottom>拡大・縮小</Typography>
          <Slider
            value={zoom}
            min={0.5}
            max={3}
            step={0.01}
            onChange={(_, v) => setZoom(v as number)}
          />
          <Typography variant="body2" gutterBottom>回転</Typography>
          <Slider
            value={rotation}
            min={0}
            max={360}
            step={1}
            onChange={(_, v) => setRotation(v as number)}
          />
          <Typography variant="caption" color="text.secondary">
            画像をドラッグで位置調整、スライダーで拡大縮小・回転できます。
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={processing}>キャンセル</Button>
        <Button variant="contained" onClick={handleApply} disabled={processing || !croppedAreaPixels}>
          {processing ? '処理中...' : 'この範囲で決定'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImageCropDialog;

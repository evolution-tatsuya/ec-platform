// react-easy-crop の croppedAreaPixels から、切り抜いた画像Blobを生成する

export interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (e) => reject(e));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

/**
 * 切り抜いた画像をBlob(JPEG/PNG)で返す
 * @param imageSrc 元画像のURL(dataURL/objectURL)
 * @param cropPixels 切り抜き範囲(px)
 * @param maxWidth 出力の最大幅(大きすぎる画像を抑制)
 */
export async function getCroppedBlob(
  imageSrc: string,
  cropPixels: Area,
  rotation = 0,
  maxWidth = 1600,
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas context を取得できません');

  const rad = (rotation * Math.PI) / 180;

  // 回転を適用するため、まず元画像を回転付きで大きめキャンバスに描画
  const safe = Math.max(image.width, image.height) * 2;
  const rotCanvas = document.createElement('canvas');
  const rotCtx = rotCanvas.getContext('2d');
  if (!rotCtx) throw new Error('canvas context を取得できません');
  rotCanvas.width = safe;
  rotCanvas.height = safe;
  rotCtx.translate(safe / 2, safe / 2);
  rotCtx.rotate(rad);
  rotCtx.drawImage(image, -image.width / 2, -image.height / 2);

  // 回転後座標系での切り抜き位置（react-easy-cropのpixel座標に合わせる）
  const offsetX = (safe - image.width) / 2;
  const offsetY = (safe - image.height) / 2;

  // 出力サイズ（最大幅で縮小）
  let outW = cropPixels.width;
  let outH = cropPixels.height;
  if (outW > maxWidth) {
    const ratio = maxWidth / outW;
    outW = Math.round(outW * ratio);
    outH = Math.round(outH * ratio);
  }
  canvas.width = outW;
  canvas.height = outH;

  ctx.drawImage(
    rotCanvas,
    offsetX + cropPixels.x,
    offsetY + cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    outW,
    outH,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('画像の切り抜きに失敗しました'));
      },
      'image/jpeg',
      0.92,
    );
  });
}

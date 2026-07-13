import { RNG } from '../rng';

export function renderPixelateLayer(ctx: CanvasRenderingContext2D, width: number, height: number, rng: RNG, params: Record<string, any>): void {
  const blockSize = params.pixelSize ?? 10;
  if (blockSize <= 1) return;

  // 1. Copy current canvas to a full-res offscreen buffer
  const offCanvas = document.createElement('canvas');
  offCanvas.width = width;
  offCanvas.height = height;
  const offCtx = offCanvas.getContext('2d');
  if (!offCtx) return;
  offCtx.drawImage(ctx.canvas, 0, 0, width, height);

  // 2. Create a tiny canvas based on block size
  const tinyW = Math.max(1, Math.floor(width / blockSize));
  const tinyH = Math.max(1, Math.floor(height / blockSize));
  const tinyCanvas = document.createElement('canvas');
  tinyCanvas.width = tinyW;
  tinyCanvas.height = tinyH;
  const tinyCtx = tinyCanvas.getContext('2d');
  if (!tinyCtx) return;

  // 3. Draw full-res into tiny canvas (downsample)
  // We can let the browser do smooth downsampling here for better average color
  tinyCtx.imageSmoothingEnabled = true;
  tinyCtx.drawImage(offCanvas, 0, 0, tinyW, tinyH);

  // 4. Draw tiny canvas back to main canvas (upsample) without smoothing
  ctx.save();
  // We overwrite the canvas content, so we use source-over (it covers the whole canvas opaquely)
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tinyCanvas, 0, 0, width, height);
  ctx.restore();
}

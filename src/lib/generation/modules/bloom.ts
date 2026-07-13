import { RNG } from '../rng';

export function renderBloomLayer(ctx: CanvasRenderingContext2D, width: number, height: number, rng: RNG, params: Record<string, any>): void {
  const intensity = params.bloomIntensity ?? 0.5;
  if (intensity <= 0) return;

  const radius = params.bloomRadius ?? 20;
  const blendMode = (params.bloomBlendMode as GlobalCompositeOperation) || "screen";

  // To bloom the existing canvas content, we must copy it to an offscreen buffer
  const offCanvas = document.createElement('canvas');
  offCanvas.width = width;
  offCanvas.height = height;
  const offCtx = offCanvas.getContext('2d');
  
  if (!offCtx) return;

  // Copy current main canvas state to offscreen
  offCtx.drawImage(ctx.canvas, 0, 0, width, height);

  ctx.save();
  ctx.globalCompositeOperation = blendMode;
  ctx.globalAlpha = intensity;
  
  // We apply the blur filter
  ctx.filter = `blur(${radius}px)`;

  // Draw it back
  ctx.drawImage(offCanvas, 0, 0, width, height);
  
  ctx.restore();
}

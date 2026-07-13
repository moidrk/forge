import { RNG } from '../rng';

export function renderGlitchLayer(ctx: CanvasRenderingContext2D, width: number, height: number, rng: RNG, params: Record<string, any>): void {
  const intensity = params.intensity || 0.5;
  const slices = params.slices || 5;

  if (intensity <= 0) return;

  try {
    const physicalWidth = ctx.canvas.width;
    const physicalHeight = ctx.canvas.height;
    const pixelRatio = physicalWidth / width;

    const imgData = ctx.getImageData(0, 0, physicalWidth, physicalHeight);
    
    const offscreen = document.createElement('canvas');
    offscreen.width = physicalWidth;
    offscreen.height = physicalHeight;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;
    offCtx.putImageData(imgData, 0, 0);

    for (let i = 0; i < slices; i++) {
      const sliceY = rng.range(0, height);
      const sliceH = rng.range(5, height * 0.1 * intensity);
      const offsetX = rng.range(-50 * intensity, 50 * intensity);
      
      const sy = Math.max(0, Math.min(physicalHeight - 1, sliceY * pixelRatio));
      const sh = Math.max(1, Math.min(physicalHeight - sy, sliceH * pixelRatio));

      // Draw the slice back with an offset in logical space (dest coordinates)
      ctx.drawImage(offscreen, 0, sy, physicalWidth, sh, offsetX, sliceY, width, sliceH);
    }

    if (params.glitchRGB) {
      const finalData = ctx.getImageData(0, 0, physicalWidth, physicalHeight);
      const d = finalData.data;
      const shift = Math.floor(15 * intensity * pixelRatio);
      if (shift > 0) {
        const copy = new Uint8ClampedArray(d);
        for (let y = 0; y < physicalHeight; y++) {
          for (let x = 0; x < physicalWidth; x++) {
            const i = (y * physicalWidth + x) * 4;
            // Shift Red right
            if (x >= shift) d[i] = copy[i - shift * 4];
            // Shift Blue left
            if (x < physicalWidth - shift) d[i + 2] = copy[i + shift * 4 + 2];
          }
        }
        ctx.putImageData(finalData, 0, 0);
      }
    }
  } catch (e) {
    console.error('Glitch effect failed', e);
  }
}

export function generateGlitchLayerSVG(width: number, height: number, rng: RNG, params: Record<string, any>): string {
  const intensity = params.intensity || 0.5;
  const slices = params.slices || 5;

  if (intensity <= 0) return '';

  // Simulating glitch in SVG is harder because we don't have the flattened image
  // We can overlay some glitched rectangles that mimic the effect
  let svg = `<!-- Glitch Simulation Overlay -->\n`;
  
  for (let i = 0; i < slices; i++) {
    const sliceY = rng.range(0, height);
    const sliceH = rng.range(5, height * 0.1 * intensity);
    const offsetX = rng.range(-50 * intensity, 50 * intensity);
    
    // Just draw some distorted semi-transparent bars
    if (rng.chance(0.5)) {
      svg += `<rect x="${offsetX > 0 ? 0 : width + offsetX}" y="${sliceY}" width="${Math.abs(offsetX)}" height="${sliceH}" fill="rgba(255, 0, 255, 0.3)" style="mix-blend-mode: screen;" />\n`;
      svg += `<rect x="${offsetX < 0 ? 0 : width - offsetX}" y="${sliceY}" width="${Math.abs(offsetX)}" height="${sliceH}" fill="rgba(0, 255, 255, 0.3)" style="mix-blend-mode: screen;" />\n`;
    }
  }

  return svg;
}

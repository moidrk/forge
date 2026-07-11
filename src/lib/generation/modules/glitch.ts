import { RNG } from '../rng';

export function renderGlitchLayer(ctx: CanvasRenderingContext2D, width: number, height: number, rng: RNG, params: Record<string, any>): void {
  const intensity = params.intensity || 0.5;
  const slices = params.slices || 5;

  if (intensity <= 0) return;

  // For a canvas glitch, we grab pieces of the image and offset them
  // This requires the canvas to already have the image drawn on it
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    
    // We can't easily put back pieces unless we use an offscreen canvas
    // Or we just draw slices from the canvas onto itself
    
    // Quick approach: slice and shift using drawImage
    // But since we are inside render cycle, ctx is the main canvas.
    // We can't drawImage from the same canvas while modifying it without an offscreen copy.
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;
    offCtx.putImageData(imgData, 0, 0);

    for (let i = 0; i < slices; i++) {
      const sliceY = rng.range(0, height);
      const sliceH = rng.range(5, height * 0.1 * intensity);
      const offsetX = rng.range(-50 * intensity, 50 * intensity);
      
      // Draw the slice back with an offset
      ctx.drawImage(offscreen, 0, sliceY, width, sliceH, offsetX, sliceY, width, sliceH);
      
      // Add RGB split effect occasionally
      if (rng.chance(0.3)) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.fillRect(offsetX, sliceY, width, sliceH);
        ctx.restore();
      }
    }
  } catch (e) {
    // Tainted canvas or other issue
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

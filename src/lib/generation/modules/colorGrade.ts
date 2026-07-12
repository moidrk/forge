import { RNG } from '../rng';

export function renderColorGradeLayer(ctx: CanvasRenderingContext2D, width: number, height: number, rng: RNG, params: Record<string, any>): void {
  const hue = params.hue || 0; // 0 to 360
  const saturation = params.saturation || 1.0;
  const contrast = params.contrast || 1.0;
  
  // Since real color grading requires pixel manipulation or CSS filters, 
  // we'll apply an overlay for simple hue/saturation tinting
  ctx.save();
  ctx.globalCompositeOperation = 'color';
  ctx.fillStyle = `hsl(${hue}, ${Math.min(100, saturation * 100)}%, 50%)`;
  ctx.globalAlpha = 0.3; // subtle grading
  ctx.fillRect(0, 0, width, height);

  if (contrast !== 1.0) {
    ctx.globalCompositeOperation = contrast > 1.0 ? 'overlay' : 'screen';
    ctx.fillStyle = contrast > 1.0 ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
    ctx.fillRect(0, 0, width, height);
  }
  
  const vignette = params.vignette || 0;
  if (vignette > 0) {
    ctx.globalCompositeOperation = 'multiply';
    const grad = ctx.createRadialGradient(width/2, height/2, width*0.1, width/2, height/2, width*0.7);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${vignette})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }
  
  ctx.restore();
}

export function generateColorGradeLayerSVG(width: number, height: number, rng: RNG, params: Record<string, any>): string {
  const hue = params.hue || 0;
  const saturation = params.saturation || 1.0;
  const contrast = params.contrast || 1.0;

  const color = `hsl(${hue}, ${Math.min(100, saturation * 100)}%, 50%)`;
  let svg = `
    <!-- Color Grade -->
    <rect width="${width}" height="${height}" fill="${color}" opacity="0.3" style="mix-blend-mode: color;" />
  `;

  if (contrast !== 1.0) {
    const blendMode = contrast > 1.0 ? 'overlay' : 'screen';
    const fill = contrast > 1.0 ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
    svg += `<rect width="${width}" height="${height}" fill="${fill}" style="mix-blend-mode: ${blendMode};" />\n`;
  }

  const vignette = params.vignette || 0;
  if (vignette > 0) {
    const vGradId = `vignette_${rng.rangeInt(0, 1000)}`;
    svg += `
      <defs>
        <radialGradient id="${vGradId}" cx="50%" cy="50%" r="70%">
          <stop offset="50%" stop-color="rgba(0,0,0,0)" />
          <stop offset="100%" stop-color="rgba(0,0,0,${vignette})" />
        </radialGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#${vGradId})" style="mix-blend-mode: multiply;" />
    `;
  }

  return svg;
}

import { RNG } from '../rng';

export function renderPaperLayer(ctx: CanvasRenderingContext2D, width: number, height: number, rng: RNG, params: Record<string, any>): void {
  const texture = params.texture || 'grain';
  const grainIntensity = params.grainIntensity || 0.1;
  const grainSize = params.grainSize || 1;
  const paperColor = params.paperColor || '#f4f0ec';
  
  // Base paper color (using multiply or standard overlay)
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = paperColor;
  ctx.globalAlpha = 0.8;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // Noise simulation
  if (texture === 'grain' && grainIntensity > 0) {
    // Generate static noise over the image
    // To be performant, we can draw a smaller noise map and tile it or scale it
    ctx.save();
    ctx.globalAlpha = grainIntensity;
    ctx.globalCompositeOperation = 'overlay';

    // A simple programmatic noise
    const noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = 100;
    noiseCanvas.height = 100;
    const noiseCtx = noiseCanvas.getContext('2d');
    if (noiseCtx) {
      const imgData = noiseCtx.createImageData(100, 100);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const val = rng.rangeInt(0, 255);
        data[i] = val;
        data[i+1] = val;
        data[i+2] = val;
        data[i+3] = 255;
      }
      noiseCtx.putImageData(imgData, 0, 0);

      // Tile the noise
      ctx.imageSmoothingEnabled = false;
      const pattern = ctx.createPattern(noiseCanvas, 'repeat');
      if (pattern) {
        ctx.fillStyle = pattern;
        // Scale the context to simulate grain size
        ctx.scale(grainSize, grainSize);
        ctx.fillRect(0, 0, width / grainSize, height / grainSize);
      }
    }
    ctx.restore();
  }
}

export function generatePaperLayerSVG(width: number, height: number, rng: RNG, params: Record<string, any>): string {
  const texture = params.texture || 'grain';
  const grainIntensity = params.grainIntensity || 0.1;
  const paperColor = params.paperColor || '#f4f0ec';

  let svg = `
    <!-- Paper Color Base -->
    <rect width="${width}" height="${height}" fill="${paperColor}" opacity="0.8" style="mix-blend-mode: multiply;" />
  `;

  if (texture === 'grain' && grainIntensity > 0) {
    // Relying on the noiseFilter defined in the root SVG engine
    svg += `
      <rect width="${width}" height="${height}" filter="url(#noiseFilter)" opacity="${grainIntensity}" style="mix-blend-mode: overlay;" />
    `;
  }

  return svg;
}

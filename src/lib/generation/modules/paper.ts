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

  // Scratches and Dust
  if (params.scratchesEnabled) {
    const scratchIntensity = params.scratchIntensity || 0.5;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    
    // Draw scratches
    const numScratches = Math.floor(scratchIntensity * 20);
    ctx.beginPath();
    for (let i = 0; i < numScratches; i++) {
      const x = rng.range(0, width);
      const y = rng.range(0, height);
      const len = rng.range(10, 100);
      const angle = rng.range(0, Math.PI * 2);
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    }
    ctx.stroke();

    // Draw dust
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    const numDust = Math.floor(scratchIntensity * 100);
    for (let i = 0; i < numDust; i++) {
      const x = rng.range(0, width);
      const y = rng.range(0, height);
      const r = rng.range(0.5, 2);
      ctx.moveTo(x, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fill();
    
    // Draw some dark scratches
    ctx.globalCompositeOperation = 'multiply';
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    for (let i = 0; i < numScratches / 2; i++) {
      const x = rng.range(0, width);
      const y = rng.range(0, height);
      const len = rng.range(5, 50);
      const angle = rng.range(0, Math.PI * 2);
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    }
    ctx.stroke();
    
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

  if (params.scratchesEnabled) {
    const scratchIntensity = params.scratchIntensity || 0.5;
    const numScratches = Math.floor(scratchIntensity * 20);
    const numDust = Math.floor(scratchIntensity * 100);

    svg += `<g stroke="rgba(255,255,255,0.4)" stroke-width="1" style="mix-blend-mode: screen;">\n`;
    for (let i = 0; i < numScratches; i++) {
      const x = rng.range(0, width);
      const y = rng.range(0, height);
      const len = rng.range(10, 100);
      const angle = rng.range(0, Math.PI * 2);
      svg += `<line x1="${x}" y1="${y}" x2="${x + Math.cos(angle) * len}" y2="${y + Math.sin(angle) * len}" />\n`;
    }
    svg += `</g>\n`;

    svg += `<g fill="rgba(255,255,255,0.6)" style="mix-blend-mode: screen;">\n`;
    for (let i = 0; i < numDust; i++) {
      const x = rng.range(0, width);
      const y = rng.range(0, height);
      const r = rng.range(0.5, 2);
      svg += `<circle cx="${x}" cy="${y}" r="${r}" />\n`;
    }
    svg += `</g>\n`;

    svg += `<g stroke="rgba(0,0,0,0.3)" stroke-width="1" style="mix-blend-mode: multiply;">\n`;
    for (let i = 0; i < numScratches / 2; i++) {
      const x = rng.range(0, width);
      const y = rng.range(0, height);
      const len = rng.range(5, 50);
      const angle = rng.range(0, Math.PI * 2);
      svg += `<line x1="${x}" y1="${y}" x2="${x + Math.cos(angle) * len}" y2="${y + Math.sin(angle) * len}" />\n`;
    }
    svg += `</g>\n`;
  }

  return svg;
}

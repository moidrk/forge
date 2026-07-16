import { RNG } from '../rng';

export function renderGlitterLayer(ctx: CanvasRenderingContext2D, width: number, height: number, rng: RNG, params: Record<string, any>): void {
  const density = params.glitterDensity ?? 100;
  const sizeMin = params.glitterSizeMin ?? 0.5;
  const sizeMax = params.glitterSizeMax ?? 2.5;
  const opacity = params.glitterOpacity ?? 0.65;
  
  // Basic sanity check
  if (density <= 0 || opacity <= 0) return;

  ctx.save();
  ctx.globalAlpha = opacity;
  
  // Optional internal composite operation, usually 'screen' looks best for glitter
  ctx.globalCompositeOperation = 'screen';

  // Calculate particle count based on physical area and density factor.
  // Using a base reference of 1920x1080 area to keep density consistent across resolutions.
  const areaScale = (width * height) / (1920 * 1080);
  const particleCount = Math.floor(density * 100 * areaScale);

  for (let i = 0; i < particleCount; i++) {
    const x = rng.range(0, width);
    const y = rng.range(0, height);
    
    // Bias size towards the smaller end for a more natural look
    const sizeProgress = Math.pow(rng.random(), 3); // Curve towards 0
    const size = sizeMin + sizeProgress * (sizeMax - sizeMin);
    
    // Randomize shape (mostly circles, some tiny stars)
    const isStar = rng.random() > 0.8 && size > 1;

    ctx.beginPath();
    if (isStar) {
      // Draw a tiny 4-point star
      const halfSize = size / 2;
      ctx.moveTo(x, y - size);
      ctx.quadraticCurveTo(x, y, x + size, y);
      ctx.quadraticCurveTo(x, y, x, y + size);
      ctx.quadraticCurveTo(x, y, x - size, y);
      ctx.quadraticCurveTo(x, y, x, y - size);
      ctx.fillStyle = rng.random() > 0.5 ? '#ffffff' : '#f0f0ff'; // white or slight blue
      ctx.fill();
    } else {
      // Draw a circle/dot
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
  }

  ctx.restore();
}

export function generateGlitterLayerSVG(width: number, height: number, rng: RNG, params: Record<string, any>): string {
  const density = params.glitterDensity ?? 100;
  const sizeMin = params.glitterSizeMin ?? 0.5;
  const sizeMax = params.glitterSizeMax ?? 2.5;
  const opacity = params.glitterOpacity ?? 0.65;
  
  if (density <= 0 || opacity <= 0) return '';

  const areaScale = (width * height) / (1920 * 1080);
  const particleCount = Math.floor(density * 100 * areaScale);
  
  let svg = `<g opacity="${opacity}" style="mix-blend-mode: screen;">\n`;
  
  // Limiting SVG particle count to avoid massive SVG payloads, max 5000
  const maxSVGSprites = Math.min(particleCount, 5000);
  
  for (let i = 0; i < maxSVGSprites; i++) {
    const x = rng.range(0, width);
    const y = rng.range(0, height);
    const sizeProgress = Math.pow(rng.random(), 3);
    const size = sizeMin + sizeProgress * (sizeMax - sizeMin);
    
    svg += `  <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size.toFixed(2)}" fill="#ffffff" />\n`;
  }
  
  svg += `</g>\n`;
  return svg;
}

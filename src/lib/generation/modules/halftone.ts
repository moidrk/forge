import { RNG } from '../rng';

export function renderHalftoneLayer(ctx: CanvasRenderingContext2D, width: number, height: number, rng: RNG, params: Record<string, any>): void {
  const dotSize = params.dotSize || 4;
  const spacing = params.spacing || 6;
  const color = params.color || 'rgba(255, 255, 255, 0.5)';
  const style = params.style || 'dots'; // 'dots' | 'lines' | 'crosshatch'
  const angle = (params.angle || 45) * (Math.PI / 180);

  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = dotSize;
  ctx.lineCap = 'round';

  ctx.save();
  // Translate to center for rotation
  ctx.translate(width / 2, height / 2);
  ctx.rotate(angle);
  
  const diag = Math.sqrt(width * width + height * height);
  const startX = -diag / 2;
  const startY = -diag / 2;
  const endX = diag / 2;
  const endY = diag / 2;

  if (style === 'lines' || style === 'crosshatch') {
    // Horizontal lines
    for (let y = startY; y < endY; y += spacing) {
      const noiseY = Math.cos(y * 0.02 + rng.range(0, Math.PI * 2));
      const thickness = (dotSize) * (0.3 + 0.7 * Math.abs(noiseY));
      if (thickness > 0.5) {
          ctx.lineWidth = thickness;
          ctx.beginPath();
          let x = startX;
          while(x < endX) {
              const segmentLen = rng.range(20, 100);
              const gap = rng.range(2, 10);
              ctx.moveTo(x, y);
              ctx.lineTo(Math.min(x + segmentLen, endX), y);
              x += segmentLen + gap;
          }
          ctx.stroke();
      }
    }

    // Vertical lines (only for crosshatch)
    if (style === 'crosshatch') {
      for (let x = startX; x < endX; x += spacing) {
        const noiseX = Math.cos(x * 0.02 + rng.range(0, Math.PI * 2));
        const thickness = (dotSize) * (0.3 + 0.7 * Math.abs(noiseX));
        if (thickness > 0.5) {
            ctx.lineWidth = thickness;
            ctx.beginPath();
            let y = startY;
            while(y < endY) {
                const segmentLen = rng.range(20, 100);
                const gap = rng.range(2, 10);
                ctx.moveTo(x, y);
                ctx.lineTo(x, Math.min(y + segmentLen, endY));
                y += segmentLen + gap;
            }
            ctx.stroke();
        }
      }
    }
  } else {
    // dots style - batching optimization
    ctx.beginPath();
    for (let y = startY; y < endY; y += spacing) {
      for (let x = startX; x < endX; x += spacing) {
        // Create a wave or noise effect for the halftone radius
        const noiseX = Math.sin(x * 0.05 + rng.range(0, Math.PI * 2));
        const noiseY = Math.cos(y * 0.05 + rng.range(0, Math.PI * 2));
        const r = (dotSize / 2) * (0.5 + 0.5 * (noiseX * noiseY));

        if (r > 0.5) {
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, Math.PI * 2);
        }
      }
    }
    ctx.fill();
  }
  ctx.restore();
}

export function generateHalftoneLayerSVG(width: number, height: number, rng: RNG, params: Record<string, any>): string {
  const dotSize = params.dotSize || 4;
  const spacing = params.spacing || 6;
  const color = params.color || 'rgba(255, 255, 255, 0.5)';
  const style = params.style || 'dots'; // 'dots' | 'lines' | 'crosshatch'
  const angleDeg = params.angle || 45;

  let svg = `<g fill="${color}" stroke="${color}" stroke-linecap="round" transform="translate(${width/2}, ${height/2}) rotate(${angleDeg})">\n`;
  
  const diag = Math.sqrt(width * width + height * height);
  const startX = -diag / 2;
  const startY = -diag / 2;
  const endX = diag / 2;
  const endY = diag / 2;

  if (style === 'lines' || style === 'crosshatch') {
    // Horizontal lines
    for (let y = startY; y < endY; y += spacing) {
      const noiseY = Math.cos(y * 0.02 + rng.range(0, Math.PI * 2));
      const thickness = (dotSize) * (0.3 + 0.7 * Math.abs(noiseY));
      if (thickness > 0.5) {
          let x = startX;
          let path = "";
          while(x < endX) {
              const segmentLen = rng.range(20, 100);
              const gap = rng.range(2, 10);
              path += `M ${x.toFixed(2)} ${y.toFixed(2)} L ${Math.min(x + segmentLen, endX).toFixed(2)} ${y.toFixed(2)} `;
              x += segmentLen + gap;
          }
          svg += `<path d="${path}" stroke-width="${thickness.toFixed(2)}" fill="none" />\n`;
      }
    }

    // Vertical lines
    if (style === 'crosshatch') {
      for (let x = startX; x < endX; x += spacing) {
        const noiseX = Math.cos(x * 0.02 + rng.range(0, Math.PI * 2));
        const thickness = (dotSize) * (0.3 + 0.7 * Math.abs(noiseX));
        if (thickness > 0.5) {
            let y = startY;
            let path = "";
            while(y < endY) {
                const segmentLen = rng.range(20, 100);
                const gap = rng.range(2, 10);
                path += `M ${x.toFixed(2)} ${y.toFixed(2)} L ${x.toFixed(2)} ${Math.min(y + segmentLen, endY).toFixed(2)} `;
                y += segmentLen + gap;
            }
            svg += `<path d="${path}" stroke-width="${thickness.toFixed(2)}" fill="none" />\n`;
        }
      }
    }
  } else {
    // dots style
    for (let y = startY; y < endY; y += spacing) {
      for (let x = startX; x < endX; x += spacing) {
        const noiseX = Math.sin(x * 0.05 + rng.range(0, Math.PI * 2));
        const noiseY = Math.cos(y * 0.05 + rng.range(0, Math.PI * 2));
        const r = (dotSize / 2) * (0.5 + 0.5 * (noiseX * noiseY));

        if (r > 0.5) {
          svg += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}" stroke="none" />\n`;
        }
      }
    }
  }

  svg += `</g>\n`;
  return svg;
}

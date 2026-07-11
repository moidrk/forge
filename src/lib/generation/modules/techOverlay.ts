import { RNG } from '../rng';

export function renderTechOverlayLayer(ctx: CanvasRenderingContext2D, width: number, height: number, rng: RNG, params: Record<string, any>): void {
  const density = params.density || 0.5;
  const color = params.color || 'rgba(0, 0, 0, 0.8)';
  const showBarcodes = params.showBarcodes !== undefined ? params.showBarcodes : true;

  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.font = '10px monospace';
  ctx.textBaseline = 'middle';

  // 1. Draw edge rulers
  const margin = 20;
  ctx.beginPath();
  
  // Top ruler
  for (let x = margin; x < width - margin; x += 50) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, margin / 2);
    if (x % 200 === 0 && x > margin) {
      ctx.textAlign = 'center';
      ctx.fillText(x.toString(), x, margin + 5);
    }
  }

  // Bottom ruler
  for (let x = margin; x < width - margin; x += 50) {
    ctx.moveTo(x, height);
    ctx.lineTo(x, height - margin / 2);
    if (x % 200 === 0 && x > margin) {
      ctx.textAlign = 'center';
      ctx.fillText(`-${x.toString()}`, x, height - margin - 5);
    }
  }

  // Left ruler
  for (let y = margin; y < height - margin; y += 50) {
    ctx.moveTo(0, y);
    ctx.lineTo(margin / 2, y);
    if (y % 200 === 0 && y > margin) {
      ctx.textAlign = 'left';
      ctx.fillText(y.toString(), margin + 5, y);
    }
  }

  // Right ruler
  for (let y = margin; y < height - margin; y += 50) {
    ctx.moveTo(width, y);
    ctx.lineTo(width - margin / 2, y);
    if (y % 200 === 0 && y > margin) {
      ctx.textAlign = 'right';
      ctx.fillText(`-${y.toString()}`, width - margin - 5, y);
    }
  }
  ctx.stroke();

  // 2. Corner Crop Marks
  const cropSize = 30;
  const cropOffset = 40;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  
  // Top Left
  ctx.moveTo(cropOffset, cropOffset + cropSize);
  ctx.lineTo(cropOffset, cropOffset);
  ctx.lineTo(cropOffset + cropSize, cropOffset);

  // Top Right
  ctx.moveTo(width - cropOffset - cropSize, cropOffset);
  ctx.lineTo(width - cropOffset, cropOffset);
  ctx.lineTo(width - cropOffset, cropOffset + cropSize);

  // Bottom Left
  ctx.moveTo(cropOffset, height - cropOffset - cropSize);
  ctx.lineTo(cropOffset, height - cropOffset);
  ctx.lineTo(cropOffset + cropSize, height - cropOffset);

  // Bottom Right
  ctx.moveTo(width - cropOffset - cropSize, height - cropOffset);
  ctx.lineTo(width - cropOffset, height - cropOffset);
  ctx.lineTo(width - cropOffset, height - cropOffset - cropSize);
  ctx.stroke();

  // 3. Coordinate crosshairs
  ctx.lineWidth = 1;
  const numElements = Math.floor(density * 10);
  for (let i = 0; i < numElements; i++) {
    const x = rng.range(cropOffset * 2, width - cropOffset * 2);
    const y = rng.range(cropOffset * 2, height - cropOffset * 2);
    
    ctx.beginPath();
    ctx.moveTo(x - 10, y);
    ctx.lineTo(x + 10, y);
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x, y + 10);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillText(`⌖ [${x.toFixed(0)}, ${y.toFixed(0)}]`, x + 15, y);
  }

  // 4. Fake Barcode (if enabled)
  if (showBarcodes) {
    const bcX = width - 200 - rng.range(0, 100);
    const bcY = cropOffset + rng.range(0, 100);
    
    ctx.beginPath();
    let currentX = bcX;
    for (let i = 0; i < 40; i++) {
      const w = rng.rangeInt(1, 5);
      const gap = rng.rangeInt(1, 3);
      ctx.fillRect(currentX, bcY, w, 30);
      currentX += w + gap;
    }
    ctx.textAlign = 'center';
    ctx.fillText(rng.rangeInt(1000000000, 9999999999).toString(), bcX + (currentX - bcX)/2, bcY + 40);
  }

  // 5. Compass or Circle Element
  if (rng.chance(0.5)) {
    const cx = rng.range(width * 0.3, width * 0.7);
    const cy = rng.range(height * 0.2, height * 0.5);
    const r = rng.range(80, 150);
    
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // inner ticks
    ctx.beginPath();
    for (let a = 0; a < 360; a += 15) {
      const rad = a * Math.PI / 180;
      const inner = a % 90 === 0 ? r - 15 : r - 5;
      ctx.moveTo(cx + Math.cos(rad) * inner, cy + Math.sin(rad) * inner);
      ctx.lineTo(cx + Math.cos(rad) * r, cy + Math.sin(rad) * r);
    }
    ctx.stroke();
  }

  ctx.restore();
}

export function generateTechOverlayLayerSVG(width: number, height: number, rng: RNG, params: Record<string, any>): string {
  // SVG export is a mirror of Canvas logic
  const density = params.density || 0.5;
  const color = params.color || 'rgba(0, 0, 0, 0.8)';
  const showBarcodes = params.showBarcodes !== undefined ? params.showBarcodes : true;

  let svg = `<g fill="${color}" stroke="${color}" stroke-width="1" font-family="monospace" font-size="10" dominant-baseline="middle">\n`;

  // Draw rulers, crop marks etc. (Simplified for SVG fallback)
  const margin = 20;
  let path = "";
  
  for (let x = margin; x < width - margin; x += 50) {
    path += `M ${x} 0 L ${x} ${margin / 2} `;
    if (x % 200 === 0 && x > margin) {
      svg += `<text x="${x}" y="${margin + 5}" stroke="none" text-anchor="middle">${x}</text>\n`;
    }
  }
  for (let y = margin; y < height - margin; y += 50) {
    path += `M 0 ${y} L ${margin / 2} ${y} `;
    if (y % 200 === 0 && y > margin) {
      svg += `<text x="${margin + 5}" y="${y}" stroke="none" text-anchor="start">${y}</text>\n`;
    }
  }
  
  svg += `<path d="${path}" fill="none" />\n`;

  if (showBarcodes) {
    const bcX = width - 200 - rng.range(0, 100);
    const bcY = 40 + rng.range(0, 100);
    let currentX = bcX;
    for (let i = 0; i < 40; i++) {
      const w = rng.rangeInt(1, 5);
      const gap = rng.rangeInt(1, 3);
      svg += `<rect x="${currentX}" y="${bcY}" width="${w}" height="30" stroke="none" />\n`;
      currentX += w + gap;
    }
    svg += `<text x="${bcX + (currentX - bcX)/2}" y="${bcY + 40}" stroke="none" text-anchor="middle">${rng.rangeInt(1000000000, 9999999999)}</text>\n`;
  }

  svg += `</g>\n`;
  return svg;
}

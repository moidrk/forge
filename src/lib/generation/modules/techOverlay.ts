import { RNG } from '../rng';

export function renderTechOverlayLayer(ctx: CanvasRenderingContext2D, width: number, height: number, rng: RNG, params: Record<string, any>): void {
  const density = params.density || 0.5;
  const color = params.color || 'rgba(0, 0, 0, 0.8)';
  const showBarcodes = params.showBarcodes !== undefined ? params.showBarcodes : true;

  const style = params.style || 'cyberpunk'; // cyberpunk, minimalist, blueprint

  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.font = '10px monospace';
  ctx.textBaseline = 'middle';

  const margin = 20;

  if (style === 'blueprint') {
    // 1. Draw Blueprint Grid
    const gridSize = density > 0.5 ? 20 : 50;
    ctx.beginPath();
    for (let x = 0; x < width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.globalAlpha = 0.3;
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Blueprint Border & Title Block
    ctx.lineWidth = 2;
    ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);
    ctx.strokeRect(width - 250, height - 100, 230, 80);
    ctx.textAlign = 'left';
    ctx.fillText('TITLE: FORGE SCHEMATIC', width - 240, height - 80);
    ctx.fillText('DATE: ' + new Date().toISOString().split('T')[0], width - 240, height - 60);
    ctx.fillText('SCALE: 1:1', width - 240, height - 40);
  } else if (style === 'minimalist') {
    // Minimalist: Only simple crop marks and one or two crosshairs
    const cropSize = 20;
    const cropOffset = 40;
    ctx.beginPath();
    ctx.moveTo(cropOffset, cropOffset + cropSize); ctx.lineTo(cropOffset, cropOffset); ctx.lineTo(cropOffset + cropSize, cropOffset);
    ctx.moveTo(width - cropOffset - cropSize, cropOffset); ctx.lineTo(width - cropOffset, cropOffset); ctx.lineTo(width - cropOffset, cropOffset + cropSize);
    ctx.moveTo(cropOffset, height - cropOffset - cropSize); ctx.lineTo(cropOffset, height - cropOffset); ctx.lineTo(cropOffset + cropSize, height - cropOffset);
    ctx.moveTo(width - cropOffset - cropSize, height - cropOffset); ctx.lineTo(width - cropOffset, height - cropOffset); ctx.lineTo(width - cropOffset, height - cropOffset - cropSize);
    ctx.stroke();

    const x = width / 2;
    const y = height / 2;
    ctx.beginPath();
    ctx.moveTo(x - 15, y); ctx.lineTo(x + 15, y);
    ctx.moveTo(x, y - 15); ctx.lineTo(x, y + 15);
    ctx.stroke();
  } else if (style === 'tracking') {
    // AI Bounding Boxes / Object Detection
    const numBoxes = Math.floor(density * 15);
    const boxRng = new RNG(rng.seed + 10);
    ctx.lineWidth = 1;
    
    for (let i = 0; i < numBoxes; i++) {
      const bw = boxRng.range(40, 200);
      const bh = boxRng.range(40, 200);
      const bx = boxRng.range(0, width - bw);
      const by = boxRng.range(0, height - bh);
      
      // Draw Box Corners
      const l = 10; // corner length
      ctx.beginPath();
      ctx.moveTo(bx, by + l); ctx.lineTo(bx, by); ctx.lineTo(bx + l, by);
      ctx.moveTo(bx + bw - l, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + l);
      ctx.moveTo(bx, by + bh - l); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + l, by + bh);
      ctx.moveTo(bx + bw - l, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - l);
      ctx.stroke();

      // Draw faint box
      ctx.globalAlpha = 0.1;
      ctx.fillRect(bx, by, bw, bh);
      ctx.globalAlpha = 1.0;

      // Draw label
      const prefix = ["P", "C", "S", "NODE"][boxRng.rangeInt(0, 3)];
      const id = boxRng.rangeInt(1, 99);
      const data1 = boxRng.range(0, 99).toFixed(1);
      const data2 = boxRng.range(0, 99).toFixed(1);
      const label = `[${prefix}${id} ${data1},${data2}]`;
      
      ctx.fillStyle = color;
      ctx.fillRect(bx, by - 14, ctx.measureText(label).width + 8, 14);
      
      ctx.fillStyle = '#000000'; // Inverse for text
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(label, bx + 4, by - 12);
      ctx.fillStyle = color; // restore
      
      // Maybe connect a crosshair in the center
      const cx = bx + bw/2;
      const cy = by + bh/2;
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy); ctx.lineTo(cx + 5, cy);
      ctx.moveTo(cx, cy - 5); ctx.lineTo(cx, cy + 5);
      ctx.stroke();
    }
  } else if (style === 'topography') {
    // Fake topography by drawing layered distorted concentric shapes
    const numCenters = Math.floor(density * 5) + 1;
    const topoRng = new RNG(rng.seed + 10);
    ctx.lineWidth = 1;

    for (let i = 0; i < numCenters; i++) {
      const cx = topoRng.range(0, width);
      const cy = topoRng.range(0, height);
      const maxR = topoRng.range(100, 600);
      const step = topoRng.range(10, 30);
      
      const seedPhase = topoRng.range(0, 100);

      for (let r = step; r < maxR; r += step) {
        ctx.beginPath();
        for (let a = 0; a <= Math.PI * 2; a += 0.1) {
          // Simple noise distortion based on angle and radius
          const noise = Math.sin(a * 3 + seedPhase) * 10 + Math.cos(a * 5 + r * 0.05) * 5;
          const dist = r + noise;
          const x = cx + Math.cos(a) * dist;
          const y = cy + Math.sin(a) * dist;
          if (a === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
  } else {
    // Cyberpunk (Default)
    // 1. Draw edge rulers
    ctx.beginPath();
    // Top & Bottom
    for (let x = margin; x < width - margin; x += 50) {
      ctx.moveTo(x, 0); ctx.lineTo(x, margin / 2);
      ctx.moveTo(x, height); ctx.lineTo(x, height - margin / 2);
      if (x % 200 === 0 && x > margin) {
        ctx.textAlign = 'center';
        ctx.fillText(x.toString(), x, margin + 5);
        ctx.fillText(`-${x.toString()}`, x, height - margin - 5);
      }
    }
    // Left & Right
    for (let y = margin; y < height - margin; y += 50) {
      ctx.moveTo(0, y); ctx.lineTo(margin / 2, y);
      ctx.moveTo(width, y); ctx.lineTo(width - margin / 2, y);
      if (y % 200 === 0 && y > margin) {
        ctx.textAlign = 'left'; ctx.fillText(y.toString(), margin + 5, y);
        ctx.textAlign = 'right'; ctx.fillText(`-${y.toString()}`, width - margin - 5, y);
      }
    }
    ctx.stroke();

    // 2. Corner Crop Marks
    const cropSize = 30;
    const cropOffset = 40;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cropOffset, cropOffset + cropSize); ctx.lineTo(cropOffset, cropOffset); ctx.lineTo(cropOffset + cropSize, cropOffset);
    ctx.moveTo(width - cropOffset - cropSize, cropOffset); ctx.lineTo(width - cropOffset, cropOffset); ctx.lineTo(width - cropOffset, cropOffset + cropSize);
    ctx.moveTo(cropOffset, height - cropOffset - cropSize); ctx.lineTo(cropOffset, height - cropOffset); ctx.lineTo(cropOffset + cropSize, height - cropOffset);
    ctx.moveTo(width - cropOffset - cropSize, height - cropOffset); ctx.lineTo(width - cropOffset, height - cropOffset); ctx.lineTo(width - cropOffset, height - cropOffset - cropSize);
    ctx.stroke();

    // 3. Coordinate crosshairs
    ctx.lineWidth = 1;
    const numElements = Math.floor(density * 10);
    const crosshairsRng = new RNG(rng.seed + 10);
    for (let i = 0; i < numElements; i++) {
      const x = crosshairsRng.range(cropOffset * 2, width - cropOffset * 2);
      const y = crosshairsRng.range(cropOffset * 2, height - cropOffset * 2);
      ctx.beginPath();
      ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y);
      ctx.moveTo(x, y - 10); ctx.lineTo(x, y + 10);
      ctx.stroke();
      ctx.textAlign = 'left';
      ctx.fillText(`⌖ [${x.toFixed(0)}, ${y.toFixed(0)}]`, x + 15, y);
    }

    // 4. Fake Barcode
    if (showBarcodes) {
      const barcodeRng = new RNG(rng.seed + 20);
      const bcX = width - 200 - barcodeRng.range(0, 100);
      const bcY = cropOffset + barcodeRng.range(0, 100);
      ctx.beginPath();
      let currentX = bcX;
      for (let i = 0; i < 40; i++) {
        const w = barcodeRng.rangeInt(1, 5);
        const gap = barcodeRng.rangeInt(1, 3);
        ctx.fillRect(currentX, bcY, w, 30);
        currentX += w + gap;
      }
      ctx.textAlign = 'center';
      ctx.fillText(barcodeRng.rangeInt(1000000000, 9999999999).toString(), bcX + (currentX - bcX)/2, bcY + 40);
    }

    // 5. Compass or Circle Element
    const compassRng = new RNG(rng.seed + 30);
    if (density > 0.3 && compassRng.chance(0.5)) {
      const cx = compassRng.range(width * 0.3, width * 0.7);
      const cy = compassRng.range(height * 0.2, height * 0.5);
      const r = compassRng.range(80, 150);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      for (let a = 0; a < 360; a += 15) {
        const rad = a * Math.PI / 180;
        const inner = a % 90 === 0 ? r - 15 : r - 5;
        ctx.moveTo(cx + Math.cos(rad) * inner, cy + Math.sin(rad) * inner);
        ctx.lineTo(cx + Math.cos(rad) * r, cy + Math.sin(rad) * r);
      }
      ctx.stroke();
    }
  }

  ctx.restore();
}

export function generateTechOverlayLayerSVG(width: number, height: number, rng: RNG, params: Record<string, any>): string {
  const density = params.density || 0.5;
  const color = params.color || 'rgba(0, 0, 0, 0.8)';
  const showBarcodes = params.showBarcodes !== undefined ? params.showBarcodes : true;

  const style = params.style || 'cyberpunk';
  let svg = `<g fill="${color}" stroke="${color}" stroke-width="1" font-family="monospace" font-size="10" dominant-baseline="middle">\n`;

  const margin = 20;

  if (style === 'blueprint') {
    const gridSize = density > 0.5 ? 20 : 50;
    let path = "";
    for (let x = 0; x < width; x += gridSize) { path += `M ${x} 0 L ${x} ${height} `; }
    for (let y = 0; y < height; y += gridSize) { path += `M 0 ${y} L ${width} ${y} `; }
    svg += `<path d="${path}" fill="none" opacity="0.3" />\n`;
    svg += `<rect x="${margin}" y="${margin}" width="${width - margin * 2}" height="${height - margin * 2}" fill="none" stroke-width="2" />\n`;
    svg += `<rect x="${width - 250}" y="${height - 100}" width="230" height="80" fill="none" stroke-width="2" />\n`;
    svg += `<text x="${width - 240}" y="${height - 80}" stroke="none" text-anchor="start">TITLE: FORGE SCHEMATIC</text>\n`;
    svg += `<text x="${width - 240}" y="${height - 60}" stroke="none" text-anchor="start">DATE: ${new Date().toISOString().split('T')[0]}</text>\n`;
    svg += `<text x="${width - 240}" y="${height - 40}" stroke="none" text-anchor="start">SCALE: 1:1</text>\n`;
  } else if (style === 'minimalist') {
    const cropSize = 20;
    const cropOffset = 40;
    let path = "";
    path += `M ${cropOffset} ${cropOffset + cropSize} L ${cropOffset} ${cropOffset} L ${cropOffset + cropSize} ${cropOffset} `;
    path += `M ${width - cropOffset - cropSize} ${cropOffset} L ${width - cropOffset} ${cropOffset} L ${width - cropOffset} ${cropOffset + cropSize} `;
    path += `M ${cropOffset} ${height - cropOffset - cropSize} L ${cropOffset} ${height - cropOffset} L ${cropOffset + cropSize} ${height - cropOffset} `;
    path += `M ${width - cropOffset - cropSize} ${height - cropOffset} L ${width - cropOffset} ${height - cropOffset} L ${width - cropOffset} ${height - cropOffset - cropSize} `;
    const x = width / 2;
    const y = height / 2;
    path += `M ${x - 15} ${y} L ${x + 15} ${y} M ${x} ${y - 15} L ${x} ${y + 15} `;
    svg += `<path d="${path}" fill="none" stroke-width="1.5" />\n`;
  } else if (style === 'tracking') {
    // Generate AI tracking SVG
    const numBoxes = Math.floor(density * 15);
    const boxRng = new RNG(rng.seed + 10);
    let path = "";
    let rects = "";
    let labels = "";
    
    for (let i = 0; i < numBoxes; i++) {
      const bw = boxRng.range(40, 200);
      const bh = boxRng.range(40, 200);
      const bx = boxRng.range(0, width - bw);
      const by = boxRng.range(0, height - bh);
      
      const l = 10;
      path += `M ${bx} ${by + l} L ${bx} ${by} L ${bx + l} ${by} `;
      path += `M ${bx + bw - l} ${by} L ${bx + bw} ${by} L ${bx + bw} ${by + l} `;
      path += `M ${bx} ${by + bh - l} L ${bx} ${by + bh} L ${bx + l} ${by + bh} `;
      path += `M ${bx + bw - l} ${by + bh} L ${bx + bw} ${by + bh} L ${bx + bw} ${by + bh - l} `;
      
      rects += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="${color}" opacity="0.1" />\n`;

      const prefix = ["P", "C", "S", "NODE"][boxRng.rangeInt(0, 3)];
      const id = boxRng.rangeInt(1, 99);
      const label = `[${prefix}${id} ${boxRng.range(0, 99).toFixed(1)},${boxRng.range(0, 99).toFixed(1)}]`;
      
      const labelW = label.length * 6 + 8;
      rects += `<rect x="${bx}" y="${by - 14}" width="${labelW}" height="14" fill="${color}" />\n`;
      labels += `<text x="${bx + 4}" y="${by - 7}" fill="#000000" stroke="none" text-anchor="start">${label}</text>\n`;

      const cx = bx + bw/2;
      const cy = by + bh/2;
      path += `M ${cx - 5} ${cy} L ${cx + 5} ${cy} M ${cx} ${cy - 5} L ${cx} ${cy + 5} `;
    }
    
    svg += rects;
    svg += `<path d="${path}" fill="none" stroke-width="1" />\n`;
    svg += labels;
  } else if (style === 'topography') {
    // Generate Topography SVG
    const numCenters = Math.floor(density * 5) + 1;
    const topoRng = new RNG(rng.seed + 10);
    let path = "";

    for (let i = 0; i < numCenters; i++) {
      const cx = topoRng.range(0, width);
      const cy = topoRng.range(0, height);
      const maxR = topoRng.range(100, 600);
      const step = topoRng.range(10, 30);
      const seedPhase = topoRng.range(0, 100);

      for (let r = step; r < maxR; r += step) {
        let loop = "";
        for (let a = 0; a <= Math.PI * 2; a += 0.1) {
          const noise = Math.sin(a * 3 + seedPhase) * 10 + Math.cos(a * 5 + r * 0.05) * 5;
          const dist = r + noise;
          const x = cx + Math.cos(a) * dist;
          const y = cy + Math.sin(a) * dist;
          if (a === 0) loop += `M ${x} ${y} `;
          else loop += `L ${x} ${y} `;
        }
        loop += "Z ";
        path += loop;
      }
    }
    svg += `<path d="${path}" fill="none" stroke-width="1" />\n`;
  } else {
    // Cyberpunk
    // 1. Draw edge rulers
    let path = "";
    for (let x = margin; x < width - margin; x += 50) {
      path += `M ${x} 0 L ${x} ${margin / 2} M ${x} ${height} L ${x} ${height - margin / 2} `;
      if (x % 200 === 0 && x > margin) {
        svg += `<text x="${x}" y="${margin + 5}" stroke="none" text-anchor="middle">${x}</text>\n`;
        svg += `<text x="${x}" y="${height - margin - 5}" stroke="none" text-anchor="middle">-${x}</text>\n`;
      }
    }
    for (let y = margin; y < height - margin; y += 50) {
      path += `M 0 ${y} L ${margin / 2} ${y} M ${width} ${y} L ${width - margin / 2} ${y} `;
      if (y % 200 === 0 && y > margin) {
        svg += `<text x="${margin + 5}" y="${y}" stroke="none" text-anchor="start">${y}</text>\n`;
        svg += `<text x="${width - margin - 5}" y="${y}" stroke="none" text-anchor="end">-${y}</text>\n`;
      }
    }
    svg += `<path d="${path}" fill="none" />\n`;

    // 2. Corner Crop Marks
    const cropSize = 30;
    const cropOffset = 40;
    let cropPath = "";
    cropPath += `M ${cropOffset} ${cropOffset + cropSize} L ${cropOffset} ${cropOffset} L ${cropOffset + cropSize} ${cropOffset} `;
    cropPath += `M ${width - cropOffset - cropSize} ${cropOffset} L ${width - cropOffset} ${cropOffset} L ${width - cropOffset} ${cropOffset + cropSize} `;
    cropPath += `M ${cropOffset} ${height - cropOffset - cropSize} L ${cropOffset} ${height - cropOffset} L ${cropOffset + cropSize} ${height - cropOffset} `;
    cropPath += `M ${width - cropOffset - cropSize} ${height - cropOffset} L ${width - cropOffset} ${height - cropOffset} L ${width - cropOffset} ${height - cropOffset - cropSize} `;
    svg += `<path d="${cropPath}" fill="none" stroke-width="1.5" />\n`;

    // 3. Coordinate crosshairs
    const numElements = Math.floor(density * 10);
    const crosshairsRng = new RNG(rng.seed + 10);
    let crosshairPath = "";
    for (let i = 0; i < numElements; i++) {
      const x = crosshairsRng.range(cropOffset * 2, width - cropOffset * 2);
      const y = crosshairsRng.range(cropOffset * 2, height - cropOffset * 2);
      crosshairPath += `M ${x - 10} ${y} L ${x + 10} ${y} M ${x} ${y - 10} L ${x} ${y + 10} `;
      svg += `<text x="${x + 15}" y="${y}" stroke="none" text-anchor="start">⌖ [${x.toFixed(0)}, ${y.toFixed(0)}]</text>\n`;
    }
    if (crosshairPath) {
      svg += `<path d="${crosshairPath}" fill="none" stroke-width="1" />\n`;
    }

    // 4. Fake Barcode
    if (showBarcodes) {
      const barcodeRng = new RNG(rng.seed + 20);
      const bcX = width - 200 - barcodeRng.range(0, 100);
      const bcY = cropOffset + barcodeRng.range(0, 100);
      let currentX = bcX;
      let barcodeRects = "";
      for (let i = 0; i < 40; i++) {
        const w = barcodeRng.rangeInt(1, 5);
        const gap = barcodeRng.rangeInt(1, 3);
        barcodeRects += `<rect x="${currentX}" y="${bcY}" width="${w}" height="30" stroke="none" />\n`;
        currentX += w + gap;
      }
      svg += barcodeRects;
      svg += `<text x="${bcX + (currentX - bcX) / 2}" y="${bcY + 40}" stroke="none" text-anchor="middle">${barcodeRng.rangeInt(1000000000, 9999999999)}</text>\n`;
    }

    // 5. Compass or Circle Element
    const compassRng = new RNG(rng.seed + 30);
    if (density > 0.3 && compassRng.chance(0.5)) {
      const cx = compassRng.range(width * 0.3, width * 0.7);
      const cy = compassRng.range(height * 0.2, height * 0.5);
      const r = compassRng.range(80, 150);
      svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke-width="1" />\n`;
      let compassPath = "";
      for (let a = 0; a < 360; a += 15) {
        const rad = a * Math.PI / 180;
        const inner = a % 90 === 0 ? r - 15 : r - 5;
        compassPath += `M ${cx + Math.cos(rad) * inner} ${cy + Math.sin(rad) * inner} L ${cx + Math.cos(rad) * r} ${cy + Math.sin(rad) * r} `;
      }
      if (compassPath) {
        svg += `<path d="${compassPath}" fill="none" stroke-width="1" />\n`;
      }
    }
  }

  svg += `</g>\n`;
  return svg;
}

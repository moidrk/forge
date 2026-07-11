import { RNG } from '../rng';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Very simple BSP style split for asymmetrical grid
function generateGrid(rect: Rect, columns: number, rows: number, rng: RNG): Rect[] {
  let cells: Rect[] = [rect];
  const splits = Math.max(1, Math.floor((columns * rows) / 2));
  
  for (let i = 0; i < splits; i++) {
    // Pick largest cell to split
    cells.sort((a, b) => (b.w * b.h) - (a.w * a.h));
    const toSplit = cells[0];
    cells.shift();

    const splitRatio = 0.3 + (rng.random() * 0.4); // 0.3 to 0.7
    if (toSplit.w > toSplit.h) {
      // Split horizontally
      const leftW = toSplit.w * splitRatio;
      cells.push({ x: toSplit.x, y: toSplit.y, w: leftW, h: toSplit.h });
      cells.push({ x: toSplit.x + leftW, y: toSplit.y, w: toSplit.w - leftW, h: toSplit.h });
    } else {
      // Split vertically
      const topH = toSplit.h * splitRatio;
      cells.push({ x: toSplit.x, y: toSplit.y, w: toSplit.w, h: topH });
      cells.push({ x: toSplit.x, y: toSplit.y + topH, w: toSplit.w, h: toSplit.h - topH });
    }
  }
  return cells;
}

function generateSymmetricalGrid(rect: Rect, columns: number, rows: number): Rect[] {
  const cells: Rect[] = [];
  const cw = rect.w / columns;
  const ch = rect.h / rows;
  for (let c = 0; c < columns; c++) {
    for (let r = 0; r < rows; r++) {
      cells.push({ x: rect.x + c * cw, y: rect.y + r * ch, w: cw, h: ch });
    }
  }
  return cells;
}

export function renderImageLayoutLayer(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rng: RNG,
  params: Record<string, any>
) {
  const { images = [], columns = 3, rows = 3, gap = 10, opacity = 1.0, layoutStyle = 'asymmetrical', blendMode = 'source-over' } = params;
  if (!images.length) return;

  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = blendMode as GlobalCompositeOperation;

  let cells = layoutStyle === 'asymmetrical' 
    ? generateGrid({ x: 0, y: 0, w: width, h: height }, columns, rows, rng)
    : generateSymmetricalGrid({ x: 0, y: 0, w: width, h: height }, columns, rows);

  // Apply gap
  cells = cells.map(c => ({
    x: c.x + gap / 2,
    y: c.y + gap / 2,
    w: c.w - gap,
    h: c.h - gap
  }));

  // Assign images to cells deterministically based on seed
  cells.forEach((cell, i) => {
    // We map a deterministic image from the array
    const imgIndex = Math.floor(rng.random() * images.length);
    const imgSrc = images[imgIndex];
    if (!imgSrc) return;

    // Load image synchronously is tricky in Canvas. Usually UI preloads and passes HTMLImageElement 
    // or we draw placeholder if async. Since we need synchronous preview, we must assume imgSrc is loaded
    // or we draw a placeholder rectangle for now.
    // In a real app we'd have a media manager. For our pure logic:
    
    // Draw placeholder box
    ctx.fillStyle = `hsl(${rng.random() * 360}, 10%, 20%)`;
    ctx.fillRect(cell.x, cell.y, cell.w, cell.h);

    // If we had an actual image element passed (e.g. `imgSrc` is HTMLImageElement), we would drawImage it here.
    // Since images might be strings, we draw placeholders in `engine.ts` synchronously.
    if (typeof imgSrc !== 'string' && imgSrc instanceof HTMLImageElement) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(cell.x, cell.y, cell.w, cell.h);
        ctx.clip();
        
        // Simple object-fit: cover using intrinsic dimensions
        const imgW = imgSrc.naturalWidth || imgSrc.width;
        const imgH = imgSrc.naturalHeight || imgSrc.height;
        
        if (imgW > 0 && imgH > 0) {
            const imgRatio = imgW / imgH;
            const cellRatio = cell.w / cell.h;
            let drawW = cell.w;
            let drawH = cell.h;
            
            if (imgRatio > cellRatio) {
                drawW = drawH * imgRatio;
            } else {
                drawH = drawW / imgRatio;
            }
            
            const dx = cell.x + (cell.w - drawW) / 2;
            const dy = cell.y + (cell.h - drawH) / 2;

            ctx.drawImage(imgSrc, dx, dy, drawW, drawH);
        }
        ctx.restore();
    }
  });

  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = 'source-over';
}

export function generateImageLayoutLayerSVG(
  width: number,
  height: number,
  rng: RNG,
  params: Record<string, any>
): string {
  const { columns = 3, rows = 3, gap = 10, opacity = 1.0, layoutStyle = 'asymmetrical' } = params;
  let cells = layoutStyle === 'asymmetrical' 
    ? generateGrid({ x: 0, y: 0, w: width, h: height }, columns, rows, rng)
    : generateSymmetricalGrid({ x: 0, y: 0, w: width, h: height }, columns, rows);

  let svg = `<g opacity="${opacity}">`;
  cells.forEach(c => {
    const cx = c.x + gap / 2;
    const cy = c.y + gap / 2;
    const cw = c.w - gap;
    const ch = c.h - gap;
    const fill = `hsl(${Math.floor(rng.random() * 360)}, 10%, 20%)`;
    svg += `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" fill="${fill}" />`;
    svg += `\n<text x="${cx + cw/2}" y="${cy + ch/2}" fill="#fff" font-family="sans-serif" font-size="12" text-anchor="middle">Image Placeholder</text>`;
  });
  svg += `</g>`;
  return svg;
}

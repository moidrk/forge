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

  let cells = layoutStyle === 'symmetrical' 
    ? generateSymmetricalGrid({ x: 0, y: 0, w: width, h: height }, columns, rows)
    : generateGrid({ x: 0, y: 0, w: width, h: height }, columns, rows, rng);

  if (layoutStyle === 'brutalist') {
    // Brutalist means asymmetrical but overlapping wildly
    cells = cells.map(c => {
      const overlapFactorX = 1.2 + rng.random() * 0.8; // 20% to 100% wider
      const overlapFactorY = 1.2 + rng.random() * 0.8; // 20% to 100% taller
      const nw = c.w * overlapFactorX;
      const nh = c.h * overlapFactorY;
      // Randomly shift center
      const offsetX = (rng.random() - 0.5) * c.w * 0.5;
      const offsetY = (rng.random() - 0.5) * c.h * 0.5;
      return {
        x: c.x - (nw - c.w) / 2 + offsetX,
        y: c.y - (nh - c.h) / 2 + offsetY,
        w: nw,
        h: nh
      };
    });
  }

  // Apply gap
  if (layoutStyle !== 'brutalist') {
    cells = cells.map(c => ({
      x: c.x + gap / 2,
      y: c.y + gap / 2,
      w: c.w - gap,
      h: c.h - gap
    }));
  }

  // Assign images to cells deterministically based on seed
  cells.forEach((cell, i) => {
    const cellRng = new RNG(rng.seed + i * 100);
    const imgIndex = Math.floor(cellRng.random() * images.length);
    const imgSrc = images[imgIndex];
    if (!imgSrc) return;

    // Draw placeholder box
    ctx.fillStyle = `hsl(${cellRng.random() * 360}, 10%, 20%)`;
    ctx.fillRect(cell.x, cell.y, cell.w, cell.h);

    const imgObj = (typeof imgSrc === 'object' && imgSrc !== null && !('tagName' in imgSrc))
      ? imgSrc
      : { image: imgSrc, scale: 1.0, transformX: 0, transformY: 0, opacity: 1.0, blendMode: 'source-over', imageShaderFilter: 'none', id: '' };

    const imgElement = imgObj.image;
    if (!imgElement) return;

    if (typeof imgElement !== 'string' && imgElement instanceof HTMLImageElement) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(cell.x, cell.y, cell.w, cell.h);
        ctx.clip();

        const imgScale = imgObj.scale ?? 1.0;
        const imgTransformX = imgObj.transformX ?? 0;
        const imgTransformY = imgObj.transformY ?? 0;
        const imgOpacity = imgObj.opacity ?? 1.0;
        const imgBlendMode = imgObj.blendMode ?? 'source-over';
        const imgShaderFilter = imgObj.imageShaderFilter ?? 'none';
        const imgId = imgObj.id ?? '';

        ctx.globalAlpha = opacity * imgOpacity;
        ctx.globalCompositeOperation = imgBlendMode as GlobalCompositeOperation;

        // Simple object-fit: cover using intrinsic dimensions
        const imgW = imgElement.naturalWidth || imgElement.width;
        const imgH = imgElement.naturalHeight || imgElement.height;
        
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

            const finalW = drawW * imgScale;
            const finalH = drawH * imgScale;
            const finalX = dx + imgTransformX + (drawW - finalW) / 2;
            const finalY = dy + imgTransformY + (drawH - finalH) / 2;

            const hasShader = imgShaderFilter && imgShaderFilter !== "none";
            if (hasShader && imgId) {
               const shaderCanvas = document.querySelector<HTMLCanvasElement>(`#shader-${imgId} canvas`);
               if (shaderCanvas && shaderCanvas.width > 0 && shaderCanvas.height > 0) {
                  const offCanvas = document.createElement('canvas');
                  offCanvas.width = finalW;
                  offCanvas.height = finalH;
                  const offCtx = offCanvas.getContext('2d')!;
                  
                  offCtx.drawImage(imgElement, 0, 0, finalW, finalH);
                  offCtx.globalCompositeOperation = "source-in";
                  offCtx.drawImage(shaderCanvas, 0, 0, finalW, finalH);
                  
                  ctx.drawImage(offCanvas, finalX, finalY, finalW, finalH);
               } else {
                   ctx.drawImage(imgElement, finalX, finalY, finalW, finalH);
               }
            } else {
               ctx.drawImage(imgElement, finalX, finalY, finalW, finalH);
            }
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
  const { images = [], columns = 3, rows = 3, gap = 10, opacity = 1.0, layoutStyle = 'asymmetrical' } = params;
  let cells = layoutStyle === 'symmetrical' 
    ? generateSymmetricalGrid({ x: 0, y: 0, w: width, h: height }, columns, rows)
    : generateGrid({ x: 0, y: 0, w: width, h: height }, columns, rows, rng);

  if (layoutStyle === 'brutalist') {
    cells = cells.map(c => {
      const overlapFactorX = 1.2 + rng.random() * 0.8;
      const overlapFactorY = 1.2 + rng.random() * 0.8;
      const nw = c.w * overlapFactorX;
      const nh = c.h * overlapFactorY;
      const offsetX = (rng.random() - 0.5) * c.w * 0.5;
      const offsetY = (rng.random() - 0.5) * c.h * 0.5;
      return {
        x: c.x - (nw - c.w) / 2 + offsetX,
        y: c.y - (nh - c.h) / 2 + offsetY,
        w: nw,
        h: nh
      };
    });
  }

  let svg = `<g opacity="${opacity}">`;
  cells.forEach((c, i) => {
    let cx = c.x;
    let cy = c.y;
    let cw = c.w;
    let ch = c.h;
    
    if (layoutStyle !== 'brutalist') {
      cx += gap / 2;
      cy += gap / 2;
      cw -= gap;
      ch -= gap;
    }

    const cellRng = new RNG(rng.seed + i * 100);
    const imgIndex = Math.floor(cellRng.random() * images.length);
    const imgSrc = images[imgIndex];

    const fill = `hsl(${Math.floor(cellRng.random() * 360)}, 10%, 20%)`;
    svg += `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" fill="${fill}" />\n`;

    let hasImage = false;
    if (imgSrc) {
      const imgObj = (typeof imgSrc === 'object' && imgSrc !== null && !('tagName' in imgSrc))
        ? imgSrc
        : { image: imgSrc, scale: 1.0, transformX: 0, transformY: 0, opacity: 1.0, blendMode: 'source-over', imageShaderFilter: 'none', id: '' };

      const imgElement = imgObj.image;
      const imgScale = imgObj.scale ?? 1.0;
      const imgTransformX = imgObj.transformX ?? 0;
      const imgTransformY = imgObj.transformY ?? 0;
      const imgOpacity = imgObj.opacity ?? 1.0;
      const imgBlendMode = imgObj.blendMode ?? 'source-over';

      if (imgElement) {
        const href = typeof imgElement === 'string' ? imgElement : (imgElement as HTMLImageElement).src || '';
        if (href) {
          const transformStr = `translate(${cx + cw / 2 + imgTransformX}, ${cy + ch / 2 + imgTransformY}) scale(${imgScale}) translate(${-(cx + cw / 2)}, ${-(cy + ch / 2)})`;
          svg += `<image href="${href}" x="${cx}" y="${cy}" width="${cw}" height="${ch}" preserveAspectRatio="xMidYMid slice" transform="${transformStr}" opacity="${imgOpacity}" style="mix-blend-mode: ${imgBlendMode}" />\n`;
          hasImage = true;
        }
      }
    }

    if (!hasImage) {
      svg += `<text x="${cx + cw/2}" y="${cy + ch/2}" fill="#fff" font-family="sans-serif" font-size="12" text-anchor="middle">Image Placeholder</text>\n`;
    }
  });
  svg += `</g>`;
  return svg;
}

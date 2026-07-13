# Core Rendering & Effects Pipeline Analysis

This report documents the structural and rendering issues discovered in the Forge application across:
- RNG stage seed isolation
- High-DPI canvas glitch rendering
- Halftone effect performance and features
- Tech overlay SVG export & RNG desynchronization
- Grid layout group child-layer properties and SVG export
- Image upload error resilience

---

## 1. RNG Stage Seed Isolation

### Observation
In `src/lib/generation/engine.ts`, the seed for each rendering layer is derived using the index of the loop:
- **Location**: `src/lib/generation/engine.ts:60` and `src/lib/generation/engine.ts:152`
```typescript
56:   for (let i = 0; i < recipe.layers.length; i++) {
...
60:     const rng = new RNG(recipe.seed + i);
```
And:
```typescript
148:   for (let i = 0; i < recipe.layers.length; i++) {
...
152:     const rng = new RNG(recipe.seed + i);
```

### Logic Chain
1. If a layer is deleted, the length of the layers array decreases, and the array indices of all subsequent/preceding layers shift.
2. If a layer is added or reordered, the array indices of existing layers shift.
3. Because the seed is computed as `recipe.seed + i` (where `i` is the index), any shift in index `i` changes the seed of that layer.
4. Changing the layer's seed causes all procedurally generated features (halftone dots, tech overlay lines, glitch slices, grid splits) of that layer to be re-rolled entirely.
5. This violates the RNG Stage Seed Isolation requirement, which states that parameter tweaks (or layer management operations) on one layer must not accidentally re-roll values in other layers.

### Fix Strategy
Derive the layer seed from a deterministic hash of the layer's persistent string `id` instead of its array index:
```typescript
function getSeedFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (Math.imul(31, hash) + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// Inside engine.ts:
const layerSeed = recipe.seed + getSeedFromId(layer.id);
const rng = new RNG(layerSeed);
```
If a custom seed is set on a layout (e.g. `layoutSeed`), use it. Fall back to `recipe.seed + getSeedFromId(layer.id)` if missing.

---

## 2. High-DPI Glitch Effect Rendering (Retina Display Bug)

### Observation
The glitch layer grabs canvas backing pixels using `ctx.getImageData` and draws slices back with offsets using `ctx.drawImage` and `ctx.putImageData`.
- **Location**: `src/lib/generation/modules/glitch.ts:12-25` and `src/lib/generation/modules/glitch.ts:37-53`
```typescript
12:     const imgData = ctx.getImageData(0, 0, width, height);
...
20:     const offscreen = document.createElement('canvas');
21:     offscreen.width = width;
22:     offscreen.height = height;
23:     const offCtx = offscreen.getContext('2d');
24:     if (!offCtx) return;
25:     offCtx.putImageData(imgData, 0, 0);
```
And:
```typescript
37:       const finalData = ctx.getImageData(0, 0, width, height);
...
52:         ctx.putImageData(finalData, 0, 0);
```

### Logic Chain
1. On screens where `window.devicePixelRatio > 1` (such as Retina displays), the canvas backing store has dimensions `width * pixelRatio` and `height * pixelRatio`.
2. `ctx.getImageData(0, 0, width, height)` uses CSS pixels `width` and `height`. It reads a subset of the backing store corresponding to the top-left `1 / pixelRatio` fraction of the physical canvas.
3. Placing this image data onto `offscreen` (which has CSS width and height) creates a cropped, lower-resolution copy of the top-left quadrant of the canvas.
4. When `ctx.drawImage` draws slices from `offscreen` back onto `ctx` (which is scaled by `pixelRatio`), the cropped portion is stretched, causing misaligned coordinates and pixelation.
5. In the RGB split section, `ctx.putImageData(finalData, 0, 0)` is written directly into physical pixels, completely ignoring the `ctx` transform. It writes the low-res top-left quadrant to the top-left of the canvas, leaving the rest of the canvas untouched/distorted.

### Fix Strategy
Use physical backing store coordinates for `getImageData` and `putImageData`, copy using `drawImage`, and scale the RGB shift amount by the pixel ratio:
```typescript
export function renderGlitchLayer(ctx: CanvasRenderingContext2D, width: number, height: number, rng: RNG, params: Record<string, any>): void {
  const intensity = params.intensity || 0.5;
  const slices = params.slices || 5;

  if (intensity <= 0) return;

  try {
    const canvas = ctx.canvas;
    const pixelRatio = canvas.width / width; // Derive devicePixelRatio

    // Create offscreen canvas matched to physical backing dimensions
    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;
    
    // Copy the entire physical canvas
    offCtx.drawImage(canvas, 0, 0);

    for (let i = 0; i < slices; i++) {
      const sliceY = rng.range(0, height);
      const sliceH = rng.range(5, height * 0.1 * intensity);
      const offsetX = rng.range(-50 * intensity, 50 * intensity);
      
      // Draw slice back with physical source and CSS destination coordinates
      ctx.drawImage(
        offscreen,
        0, sliceY * pixelRatio, canvas.width, sliceH * pixelRatio,
        offsetX, sliceY, width, sliceH
      );
    }

    if (params.glitchRGB) {
      const finalData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = finalData.data;
      const shift = Math.floor(15 * intensity * pixelRatio);
      if (shift > 0) {
        const copy = new Uint8ClampedArray(d);
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            if (x >= shift) d[i] = copy[i - shift * 4];
            if (x < canvas.width - shift) d[i + 2] = copy[i + shift * 4 + 2];
          }
        }
        ctx.putImageData(finalData, 0, 0);
      }
    }
  } catch (e) {
    console.error('Glitch effect failed', e);
  }
}
```

---

## 3. Halftone Effect Performance & Missing Style

### Observation
Halftone rendering has two issues:
1. **Performance**: In `dots` mode, `ctx.beginPath()`, `ctx.arc()`, and `ctx.fill()` are executed for *each dot* in the double loop.
   - **Location**: `src/lib/generation/modules/halftone.ts:51-55`
```typescript
51:           if (r > 0.5) {
52:             ctx.beginPath();
53:             ctx.arc(x, y, r, 0, Math.PI * 2);
54:             ctx.fill();
55:           }
```
2. **Missing Style**: `performGodModeShuffle` randomly assigns `"crosshatch"` style, but the halftone module only supports `"dots"` and `"lines"`.
   - **Location**: `src/lib/generation/modules/halftone.ts:7` and `src/routes/index.tsx:79`

### Logic Chain
1. Calling `ctx.fill()` hundreds of thousands of times per frame in a double loop adds immense overhead to the canvas drawing state machine, freezing the UI.
2. The `"crosshatch"` style is a common print effect, and selecting it fails silently by falling back to `dots` because it is not handled in the switch/conditions of `halftone.ts`.

### Fix Strategy
1. **Batching**: Initialize `ctx.beginPath()` before the loops, add arcs with `ctx.moveTo(x + r, y)` to avoid connecting lines, and call `ctx.fill()` once after the loops terminate.
2. **Crosshatch Style**: Implement crosshatch as two perpendicular sets of lines (at `angle` and `angle + 90°`).
```typescript
export function renderHalftoneLayer(ctx: CanvasRenderingContext2D, width: number, height: number, rng: RNG, params: Record<string, any>): void {
  const dotSize = params.dotSize || 4;
  const spacing = params.spacing || 6;
  const color = params.color || 'rgba(255, 255, 255, 0.5)';
  const style = params.style || 'dots';
  const angle = (params.angle || 45) * (Math.PI / 180);

  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = dotSize;
  ctx.lineCap = 'round';

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(angle);
  
  const diag = Math.sqrt(width * width + height * height);
  const startX = -diag / 2;
  const startY = -diag / 2;
  const endX = diag / 2;
  const endY = diag / 2;

  if (style === 'lines' || style === 'crosshatch') {
    const drawLines = () => {
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
    };

    drawLines();

    if (style === 'crosshatch') {
      ctx.rotate(Math.PI / 2); // Rotate perpendicular
      drawLines();
    }
  } else {
    // Dots style (Batched)
    ctx.beginPath();
    for (let y = startY; y < endY; y += spacing) {
      for (let x = startX; x < endX; x += spacing) {
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
```

---

## 4. Tech Overlay SVG Export & RNG Desynchronization

### Observation
The `generateTechOverlayLayerSVG` function lacks most of the visual features drawn by `renderTechOverlayLayer`.
- **Location**: `src/lib/generation/modules/techOverlay.ts:183-211`

### Logic Chain
1. `generateTechOverlayLayerSVG` under `cyberpunk` style is missing:
   - Crop corner marks
   - Coordinate crosshairs
   - Compass/circle element
2. Because it lacks these loops, it calls `rng.range()` and `rng.chance()` significantly fewer times than `renderTechOverlayLayer`.
3. Consequently, the seed state is completely desynchronized between canvas rendering and SVG rendering. Any subsequent RNG call (e.g., the barcode numbers/sizes) yields entirely different values.
4. This results in the SVG output looking completely different from the canvas preview.

### Fix Strategy
Update `generateTechOverlayLayerSVG` to fully implement and mirror all visual elements from `renderTechOverlayLayer`, maintaining identical RNG consumption order:
```typescript
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
  } else {
    // Cyberpunk
    // 1. Edge Rulers
    let rulerPath = "";
    for (let x = margin; x < width - margin; x += 50) {
      rulerPath += `M ${x} 0 L ${x} ${margin / 2} M ${x} ${height} L ${x} ${height - margin / 2} `;
      if (x % 200 === 0 && x > margin) {
        svg += `<text x="${x}" y="${margin + 5}" stroke="none" text-anchor="middle">${x}</text>\n`;
      }
    }
    for (let y = margin; y < height - margin; y += 50) {
      rulerPath += `M 0 ${y} L ${margin / 2} ${y} M ${width} ${y} L ${width - margin / 2} ${y} `;
      if (y % 200 === 0 && y > margin) {
        svg += `<text x="${margin + 5}" y="${y}" stroke="none" text-anchor="start">${y}</text>\n`;
      }
    }
    svg += `<path d="${rulerPath}" fill="none" />\n`;

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
    let crosshairPath = "";
    for (let i = 0; i < numElements; i++) {
      const x = rng.range(cropOffset * 2, width - cropOffset * 2);
      const y = rng.range(cropOffset * 2, height - cropOffset * 2);
      crosshairPath += `M ${x - 10} ${y} L ${x + 10} ${y} M ${x} ${y - 10} L ${x} ${y + 10} `;
      svg += `<text x="${x + 15}" y="${y}" stroke="none" text-anchor="start">⌖ [${x.toFixed(0)}, ${y.toFixed(0)}]</text>\n`;
    }
    svg += `<path d="${crosshairPath}" fill="none" stroke-width="1" />\n`;

    // 4. Fake Barcode
    if (showBarcodes) {
      const bcX = width - 200 - rng.range(0, 100);
      const bcY = cropOffset + rng.range(0, 100);
      let currentX = bcX;
      for (let i = 0; i < 40; i++) {
        const w = rng.rangeInt(1, 5);
        const gap = rng.rangeInt(1, 3);
        svg += `<rect x="${currentX}" y="${bcY}" width="${w}" height="30" stroke="none" />\n`;
        currentX += w + gap;
      }
      svg += `<text x="${bcX + (currentX - bcX)/2}" y="${bcY + 40}" stroke="none" text-anchor="middle">${rng.rangeInt(1000000000, 9999999999)}</text>\n`;
    }

    // 5. Compass or Circle Element
    if (density > 0.3 && rng.chance(0.5)) {
      const cx = rng.range(width * 0.3, width * 0.7);
      const cy = rng.range(height * 0.2, height * 0.5);
      const r = rng.range(80, 150);
      svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke-width="1" />\n`;
      let compassPath = "";
      for (let a = 0; a < 360; a += 15) {
        const rad = a * Math.PI / 180;
        const inner = a % 90 === 0 ? r - 15 : r - 5;
        compassPath += `M ${cx + Math.cos(rad) * inner} ${cy + Math.sin(rad) * inner} L ${cx + Math.cos(rad) * r} ${cy + Math.sin(rad) * r} `;
      }
      svg += `<path d="${compassPath}" fill="none" stroke-width="1" />\n`;
    }
  }

  svg += `</g>\n`;
  return svg;
}
```

---

## 5. Grid Layout Group Child Properties & SVG Export

### Observation
The Grid Layout group consumes children layers but has three critical defects:
1. **Property Bypass**: `renderImageLayoutLayer` only consumes the raw `HTMLImageElement`s from `params.images`, entirely ignoring child layer properties (scale, transformX/Y, opacity, blendMode, shader filters).
   - **Location**: `src/lib/generation/modules/imageLayout.ts:96-141`
2. **Missing SVG Images**: `generateImageLayoutLayerSVG` only renders placeholder `<rect>` elements instead of embedding the actual uploaded images.
   - **Location**: `src/lib/generation/modules/imageLayout.ts:177-192`
3. **BSP Grid Sizing**: `generateGrid` splits only `Math.floor((columns * rows) / 2)` times. For a 3x3 layout, this yields 5 cells instead of 9, which can lead to layout confusion.
   - **Location**: `src/lib/generation/modules/imageLayout.ts:13`

### Logic Chain
1. When a user uploads images, they are created as child layers of the Grid Layout group. In the properties panel, users can select child layers and apply scale, position, and shader filters.
2. Because the grid renderer reads only `imageMap.get(c.id)` (raw image elements), adjustments made by the user are completely bypassed and do not render on the canvas.
3. In SVG exports, the generator has no access to the images and only writes grey rectangles, leaving exports incomplete.
4. Limiting BSP cell splits to `Math.floor((columns * rows) / 2)` does not match symmetrical grids, causing layout discrepancies.

### Fix Strategy
1. **Data Transfer**: Update `createRecipeFromState` in `ForgeCanvas.tsx` to map children to rich objects containing image data, ID, and parameters:
```typescript
    } else if (type === "imageLayout") {
      const children = state.layers.filter((l: any) => l.parentGroupId === layer.id);
      params.images = children.map((c: any) => {
        const img = imageMap.get(c.id);
        if (!img) return null;
        const childProps = store[c.id] || {};
        return {
          id: c.id,
          image: img,
          scale: childProps.scale ?? 1.0,
          transformX: childProps.transformX ?? 0,
          transformY: childProps.transformY ?? 0,
          imageShaderFilter: childProps.imageShaderFilter || "none",
          preserveTransparency: childProps.preserveTransparency ?? true,
          opacity: childProps.opacity ?? childProps.imageOpacity ?? 1.0,
          blendMode: childProps.blendMode || childProps.imageBlendMode || "source-over"
        };
      }).filter(Boolean);
    }
```
2. **Renderer Properties Support**: Update `renderImageLayoutLayer` to apply scale, position, opacity, blendMode, and shader filters for each cell:
```typescript
  cells.forEach((cell, i) => {
    const imgIndex = Math.floor(rng.random() * images.length);
    const imgData = images[imgIndex];
    if (!imgData) return;

    let img: HTMLImageElement;
    let childParams: any = {};
    let childId = "";

    if (imgData instanceof HTMLImageElement) {
      img = imgData;
    } else {
      img = imgData.image;
      childParams = imgData;
      childId = imgData.id;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(cell.x, cell.y, cell.w, cell.h);
    ctx.clip();

    const imgW = img.naturalWidth || img.width;
    const imgH = img.naturalHeight || img.height;

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

      const scale = childParams.scale ?? 1.0;
      const tx = childParams.transformX ?? 0;
      const ty = childParams.transformY ?? 0;

      const finalW = drawW * scale;
      const finalH = drawH * scale;
      const finalX = dx + tx + (drawW - finalW) / 2;
      const finalY = dy + ty + (drawH - finalH) / 2;

      ctx.globalAlpha = (params.opacity ?? 1) * (childParams.opacity ?? 1.0);
      ctx.globalCompositeOperation = childParams.blendMode || "source-over";

      const hasShader = childParams.imageShaderFilter && childParams.imageShaderFilter !== "none";
      const preserveTransparency = childParams.preserveTransparency ?? true;

      if (hasShader && childId) {
        const shaderCanvas = document.querySelector<HTMLCanvasElement>(`#shader-${childId} canvas`);
        if (shaderCanvas && shaderCanvas.width > 0 && shaderCanvas.height > 0) {
          if (preserveTransparency) {
            const offCanvas = document.createElement('canvas');
            offCanvas.width = cell.w;
            offCanvas.height = cell.h;
            const offCtx = offCanvas.getContext('2d')!;
            
            offCtx.drawImage(img, finalX - cell.x, finalY - cell.y, finalW, finalH);
            offCtx.globalCompositeOperation = "source-in";
            offCtx.drawImage(shaderCanvas, 0, 0, cell.w, cell.h);
            
            ctx.drawImage(offCanvas, cell.x, cell.y, cell.w, cell.h);
          } else {
            ctx.drawImage(shaderCanvas, cell.x, cell.y, cell.w, cell.h);
          }
        } else {
          ctx.drawImage(img, finalX, finalY, finalW, finalH);
        }
      } else {
        ctx.drawImage(img, finalX, finalY, finalW, finalH);
      }
    }
    ctx.restore();
  });
```
3. **SVG Images Support**: Update `generateImageLayoutLayerSVG` to output SVG `<image>` tags with `preserveAspectRatio="xMidYMid slice"` to support real image rendering in SVG:
```typescript
    const imgIndex = Math.floor(rng.random() * (params.images?.length || 1));
    const imgData = params.images?.[imgIndex];

    if (imgData) {
      let imgSrc = "";
      if (imgData instanceof HTMLImageElement) {
        imgSrc = imgData.src;
      } else if (imgData && imgData.image) {
        imgSrc = imgData.image.src;
      }

      if (imgSrc) {
        svg += `<image href="${imgSrc}" x="${cx.toFixed(2)}" y="${cy.toFixed(2)}" width="${cw.toFixed(2)}" height="${ch.toFixed(2)}" preserveAspectRatio="xMidYMid slice" />\n`;
      } else {
        drawPlaceholder();
      }
    } else {
      drawPlaceholder();
    }
```
4. **BSP Grid Sizing Split Match**: Update `generateGrid` splits logic to match symmetric grid complexity if preferred, or maintain the organic asymmetric feel but ensure cell count matches the target grid cells (`columns * rows`).

---

## 6. Image Upload Error Resilience

### Observation
If any single uploaded image fails to load (e.g. invalid base64 data, revoked object URL, corrupt file), the entire canvas preview halts.
- **Location**: `src/app/ForgeCanvas.tsx:85-104`
```typescript
85:     const imagesPromises = state.mediaAssets
...
89:           const img = new Image();
90:           img.onload = () => resolve({ id: asset.layerId || asset.id, img });
91:           img.onerror = reject;
92:           img.src = asset.dataUrl;
...
96:     Promise.all(imagesPromises).then((imagesData) => {
...
103:     }).catch(console.error);
```

### Logic Chain
1. When `Promise.all` receives a rejected promise, it immediately rejects the entire aggregate promise.
2. The `.then` block that constructs the recipe and triggers `generatePreview` is skipped, hitting the `.catch` block instead.
3. This halts canvas preview rendering entirely, showing a blank canvas to the user.

### Fix Strategy
Resolve `null` on image load error, and filter out failed images from the loaded dataset, preventing any single bad image from breaking the entire application:
```typescript
    const imagesPromises = state.mediaAssets
      .filter((asset) => asset.sourceTarget === "images" || !asset.sourceTarget)
      .map((asset) => {
        return new Promise<{ id: string, img: HTMLImageElement } | null>((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ id: asset.layerId || asset.id, img });
          img.onerror = () => resolve(null); // Fail gracefully
          img.src = asset.dataUrl;
        });
      });

    Promise.all(imagesPromises).then((imagesData) => {
      const imageMap = new Map<string, HTMLImageElement>();
      imagesData.forEach(d => {
        if (d) imageMap.set(d.id, d.img);
      });

      const recipe = createRecipeFromState(state, store, imageMap);
      currentRecipeRef.current = recipe;
      generatePreview(recipe, canvasRef.current!);
    }).catch(console.error);
```

# Analysis: Core Rendering & Effects Pipeline Issues

## Summary of Findings
A systematic investigation of the Forge rendering pipeline, schema, and modules reveals several critical bugs and architectural issues:
1. **Physical vs. Logical Coordinate Mismatch in Glitch Effect**: The glitch module uses logical coordinates for physical `getImageData` and `putImageData` operations, breaking canvas rendering scale on high-DPI screens and exports.
2. **Missing SVG Cyberpunk Elements**: The tech overlay SVG generator completely omits crop marks, crosshairs, and the compass circle, leading to rendering discrepancies between preview and export.
3. **RNG Stage Seed Contamination**: Stages within `techOverlay` and `imageLayout` share a single mutable RNG state, causing parameter tweaks in one stage to unexpectedly re-roll random values in subsequent stages.
4. **SVG Image Layout Placeholder Bug**: The image layout SVG generator renders text placeholders instead of embedding the actual uploaded images.
5. **Brittle Multi-Image Upload Loader**: A single slow or failed image load in the `Promise.all` block completely stops canvas updates.
6. **Blured High-Res Image Export**: The PNG export upscales a low-resolution temporary preview canvas instead of rendering directly at target 2K/4K/8K resolution.

---

## 1. Physical vs. Logical Coordinate Mismatch in Glitch FX

### Observation & Evidence
* **File**: `src/lib/generation/modules/glitch.ts` (lines 12, 37, 43-52)
```typescript
12:     const imgData = ctx.getImageData(0, 0, width, height);
...
37:       const finalData = ctx.getImageData(0, 0, width, height);
...
43:         for (let y = 0; y < height; y++) {
44:           for (let x = 0; x < width; x++) {
```
* **Explanation**: `ctx.getImageData` and `ctx.putImageData` operate on the canvas's physical pixels, whereas `width` and `height` passed from the recipe represent logical coordinates. When the device pixel ratio is greater than 1 (e.g., Retina screens) or during high-resolution exports (where `pixelRatio > 1` is applied to scale up), `width` and `height` are smaller than the backing store canvas dimensions. As a result, the glitch effect only captures and updates the top-left quadrant of the canvas, destroying the layout and rendering scale of the image.

### Fix Strategy
* Update `renderGlitchLayer` to retrieve physical dimensions using `ctx.canvas.width` and `ctx.canvas.height` instead of logical `width` and `height`.
* Scale the glitch slice dimensions and offsets by the actual physical-to-logical ratio (i.e. `scaleFactor = ctx.canvas.width / width`) so that slice sizes and offsets look consistent regardless of resolution.
* Use physical coordinates for pixel loops:
```typescript
const physW = ctx.canvas.width;
const physH = ctx.canvas.height;
const imgData = ctx.getImageData(0, 0, physW, physH);
// Perform shifts and slices using physW, physH
```

---

## 2. Missing SVG Cyberpunk Elements in Tech Overlay

### Observation & Evidence
* **File**: `src/lib/generation/modules/techOverlay.ts` (lines 148-216 vs. 3-146)
* **Explanation**: `renderTechOverlayLayer` renders corner crop marks (lines 85-94), coordinate crosshairs (lines 98-108), and a circular compass element (lines 127-142) on canvas for the `cyberpunk` style. However, `generateTechOverlayLayerSVG` entirely omits these stages. The generated SVG only contains border ticks and a barcode.

### Fix Strategy
* Update `generateTechOverlayLayerSVG` to parity the canvas version.
* Translate crop marks, crosshairs, and compass circles into their SVG equivalents (`<path>`, `<g>`, `<circle>`, `<line>` tags):
```typescript
// Corner Crop Marks
path += `M ${cropOffset} ${cropOffset + cropSize} L ${cropOffset} ${cropOffset} L ${cropOffset + cropSize} ${cropOffset} ...`;
// Coordinate crosshairs
for (let i = 0; i < numElements; i++) {
  const x = rng.range(cropOffset * 2, width - cropOffset * 2);
  const y = rng.range(cropOffset * 2, height - cropOffset * 2);
  path += `M ${x - 10} ${y} L ${x + 10} ${y} M ${x} ${y - 10} L ${x} ${y + 10} `;
  svg += `<text x="${x + 15}" y="${y}" stroke="none" text-anchor="start">⌖ [${x.toFixed(0)}, ${y.toFixed(0)}]</text>\n`;
}
```

---

## 3. RNG Stage Seed Contamination (The Butterfly Effect)

### Observation & Evidence
* **File**: `src/lib/generation/modules/techOverlay.ts` (lines 99, 112, 127)
```typescript
99:     for (let i = 0; i < numElements; i++) { // crosshairs
112:       const bcX = width - 200 - rng.range(0, 100); // barcode
127:     if (density > 0.3 && rng.chance(0.5)) { // compass
```
* **File**: `src/lib/generation/modules/imageLayout.ts` (lines 64, 69, 98, 108)
```typescript
64:     : generateGrid(..., rng);
69:       const overlapFactorX = 1.2 + rng.random() * 0.8;
98:     const imgIndex = Math.floor(rng.random() * images.length);
108:     ctx.fillStyle = `hsl(${rng.random() * 360}, ...)`
```
* **Explanation**: 
  - In `techOverlay`, the single `rng` is passed between crosshairs, barcode, and compass. Changing the crosshair `density` alters the loop count, consuming a different amount of random values and throwing off the barcode/compass locations. Toggling barcodes also alters the compass.
  - In `imageLayout`, the layout parameters (columns/rows) or layout style (toggling brutalist) changes the number of random calls, completely re-rolling the cell-to-image assignments and background hues.
  - In `engine.ts` (line 60) and `routes/index.tsx` (line 152), layer-specific seeds are derived as `recipe.seed + i` where `i` is the array index. Reordering layers shifts the indices and re-rolls seeds for unrelated layers.

### Fix Strategy
* **Layer Seed Isolation**: Hash the layer's stable ID to create a permanent offset:
```typescript
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
const layerSeed = recipe.seed + hashString(layer.id);
const rng = new RNG(layerSeed);
```
* **Stage Seed Isolation (techOverlay)**: Instantiate fresh stage-specific RNGs derived from the base layer seed:
```typescript
const crosshairRng = new RNG(layerSeed + 10);
const barcodeRng = new RNG(layerSeed + 20);
const compassRng = new RNG(layerSeed + 30);
```
* **Stage Seed Isolation (imageLayout)**: Isolate grid, overlap, and cell styling:
```typescript
const gridRng = new RNG(layoutSeed + 100);
const brutalistRng = new RNG(layoutSeed + 200);
// Cell-specific seed derivation ensures that cell 0 maintains its properties 
// even if cells 3+ are added/removed!
cells.forEach((cell, i) => {
  const cellRng = new RNG(layoutSeed + 300 + i);
  const imgIndex = Math.floor(cellRng.random() * images.length);
  ...
});
```

---

## 4. SVG Image Layout Placeholder Bug

### Observation & Evidence
* **File**: `src/lib/generation/modules/imageLayout.ts` (lines 189-192)
```typescript
189:     const fill = `hsl(${Math.floor(rng.random() * 360)}, 10%, 20%)`;
190:     svg += `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" fill="${fill}" />`;
191:     svg += `\n<text x="${cx + cw/2}" y="${cy + ch/2}" fill="#fff" font-family="sans-serif" font-size="12" text-anchor="middle">Image Placeholder</text>`;
```
* **Explanation**: The SVG generator completely ignores `params.images` and only renders colored rectangles with text, leading to empty/incorrect exported SVGs for grid layout groups.

### Fix Strategy
* Update `generateImageLayoutLayerSVG` to accept and process `params.images`.
* Map images to cells using isolated random states, rendering SVG `<image>` tags with `preserveAspectRatio="xMidYMid slice"` to match the canvas's object-fit: cover logic:
```typescript
cells.forEach((cell, i) => {
  const cellRng = new RNG(layoutSeed + 300 + i);
  const imgIndex = Math.floor(cellRng.random() * images.length);
  const imgSrc = images[imgIndex];
  if (imgSrc && typeof imgSrc !== 'string' && imgSrc.src) {
    svg += `<image href="${imgSrc.src}" x="${cx}" y="${cy}" width="${cw}" height="${ch}" preserveAspectRatio="xMidYMid slice" opacity="${opacity}" />`;
  } else {
    // Fallback placeholder
  }
});
```

---

## 5. Brittle Multi-Image Upload Loader

### Observation & Evidence
* **File**: `src/app/ForgeCanvas.tsx` (lines 85-103)
```typescript
85:     const imagesPromises = state.mediaAssets
...
96:     Promise.all(imagesPromises).then((imagesData) => {
```
* **Explanation**: If a user drops multiple files (up to 3) and one image fails to load (due to file taint, format issue, or network latency), `Promise.all` throws immediately and rejects the entire list. This blocks the preview from updating for all other valid layers.
* **Layout group mapping**: When the user adds a Grid Layout, the child image layers' shader filters are ignored because `createRecipeFromState` (line 541) only transfers the raw `HTMLImageElement`s in `params.images`.

### Fix Strategy
* Resolve individual image loading promises with `null` on failure, and filter out nulls:
```typescript
const imagesPromises = state.mediaAssets.map((asset) => {
  return new Promise<{ id: string, img: HTMLImageElement } | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ id: asset.layerId || asset.id, img });
    img.onerror = () => resolve(null); // Silent fail
    img.src = asset.dataUrl;
  });
});
// Then filter Boolean:
const imagesData = (await Promise.all(imagesPromises)).filter(Boolean);
```
* Pass down child layer properties (like shader filter type) to the image layout engine, allowing the engine to composite shader filters or reference the correct DOM canvases if a child cell requires a shader layer.

---

## 6. Blurry High-Res Image Export

### Observation & Evidence
* **File**: `src/routes/index.tsx` (lines 300-304)
```typescript
300:             render: (renderContext) => {
301:               const tempCanvas = document.createElement("canvas");
302:               generatePreview(recipe, tempCanvas);
303:               renderContext.context.drawImage(tempCanvas, 0, 0, renderContext.cssWidth, renderContext.cssHeight);
304:             }
```
* **Explanation**: `generatePreview` sets the temporary canvas width/height to logical dimensions scaled by `window.devicePixelRatio`. During 4K or 8K export, this results in a low-resolution preview canvas (e.g. 1600x1600) being drawn stretched onto the target 4K canvas (3840x3840), creating blurry, upscaled PNG exports.

### Fix Strategy
* Refactor `generatePreview` in `src/lib/generation/engine.ts` to separate canvas dimension setup from the actual layer rendering loop.
* Expose a new function `renderRecipe(recipe: DesignRecipe, ctx: CanvasRenderingContext2D, width: number, height: number)`:
```typescript
export function renderRecipe(recipe: DesignRecipe, ctx: CanvasRenderingContext2D, width: number, height: number): void {
  for (let i = 0; i < recipe.layers.length; i++) {
    // Render layer logic...
  }
}
```
* Update `routes/index.tsx` to render directly onto the export canvas context at true resolution:
```typescript
render: (renderContext) => {
  renderRecipe(recipe, renderContext.context, renderContext.cssWidth, renderContext.cssHeight);
}
```
* Ensure that the background color control (`scene.background`) is passed as `background` to `createToolcraftPngExportCanvas` to prevent the export from falling back to black:
```typescript
background: values["scene.background"] ? (typeof values["scene.background"] === 'string' ? values["scene.background"] : values["scene.background"].hex) : "#000000",
```

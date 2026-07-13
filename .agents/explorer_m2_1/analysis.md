# Analysis Report — Core Rendering & Effects Pipeline

This report details the investigation of the core rendering, effects, grid layout, and RNG seed isolation pipelines.

## Executive Summary
Multiple critical bugs were found across the rendering, upload, and effects pipelines: deleting uploaded media leaves behind phantom layers, the glitch effect breaks under Retina scaling (destroying canvas rendering), SVG exports lack tech overlay/halftone styling and show text placeholders instead of actual images in grid layouts, and parameter tweaks in halftone/tech overlay trigger "butterfly effect" re-rolls due to shared sequential RNG states.

---

## 1. Uploading Multiple Images (Up to 3)

### Observations & Evidence Chain
1.  **Multiple Image Configuration**: In `src/app/app-schema.ts` (lines 17-23), the `"images"` control is configured with `multiple: true` to allow uploading up to 3 images:
    ```typescript
    "images": {
      target: "images",
      type: "fileDrop",
      assetKind: "image",
      multiple: true,
      performanceRole: "workload"
    }
    ```
2.  **Clear Control Bug**: In `src/toolcraft/runtime/react/controls-panel.tsx` (lines 2773-2781), the `onClear` callback for `FileDrop` is defined as:
    ```typescript
    onClear={
      previewMediaAsset
        ? () => {
            dispatchCommand({
              mediaId: previewMediaAsset.id,
              type: "media.delete",
            });
          }
        : undefined
    }
    ```
    Since `previewMediaAsset` is defined as `previewMediaAssets[0]` (line 2705), clicking "Clear" in the fileDrop only deletes the first uploaded media asset. The remaining assets persist in `state.mediaAssets`.
3.  **Phantom/De-synced Layers**: In `src/toolcraft/runtime/state/reducer.ts` under `case "media.delete"` (lines 1408-1428), deleting a media asset only filters the asset from `mediaAssets`. It does **not** delete the corresponding layer that was automatically created during `media.import` (lines 1369-1378). This leaves "phantom" layers in the layers panel with missing backing assets.
4.  **Ungrouped Add Layout Action**: In `src/routes/index.tsx` (lines 194-210), when clicking "Add Grid Layout" (`addImageLayout`), it only moves the currently selected layer into the new layout group:
    ```typescript
    context.dispatch({
      type: "layers.moveToGroup",
      layerIds: [selectedLayer.id],
      parentGroupId: targetLayerId
    });
    ```
    This leaves other uploaded images ungrouped. They do not render in the grid unless the user manually drags them under the Grid Layout group.

### Detailed Fix Strategy
*   **Fix Uploader Clear**: Modify the `onClear` handler in `controls-panel.tsx` (or support a new `media.clear` action) to delete all media assets matching the `sourceTarget` in one command:
    ```typescript
    onClear={() => {
      previewMediaAssets.forEach(asset => {
        dispatchCommand({ mediaId: asset.id, type: "media.delete" });
      });
    }}
    ```
*   **Prune Deleted Media Layers**: Update `reducer.ts` under `"media.delete"` to filter out the layer that corresponds to the deleted media asset (`layer.id === mediaAsset.layerId`), preventing phantom layers in the UI.
*   **QoL Grid Layout Fallback**: In `createRecipeFromState` (`src/app/ForgeCanvas.tsx`), if a Grid Layout group has no child layers, automatically populate `params.images` with all uploaded images from `imageMap`:
    ```typescript
    } else if (type === "imageLayout") {
      const children = state.layers.filter((l: any) => l.parentGroupId === layer.id);
      if (children.length > 0) {
        params.images = children.map((c: any) => imageMap.get(c.id)).filter(Boolean);
      } else {
        params.images = Array.from(imageMap.values());
      }
    }
    ```
    This allows the grid layout to display all uploaded images instantly without requiring manual grouping.

---

## 2. Halftone/Glitch/Tech/Shader Effect Rendering

### Observations & Evidence Chain
1.  **Glitch Retina Scaling Bug**: In `src/lib/generation/modules/glitch.ts` (lines 12 and 52), the glitch renderer reads and writes logical dimensions:
    ```typescript
    const imgData = ctx.getImageData(0, 0, width, height);
    // ...
    ctx.putImageData(finalData, 0, 0);
    ```
    Because the canvas has a `pixelRatio` scale (usually 2.0 on retina displays), its physical dimensions are `width * pixelRatio` by `height * pixelRatio`. `getImageData(0, 0, width, height)` only reads the top-left quadrant of the canvas. `putImageData` then overwrites this quadrant with low-resolution pixels and discards the rest of the canvas rendering, breaking the visual output.
2.  **SVG Halftone Line Fill Bug**: In `src/lib/generation/modules/halftone.ts` (lines 78-91), the path for the `lines` style is exported as:
    ```typescript
    svg += `<path d="${path}" stroke-width="${thickness.toFixed(2)}" />\n`;
    ```
    Since the parent `<g>` element (line 69) defines `fill="${color}"`, and the path doesn't specify `fill="none"`, the SVG fills the space between the dashed line segments as solid shapes, destroying the line pattern.
3.  **SVG Tech Overlay Disparity & Sync Bug**: In `src/lib/generation/modules/techOverlay.ts` (lines 148-216), `generateTechOverlayLayerSVG` has **no code** to export the coordinate crosshairs and the compass/circle element. This results in:
    *   Missing visual features in SVG exports.
    *   Desynchronization of the `rng` sequence between Canvas and SVG render paths, causing subsequent components (like the barcode) to be drawn with completely different random values and coordinates.
4.  **Shader Export Quality**: In `src/lib/generation/engine.ts` (lines 66-74), shaders are rendered by copying pixels from the DOM canvas:
    ```typescript
    ctx.drawImage(shaderCanvas, 0, 0, width, height);
    ```
    During export (e.g. at 4K resolution), the DOM shader canvas is still sized at low preview dimensions (e.g., 500x500), leading to heavily pixelated and blurry stretches on high-res output.

### Detailed Fix Strategy
*   **Retina Glitch Fix**: Read backing physical dimensions and temporarily reset the transform matrix during slicing:
    ```typescript
    const pW = ctx.canvas.width;
    const pH = ctx.canvas.height;
    const pixelRatio = pW / width;
    const imgData = ctx.getImageData(0, 0, pW, pH);
    // ... setup offscreen canvas at pW x pH ...
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Temporary physical coordinates
    for (let i = 0; i < slices; i++) {
      const sliceY = rng.range(0, pH);
      const sliceH = rng.range(5 * pixelRatio, pH * 0.1 * intensity);
      const offsetX = rng.range(-50 * intensity * pixelRatio, 50 * intensity * pixelRatio);
      ctx.drawImage(offscreen, 0, sliceY, pW, sliceH, offsetX, sliceY, pW, sliceH);
    }
    ctx.restore();
    ```
*   **Halftone SVG Path Stroke Fix**: Add `fill="none"` to the `<path>` element for the `lines` style:
    ```typescript
    svg += `<path d="${path}" stroke-width="${thickness.toFixed(2)}" fill="none" />\n`;
    ```
*   **Tech Overlay SVG Parity**: Implement coordinate crosshairs and compass drawings in `generateTechOverlayLayerSVG` matching the canvas rendering, using the exact same order and number of `rng` calls.
*   **High-Res Shader Export**: Dynamically resize the DOM shader canvas to match the target export dimensions during the export sequence, or run a headless WebGL pass at the target resolution, before rendering.

---

## 3. Grid Layout Groups

### Observations & Evidence Chain
1.  **SVG Image Omission**: In `src/lib/generation/modules/imageLayout.ts` (lines 148-195), `generateImageLayoutLayerSVG` does not destructure `images` from `params` and only draws colored placeholder rectangles:
    ```typescript
    const fill = `hsl(${Math.floor(rng.random() * 360)}, 10%, 20%)`;
    svg += `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" fill="${fill}" />`;
    svg += `\n<text x="${cx + cw/2}" ...>Image Placeholder</text>`;
    ```
    This completely discards the user's uploaded images in SVG exports, rendering text placeholders instead.

### Detailed Fix Strategy
*   **Image Rendering in SVG Grid**: Destructure `images = []` from `params` in `generateImageLayoutLayerSVG`.
*   **Nested Viewport Clipping**: Output each cell as a nested `<svg>` with `overflow="hidden"` (which clips the image to cell boundaries) and compute proportional `object-fit: cover` scaling coordinates:
    ```typescript
    cells.forEach((cell, i) => {
      const imgSrc = images[i % images.length];
      const fill = `hsl(${Math.floor(rng.random() * 360)}, 10%, 20%)`;
      let cellContent = `<rect x="0" y="0" width="${cw}" height="${ch}" fill="${fill}" />`;
      
      if (imgSrc) {
        const src = typeof imgSrc === 'string' ? imgSrc : imgSrc.src;
        // Compute dx, dy, drawW, drawH proportionally...
        cellContent += `\n<image href="${src}" x="${dx}" y="${dy}" width="${drawW}" height="${drawH}" preserveAspectRatio="none" />`;
      } else {
        cellContent += `\n<text x="${cw/2}" y="${ch/2}" fill="#fff" font-family="sans-serif" font-size="12" text-anchor="middle">Image Placeholder</text>`;
      }
      svg += `<svg x="${cx}" y="${cy}" width="${cw}" height="${ch}" viewBox="0 0 ${cw} ${ch}" overflow="hidden">\n${cellContent}\n</svg>\n`;
    });
    ```

---

## 4. RNG Stage Seed Isolation (Butterfly Effect)

### Observations & Evidence Chain
1.  **Inter-layer Seed Coupling**: In `src/lib/generation/engine.ts` (lines 60 and 152), the seed for each layer depends on its array index `i`:
    ```typescript
    const rng = new RNG(recipe.seed + i);
    ```
    If the user reorders layers, deletes a layer, or hides a layer, the indices of the other layers shift, which re-rolls their seeds and changes their procedural patterns.
2.  **Intra-layer Seed Coupling (Tech Overlay)**: In `src/lib/generation/modules/techOverlay.ts` (lines 99-142), the crosshairs, barcode, and compass elements are generated sequentially from a single `rng` instance. Changing `density` alters the number of crosshair iterations, which shifts the generator sequence and re-rolls the barcode and compass positions.
3.  **Loop-based Seed Coupling (Halftone)**: In `src/lib/generation/modules/halftone.ts` (lines 26-58), the nested loops call `rng.range` sequentially. Tweaking the grid `spacing` changes the loop steps, altering the sequence of calls and completely re-rolling the halftone pattern.
4.  **Layout/Image Seed Coupling (Grid Layout)**: In `src/lib/generation/modules/imageLayout.ts` (lines 62-64), the same `rng` is shared between grid layout splits and image/color assignments. Changing columns, rows, or layout style shifts the generator state, causing completely different images to be assigned to the cells.

### Detailed Fix Strategy
*   **Layer Seed Hash**: Derive seeds based on a hash of the layer's unique ID, making them independent of array index or visibility:
    ```typescript
    function hashString(str: string): number {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      return hash;
    }
    const layerSeed = recipe.seed + hashString(layer.id);
    const rng = new RNG(layerSeed);
    ```
*   **Sub-stage RNGs (Tech Overlay)**: Isolate the generations using separate sub-RNG instances:
    ```typescript
    const crosshairRng = new RNG(layerSeed + 1);
    const barcodeRng = new RNG(layerSeed + 2);
    const compassRng = new RNG(layerSeed + 3);
    ```
*   **Coordinate-based Seeding (Halftone)**: Seed a new RNG for each cell/coordinate deterministically:
    ```typescript
    const cellSeed = Math.floor(layerSeed + Math.floor(x * 31 + y * 97));
    const cellRng = new RNG(cellSeed);
    ```
*   **Grid Layout RNG Isolation**: Use a `layoutRng` for cell structure/brutalist offsets and an `imageRng` for cell background color and image index assignments:
    ```typescript
    const layoutRng = new RNG(layerSeed + 1);
    const imageRng = new RNG(layerSeed + 2);
    ```

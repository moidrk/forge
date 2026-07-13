# Handoff Report — Explorer 3 (Milestone 2)

## 1. Observation

Direct observations made in the codebase:

1. **Logical vs. Physical Coordinates in Glitch FX**:
   * **File**: `src/lib/generation/modules/glitch.ts` (lines 12 & 37):
     ```typescript
     const imgData = ctx.getImageData(0, 0, width, height);
     ```
   * **File**: `src/lib/generation/engine.ts` (lines 45-53):
     ```typescript
     const pixelRatio = window.devicePixelRatio || 1;
     canvas.width = width * pixelRatio;
     canvas.height = height * pixelRatio;
     ctx.scale(pixelRatio, pixelRatio);
     ```
     `getImageData` does not respect the scale transform and reads logical coordinates from the physical canvas backing.

2. **Missing SVG Cyberpunk Elements**:
   * **File**: `src/lib/generation/modules/techOverlay.ts` (lines 148-216) lacks drawing logic for corner crop marks (lines 85-94 in canvas), crosshairs (lines 98-108 in canvas), and compass/circle elements (lines 127-142 in canvas) inside the `cyberpunk` style.

3. **RNG Stage Seed Contamination**:
   * **File**: `src/lib/generation/modules/techOverlay.ts` (lines 99, 112, 127):
     * Successive stages (crosshairs, barcode, compass) use the same mutable `rng` state.
   * **File**: `src/lib/generation/modules/imageLayout.ts` (lines 64, 69, 98, 108):
     * Grid generation, brutalist calculations, and cell content selection share the same `rng` object.
   * **File**: `src/lib/generation/engine.ts` (line 60) uses array index to seed:
     ```typescript
     const rng = new RNG(recipe.seed + i);
     ```

4. **SVG Image Layout Placeholder**:
   * **File**: `src/lib/generation/modules/imageLayout.ts` (lines 189-192) renders placeholders instead of drawing `params.images` as SVG `<image>` tags.

5. **Brittle Multi-Image Upload Loader**:
   * **File**: `src/app/ForgeCanvas.tsx` (lines 96-103) uses:
     ```typescript
     Promise.all(imagesPromises).then(...).catch(console.error);
     ```
     Any failed file load halts all preview renders.

6. **Blurry High-Res Image Export**:
   * **File**: `src/routes/index.tsx` (lines 301-304) creates `tempCanvas`, renders at logical size, and stretches it:
     ```typescript
     const tempCanvas = document.createElement("canvas");
     generatePreview(recipe, tempCanvas);
     renderContext.context.drawImage(tempCanvas, 0, 0, renderContext.cssWidth, renderContext.cssHeight);
     ```

7. **Background Export Color Ignored**:
   * **File**: `src/routes/index.tsx` (lines 296-305) does not pass `background` parameter to `createToolcraftPngExportCanvas`.
   * **File**: `src/toolcraft/runtime/export/export.ts` (line 229) defaults background to `#000000`.

---

## 2. Logic Chain

1. **Glitch Coordinate Mismatch**:
   * `getImageData` is defined to retrieve backing-store (physical) pixels rather than CSS (logical) pixels.
   * Because `engine.ts` scales the context by `pixelRatio`, the logical `width` and `height` parameters represent only a portion of the backing store.
   * Drawing logical coordinates back via `putImageData` overwrites only the top-left quadrant of scaled previews/exports, causing visual layout corruption.

2. **RNG Stage Seed Contamination**:
   * A mutable RNG state advances each time `.random()` or `.range()` is called.
   * In `techOverlay`, tweaking density changes the crosshair count (loop iterations), shifting the number of RNG advances.
   * This shifts the RNG state for subsequent stages, causing the barcode and compass to re-roll positions upon minor density tweaks.
   * Deriving separate stage seeds (e.g. `layerSeed + offset`) prevents this cross-stage contamination.

3. **Blurry High-Res Export**:
   * `tempCanvas` has logical width/height (multiplied by `devicePixelRatio`).
   * When exporting to 4K/8K, this temporary canvas is drawn via `drawImage` stretched to fit the larger export canvas size (e.g. 1600x1600 stretched to 3840x3840).
   * Separating sizing from drawing and rendering directly onto the target export context fixes this blurriness and enables true-resolution exports.

---

## 3. Caveats
* The analysis assumes that the `HTMLImageElement` objects inside the `recipe.layers[i].params.images` array are fully loaded before rendering the SVG export. If they are not fully loaded, their `.src` attribute is still valid and can be embedded, but the browser exporting them must handle the asynchronous SVG serialization correctly.
* WebGL shaders are mounted in the React DOM, and their previews are captured dynamically. High-resolution WebGL exports are limited by the DOM canvas size, unless a separate offscreen WebGL context is initialized at the target export resolution.

---

## 4. Conclusion
The rendering pipeline contains several critical bugs that result in:
* Layout corruption on Retina displays due to coordinate mismatches in pixel-manipulation effects (glitch).
* Drastic discrepancies between the preview canvas and the exported SVG format (missing HUD elements, image layout placeholders).
* Unstable rendering parameters where a minor slider tweak re-rolls unrelated procedural features (RNG contamination).
* Upscaled, blurry images during high-resolution PNG exports.

All identified issues are addressable by refactoring coordinate queries, isolating RNG seeds, embedding images as SVG tags, and rendering recipes directly onto the target export context.

---

## 5. Verification Method
1. **Types and Integrity Check**: Run `cmd.exe /c "npm run test"` to confirm that type-checking and base docs validation checks pass.
2. **Visual Verification of PNG Export**: Verify that exported PNGs are rendered at true 4K resolution (3840px on long edge) and that the background matches the user-selected color.
3. **Visual Verification of SVG Export**: Inspect exported SVGs in a browser to check that:
   * Symmetrical, asymmetrical, and brutalist image grids contain the actual uploaded images.
   * Tech overlay elements (crop marks, crosshairs, compasses) are present and scale correctly.

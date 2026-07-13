# Synthesis: Milestone 2 Core Rendering & Effects Pipeline

## Subagent Results Summary
- 3 completed, 0 failed/timed out

## Aggregated Findings

### 1. Upload & Media Management Bugs
* **Brittle Image Loader**: In `src/app/ForgeCanvas.tsx`, using `Promise.all` directly with raw `onerror` rejections causes a single failed/slow image to completely halt all canvas updates.
* **Uploader Clear & Phantom Layers**: In `src/toolcraft/runtime/react/controls-panel.tsx`, clearing only deletes the first asset. In `reducer.ts`, deleting media does not remove the corresponding layer, creating "phantom" layers in the layers panel.

### 2. High-DPI Glitch FX Coordinate Mismatch
* In `src/lib/generation/modules/glitch.ts`, physical pixel functions `getImageData`/`putImageData` are called with logical CSS width/height. On high-DPI screens or during exports (`pixelRatio > 1`), this captures only the top-left quadrant and stretches/distorts it.
* **Fix**: Fetch physical canvas size `ctx.canvas.width/height`, use an offscreen canvas at physical dimensions for slicing/shifts, scale slice offsets by the physical ratio, and write back using physical coords.

### 3. RNG Stage Seed Contamination (Butterfly Effect)
* **Inter-layer Seed Coupling**: Layer seeds are computed sequentially as `recipe.seed + i` where `i` is the loop index in `engine.ts`. Moving/deleting layers shifts indices and re-rolls seeds for unrelated layers.
* **Intra-layer Stage Coupling (Tech Overlay)**: The single `rng` is shared sequentially among crosshairs, barcodes, and compasses. Toggling barcodes or changing crosshair density shifts the RNG and re-rolls the compass position.
* **Grid Layout Seed Coupling**: Cell-to-image assignments and background hues re-roll whenever column/row parameters change.
* **Fix**:
  1. Hash layer IDs to derive stable layer seeds.
  2. Use stage-specific RNGs inside `techOverlay.ts` (e.g., `new RNG(layerSeed + 10)`, `+ 20`, `+ 30`).
  3. Deriving cell seeds deterministically based on layout seed and cell index.

### 4. SVG Tech Overlay Disparity & Sync Bug
* `generateTechOverlayLayerSVG` is missing crop marks, crosshairs, and compass circles, leading to discrepancies in SVG export. It also skips the RNG calls for these stages, desynchronizing the RNG state for subsequent stages.
* **Fix**: Re-implement all missing SVG stages in the exact same execution/RNG-consumption order as the Canvas renderer.

### 5. SVG Image Layout Placeholder Bug
* `generateImageLayoutLayerSVG` only renders text placeholder boxes instead of embedding actual uploaded images.
* **Fix**: Destructure `images` from `params` and output SVG `<image>` tags with `preserveAspectRatio="xMidYMid slice"`.

### 6. Blurry High-Res Image Export
* PNG export upscales a low-res temporary preview canvas rather than drawing at the target resolution.
* **Fix**: Refactor `generatePreview` in `engine.ts` to expose `renderRecipe(recipe, ctx, width, height)` and draw directly onto the export canvas in `index.tsx`.

### 7. Missing Halftone Crosshatch & Performance Batching
* Halftone `"crosshatch"` style is selected in god-mode shuffle but is missing from halftone styles.
* In dots mode, calling `beginPath` and `fill` inside the loops causes performance issues.
* **Fix**: Implement `"crosshatch"` as dual perpendicular line patterns. Batch dot drawings by calling `beginPath` before the loop and `fill` once after.

### 8. Support Grid Layout Child Layer Properties
* Child image properties (scale, transformX/Y, opacity, blendMode, shader filters) are ignored in the layout compositor.
* **Fix**: Gather child properties in `createRecipeFromState` and apply them in `renderImageLayoutLayer`.

## Per-Subagent Status
- **Explorer 1**: Completed (analysis.md, handoff.md)
- **Explorer 2**: Completed (analysis.md, handoff.md)
- **Explorer 3**: Completed (analysis.md, handoff.md)

# Handoff Report — Core Rendering & Effects Pipeline Investigation

## 1. Observation
I directly observed the following code sections and behaviors:
*   **Multiple Image Configuration**: `src/app/app-schema.ts` (lines 17-23) defines the `"images"` control of type `fileDrop` with `multiple: true`.
*   **Clear Control**: `src/toolcraft/runtime/react/controls-panel.tsx` (lines 2773-2781) deletes only the first media asset (`previewMediaAsset.id`) inside the `onClear` callback:
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
*   **Media Delete Reducer**: `src/toolcraft/runtime/state/reducer.ts` (lines 1408-1428) processes `media.delete` by filtering the media asset out of `state.mediaAssets` but leaves its corresponding layer inside `state.layers` untouched.
*   **Grid Layout Add Action**: `src/routes/index.tsx` (lines 194-210) moves only the selected layer into the new group when creating a grid layout:
    ```typescript
    context.dispatch({
      type: "layers.moveToGroup",
      layerIds: [selectedLayer.id],
      parentGroupId: targetLayerId
    });
    ```
*   **Glitch Layer rendering**: `src/lib/generation/modules/glitch.ts` (lines 12 and 52) calls `ctx.getImageData(0, 0, width, height)` and `ctx.putImageData(finalData, 0, 0)`.
*   **SVG Halftone line styling**: `src/lib/generation/modules/halftone.ts` (lines 78-91) exports paths for `lines` style without `fill="none"`.
*   **SVG Tech Overlay**: `src/lib/generation/modules/techOverlay.ts` (lines 148-216) completely lacks the coordinate crosshairs and compass elements present in the canvas drawing path (lines 99-142).
*   **Inter-layer Seeding**: `src/lib/generation/engine.ts` (lines 60 and 152) initializes RNG as `new RNG(recipe.seed + i)` where `i` is the layer loop index.
*   **Intra-layer Seeding (Tech Overlay)**: `src/lib/generation/modules/techOverlay.ts` (lines 99-142) makes consecutive calls to a single `rng` instance across crop marks, coordinate crosshairs, barcodes, and compass stages.
*   **Loop-based Seeding (Halftone)**: `src/lib/generation/modules/halftone.ts` (lines 26-58) advances `rng` sequentially inside nested loops over spacing coordinates.
*   **Layout/Image Seeding (Grid)**: `src/lib/generation/modules/imageLayout.ts` (lines 62-64, 98-99) uses a single shared `rng` for grid splitting and image/color assignments.

## 2. Logic Chain
1.  **Multiple Uploads & Clear/Delete**: Because `onClear` in `controls-panel.tsx` only dispatches a delete command for the first asset ID, clicking the "Clear" button fails to remove other uploaded images. Because `media.delete` in `reducer.ts` does not clean up the corresponding layer, users are left with orphaned "phantom" layers in the layers panel. Because `moveToGroup` only groups the currently selected layer, other uploaded images are left ungrouped and cannot render inside the Grid Layout group.
2.  **Glitch Retina Scaling**: Since `getImageData`/`putImageData` are physical coordinate operations but are called with logical `width`/`height` variables, they only process the top-left quadrant of the backing store on High-DPI screens. Since the canvas transform is active, writing a logical-sized offscreen copy back via `drawImage` distorts and pixelates the top-left section while `putImageData` overwrites the scaling structure, causing layout breakage.
3.  **SVG Exports**: Because halftone line paths lack `fill="none"`, they fill closed subpaths with solid color. Because `generateTechOverlayLayerSVG` lacks coordinate crosshairs and compass elements, these elements are omitted from SVGs and the shared `rng` state drifts, generating completely different barcode coordinates in SVG vs Canvas. Because `generateImageLayoutLayerSVG` lacks `<image>` element rendering, exported grid layouts show colored blocks with text placeholders instead of actual images.
4.  **RNG Butterfly Effect**: Because layer seeds are based on array index `i`, adding, reordering, or hiding layers shifts the index and re-rolls seeds for unaffected layers. Because tech overlay, halftone loops, and grid layout assignments make sequential calls to a single stateful generator, tweaking parameters (like crosshair density, grid spacing, layout style) changes the call count, shifting the generator's state and causing unrelated downstream elements (barcode, compass, image assignments) to re-roll and jump around.

## 3. Caveats
*   The investigation assumed that the monorepo's WebGL React components (e.g. `@paper-design/shaders-react`) behave normally and only focus on how their output canvases are composed into the Canvas 2D engine.
*   SVG image embedding is limited by browser capabilities to display dataUrls within SVG tags, which is standard for modern browsers.

## 4. Conclusion
The codebase has multiple structural bugs in its effects rendering and seed isolation logic. A detailed fix strategy is described in `analysis.md` in this directory, focusing on:
1.  Aligning uploader clearing and media deletion to clean up associated layers.
2.  Fixing Retina-scaling pixel limits in `renderGlitchLayer`.
3.  Restructuring SVG exporters to include missing visual components, stroked paths, and nested viewports with images.
4.  Isolating RNG seeds per-layer using layer ID hashes, per-stage using sub-RNG offsets, and per-coordinate in nested loops to eliminate the butterfly effect.

## 5. Verification Method
*   **Commands**:
    *   `cmd.exe /c "npm run verify:quick"`: Run checks to ensure typechecking passes.
    *   `cmd.exe /c "npm run test:browser"`: Run browser functional verification (Playwright).
*   **Manual Inspection**:
    *   Inspect `analysis.md` for the detailed implementation formulas and code structures for the fixes.
    *   Verify that `analysis.md` contains accurate line numbers for all issues.

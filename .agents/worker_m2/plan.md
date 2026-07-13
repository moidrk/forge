# Implementation Plan — Milestone 2 Core Rendering & Effects Pipeline

## 1. Files to change
- `src/lib/generation/modules/glitch.ts`
- `src/lib/generation/modules/techOverlay.ts`
- `src/lib/generation/modules/imageLayout.ts`
- `src/lib/generation/engine.ts`
- `src/app/ForgeCanvas.tsx`
- `src/routes/index.tsx`
- `src/lib/generation/modules/halftone.ts`
- `src/app/LayerPropertiesPanel.tsx`
- `src/toolcraft/runtime/react/controls-panel.tsx`
- `src/toolcraft/runtime/state/reducer.ts`
- `src/toolcraft/.toolcraft-manifest.json`

## 2. Affected Schema, Renderers, and Controls
- Glitch Effect renderer coordinates and scaling.
- Tech Overlay SVG rendering: Corner crop marks, crosshairs, barcodes, compass.
- RNG seed isolation: Stable layer seeds using ID hashing, stage-specific RNGs for techOverlay, and cell-specific RNGs for imageLayout.
- SVG imageLayout rendering: Embed actual uploaded images via `<image>`.
- Image loader: Resolve `null` on error instead of rejecting in both ForgeCanvas and index.tsx.
- PNG export: Expose `renderRecipe` and draw directly to export canvas.
- Halftone style: Add `crosshatch` options, implement perpendicular dashed lines, and batch dots.
- Layer Deletion/Clear: `onClear` delete all IDs, `media.delete` removes layers, child properties mapped in `createRecipeFromState` and applied.

## 3. Verification Tier & Coverage
- Verification tier: Tier 3 / Tier 4
- Run: typecheck/build, vitest unit tests.
- Skip: Full browser performance checkpoints unless needed.

## 4. Commands to run
- `cmd /c npm run test`
- Update manifest hashes using helper script.

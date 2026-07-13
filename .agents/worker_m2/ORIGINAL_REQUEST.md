## 2026-07-13T11:31:25Z
You are Worker for Milestone 2: Core Rendering & Effects Pipeline.
Your working directory is c:/Personal/Clients/forge/.agents/worker_m2.
Your objective is to implement the fixes identified in the synthesis report at c:/Personal/Clients/forge/.agents/sub_orch_implementation/synthesis_m2.md.
Specifically, fix:
1. Glitch Effect coordinate and Retina scaling mismatch in src/lib/generation/modules/glitch.ts.
2. SVG Tech Overlay cyberpunk drawing disparity and desync in src/lib/generation/modules/techOverlay.ts.
3. RNG stage seed isolation for layers and stages (techOverlay, imageLayout) in engine.ts, techOverlay.ts, and imageLayout.ts.
4. SVG image layout embedding of uploaded images in src/lib/generation/modules/imageLayout.ts.
5. Brittle image loader in src/app/ForgeCanvas.tsx (use graceful null resolution in Promise.all).
6. High-res image export blur (expose renderRecipe in engine.ts and draw directly on export canvas in index.tsx).
7. Halftone crosshatch style implementation and dots batching optimization in src/lib/generation/modules/halftone.ts.
8. Deletion/clear phantom layers (and child image properties support in grid layouts) in controls-panel.tsx, reducer.ts, and ForgeCanvas.tsx.

Verify your implementation by running the TypeScript type check and tests. Ensure no compilation errors are introduced.

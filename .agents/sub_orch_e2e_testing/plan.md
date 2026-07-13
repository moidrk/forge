# E2E Test Implementation Plan

Verification tier: Tier 3
Reason: Implementing a comprehensive E2E test suite under `e2e/` covering all product features, interactions, and edge cases.
Run: `npx playwright test` (to run the tests)
Skip: Performance budget suites (`npm run verify:perf`) during initial testing to avoid run noise, but functional checks for responsiveness will be run.

## 1. Files to Change
- `e2e/app.spec.ts`: Replace/add test cases to fully implement the 71 designed test cases across 4 tiers.

## 2. Affected Schema Controls & Interactions
- File drop (`images` control)
- Layer Actions panel (addShader, addTechOverlay, addGlitch, addHalftone, addImageLayout)
- Shuffle action (shuffle)
- Layer properties panel (custom LayerPropertiesPanel)
- Scene background color selection
- Image Export format, resolution, and Export PNG action
- Canvas viewport zoom, pan, select, drag handles, scale handles

## 3. Test Cases Implementation Strategy
We will implement the tests inside `e2e/app.spec.ts` using Playwright:
- **Tier 1 (Feature Coverage)**: 30 tests checking each feature individually.
- **Tier 2 (Boundary & Corner)**: 30 tests checking boundaries, error handling, undo/redo, store synchronization, limits.
- **Tier 3 (Cross-Feature)**: 6 tests checking interactions between features (e.g. upload + halftone, grid + 3 images, lock + shuffle).
- **Tier 4 (Real-World Scenarios)**: 5 tests simulating end-to-end workflows (e.g. collage layout build, effect stack, high-res export).

All tests will be opaque-box, interacting with the real DOM/HTML and asserting output changes using `expectToolcraftProductObservableToChange` and other public UI markers.

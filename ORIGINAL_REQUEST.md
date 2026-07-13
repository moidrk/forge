# Original User Request

## Initial Request — 2026-07-13T16:27:06+05:00

Forge is a layer-based generative design tool built on the Toolcraft runtime. It features a Canvas 2D rendering engine with WebGL shader backgrounds, image uploads, halftone/glitch/tech overlay effects, grid layouts, and a "God-Mode Shuffle" feature. The app has accumulated integration bugs and UX rough edges during rapid feature development. This task is a comprehensive QA, bug-fix, performance, and UX/UI polish pass to bring it to the quality bar of professional tools like Figma and Canva.

Working directory: c:/Personal/Clients/forge
Integrity mode: development

## Requirements

### R1. Comprehensive Bug Audit & Fix
Systematically test every user flow in the app and fix all bugs found. Key flows to test include:
- Uploading images (single and multiple) and verifying they render on canvas
- Adding effect layers (Shader, Halftone, Glitch, Tech Overlay) on top of existing image layers without destroying them
- Creating Grid Layout groups and adding/removing images from them
- Layer operations: reorder, rename, delete, lock, hide/show, group/ungroup
- Layer properties panel: verify every control (sliders, color pickers, selects, checkboxes) actually affects the canvas output
- God-Mode Shuffle (Spacebar): verify it randomizes unlocked layers, respects locked layers, and doesn't crash on rapid repeated presses
- Canvas interactions: pan, zoom, select layers by clicking on canvas, drag to reposition images, scale handles
- Empty layer state: verify empty layers show the correct "pending" UI, and that adding an effect or image transitions them properly
- Export: PNG export produces correct output at the selected resolution
- Initial launch state: app starts with a centered white background layer

### R2. Performance Optimization
Profile and optimize the rendering pipeline and React state management:
- Canvas re-renders should not occur unnecessarily (e.g. when unrelated UI state changes)
- Rapid Spacebar shuffling should not cause memory leaks, dropped frames, or stale renders
- Image loading should be properly debounced/cached — no redundant re-fetches of the same media assets
- Large numbers of layers (10+) should not degrade UI responsiveness
- The layerPropertiesStore JSON serialization/deserialization should be efficient and not block the main thread
- Shader WebGL components should not re-mount unnecessarily
- Canvas drag/pan/zoom interactions should feel smooth at 60fps

### R3. UX/UI Polish to Professional Grade
Audit the entire UI against the quality bar of Figma/Canva and fix issues:
- Layer properties panel should have clear visual hierarchy, proper spacing, and intuitive grouping
- Empty states should be helpful and guide the user toward their next action
- All interactive elements need proper hover/focus/active states
- Transitions and micro-animations where appropriate (panel open/close, layer selection, property changes)
- Color picker: verify the new eyedropper and transparent buttons work correctly
- Error states: what happens when an invalid image is uploaded, or a shader fails to compile?
- Keyboard shortcuts should not conflict with text input fields
- Canvas selection overlays should be visually crisp and responsive
- The toolbar/footer actions should have clear iconography and tooltips

### R4. State Management Integrity
Verify that the layerPropertiesStore (JSON string in Toolcraft state) stays in sync with the actual layer list:
- Deleting a layer should clean up its entry from the store
- Duplicating a layer should correctly clone its properties
- Undo/redo should properly restore layer properties
- Reloading the app should restore persisted state correctly (if persistence is enabled)
- No orphaned entries in the store for layers that no longer exist

## Acceptance Criteria

### Bug-Free Core Flows
- [ ] Upload 3 images sequentially; all 3 render on canvas without any becoming halftone/glitch/other effect
- [ ] Add a Halftone effect while an image layer is selected; the image layer is preserved and a new Halftone layer is created
- [ ] Add all 4 effect types (Shader, Halftone, Glitch, Tech Overlay) to a canvas with 2 images; all 6 layers render correctly
- [ ] Lock 2 of 6 layers, press Spacebar 10 times rapidly; locked layers are unchanged, unlocked layers randomize, no crash or console error
- [ ] Delete a layer; its properties are removed from the store (no orphaned data)
- [ ] Create a Grid Layout group with 3 images; grid renders with all 3 images visible
- [ ] Every slider/color/select control in LayerPropertiesPanel produces a visible change on the canvas
- [ ] Empty layers show the pending UI; adding an image or effect transitions them to the correct property panel

### Performance
- [ ] With 10 layers (mix of images and effects), canvas renders within 16ms per frame during idle
- [ ] Rapid Spacebar pressing (20 presses in 5 seconds) does not cause visible lag, memory growth, or console errors
- [ ] Pan/zoom interactions maintain smooth 60fps feel with 5+ layers

### UX/UI Quality
- [ ] No unstyled, broken, or visually jarring UI elements across the entire app
- [ ] All buttons, sliders, and interactive controls have visible hover/focus states
- [ ] The layer properties panel correctly shows only relevant controls for each layer type
- [ ] The color picker eyedropper and transparent buttons function correctly
- [ ] Spacebar shortcut does not fire when typing in text input fields

### State Integrity
- [ ] After deleting all layers and re-adding them, layerPropertiesStore contains only entries for existing layers
- [ ] Layer property changes are reflected immediately on canvas without requiring a manual refresh

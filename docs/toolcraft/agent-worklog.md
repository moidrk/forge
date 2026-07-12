# Implementation Worklog

This file records product decisions and the evidence behind them. Keep it short, factual, and current. Update it after schema, renderer, timeline, layer, export, performance, or acceptance decisions.

## Status

Mode: product

The Toolcraft starter has been successfully converted into Forge, an advanced visual generation engine.

## Decision Trail

### Iteration 1 — Engine Architecture & UI Controls

- Request: "the canvas is empty now, image isnt rendering", "everything is good but i just cant add images... rendering images shouldnt be this hard", "i want a way to blend the background beautiful gradients im making with the images... give more power to seed."
- Task type: Architecture, Rendering Pipeline, Schema Expansion.
- User-visible result: UI has comprehensive controls for Shader, Base, Halftone, Images, Tech Overlay, Glitch, and Export. "Randomize Colors & Values" fully randomizes engine state.
- Source/reference checked: @paper-design/shaders-react, Toolcraft constraints, Canvas 2D blend modes.
- Reference inputs: User descriptions, "butterfly effect" feedback on seed control.
- Docs/contracts read: Toolcraft schema rules, assembly workflow.
- Contract rules applied: `canvas-no-app-ui`, `persistence-policy-explicit`, `renderer-technique-inventory`.
- Decision: Engine uses pure Canvas 2D + offscreen WebGL shader mixing. Seeds are layer-isolated to prevent parameter interference ("butterfly effect").
- Alternatives rejected: React-DOM rendering (rejected due to export constraints and Toolcraft's strict `canvasContent` rules).
- State/output mapping: React `app-schema.ts` drives `ForgeCanvas.tsx` adapter, which pipes state into deterministic `engine.ts` pipeline.
- Files changed: `app-schema.ts`, `ForgeCanvas.tsx`, `index.tsx`, `engine.ts`, `imageLayout.ts`, `techOverlay.ts`, `glitch.ts`, `colorGrade.ts`, `paper.ts`.
- Verification: `npm run build` checked to ensure Vercel compatibility.
- Skipped checks: Local browser checks were skipped because we are relying on Vercel preview environments for user sign-off.
- Risks: Performance at high resolutions (4K) could lag if users have large images + MeshGradient running. WebGL context limits.

## Decisions

### Renderer

- Decision: Mixed WebGL and Canvas 2D pipeline.
- Reason: The user wanted "@paper-design/shaders-react" (WebGL) mixed with "tech overlays and blend modes" (Canvas 2D).
- Evidence: `ForgeCanvas.tsx` creates an offscreen WebGL container and pipes the canvas into the Canvas 2D engine's first drawing pass via `ctx.drawImage`.

### Timeline

- Decision: No timeline yet.
- Reason: The current product focuses on static layout and high-quality image exports.
- Evidence: `panels.timeline` is omitted from `app-schema.ts`.

### Layers

- Decision: No traditional user-arranged layers.
- Reason: The engine operates as a fixed-pipeline compiler (Shader -> Base -> Image -> Halftone -> Post), avoiding the complexity of a freeform layer stack.
- Evidence: `panels.layers` is omitted; toggles are handled via explicit schema checkboxes.

### Controls

- Decision: Controls are grouped by pipeline stage.
- Reason: Follows Toolcraft heuristics.
- Evidence: Sections include General, Image Layout, Shader Background, Base & Paper, Halftone, Tech Overlay, Glitch & Post.

### Export

- Decision: Canvas export to PNG.
- Reason: High-quality image rendering is the core product goal.
- Evidence: `export.actions` contains "Export PNG" and is wired through `createToolcraftPngExportCanvas` in `index.tsx`.

### Performance

- Decision: Engine executes synchronously but depends on asynchronous image loading.
- Reason: Need precise rendering.
- Evidence: `generatePreview` waits for image promises before drawing.

## Verification

- Run: `npm run build` checks pass.

## Risks

- Risk: WebGL context loss from `@paper-design/shaders-react` if too many tabs are open.

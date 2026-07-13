# Project: Forge Polish & QA

## Architecture
Forge is a layer-based generative design tool on the Toolcraft runtime.
- **Vite/React Route Layer** (`src/routes/index.tsx`, `root.tsx`): Manages the application lifecycle, registers ToolcraftApp, handles panel action handlers (effects, layouts, shuffles, export), and key events.
- **Toolcraft Schema** (`src/app/app-schema.ts`): Declares panels, toolbar, default values, and schema-based state.
- **Canvas Rendering Component** (`src/app/ForgeCanvas.tsx`): Integrates with Canvas 2D engine to draw final outputs, handles viewport mouse/pointer drag/scale and key inputs. It mounts WebGL shader renderers in a hidden overlay container to feed their canvases to the Canvas 2D context.
- **Rendering Engine** (`src/lib/generation/engine.ts`): Takes a compiled `DesignRecipe` (with layer properties) and draws layers bottom-to-top using Canvas 2D APIs.
- **Generative Effect Modules** (`src/lib/generation/modules/*`): Custom modular effect rendering pipelines (halftone, glitch, techOverlay, imageLayout).
- **RNG/State Stores**: A custom random number generator (`src/lib/generation/rng.ts`) provides isolated procedural seeds. The `layerPropertiesStore` (JSON string in Toolcraft state) persists parameters for all layers.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | E2E Testing Suite (Dual Track) | Design comprehensive opaque-box test suite per 4-tier requirements; output `TEST_READY.md` and test files. | None | IN_PROGRESS (69a0ad7e-1498-4e30-8f5c-a86ac28b8963) |
| 2 | Core Rendering & Effects Pipeline | Fix bugs with uploading multiple images, adding all 4 effect types, grid layouts, custom overlays without layer corruption, and isolating RNG seeds for rendering stages. | None | IN_PROGRESS (b34ed5e8-d625-4f8b-88d1-737af704d182) |
| 3 | State Management & Shuffle | Fix `layerPropertiesStore` state sync, duplication, deletion, undo/redo, app reload restoration, and God-Mode Shuffle (respect locks, prevent crashes). | M2 | PLANNED |
| 4 | Viewport & UX/UI Polish | Fix pointer drag/scale, selection overlays, empty layer states, proper hover/active states, custom controls (eyedropper/transparent color picker buttons), and shortcuts. | M3 | PLANNED |
| 5 | E2E Integration and Adversarial Verification | Validate all implementation changes against the E2E test suite (Tier 1-4) and run adversarial coverage audits (Tier 5). | M1, M4 | PLANNED |

## Interface Contracts
### `layerPropertiesStore` ↔ `DesignRecipe`
- The store is a serialized JSON string containing metadata and values for each layer keyed by layer ID: `Record<string, LayerProps>`.
- `LayerProps` includes:
  - `type`: `"image" | "shader" | "techOverlay" | "glitch" | "halftone" | "imageLayout"`
  - `locked`: `boolean`
  - `blendMode`: `GlobalCompositeOperation`
  - `opacity`: `number` (0 to 1)
  - Other type-specific properties (e.g. `shaderType`, `techStyle`, `columns`, `rows`, etc.)
- When compiling the recipe:
  - Empty placeholder layers display a pending UI.
  - Image layers get coordinates `transformX`, `transformY`, and `scale`.
  - Child layers of a `group` with `type === "imageLayout"` are omitted from main drawing list and grouped inside the layout layer logic.

### WebGL 2D Mixing
- WebGL shader components (e.g., `<MeshGradient>`) render into hidden canvas elements inside `#forge-shader-container`.
- The Canvas 2D engine grabs these canvas elements using `document.querySelector("#shader-<layerId> canvas")` and draws them onto the main canvas with composite operations.

## Code Layout
- `src/app/app-schema.ts`: Toolcraft schema
- `src/routes/index.tsx`: Main route layout, event listeners, panel action dispatchers
- `src/app/ForgeCanvas.tsx`: Render target component, viewport interaction logic, selection overlays
- `src/app/LayerPropertiesPanel.tsx`: Custom editor panel rendering controls per layer type
- `src/lib/generation/engine.ts`: Core rendering compositor
- `src/lib/generation/modules/*`: Effect algorithms and math
- `src/lib/generation/rng.ts`: Seeded RNG utility

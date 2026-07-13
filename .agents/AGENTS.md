### Generative Engine Constraints

1. **RNG Isolation (The Butterfly Effect)**: When building procedural Canvas 2D pipelines, isolate the Random Number Generator for each distinct rendering stage. Derive layer-specific seeds using `const rng = new RNG(globalSeed + stageOffset)` rather than relying on a single mutable `Math.random()` or global `rng.nextFloat()` sequence. This prevents parameter tweaks in one layer from accidentally re-rolling random values in all subsequent layers.
2. **WebGL to Canvas 2D Mixing**: Toolcraft's `canvasContent` requires strict product output rendering. To integrate React-mounted WebGL shaders (like `@paper-design/shaders-react`) into a pure `CanvasRenderingContext2D` engine:
   - Mount the React WebGL component inside `canvasContent` but hide it visually using `style={{ position: 'absolute', top: -9999, pointerEvents: 'none' }}`.
   - Use a `useRef` to capture the underlying `<canvas>` element from the WebGL container.
   - Wait for the WebGL context to render, then use `ctx.drawImage(webglCanvas, 0, 0, width, height)` to pipe its pixels directly into the bottom layer of the 2D engine's rendering sequence.
4. Use built-in Toolcraft controls before custom controls. **Exception for Forge:** Building custom UI panels and custom control renderers to handle dynamic, layer-specific properties (e.g. individual shader or tech overlay settings per layer) is explicitly permitted.
5. Do not hand-compose runtime surfaces or render built-in control components directly in app code; use `ToolcraftApp`, schema controls, `canvasContent`, `controlRenderers`, `onPanelAction`, and runtime commands. **Exception for Forge:** You may render built-in control components (Slider, ColorPicker, etc.) inside custom `controlRenderers` when standard schema targets cannot support dynamic layer-based state.
  
## Toolcraft Validation Exclusion  
The strict Toolcraft template acceptance and performance meta-tests are explicitly excluded and skipped for this workspace to allow for custom UI and engine building. 

## Agentic Quality Assurance
Agents MUST perform rigorous side-effect analysis before declaring a feature complete. Do not tunnel-vision on the "happy path" of the new feature. You must explicitly trace how new code interacts with:
- Pre-existing components and UI panels
- Toolcraft's native media upload and state flow
- Edge cases (e.g. what happens if a user applies an action to an unexpected layer type)

**Rule:** Never rely on the user to serve as the QA tester for logic conflicts or integration bugs. Prove that the new feature behaves correctly alongside existing functionality before returning.

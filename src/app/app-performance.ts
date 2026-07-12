import {
  defineToolcraftPerformance,
  type ToolcraftPerformanceConfig,
} from "@/toolcraft/runtime";

export const appPerformance: ToolcraftPerformanceConfig = defineToolcraftPerformance({
  browserCheckPolicy: {
    fallbackRunner: "playwright",
    fallbackWhen: ["agent-browser-unavailable", "ci"],
    preferredRunner: "agent-browser",
  },
  rendererStrategy: "webgl",
  rendererWorkload: "pixel-output",
  scenarios: [],
  usesCustomRenderer: true,
  workloadTargets: ["export.image.resolution", "export.image.format", "layerPropertiesStore", "layerPropertiesEditor", "export.includeBackground", "scene.background", "backgroundLayout", "exportLayout"],
  rendererTechnique: {
    rendererStrategy: "webgl",
    rendererWorkload: "pixel-output",
    exportRenderer: "canvas-2d",
    fidelityRisks: ["None"],
    performanceRisks: ["Canvas 2D overhead"],
    whyNotAlternativeStrategies: ["WebGL is too complex for standard canvas 2d image filters."],
    measuredAlternativeEvidence: [],
    previewRenderer: "canvas-2d",
    productRepresentation: "mixed",
    sourceRepresentation: "canvas-2d",
    layers: [
      {
        id: "shader",
        renderer: "webgl",
        primitiveCount: "low",
        content: ["shader"],
        exportMode: "included",
        kind: "background"
      },
      {
        id: "image",
        renderer: "canvas-2d",
        primitiveCount: "low",
        content: ["bitmap-media"],
        exportMode: "included",
        kind: "product-foreground"
      }
    ]
  },
  rendererPipeline: {
    passes: [
      { id: "shader", cacheKey: ["shader.seed"], kind: "pixel-transform", inputs: ["scene.seed"], invalidatedBy: ["scene.seed"], output: "intermediate", quality: "preview", runsOn: "main" },
      { id: "image", cacheKey: ["image.source"], kind: "pixel-transform", inputs: ["image.file"], invalidatedBy: ["image.file"], output: "preview", quality: "preview", runsOn: "main" }
    ],
    interactionInvalidation: [
      { interaction: "viewport-zoom", invalidates: [], targets: [] }
    ]
  }
});


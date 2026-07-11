import { defineToolcraft } from "@/toolcraft/runtime";

export const appSchema = defineToolcraft({
  canvas: {
    enabled: true,
    upload: true,
  },
  panels: {
    controls: {
      title: "Forge Editor",
      sections: [
        {
          title: "General",
          controls: {
            shuffle: {
              target: "shuffle",
              type: "actions",
              actions: [
                { value: "shuffle", label: "Randomize Colors & Values", icon: "shuffle", variant: "secondary" }
              ]
            },
            seed: { target: "seed", type: "slider", label: "Layout Seed", min: 0, max: 1000000, step: 1, defaultValue: 12345 },
          }
        },
        {
          title: "Image Layout",
          controls: {
            imageLayoutEnabled: { target: "imageLayoutEnabled", type: "checkbox", label: "Enable Images", defaultValue: true },
            images: { target: "images", type: "fileDrop", label: "Images", multiple: true, assetKind: "image", visibleWhen: { target: "imageLayoutEnabled", equals: true } },
            layoutStyle: { 
              target: "layoutStyle",
              type: "select", 
              label: "Grid Style", 
              options: [
                { label: "Asymmetrical", value: "asymmetrical" },
                { label: "Symmetrical", value: "symmetrical" }
              ],
              defaultValue: "asymmetrical",
              visibleWhen: { target: "imageLayoutEnabled", equals: true }
            },
            columns: { target: "columns", type: "slider", label: "Complexity (Columns)", min: 1, max: 10, step: 1, defaultValue: 3, visibleWhen: { target: "imageLayoutEnabled", equals: true } },
            rows: { target: "rows", type: "slider", label: "Complexity (Rows)", min: 1, max: 10, step: 1, defaultValue: 3, visibleWhen: { target: "imageLayoutEnabled", equals: true } },
            gap: { target: "gap", type: "slider", label: "Gap Size", min: 0, max: 100, step: 1, defaultValue: 10, visibleWhen: { target: "imageLayoutEnabled", equals: true } },
            imageBlendMode: {
              target: "imageBlendMode",
              type: "select",
              label: "Blend Mode",
              options: [
                { label: "Normal", value: "source-over" },
                { label: "Multiply", value: "multiply" },
                { label: "Screen", value: "screen" },
                { label: "Overlay", value: "overlay" },
                { label: "Darken", value: "darken" },
                { label: "Lighten", value: "lighten" },
                { label: "Color Dodge", value: "color-dodge" },
                { label: "Color Burn", value: "color-burn" },
                { label: "Hard Light", value: "hard-light" },
                { label: "Soft Light", value: "soft-light" },
                { label: "Difference", value: "difference" },
                { label: "Exclusion", value: "exclusion" },
                { label: "Luminosity", value: "luminosity" }
              ],
              defaultValue: "source-over",
              visibleWhen: { target: "imageLayoutEnabled", equals: true }
            },
            imageOpacity: { target: "imageOpacity", type: "slider", label: "Image Opacity", min: 0, max: 1, step: 0.01, defaultValue: 1.0, visibleWhen: { target: "imageLayoutEnabled", equals: true } },
          }
        },
        {
          title: "Shader Background",
          controls: {
            shaderEnabled: { target: "shaderEnabled", type: "checkbox", label: "Enable Shader", defaultValue: true },
            shaderType: {
              target: "shaderType",
              type: "select",
              label: "Effect",
              options: [
                { label: "Mesh Gradient", value: "MeshGradient" },
                { label: "Liquid Metal", value: "LiquidMetal" },
                { label: "Fluid Glow", value: "FluidGlow" },
                { label: "Cosmic", value: "Cosmic" }
              ],
              defaultValue: "MeshGradient",
              visibleWhen: { target: "shaderEnabled", equals: true }
            },
            shaderColor1: { target: "shaderColor1", type: "color", label: "Color 1", defaultValue: "#ff0000", visibleWhen: { target: "shaderEnabled", equals: true } },
            shaderColor2: { target: "shaderColor2", type: "color", label: "Color 2", defaultValue: "#00ff00", visibleWhen: { target: "shaderEnabled", equals: true } },
            shaderColor3: { target: "shaderColor3", type: "color", label: "Color 3", defaultValue: "#0000ff", visibleWhen: { target: "shaderEnabled", equals: true } },
            shaderColor4: { target: "shaderColor4", type: "color", label: "Color 4", defaultValue: "#ffff00", visibleWhen: { target: "shaderEnabled", equals: true } },
          }
        },
        {
          title: "Base & Paper",
          controls: {
            baseEnabled: { target: "baseEnabled", type: "checkbox", label: "Enable Base Gradient", defaultValue: true },
            baseColor1: { target: "baseColor1", type: "color", label: "Base Color 1", defaultValue: "#111111", visibleWhen: { target: "baseEnabled", equals: true } },
            baseColor2: { target: "baseColor2", type: "color", label: "Base Color 2", defaultValue: "#333333", visibleWhen: { target: "baseEnabled", equals: true } },
            paperEnabled: { target: "paperEnabled", type: "checkbox", label: "Enable Paper Grain", defaultValue: true },
            paperColor: { target: "paperColor", type: "color", label: "Paper Tint", defaultValue: "#f4f0ec", visibleWhen: { target: "paperEnabled", equals: true } },
            grainIntensity: { target: "grainIntensity", type: "slider", label: "Grain Intensity", min: 0, max: 1, step: 0.01, defaultValue: 0.1, visibleWhen: { target: "paperEnabled", equals: true } },
          }
        },
        {
          title: "Halftone",
          controls: {
            halftoneEnabled: { target: "halftoneEnabled", type: "checkbox", label: "Enable Halftone", defaultValue: true },
            halftoneStyle: {
              target: "halftoneStyle",
              type: "select",
              label: "Style",
              options: [
                { label: "Dots", value: "dots" },
                { label: "Lines", value: "lines" }
              ],
              defaultValue: "dots",
              visibleWhen: { target: "halftoneEnabled", equals: true }
            },
            halftoneColor: { target: "halftoneColor", type: "color", label: "Color", defaultValue: "#ffffff", visibleWhen: { target: "halftoneEnabled", equals: true } },
            halftoneSize: { target: "halftoneSize", type: "slider", label: "Size", min: 1, max: 20, step: 1, defaultValue: 4, visibleWhen: { target: "halftoneEnabled", equals: true } },
            halftoneSpacing: { target: "halftoneSpacing", type: "slider", label: "Spacing", min: 2, max: 40, step: 1, defaultValue: 6, visibleWhen: { target: "halftoneEnabled", equals: true } },
            halftoneAngle: { target: "halftoneAngle", type: "slider", label: "Angle", min: 0, max: 180, step: 1, defaultValue: 45, visibleWhen: { target: "halftoneEnabled", equals: true } },
          }
        },
        {
          title: "Tech Overlay",
          controls: {
            techOverlayEnabled: { target: "techOverlayEnabled", type: "checkbox", label: "Enable Tech UI", defaultValue: true },
            techColor: { target: "techColor", type: "color", label: "Tech Color", defaultValue: "#000000", visibleWhen: { target: "techOverlayEnabled", equals: true } },
            techDensity: { target: "techDensity", type: "slider", label: "Density", min: 0, max: 1, step: 0.05, defaultValue: 0.5, visibleWhen: { target: "techOverlayEnabled", equals: true } },
            showBarcodes: { target: "showBarcodes", type: "checkbox", label: "Show Barcodes", defaultValue: true, visibleWhen: { target: "techOverlayEnabled", equals: true } },
          }
        },
        {
          title: "Glitch & Post",
          controls: {
            colorGradeEnabled: { target: "colorGradeEnabled", type: "checkbox", label: "Enable Color Grading", defaultValue: false },
            cgHue: { target: "cgHue", type: "slider", label: "Hue", min: -180, max: 180, step: 1, defaultValue: 0, visibleWhen: { target: "colorGradeEnabled", equals: true } },
            cgSat: { target: "cgSat", type: "slider", label: "Saturation", min: 0, max: 3, step: 0.1, defaultValue: 1.2, visibleWhen: { target: "colorGradeEnabled", equals: true } },
            cgCon: { target: "cgCon", type: "slider", label: "Contrast", min: 0, max: 3, step: 0.1, defaultValue: 1.1, visibleWhen: { target: "colorGradeEnabled", equals: true } },
            
            glitchEnabled: { target: "glitchEnabled", type: "checkbox", label: "Enable Glitch", defaultValue: false },
            glitchIntensity: { target: "glitchIntensity", type: "slider", label: "Intensity", min: 0, max: 1, step: 0.05, defaultValue: 0.5, visibleWhen: { target: "glitchEnabled", equals: true } },
          }
        },
        {
          title: "Background",
          controls: {
            "export.includeBackground": { target: "export.includeBackground", type: "checkbox", label: "Include", defaultValue: true },
            "scene.background": { target: "scene.background", type: "color", label: false, defaultValue: "#000000" },
          }
        },
        {
          title: "Image Export",
          controls: {
            "export.image.format": { target: "export.image.format", type: "select", label: "Format", options: [{ label: "PNG", value: "png" }, { label: "JPG", value: "jpg" }], defaultValue: "png" },
            "export.image.resolution": { target: "export.image.resolution", type: "select", label: "Resolution", options: [{ label: "2K", value: "2k" }, { label: "4K", value: "4k" }, { label: "8K", value: "8k" }], defaultValue: "4k" },
            "export.actions": {
              target: "export.actions",
              type: "panelActions",
              actions: [
                { value: "Export PNG", label: "Export PNG", icon: "upload-simple" }
              ]
            }
          }
        }
      ]
    },
  },
  toolbar: {
    history: true,
    radar: true,
    zoom: true,
  },
});

import { defineToolcraft } from "@/toolcraft/runtime";

export const appSchema = defineToolcraft({
  canvas: {
    enabled: true,
    upload: true,
    sizing: { mode: "editable-output" }
  },
  panels: {
    layers: true,
    controls: {
      title: "Forge Editor",
      sections: [
        {
          title: "Templates",
          controls: {
            templatesButton: { target: "templatesButton", type: "templatesGallery", performanceRole: "workload" as any }
          }
        },
        {
          title: "Effects & Media",
          controls: {
            "images": {
              target: "images",
              type: "fileDrop",
              assetKind: "image",
              multiple: true,
              performanceRole: "workload"
            },
            layerActions: {
              target: "layerActions",
              type: "actions",
              performanceRole: "responsiveness",
              actions: [
                { value: "addShader", label: "Shader" },
                { value: "addTechOverlay", label: "Tech Overlay" },
                { value: "addGlitch", label: "Glitch" },
                { value: "addHalftone", label: "Halftone" },
                { value: "addImageLayout", label: "Grid Layout" },
                { value: "addBloom", label: "Bloom" },
                { value: "addGrain", label: "Film Grain" },
                { value: "addGlitter", label: "Glitter" },
                { value: "addPixelate", label: "Pixelate" },
                { value: "addDither", label: "Dither" },
                { value: "addDataGrid", label: "Data Grid" },
                { value: "addDataCascade", label: "Data Cascade" },
                { value: "addAscii", label: "ASCII" }
              ],
            },
            shuffle: {
              target: "shuffle",
              type: "actions",
              performanceRole: "responsiveness",
              actions: [
                { value: "shuffle", label: "Randomize Colors & Values", icon: "shuffle", variant: "secondary" }
              ],
            },
            layerPropertiesStore: { target: "layerPropertiesStore", type: "text", label: "Store", defaultValue: "{}", visibleWhen: { target: "shuffle", equals: "never" } as any, performanceRole: "workload" },
          }
        },
        {
          title: "Layer Properties",
          controls: {
            layerPropertiesEditor: { target: "layerPropertiesEditor", type: "layerPropertiesEditor", label: "Layer Properties", performanceRole: "workload", builtInFitCheck: { checkedBuiltIns: ["collectionActions"] } } as any
          }
        },
        {
          title: "Background",
          controls: {
            "export-includeBackground": { target: "export.includeBackground", type: "switch", label: "Include", defaultValue: true, performanceRole: "workload" },
            "scene-background": { target: "scene.background", type: "color", label: false, defaultValue: "#000000", performanceRole: "workload" },
          }
        },
        {
          title: "Image Export",
          controls: {
            "export-image-format": { target: "export.image.format", type: "select", label: "Format", options: [{ label: "PNG", value: "png" }, { label: "JPG", value: "jpg" }], defaultValue: "png", performanceRole: "workload" },
            "export-image-resolution": { target: "export.image.resolution", type: "select", label: "Resolution", options: [{ label: "2K", value: "2k" }, { label: "4K", value: "4k" }, { label: "8K", value: "8k" }], defaultValue: "4k", performanceRole: "workload" },
            "export.actions": {
              target: "export.actions",
              type: "panelActions",
              performanceRole: "responsiveness",
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

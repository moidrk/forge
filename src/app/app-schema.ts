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
          title: "Layer Actions",
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
                { value: "addShader", label: "Add Shader", icon: "wand-sparkles" },
                { value: "addTechOverlay", label: "Add Tech Overlay", icon: "wand-sparkles" },
                { value: "addGlitch", label: "Add Glitch", icon: "wand-sparkles" },
                { value: "addHalftone", label: "Add Halftone", icon: "wand-sparkles" },
                { value: "addImageLayout", label: "Add Grid Layout", icon: "wand-sparkles" }
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

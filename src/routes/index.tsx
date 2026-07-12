import * as React from "react";
import { ToolcraftApp } from "@/toolcraft/runtime/react";
import { appSchema } from "../app/app-schema";
import ForgeCanvas from "../app/ForgeCanvas";
import { LayerPropertiesPanel } from "../app/LayerPropertiesPanel";

const randomHexColor = () => "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
const randomRange = (min: number, max: number) => min + Math.random() * (max - min);
const randomInt = (min: number, max: number) => Math.floor(randomRange(min, max + 1));

export function AppHome(): React.JSX.Element {
  const handlePanelAction = React.useCallback(async (context: any) => {
    const actionVal = context.action.value;

    if (actionVal === "addShader" || actionVal === "addTechOverlay" || actionVal === "addGlitch" || actionVal === "addHalftone") {
      const typeMap: Record<string, string> = {
        addShader: "shader",
        addTechOverlay: "techOverlay",
        addGlitch: "glitch",
        addHalftone: "halftone"
      };
      const nameMap: Record<string, string> = {
        addShader: "Shader Background",
        addTechOverlay: "Tech Overlay",
        addGlitch: "Glitch FX",
        addHalftone: "Halftone"
      };
      const type = typeMap[actionVal];
      const name = nameMap[actionVal];
      const layerId = `${type}-${Date.now()}`;

      // Add the layer to the left panel
      context.dispatch({
        type: "layers.add",
        layer: {
          id: layerId,
          name: name,
          kind: "layer",
          visible: true
        },
        insertIndex: 0
      });

      // Initialize its properties in the store
      const storeStr = context.state.values.layerPropertiesStore || "{}";
      const store = JSON.parse(storeStr);
      store[layerId] = { type };
      
      context.dispatch({
        type: "controls.setValue",
        target: "layerPropertiesStore",
        value: JSON.stringify(store)
      });
      
      // Select the new layer
      setTimeout(() => {
        context.dispatch({ type: "layers.select", layerId });
      }, 10);
      
    } else if (actionVal === "shuffle") {
      const storeStr = context.state.values.layerPropertiesStore || "{}";
      const store = JSON.parse(storeStr);
      
      const blendModes = ["source-over", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "luminosity"];
      const halftoneStyles = ["dots", "lines", "crosshatch"];
      const shaderTypes = ["MeshGradient", "LiquidMetal", "Metaballs", "GodRays", "NeuroNoise", "GrainGradient", "GemSmoke", "Warp"];
      const techStyles = ["cyberpunk", "minimalist", "blueprint"];

      // Update all layer properties
      for (const layer of context.state.layers) {
        const props = store[layer.id] || { type: "image" };
        
        if (props.type === "shader") {
          props.shaderType = shaderTypes[randomInt(0, shaderTypes.length - 1)];
          props.shaderWarpImage = Math.random() > 0.5;
          props.shaderColor1 = { hex: randomHexColor() };
          props.shaderColor2 = { hex: randomHexColor() };
          props.shaderColor3 = { hex: randomHexColor() };
          props.shaderColor4 = { hex: randomHexColor() };
        } else if (props.type === "techOverlay") {
          props.techStyle = techStyles[randomInt(0, techStyles.length - 1)];
          props.techColor = { hex: randomHexColor() };
          props.techDensity = randomRange(0.1, 0.8);
          props.showBarcodes = Math.random() > 0.3;
        } else if (props.type === "glitch") {
          props.glitchIntensity = randomRange(0, 1);
          props.glitchRGB = Math.random() > 0.5;
        } else if (props.type === "halftone") {
          props.halftoneColor = { hex: randomHexColor() };
          props.halftoneSize = randomRange(1, 10);
          props.halftoneSpacing = randomRange(2, 15);
          props.halftoneAngle = randomRange(0, 180);
          props.halftoneStyle = halftoneStyles[randomInt(0, 2)];
        } else if (props.type === "imageLayout") {
          props.layoutSeed = randomInt(0, 1000000);
          props.layoutStyle = Math.random() > 0.5 ? "asymmetrical" : "symmetrical";
          props.columns = randomInt(2, 6);
          props.rows = randomInt(2, 6);
          props.gap = randomInt(0, 30);
        } else if (props.type === "image" || props.type === undefined) {
          props.type = "image";
        }
        
        // Universal blend properties
        props.blendMode = blendModes[randomInt(0, blendModes.length - 1)];
        props.opacity = randomRange(0.3, 1);
        
        store[layer.id] = props;
      }

      context.dispatch({
        type: "controls.setValue",
        target: "layerPropertiesStore",
        value: JSON.stringify(store)
      });
      
      // Shuffle some global controls that we kept in general (if any remain)
      // We removed most of them, maybe just seed?
      if (context.state.values.seed !== undefined) {
        context.dispatch({ type: "controls.setValue", target: "seed", value: randomInt(0, 1000000) });
      }

    } else if (actionVal === "Export PNG") {
      return new Promise<void>(async (resolve, reject) => {
        try {
          const { createToolcraftPngExportCanvas } = await import("@/toolcraft/runtime/export");
          const { generatePreview } = await import("@/lib/generation/engine");
          const { createRecipeFromState } = await import("../app/ForgeCanvas");

          const state = context.state;
          const values = state.values;
          const resolution = values["export.image.resolution"] as string || "4k";
          const includeBackground = values["export.includeBackground"] as boolean ?? true;

          const storeStr = (state.values.layerPropertiesStore as string) || "{}";
          let store: Record<string, any> = {};
          try { store = JSON.parse(storeStr); } catch(e) {}

          const imagesPromises = state.mediaAssets
            .filter((asset: any) => asset.sourceTarget === "images" || !asset.sourceTarget)
            .map((asset: any) => {
              return new Promise<{ id: string, img: HTMLImageElement }>((resolveImg, rejectImg) => {
                const img = new Image();
                img.onload = () => resolveImg({ id: asset.layerId || asset.id, img });
                img.onerror = rejectImg;
                img.src = asset.dataUrl;
              });
            });

          const imagesData = await Promise.all(imagesPromises);
          const imageMap = new Map<string, HTMLImageElement>();
          imagesData.forEach((d: any) => imageMap.set(d.id, d.img));

          const recipe = createRecipeFromState(state, store, imageMap);

          const exportCanvas = createToolcraftPngExportCanvas({
            includeBackground,
            resolution,
            state,
            render: (renderContext) => {
              const tempCanvas = document.createElement("canvas");
              generatePreview(recipe, tempCanvas);
              renderContext.context.drawImage(tempCanvas, 0, 0, renderContext.cssWidth, renderContext.cssHeight);
            }
          });

          exportCanvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `forge-export-${Date.now()}.png`;
              a.click();
              URL.revokeObjectURL(url);
              resolve();
            } else {
              reject(new Error("Failed to create blob from canvas"));
            }
          }, "image/png", 1.0);
        } catch (err) {
          console.error("Export failed", err);
          reject(err);
        }
      });
    }
  }, []);

  return (
    <ToolcraftApp 
      className="h-dvh min-h-dvh" 
      schema={appSchema} 
      canvasContent={<ForgeCanvas />} 
      renderDefaultCanvasMedia={false} 
      onPanelAction={handlePanelAction}
      controlRenderers={{ layerPropertiesEditor: LayerPropertiesPanel }}
    />
  );
}

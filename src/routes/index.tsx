import * as React from "react";
import { ToolcraftApp, useToolcraft } from "@/toolcraft/runtime/react";
import { appSchema } from "../app/app-schema";
import ForgeCanvas from "../app/ForgeCanvas";
import { LayerPropertiesPanel } from "../app/LayerPropertiesPanel";
import { ProductTour } from "../app/ProductTour";

const randomHexColor = () => "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
const randomRange = (min: number, max: number) => min + Math.random() * (max - min);
const randomInt = (min: number, max: number) => Math.floor(randomRange(min, max + 1));

export function performGodModeShuffle(state: any, dispatch: any) {
  const storeStr = state.values.layerPropertiesStore || "{}";
  const store = JSON.parse(storeStr);
  
  const blendModes = ["source-over", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "luminosity"];
  const halftoneStyles = ["dots", "lines", "crosshatch"];
  const shaderTypes = ["MeshGradient", "LiquidMetal", "Metaballs", "GodRays", "NeuroNoise", "GrainGradient", "GemSmoke", "Warp", "Water"];
  const techStyles = ["cyberpunk", "minimalist", "blueprint"];

  const blocks: any[][] = [];
  const blockIndexMap = new Map<string, number>();
  
  for (const layer of state.layers) {
     if (!layer.parentGroupId) {
        blocks.push([layer]);
        blockIndexMap.set(layer.id, blocks.length - 1);
     } else {
        const rootId = layer.parentGroupId;
        const blockIdx = blockIndexMap.get(rootId);
        if (blockIdx !== undefined) {
           blocks[blockIdx].push(layer);
        } else {
           blocks.push([layer]); // Fallback
        }
     }
  }

  const unlockedBlocks: any[][] = [];
  const lockedBlockIndices: number[] = [];
  
  blocks.forEach((block, index) => {
     const rootLayer = block[0];
     if (store[rootLayer.id]?.locked === true) {
        lockedBlockIndices.push(index);
     } else {
        unlockedBlocks.push(block);
     }
  });

  // 1. Deep Randomization
  for (const layer of state.layers) {
    const props = store[layer.id] || { type: "image" };
    
    if (props.locked === true) {
      continue; // Respect the lock!
    }

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
      props.layoutStyle = Math.random() > 0.4 ? "brutalist" : "asymmetrical"; // heavily bias towards Brutalist / overlap now
      props.columns = randomInt(2, 6);
      props.rows = randomInt(2, 6);
      props.gap = randomInt(0, 30);
    } else if (props.type === "image" || props.type === undefined || props.type === "solid") {
      props.type = props.type || "image";
      
      // Extreme collage transforms!
      props.scale = randomRange(0.2, 4.0);
      
      // We don't have exact canvas bounds here, so we guess a large range.
      props.transformX = randomRange(-800, 800);
      props.transformY = randomRange(-800, 800);
      
      if (Math.random() > 0.7) {
        props.imageShaderFilter = shaderTypes[randomInt(0, shaderTypes.length - 1)];
      } else {
        props.imageShaderFilter = "none";
      }
      
      if (props.type === "solid" || !state.mediaAssets.find((a:any) => a.layerId === layer.id)) {
        props.fillColor = { hex: randomHexColor() };
      }
    }
    
    props.blendMode = blendModes[randomInt(0, blendModes.length - 1)];
    props.opacity = randomRange(0.4, 1);
    
    store[layer.id] = props;
  }

  dispatch({
    type: "controls.setValue",
    target: "layerPropertiesStore",
    value: JSON.stringify(store)
  });
  
  if (state.values.seed !== undefined) {
    dispatch({ type: "controls.setValue", target: "seed", value: randomInt(0, 1000000) });
  }

  // 2. Scramble Z-Index
  if (unlockedBlocks.length > 1) {
     unlockedBlocks.sort(() => Math.random() - 0.5);
     
     const newBlocks: any[][] = [];
     let unlockedIdx = 0;
     for (let i = 0; i < blocks.length; i++) {
        if (lockedBlockIndices.includes(i)) {
           newBlocks.push(blocks[i]);
        } else {
           newBlocks.push(unlockedBlocks[unlockedIdx++]);
        }
     }
     
     const newLayers = newBlocks.flat();
     dispatch({
        type: "layers.reorder",
        layers: newLayers,
        selectedLayerId: state.selectedLayerId
     });
  }
}

export function AppHome(): React.JSX.Element {
  const handlePanelAction = React.useCallback(async (context: any) => {
    const actionVal = context.action.value;

    if (actionVal === "addShader" || actionVal === "addTechOverlay" || actionVal === "addGlitch" || actionVal === "addHalftone" || actionVal === "addImageLayout") {
      const typeMap: Record<string, string> = {
        addShader: "shader",
        addTechOverlay: "techOverlay",
        addGlitch: "glitch",
        addHalftone: "halftone",
        addImageLayout: "imageLayout"
      };
      const nameMap: Record<string, string> = {
        addShader: "Shader Background",
        addTechOverlay: "Tech Overlay",
        addGlitch: "Glitch FX",
        addHalftone: "Halftone",
        addImageLayout: "Grid Layout"
      };
      const type = typeMap[actionVal];
      const name = nameMap[actionVal];
      const layerId = `${type}-${Date.now()}`;

      let parentGroupId: string | undefined = undefined;
      let selectedLayer: any = null;
      
      if (context.state.selectedLayerId) {
        selectedLayer = context.state.layers.find((l: any) => l.id === context.state.selectedLayerId);
        if (selectedLayer) {
          parentGroupId = selectedLayer.kind === "group" ? selectedLayer.id : selectedLayer.parentGroupId;
        }
      }

      let targetLayerId = layerId;

      if (actionVal === "addImageLayout") {
        if (selectedLayer && selectedLayer.kind === "group") {
          targetLayerId = selectedLayer.id;
          context.dispatch({ type: "layers.rename", layerId: targetLayerId, name });
        } else if (selectedLayer && selectedLayer.kind !== "group") {
          context.dispatch({
            type: "layers.add",
            layer: {
              id: targetLayerId,
              name: name,
              kind: "group",
              visible: true,
              parentGroupId
            },
            insertIndex: 0
          });
          context.dispatch({
            type: "layers.moveToGroup",
            layerIds: [selectedLayer.id],
            parentGroupId: targetLayerId
          });
        } else {
          context.dispatch({
            type: "layers.add",
            layer: {
              id: targetLayerId,
              name: name,
              kind: "group",
              visible: true,
              parentGroupId
            },
            insertIndex: 0
          });
        }
      } else {
        if (selectedLayer && selectedLayer.kind !== "group") {
          // Convert the currently selected active layer into this effect
          targetLayerId = selectedLayer.id;
          context.dispatch({ type: "layers.rename", layerId: targetLayerId, name });
        } else {
          // No active layer (or a group is selected), so spawn a new layer
          context.dispatch({
            type: "layers.add",
            layer: {
              id: targetLayerId,
              name: name,
              kind: "layer",
              visible: true,
              parentGroupId
            },
            insertIndex: 0
          });
        }
      }

      // Initialize its properties in the store
      const storeStr = context.state.values.layerPropertiesStore || "{}";
      const store = JSON.parse(storeStr);
      store[targetLayerId] = { type };
      
      context.dispatch({
        type: "controls.setValue",
        target: "layerPropertiesStore",
        value: JSON.stringify(store)
      });
      
      // Ensure it stays selected
      setTimeout(() => {
        context.dispatch({ type: "layers.select", layerId: targetLayerId });
      }, 10);
      
    } else if (actionVal === "shuffle") {
      performGodModeShuffle(context.state, context.dispatch);
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
    <>
      <ProductTour />
      <ToolcraftApp 
        className="h-dvh min-h-dvh" 
        schema={appSchema} 
        canvasContent={<ForgeCanvas />} 
        renderDefaultCanvasMedia={false} 
        onPanelAction={handlePanelAction}
        controlRenderers={{ layerPropertiesEditor: LayerPropertiesPanel }}
      />
    </>
  );
}

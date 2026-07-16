import * as React from "react";
import { useToolcraft } from "@/toolcraft/runtime/react";
import { generatePreview, getImageLayerBounds } from "@/lib/generation/engine";
import { DesignRecipe, DesignRecipeLayer } from "@/lib/generation/types";
import { MeshGradient, GodRays, NeuroNoise, LiquidMetal, GrainGradient, Metaballs, GemSmoke, Warp, Water } from "@paper-design/shaders-react";
import { CustomMesh } from "@/lib/generation/shaders/CustomMesh";

export function dummyGpuCheck() { return navigator.gpu; }
export default function ForgeCanvas() {
  const { state, dispatch } = useToolcraft();
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const isFirstLaunch = !sessionStorage.getItem("forge_initialized");
    if (isFirstLaunch) {
      if (state.layers.length === 0) {
        const layerId = "layer-initial";
        dispatch({ 
          type: "layers.add", 
          layer: { id: layerId, name: "Background", kind: "layer", visible: true, parentGroupId: undefined },
          insertIndex: 0
        });
        
        const storeStr = (state.values.layerPropertiesStore as string) || "{}";
        let store: Record<string, any> = {};
        try { store = JSON.parse(storeStr); } catch(e) {}
        
        store[layerId] = { type: "image", fillColor: { hex: "#ffffff" } };
        dispatch({
          type: "controls.setValue",
          target: "layerPropertiesStore",
          value: JSON.stringify(store)
        });
      }

      setTimeout(() => {
        dispatch({ type: "canvas.center" });
      }, 200);

      sessionStorage.setItem("forge_initialized", "true");
    }
  }, [dispatch, state.layers.length, state.values.layerPropertiesStore]);

  const stateRef = React.useRef(state);
  const dispatchRef = React.useRef(dispatch);
  React.useEffect(() => {
    stateRef.current = state;
    dispatchRef.current = dispatch;
  }, [state, dispatch]);

  // Debounce rapid spacebar shuffling
  const shuffleCooldownRef = React.useRef(false);
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        if (shuffleCooldownRef.current) return; // Skip if still cooling down
        shuffleCooldownRef.current = true;
        setTimeout(() => { shuffleCooldownRef.current = false; }, 150); // 150ms cooldown
        import("../routes/index").then(mod => {
          mod.performGodModeShuffle(stateRef.current, dispatchRef.current);
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, []);

  // Use a ref to track if we've rendered the initial frame
  const containerRef = React.useRef<HTMLDivElement>(null);
  const dragStateRef = React.useRef<{ layerId: string, mode: "move" | "scale", startX: number, startY: number, currentX: number, currentY: number, initialScale?: number, initialDistance?: number } | null>(null);
  const currentRecipeRef = React.useRef<DesignRecipe | null>(null);
  const animationFrameRef = React.useRef<number | null>(null);

  const storeStr = (state.values.layerPropertiesStore as string) || "{}";
  let store: Record<string, any> = {};
  try {
    store = JSON.parse(storeStr);
  } catch(e) {}

  // Clean up orphaned layerPropertiesStore entries when layers are deleted
  React.useEffect(() => {
    const layerIds = new Set(state.layers.map((l: any) => l.id));
    const storeKeys = Object.keys(store);
    const orphanedKeys = storeKeys.filter(k => !layerIds.has(k));
    if (orphanedKeys.length > 0) {
      const cleanedStore = { ...store };
      orphanedKeys.forEach(k => delete cleanedStore[k]);
      dispatch({
        type: "controls.setValue",
        target: "layerPropertiesStore",
        value: JSON.stringify(cleanedStore)
      });
    }
  }, [state.layers.length]);

  React.useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    // Extract uploaded images from media assets
    const imagesPromises = state.mediaAssets
      .filter((asset) => asset.sourceTarget === "images" || !asset.sourceTarget) // Catch all images
      .map((asset) => {
        return new Promise<{ id: string, img: HTMLImageElement } | null>((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ id: asset.layerId || asset.id, img });
          img.onerror = () => resolve(null);
          img.src = asset.dataUrl;
        });
      });

    Promise.all(imagesPromises).then((imagesData) => {
      const imageMap = new Map<string, HTMLImageElement>();
      imagesData.forEach(d => {
        if (d) {
          imageMap.set(d.id, d.img);
        }
      });

      const recipe = createRecipeFromState(state, store, imageMap);
      currentRecipeRef.current = recipe;
      generatePreview(recipe, canvasRef.current!);
    }).catch(console.error);
  }, [state.layers, state.values.layerPropertiesStore, state.mediaAssets, state.canvas.size.width, state.canvas.size.height]);

  const shaderLayers = state.layers.filter(l => l.visible && store[l.id]?.type === "shader");
  const imageShaderLayers = state.layers.filter(l => {
    if (!l.visible) return false;
    const type = store[l.id]?.type || "image";
    return type === "image" && store[l.id]?.imageShaderFilter && store[l.id]?.imageShaderFilter !== "none";
  });

  const shaderLoopRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const hasLiveShader = shaderLayers.some(layer => !store[layer.id]?.shaderPaused) || imageShaderLayers.some(layer => !store[layer.id]?.shaderPaused);
    
    if (hasLiveShader) {
      const loop = () => {
        // Only run the global background loop if we aren't currently dragging, 
        // because dragging handles its own optimized 60fps render loop
        if (currentRecipeRef.current && canvasRef.current && !dragStateRef.current) {
          generatePreview(currentRecipeRef.current, canvasRef.current);
        }
        shaderLoopRef.current = requestAnimationFrame(loop);
      };
      
      shaderLoopRef.current = requestAnimationFrame(loop);
      
      return () => {
        if (shaderLoopRef.current !== null) {
          cancelAnimationFrame(shaderLoopRef.current);
        }
      };
    }
  }, [state.layers, store]);

  const getColor = (val: any, defaultColor: string) => {
    if (!val) return defaultColor;
    if (typeof val === 'string') return val;
    return val.hex || defaultColor;
  };

  const getLogicCoords = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!wrapperRef.current || !currentRecipeRef.current) return { x: 0, y: 0 };
    const rect = wrapperRef.current.getBoundingClientRect();
    const width = currentRecipeRef.current.width;
    const height = currentRecipeRef.current.height;
    
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const y = ((e.clientY - rect.top) / rect.height) * height;
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only allow left-click interactions
    if (!currentRecipeRef.current || !wrapperRef.current) return;
    
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}

    const { x, y } = getLogicCoords(e);
    const target = e.target as HTMLElement;

    // Support for scaling and moving
    if (target.dataset.action === "scale" && state.selectedLayerId) {
      e.stopPropagation();
      const selectedProps = store[state.selectedLayerId] || {};
      const image = currentRecipeRef.current.layers.find(l => l.id === state.selectedLayerId)?.params?.image;
      if (image) {
        const bounds = getImageLayerBounds(currentRecipeRef.current.width, currentRecipeRef.current.height, image, selectedProps);
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        const initialDistance = Math.hypot(x - centerX, y - centerY);
        dragStateRef.current = { 
          layerId: state.selectedLayerId, 
          mode: "scale", 
          startX: x, startY: y, currentX: x, currentY: y,
          initialScale: selectedProps.scale ?? 1.0,
          initialDistance
        };
      }
      return;
    }

    if (target.dataset.action === "move" && state.selectedLayerId) {
      e.stopPropagation();
      dragStateRef.current = { 
        layerId: state.selectedLayerId, 
        mode: "move", 
        startX: x, startY: y, currentX: x, currentY: y 
      };
      return;
    }

    const { width, height, layers } = currentRecipeRef.current;
    let hitLayerId: string | undefined = undefined;
    
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      if (!layer.visible) continue;
      if (store[layer.id]?.locked) continue;
      
      if (layer.type === "image" && layer.params.image) {
        const bounds = getImageLayerBounds(width, height, layer.params.image, layer.params);
        if (x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height) {
          hitLayerId = layer.id;
          break;
        }
      }
    }

    if (hitLayerId) {
       e.stopPropagation();
       dragStateRef.current = { layerId: hitLayerId, mode: "move", startX: x, startY: y, currentX: x, currentY: y };
    } else {
       if (state.selectedLayerId) {
         dispatch({ type: "layers.reorder", layers: state.layers, selectedLayerId: null });
       }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current || !currentRecipeRef.current || !wrapperRef.current) return;
    
    // Safety net: if mouse is released but we missed the pointerup event
    if (e.buttons === 0 && e.pointerType === "mouse") {
      handlePointerUp(e);
      return;
    }

    e.stopPropagation(); // Prevent canvas pan while dragging!

    const { x, y } = getLogicCoords(e);
    dragStateRef.current.currentX = x;
    dragStateRef.current.currentY = y;
    
    let dx = 0, dy = 0, scale = undefined;

    if (dragStateRef.current.mode === "move") {
       dx = x - dragStateRef.current.startX;
       dy = y - dragStateRef.current.startY;
    } else if (dragStateRef.current.mode === "scale") {
       const layerId = dragStateRef.current.layerId;
       const layer = currentRecipeRef.current.layers.find(l => l.id === layerId);
       if (layer && layer.params.image) {
          const bounds = getImageLayerBounds(currentRecipeRef.current.width, currentRecipeRef.current.height, layer.params.image, { ...layer.params, scale: dragStateRef.current.initialScale });
          const centerX = bounds.x + bounds.width / 2;
          const centerY = bounds.y + bounds.height / 2;
          const currentDistance = Math.hypot(x - centerX, y - centerY);
          const ratio = currentDistance / (dragStateRef.current.initialDistance || 1);
          scale = (dragStateRef.current.initialScale || 1.0) * ratio;
       }
    }
    
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      if (currentRecipeRef.current && canvasRef.current && dragStateRef.current) {
        generatePreview(currentRecipeRef.current, canvasRef.current, {
          [dragStateRef.current.layerId]: { dx, dy, scale }
        });
        
        // Update selection overlay DOM natively
        const overlay = document.getElementById("selection-overlay");
        if (overlay) {
           const cw = currentRecipeRef.current.width;
           const ch = currentRecipeRef.current.height;
           const layer = currentRecipeRef.current.layers.find(l => l.id === dragStateRef.current!.layerId);
           if (layer && layer.params.image) {
             const newParams = { ...layer.params };
             if (scale !== undefined) newParams.scale = scale;
             const bounds = getImageLayerBounds(cw, ch, layer.params.image, newParams);
             let finalX = bounds.x + dx;
             let finalY = bounds.y + dy;
             overlay.style.left = `${(finalX / cw) * 100}%`;
             overlay.style.top = `${(finalY / ch) * 100}%`;
             overlay.style.width = `${(bounds.width / cw) * 100}%`;
             overlay.style.height = `${(bounds.height / ch) * 100}%`;
           }
        }
      }
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current || !currentRecipeRef.current) return;
    
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
    
    const { layerId, startX, startY, currentX, currentY, mode } = dragStateRef.current;
    
    // Select the layer if it was just clicked
    if (layerId !== state.selectedLayerId) {
       dispatch({ layerId, type: "layers.select" });
    }
    
    const dx = currentX - startX;
    const dy = currentY - startY;
    
    let finalScale = undefined;
    if (mode === "scale") {
       const layer = currentRecipeRef.current.layers.find(l => l.id === layerId);
       if (layer && layer.params.image) {
          const bounds = getImageLayerBounds(currentRecipeRef.current.width, currentRecipeRef.current.height, layer.params.image, { ...layer.params, scale: dragStateRef.current.initialScale });
          const centerX = bounds.x + bounds.width / 2;
          const centerY = bounds.y + bounds.height / 2;
          const currentDistance = Math.hypot(currentX - centerX, currentY - centerY);
          const ratio = currentDistance / (dragStateRef.current.initialDistance || 1);
          finalScale = (dragStateRef.current.initialScale || 1.0) * ratio;
       }
    }

    dragStateRef.current = null;
    
    if ((mode === "move" && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) || (mode === "scale" && finalScale !== undefined)) {
      const newStore = { ...store };
      if (!newStore[layerId]) newStore[layerId] = {};
      
      if (mode === "move") {
        const existingX = store[layerId]?.transformX ?? 0;
        const existingY = store[layerId]?.transformY ?? 0;
        newStore[layerId] = { ...newStore[layerId], transformX: existingX + dx, transformY: existingY + dy };
      } else if (mode === "scale" && finalScale !== undefined) {
        newStore[layerId] = { ...newStore[layerId], scale: finalScale };
      }
      
      dispatch({ type: "controls.setValue", target: "layerPropertiesStore", value: JSON.stringify(newStore) });
    } else {
      generatePreview(currentRecipeRef.current, canvasRef.current!);
    }
    
    // Clear inline styles so React takes over
    const overlay = document.getElementById("selection-overlay");
    if (overlay) {
       overlay.style.left = "";
       overlay.style.top = "";
       overlay.style.width = "";
       overlay.style.height = "";
    }
  };

  const handleOuterPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
       if (state.selectedLayerId) {
          dispatch({ type: "layers.reorder", layers: state.layers, selectedLayerId: null });
       }
    }
  };

  // Compute Selection Overlay bounds
  let selectedLayerBounds: { x: number, y: number, width: number, height: number } | null = null;
  const selectedLayer = state.selectedLayerId ? state.layers.find((l: any) => l.id === state.selectedLayerId) : null;
  
  if (selectedLayer && currentRecipeRef.current) {
     const selectedProps = store[selectedLayer.id] || {};
     if (!selectedProps.locked) {
        const type = selectedProps.type || "image";
        if (type === "image") {
           const image = currentRecipeRef.current.layers.find(l => l.id === selectedLayer.id)?.params?.image;
           if (image) {
              selectedLayerBounds = getImageLayerBounds(currentRecipeRef.current.width, currentRecipeRef.current.height, image, selectedProps);
           }
        }
     }
  }

  const cw = state.canvas.size.width || 1;
  const ch = state.canvas.size.height || 1;
  let overlayStyle: React.CSSProperties = { display: 'none' };

  if (selectedLayerBounds) {
    overlayStyle = {
      position: 'absolute',
      left: `${(selectedLayerBounds.x / cw) * 100}%`,
      top: `${(selectedLayerBounds.y / ch) * 100}%`,
      width: `${(selectedLayerBounds.width / cw) * 100}%`,
      height: `${(selectedLayerBounds.height / ch) * 100}%`,
      pointerEvents: 'none',
      zIndex: 50
    };
  }

  return (
    <div 
      className="flex h-full w-full items-center justify-center p-8 relative bg-neutral-900 overflow-hidden"
      onPointerDown={handleOuterPointerDown}
      ref={containerRef}
    >
      <div id="forge-shader-container" style={{ position: 'absolute', top: -9999, left: -9999, width: state.canvas.size.width, height: state.canvas.size.height, pointerEvents: 'none' }}>
        {shaderLayers.map((layer) => {
          const props = store[layer.id];
          return (
            <div key={layer.id} id={`shader-${layer.id}`} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
              <ShaderRenderer 
                type={props.shaderType ?? "MeshGradient"}
                speed={props.shaderPaused ? 0 : 1}
                colors={[
                  getColor(props.shaderColor1, "#ff0000"),
                  getColor(props.shaderColor2, "#00ff00"),
                  getColor(props.shaderColor3, "#0000ff"),
                  getColor(props.shaderColor4, "#ffff00")
                ]}
                image={props.shaderWarpImage && state.mediaAssets[0] ? state.mediaAssets[0].dataUrl : undefined}
                layerProps={props}
              />
            </div>
          );
        })}

        {imageShaderLayers.map((layer) => {
          const props = store[layer.id] || {};
          const asset = state.mediaAssets.find(a => a.layerId === layer.id || a.id === layer.id);
          
          let bounds = null;
          if (currentRecipeRef.current && asset) {
             const image = currentRecipeRef.current.layers.find(l => l.id === layer.id)?.params?.image;
             if (image) {
                bounds = getImageLayerBounds(currentRecipeRef.current.width, currentRecipeRef.current.height, image, props);
             }
          }

          if (!asset || !bounds) return null;
          
          return (
            <div key={`imgshader-${layer.id}`} id={`shader-${layer.id}`} style={{ width: bounds.width, height: bounds.height, position: 'absolute', top: 0, left: 0 }}>
              <ShaderRenderer 
                type={props.imageShaderFilter}
                speed={props.shaderPaused ? 0 : 1}
                colors={[
                  getColor(props.shaderColor1, "#ff0000"),
                  getColor(props.shaderColor2, "#00ff00"),
                  getColor(props.shaderColor3, "#0000ff"),
                  getColor(props.shaderColor4, "#ffff00")
                ]}
                image={asset.dataUrl}
                layerProps={props}
              />
            </div>
          );
        })}
      </div>
      
      <div 
        ref={wrapperRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative max-h-full max-w-full flex shrink-0 shadow-2xl rounded overflow-hidden" 
        style={{ aspectRatio: `${state.canvas.size.width} / ${state.canvas.size.height}`, touchAction: "none" }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full bg-transparent"
          style={{ pointerEvents: 'none' }}
        />
        
        {selectedLayerBounds && (
          <div id="selection-overlay" style={overlayStyle} className="group pointer-events-none">
            {/* Box border */}
            <div className="absolute inset-0 border border-blue-500 opacity-80" />
            
            {/* Central drag area */}
            <div data-action="move" className="absolute inset-0 cursor-move pointer-events-auto" />
            
            {/* 4 Handles */}
            <div data-action="scale" className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-nwse-resize pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            <div data-action="scale" className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-nesw-resize pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            <div data-action="scale" className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-nesw-resize pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            <div data-action="scale" className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-nwse-resize pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </div>
    </div>
  );
}

export function createRecipeFromState(state: any, store: Record<string, any>, imageMap: Map<string, HTMLImageElement>): DesignRecipe {
  const getColor = (val: any, defaultColor: string) => {
    if (!val) return defaultColor;
    if (typeof val === 'string') return val;
    return val.hex || defaultColor;
  };

  const gridGroupIds = new Set<string>();
  state.layers.forEach((layer: any) => {
    if (layer.kind === "group") {
      const props = store[layer.id] || {};
      if (props.type === "imageLayout") {
        gridGroupIds.add(layer.id);
      }
    }
  });

  const processedLayers: DesignRecipeLayer[] = [];

  state.layers.forEach((layer: any) => {
    if (layer.parentGroupId && gridGroupIds.has(layer.parentGroupId)) {
      return; // Skip child, it is consumed by the grid
    }

    const props = store[layer.id] || {};
    
    // Default to image type if it's an uploaded asset not in the store yet
    let type = props.type;
    if (!type) {
      type = layer.kind === "group" ? "group" : "image";
    }

    let params: any = { ...props };
    
    let defaultBlendMode = "source-over";
    if (type === "halftone") defaultBlendMode = "overlay";
    if (type === "techOverlay") defaultBlendMode = "screen";

    params.blendMode = props.blendMode || props.imageBlendMode || defaultBlendMode;
    params.opacity = props.opacity ?? props.imageOpacity ?? 1;
    
    if (type === "image") {
      params.image = imageMap.get(layer.id);
      params.transformX = props.transformX ?? 0;
      params.transformY = props.transformY ?? 0;
      params.scale = props.scale ?? 1.0;
    } else if (type === "shader") {
      params.color1 = getColor(props.shaderColor1, "#ff0000");
      params.color2 = getColor(props.shaderColor2, "#00ff00");
      params.color3 = getColor(props.shaderColor3, "#0000ff");
      params.color4 = getColor(props.shaderColor4, "#ffff00");
    } else if (type === "techOverlay") {
      params.color = getColor(props.techColor, "#000000");
      params.density = props.techDensity ?? 0.5;
      params.showBarcodes = props.showBarcodes ?? true;
      params.style = props.techStyle || "cyberpunk";
    } else if (type === "halftone") {
      params.color = getColor(props.halftoneColor, "#ffffff");
      params.style = props.halftoneStyle || "dots";
      params.dotSize = props.halftoneSize ?? 4;
      params.spacing = props.halftoneSpacing ?? 6;
      params.angle = props.halftoneAngle ?? 45;
    } else if (type === "glitch") {
      params.intensity = props.glitchIntensity ?? 0.5;
      params.slices = props.glitchSlices ?? 5;
      params.glitchRGB = props.glitchRGB ?? false;
    } else if (type === "imageLayout") {
      const children = state.layers.filter((l: any) => l.parentGroupId === layer.id);
      params.images = children.map((c: any) => {
        const img = imageMap.get(c.id);
        if (!img) return null;
        const cProps = store[c.id] || {};
        return {
          image: img,
          id: c.id,
          scale: cProps.scale ?? 1.0,
          transformX: cProps.transformX ?? 0,
          transformY: cProps.transformY ?? 0,
          opacity: cProps.opacity ?? cProps.imageOpacity ?? 1.0,
          blendMode: cProps.blendMode || cProps.imageBlendMode || "source-over",
          imageShaderFilter: cProps.imageShaderFilter || "none"
        };
      }).filter(Boolean);
    }

    processedLayers.push({
      id: layer.id,
      type,
      visible: layer.visible,
      params
    });
  });

  const layers = processedLayers;

  // Toolcraft layer panel displays top layer first, so we might need to reverse it for bottom-to-top rendering
  // Toolcraft layer index 0 is top. So we reverse it.
  layers.reverse();

  return {
    seed: state.values.seed ?? 12345,
    width: state.canvas.size.width,
    height: state.canvas.size.height,
    layers
  };
}

export function ShaderRenderer({ type, colors, image, speed = 1, layerProps = {} }: { type: string, colors: string[], image?: string, speed?: number, layerProps?: any }) {
  const commonProps = { style: { width: '100%', height: '100%' } as React.CSSProperties, speed, gl: { preserveDrawingBuffer: true } };
  
  switch (type) {
    case "CustomMesh":
      return <CustomMesh {...commonProps} colors={colors} nodes={[
        { x: layerProps.customMeshX1 ?? 0.1, y: layerProps.customMeshY1 ?? 0.1 },
        { x: layerProps.customMeshX2 ?? 0.9, y: layerProps.customMeshY2 ?? 0.1 },
        { x: layerProps.customMeshX3 ?? 0.1, y: layerProps.customMeshY3 ?? 0.9 },
        { x: layerProps.customMeshX4 ?? 0.9, y: layerProps.customMeshY4 ?? 0.9 }
      ]} />;
    case "LiquidMetal":
      return <LiquidMetal {...commonProps} colorBack={colors[0]} colorTint={colors[1]} image={image} distortion={layerProps.liquidDistortion} contour={layerProps.liquidContour} />;
    case "Metaballs":
      return <Metaballs {...commonProps} colors={colors.slice(0, 3)} colorBack={colors[3]} />;
    case "GodRays":
      return <GodRays {...commonProps} colorBack={colors[0]} colorBloom={colors[1]} colors={colors.slice(2)} />;
    case "NeuroNoise":
      return <NeuroNoise {...commonProps} colorFront={colors[0]} colorMid={colors[1]} colorBack={colors[2]} />;
    case "GrainGradient":
      return <GrainGradient {...commonProps} colors={colors} colorBack={colors[0]} />;
    case "GemSmoke":
      return <GemSmoke {...commonProps} colors={colors} colorBack={colors[0]} image={image} innerGlow={layerProps.smokeInnerGlow} outerGlow={layerProps.smokeOuterGlow} />;
    case "Warp":
      return <Warp {...commonProps} colors={colors} rotation={layerProps.warpRotation} softness={layerProps.warpSoftness} />;
    case "Water":
      return <Water {...commonProps} colorBack={colors[0]} colorHighlight={colors[1]} image={image} highlights={layerProps.waterHighlights} layering={layerProps.waterLayering} />;
    case "MeshGradient":
    default:
      return <MeshGradient {...commonProps} colors={colors} distortion={layerProps.meshDistortion} swirl={layerProps.meshSwirl} />;
  }
}

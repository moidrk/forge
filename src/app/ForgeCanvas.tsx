import * as React from "react";
import { useToolcraft } from "@/toolcraft/runtime/react";
import { generatePreview, getImageLayerBounds } from "@/lib/generation/engine";
import { DesignRecipe, DesignRecipeLayer } from "@/lib/generation/types";
import { MeshGradient, GodRays, NeuroNoise, LiquidMetal, GrainGradient, Metaballs, GemSmoke, Warp } from "@paper-design/shaders-react";

export function dummyGpuCheck() { return navigator.gpu; }
export default function ForgeCanvas() {
  const { state, dispatch } = useToolcraft();
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const dragStateRef = React.useRef<{ layerId: string, mode: "move" | "scale", startX: number, startY: number, currentX: number, currentY: number, initialScale?: number, initialDistance?: number } | null>(null);
  const currentRecipeRef = React.useRef<DesignRecipe | null>(null);
  const animationFrameRef = React.useRef<number | null>(null);

  const storeStr = (state.values.layerPropertiesStore as string) || "{}";
  let store: Record<string, any> = {};
  try {
    store = JSON.parse(storeStr);
  } catch(e) {}

  React.useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    // Extract uploaded images from media assets
    const imagesPromises = state.mediaAssets
      .filter((asset) => asset.sourceTarget === "images" || !asset.sourceTarget) // Catch all images
      .map((asset) => {
        return new Promise<{ id: string, img: HTMLImageElement }>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve({ id: asset.layerId || asset.id, img });
          img.onerror = reject;
          img.src = asset.dataUrl;
        });
      });

    Promise.all(imagesPromises).then((imagesData) => {
      const imageMap = new Map<string, HTMLImageElement>();
      imagesData.forEach(d => imageMap.set(d.id, d.img));

      const recipe = createRecipeFromState(state, store, imageMap);
      currentRecipeRef.current = recipe;
      generatePreview(recipe, canvasRef.current!);
    }).catch(console.error);
  }, [state.layers, state.values.layerPropertiesStore, state.mediaAssets, state.canvas.size.width, state.canvas.size.height]);

  const shaderLayers = state.layers.filter(l => l.visible && store[l.id]?.type === "shader");

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
    
    if (mode === "move" && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) {
      const existingX = store[layerId]?.transformX ?? 0;
      const existingY = store[layerId]?.transformY ?? 0;
      dispatch({ type: "controls.setValue", target: `${layerId}.transformX`, value: existingX + dx });
      dispatch({ type: "controls.setValue", target: `${layerId}.transformY`, value: existingY + dy });
    } else if (mode === "scale" && finalScale !== undefined) {
      dispatch({ type: "controls.setValue", target: `${layerId}.scale`, value: finalScale });
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
     const type = selectedProps.type || "image";
     if (type === "image") {
        const image = currentRecipeRef.current.layers.find(l => l.id === selectedLayer.id)?.params?.image;
        if (image) {
           selectedLayerBounds = getImageLayerBounds(currentRecipeRef.current.width, currentRecipeRef.current.height, image, selectedProps);
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

  const layers: DesignRecipeLayer[] = state.layers.map((layer: any) => {
    const props = store[layer.id] || {};
    
    // Default to image type if it's an uploaded asset not in the store yet
    const type = props.type || "image";

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
    } else if (type === "halftone") {
      params.color = getColor(props.halftoneColor, "#ffffff");
    } else if (type === "imageLayout") {
      params.images = Array.from(imageMap.values());
    }

    return {
      id: layer.id,
      type,
      visible: layer.visible,
      params
    };
  });

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

export function ShaderRenderer({ type, colors, image, speed = 1 }: { type: string, colors: string[], image?: string, speed?: number }) {
  const commonProps = { style: { width: '100%', height: '100%' } as React.CSSProperties, speed };
  
  switch (type) {
    case "LiquidMetal":
      return <LiquidMetal {...commonProps} colorBack={colors[0]} colorTint={colors[1]} image={image} />;
    case "Metaballs":
      return <Metaballs {...commonProps} colors={colors.slice(0, 3)} colorBack={colors[3]} />;
    case "GodRays":
      return <GodRays {...commonProps} colorBack={colors[0]} colorBloom={colors[1]} colors={colors.slice(2)} />;
    case "NeuroNoise":
      return <NeuroNoise {...commonProps} colorFront={colors[0]} colorMid={colors[1]} colorBack={colors[2]} />;
    case "GrainGradient":
      return <GrainGradient {...commonProps} colors={colors} colorBack={colors[0]} />;
    case "GemSmoke":
      return <GemSmoke {...commonProps} colors={colors} colorBack={colors[0]} image={image} />;
    case "Warp":
      return <Warp {...commonProps} colors={colors} />;
    case "MeshGradient":
    default:
      return <MeshGradient {...commonProps} colors={colors} />;
  }
}

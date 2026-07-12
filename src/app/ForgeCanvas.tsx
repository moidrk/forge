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
  const dragStateRef = React.useRef<{ layerId: string, startX: number, startY: number, currentX: number, currentY: number } | null>(null);
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

  const getLogicCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    const x = ((e.clientX - rect.left) * (canvasRef.current.width / rect.width)) / pixelRatio;
    const y = ((e.clientY - rect.top) * (canvasRef.current.height / rect.height)) / pixelRatio;
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!currentRecipeRef.current || !canvasRef.current) return;
    
    // Release capture so dragging outside canvas still works
    e.currentTarget.setPointerCapture(e.pointerId);

    const { x, y } = getLogicCoords(e);
    const { width, height, layers } = currentRecipeRef.current;
    
    // Iterate from top-most layer (end of array) to bottom-most
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      if (!layer.visible) continue;
      
      if (layer.type === "image" && layer.params.image) {
        const bounds = getImageLayerBounds(width, height, layer.params.image, layer.params);
        if (x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height) {
          dragStateRef.current = { layerId: layer.id, startX: x, startY: y, currentX: x, currentY: y };
          dispatch({ layerId: layer.id, type: "layers.select" });
          break;
        }
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragStateRef.current || !currentRecipeRef.current || !canvasRef.current) return;
    
    const { x, y } = getLogicCoords(e);
    dragStateRef.current.currentX = x;
    dragStateRef.current.currentY = y;
    
    const dx = x - dragStateRef.current.startX;
    const dy = y - dragStateRef.current.startY;
    
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      if (currentRecipeRef.current && canvasRef.current && dragStateRef.current) {
        generatePreview(currentRecipeRef.current, canvasRef.current, {
          [dragStateRef.current.layerId]: { dx, dy }
        });
      }
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragStateRef.current || !currentRecipeRef.current) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    const { layerId, startX, startY, currentX, currentY } = dragStateRef.current;
    const dx = currentX - startX;
    const dy = currentY - startY;
    
    dragStateRef.current = null;
    
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      // Find the existing transform for this layer to add to it
      const existingX = store[layerId]?.transformX ?? 0;
      const existingY = store[layerId]?.transformY ?? 0;
      
      // Update store state natively
      dispatch({
        type: "controls.setValue",
        target: `${layerId}.transformX`,
        value: existingX + dx,
      });
      dispatch({
        type: "controls.setValue",
        target: `${layerId}.transformY`,
        value: existingY + dy,
      });
    } else {
      // Just a click, re-render to remove overrides
      generatePreview(currentRecipeRef.current, canvasRef.current!);
    }
  };

  return (
    <div className="flex h-full w-full items-center justify-center p-8 relative">
      <div id="forge-shader-container" ref={containerRef} style={{ position: 'absolute', top: -9999, left: -9999, width: state.canvas.size.width, height: state.canvas.size.height, pointerEvents: 'none' }}>
        {shaderLayers.map((layer) => {
          const props = store[layer.id];
          return (
            <div key={layer.id} id={`shader-${layer.id}`} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
              <ShaderRenderer 
                type={props.shaderType ?? "MeshGradient"}
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
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="max-h-full max-w-full rounded bg-transparent shadow-lg"
        style={{
          width: "auto",
          height: "auto",
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          touchAction: "none"
        }}
      />
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

export function ShaderRenderer({ type, colors, image }: { type: string, colors: string[], image?: string }) {
  const commonProps = { style: { width: '100%', height: '100%' } as React.CSSProperties };
  
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

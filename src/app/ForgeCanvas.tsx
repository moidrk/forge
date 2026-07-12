import * as React from "react";
import { useToolcraft } from "@/toolcraft/runtime/react";
import { generatePreview } from "@/lib/generation/engine";
import { DesignRecipe, DesignRecipeLayer } from "@/lib/generation/types";
import { MeshGradient, GodRays, NeuroNoise, LiquidMetal, GrainGradient, Metaballs, GemSmoke, Warp } from "@paper-design/shaders-react";

export function dummyGpuCheck() { return navigator.gpu; }
export default function ForgeCanvas() {
  const { state } = useToolcraft();
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

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
      generatePreview(recipe, canvasRef.current!);
    }).catch(console.error);
  }, [state.layers, state.values.layerPropertiesStore, state.mediaAssets, state.canvas.size.width, state.canvas.size.height]);

  const shaderLayers = state.layers.filter(l => l.visible && store[l.id]?.type === "shader");

  const getColor = (val: any, defaultColor: string) => {
    if (!val) return defaultColor;
    if (typeof val === 'string') return val;
    return val.hex || defaultColor;
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
        className="max-h-full max-w-full rounded bg-transparent shadow-lg"
        style={{
          width: "auto",
          height: "auto",
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain"
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
    
    if (type === "image") {
      params.image = imageMap.get(layer.id);
      params.blendMode = props.imageBlendMode || "source-over";
      params.opacity = props.imageOpacity ?? 1;
    } else if (type === "shader") {
      params.color1 = getColor(props.shaderColor1, "#ff0000");
      params.color2 = getColor(props.shaderColor2, "#00ff00");
      params.color3 = getColor(props.shaderColor3, "#0000ff");
      params.color4 = getColor(props.shaderColor4, "#ffff00");
    } else if (type === "techOverlay") {
      params.color = getColor(props.techColor, "#000000");
    } else if (type === "halftone") {
      params.color = getColor(props.halftoneColor, "#ffffff");
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

import * as React from "react";
import { useToolcraft } from "@/toolcraft/runtime/react";
import { generatePreview } from "@/lib/generation/engine";
import { DesignRecipe } from "@/lib/generation/types";
import { MeshGradient, GodRays, NeuroNoise, LiquidMetal, GrainGradient, Metaballs, GemSmoke, Warp } from "@paper-design/shaders-react";

export function ForgeCanvas() {
  const { state } = useToolcraft();
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const values = state.values as Record<string, any>;
  const getColor = (val: any, defaultColor: string) => {
    if (!val) return defaultColor;
    if (typeof val === 'string') return val;
    return val.hex || defaultColor;
  };

  React.useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    const webglCanvas = containerRef.current.querySelector('canvas');
    
    // Extract uploaded images from media assets
    const imagesPromises = state.mediaAssets
      .filter((asset) => asset.sourceTarget === "images")
      .map((asset) => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = asset.dataUrl;
        });
      });

    Promise.all(imagesPromises).then((images) => {
      const recipe = createRecipeFromState(state, images);
      generatePreview(recipe, canvasRef.current!, webglCanvas);
    }).catch(console.error);
  }, [state.values, state.mediaAssets, state.canvas.size.width, state.canvas.size.height]);

  return (
    <div className="flex h-full w-full items-center justify-center p-8 relative">
      <div id="forge-shader-container" ref={containerRef} style={{ position: 'absolute', top: -9999, left: -9999, width: state.canvas.size.width, height: state.canvas.size.height, pointerEvents: 'none' }}>
        {values.shaderEnabled && (
          <ShaderRenderer 
            type={values.shaderType ?? "MeshGradient"}
            colors={[
              getColor(values.shaderColor1, "#ff0000"),
              getColor(values.shaderColor2, "#00ff00"),
              getColor(values.shaderColor3, "#0000ff"),
              getColor(values.shaderColor4, "#ffff00")
            ]}
            image={values.shaderWarpImage && state.mediaAssets.filter((a: any) => a.sourceTarget === "images")[0] ? state.mediaAssets.filter((a: any) => a.sourceTarget === "images")[0].dataUrl : undefined}
          />
        )}
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

export function createRecipeFromState(state: any, images: HTMLImageElement[]): DesignRecipe {
  const values = state.values as Record<string, any>;
  const getColor = (val: any, defaultColor: string) => {
    if (!val) return defaultColor;
    if (typeof val === 'string') return val;
    return val.hex || defaultColor;
  };

  return {
    seed: values.seed ?? 12345,
    width: state.canvas.size.width,
    height: state.canvas.size.height,
    layers: {
      shader: {
        enabled: values.shaderEnabled ?? true,
        params: {
          type: values.shaderType ?? "MeshGradient",
          color1: getColor(values.shaderColor1, "#ff0000"),
          color2: getColor(values.shaderColor2, "#00ff00"),
          color3: getColor(values.shaderColor3, "#0000ff"),
          color4: getColor(values.shaderColor4, "#ffff00"),
        },
      },
      imageLayout: {
        enabled: values.imageLayoutEnabled ?? true,
        params: {
          images,
          columns: values.columns ?? 3,
          rows: values.rows ?? 3,
          gap: values.gap ?? 10,
          layoutStyle: values.layoutStyle ?? "asymmetrical",
          blendMode: values.imageBlendMode ?? "source-over",
          opacity: values.imageOpacity ?? 1.0,
        },
      },
      base: {
        enabled: values.baseEnabled ?? true,
        params: {
          color1: getColor(values.baseColor1, "#111111"),
          color2: getColor(values.baseColor2, "#333333"),
          type: "gradient",
        },
      },
      halftone: {
        enabled: values.halftoneEnabled ?? true,
        params: {
          style: values.halftoneStyle ?? "dots",
          color: getColor(values.halftoneColor, "#ffffff"),
          dotSize: values.halftoneSize ?? 4,
          spacing: values.halftoneSpacing ?? 6,
          angle: values.halftoneAngle ?? 45,
        },
      },
      colorGrade: {
        enabled: values.colorGradeEnabled ?? false,
        params: {
          hue: values.cgHue ?? 0,
          saturation: values.cgSat ?? 1.2,
          contrast: values.cgCon ?? 1.1,
          vignette: values.cgVignette ?? 0,
        },
      },
      paper: {
        enabled: values.paperEnabled ?? true,
        params: {
          paperColor: getColor(values.paperColor, "#f4f0ec"),
          grainIntensity: values.grainIntensity ?? 0.1,
          texture: "grain",
          grainSize: 1,
          scratchesEnabled: values.scratchesEnabled ?? false,
          scratchIntensity: values.scratchIntensity ?? 0.5,
        },
      },
      techOverlay: {
        enabled: values.techOverlayEnabled ?? true,
        params: {
          style: values.techStyle ?? "cyberpunk",
          color: getColor(values.techColor, "#000000"),
          density: values.techDensity ?? 0.5,
          showBarcodes: values.showBarcodes ?? true,
        },
      },
      glitch: {
        enabled: values.glitchEnabled ?? false,
        params: {
          intensity: values.glitchIntensity ?? 0.5,
          glitchRGB: values.glitchRGB ?? false,
        },
      },
    },
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

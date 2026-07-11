import * as React from "react";
import { useToolcraft } from "@/toolcraft/runtime/react";
import { generatePreview } from "@/lib/generation/engine";
import { DesignRecipe } from "@/lib/generation/types";
import { MeshGradient } from "@paper-design/shaders-react";

export function ForgeCanvas() {
  const { state } = useToolcraft();
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    const webglCanvas = containerRef.current.querySelector('canvas');

    const values = state.values as Record<string, any>;
    
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

    const getColor = (val: any, defaultColor: string) => {
      if (!val) return defaultColor;
      if (typeof val === 'string') return val;
      return val.hex || defaultColor;
    };

    Promise.all(imagesPromises).then((images) => {
      const recipe = createRecipeFromState(state, images);
      generatePreview(recipe, canvasRef.current!, webglCanvas);
    }).catch(console.error);
  }, [state.values, state.mediaAssets, state.canvas.size.width, state.canvas.size.height]);

  return (
    <div className="flex h-full w-full items-center justify-center p-8 relative">
      <div id="forge-shader-container" ref={containerRef} style={{ position: 'absolute', top: -9999, left: -9999, width: state.canvas.size.width, height: state.canvas.size.height, pointerEvents: 'none' }}>
        <MeshGradient style={{ width: '100%', height: '100%' }} />
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
        },
      },
      paper: {
        enabled: values.paperEnabled ?? true,
        params: {
          paperColor: getColor(values.paperColor, "#f4f0ec"),
          grainIntensity: values.grainIntensity ?? 0.1,
          texture: "grain",
          grainSize: 1,
        },
      },
      techOverlay: {
        enabled: values.techOverlayEnabled ?? true,
        params: {
          color: getColor(values.techColor, "#000000"),
          density: values.techDensity ?? 0.5,
          showBarcodes: values.showBarcodes ?? true,
        },
      },
      glitch: {
        enabled: values.glitchEnabled ?? false,
        params: {
          intensity: values.glitchIntensity ?? 0.5,
        },
      },
    },
  };
}

import * as React from "react";
import { ToolcraftApp } from "@/toolcraft/runtime/react";
import { appSchema } from "../app/app-schema";
import { ForgeCanvas } from "../app/ForgeCanvas";

const randomHexColor = () => "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
const randomRange = (min: number, max: number) => min + Math.random() * (max - min);
const randomInt = (min: number, max: number) => Math.floor(randomRange(min, max + 1));

export function AppHome(): React.JSX.Element {
  const handlePanelAction = React.useCallback(async (context: any) => {
    if (context.action.value === "shuffle") {
      const blendModes = ["source-over", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "luminosity"];
      const styles = ["asymmetrical", "symmetrical"];
      const halftoneStyles = ["dots", "lines", "crosshatch"];

      const newValues: Record<string, any> = {
        seed: randomInt(0, 1000000),
        columns: randomInt(1, 10),
        rows: randomInt(1, 10),
        gap: randomInt(0, 50),
        imageBlendMode: blendModes[randomInt(0, blendModes.length - 1)],
        imageOpacity: randomRange(0.3, 1),
        layoutStyle: styles[randomInt(0, 1)],
        shaderColor1: { hex: randomHexColor() },
        shaderColor2: { hex: randomHexColor() },
        shaderColor3: { hex: randomHexColor() },
        shaderColor4: { hex: randomHexColor() },
        baseColor1: { hex: randomHexColor() },
        baseColor2: { hex: randomHexColor() },
        halftoneColor: { hex: randomHexColor() },
        halftoneSize: randomRange(1, 10),
        halftoneSpacing: randomRange(2, 15),
        halftoneAngle: randomRange(0, 180),
        halftoneStyle: halftoneStyles[randomInt(0, 2)],
        paperColor: { hex: randomHexColor() },
        grainIntensity: randomRange(0.01, 0.3),
        techColor: { hex: randomHexColor() },
        techDensity: randomRange(0.1, 0.8),
        cgHue: randomRange(-180, 180),
        cgSat: randomRange(0, 2),
        cgCon: randomRange(0.5, 1.5),
        glitchIntensity: randomRange(0, 1),
      };

      for (const [key, value] of Object.entries(newValues)) {
        context.dispatch({
          type: "controls.setValue",
          target: key,
          value: value
        });
      }
    } else if (context.action.value === "Export PNG") {
      return new Promise<void>(async (resolve, reject) => {
        try {
          const { createToolcraftPngExportCanvas } = await import("@/toolcraft/runtime/export");
          const { generatePreview } = await import("@/lib/generation/engine");
          const { createRecipeFromState } = await import("../app/ForgeCanvas");

          const state = context.state;
          const values = state.values;
          const resolution = values["export.image.resolution"] as string || "4k";
          const includeBackground = values["export.includeBackground"] as boolean ?? true;

          const imagesPromises = state.mediaAssets
            .filter((asset: any) => asset.sourceTarget === "images")
            .map((asset: any) => {
              return new Promise<HTMLImageElement>((resolveImg, rejectImg) => {
                const img = new Image();
                img.onload = () => resolveImg(img);
                img.onerror = rejectImg;
                img.src = asset.dataUrl;
              });
            });

          const images = await Promise.all(imagesPromises);
          const recipe = createRecipeFromState(state, images);
          
          const shaderCanvas = document.querySelector<HTMLCanvasElement>('#forge-shader-container canvas');

          const exportCanvas = createToolcraftPngExportCanvas({
            includeBackground,
            resolution,
            state,
            render: (renderContext) => {
              const tempCanvas = document.createElement("canvas");
              generatePreview(recipe, tempCanvas, shaderCanvas, renderContext.pixelRatio);
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
    />
  );
}

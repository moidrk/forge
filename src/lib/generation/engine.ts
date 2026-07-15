import { DesignRecipe, DesignRecipeLayer, Seed } from './types';
import { RNG } from './rng';

import { renderHalftoneLayer, generateHalftoneLayerSVG } from './modules/halftone';
import { renderTechOverlayLayer, generateTechOverlayLayerSVG } from './modules/techOverlay';
import { renderGlitchLayer, generateGlitchLayerSVG } from './modules/glitch';
import { renderImageLayoutLayer, generateImageLayoutLayerSVG } from './modules/imageLayout';

import { renderBloomLayer } from './modules/bloom';
import { renderGrainLayer } from './modules/grain';
import { renderPixelateLayer } from './modules/pixelate';
import { renderDitherLayer } from './modules/dither';
import { renderDataGridLayer } from './modules/dataGrid';
import { renderDataCascadeLayer } from './modules/dataCascade';
import { renderAsciiLayer } from './modules/ascii';

export function getImageLayerBounds(width: number, height: number, img: HTMLImageElement, params: any) {
  const scale = params.scale ?? 1.0;
  const imgRatio = img.width / img.height;
  const canvasRatio = width / height;

  let drawWidth = width;
  let drawHeight = height;
  let offsetX = 0;
  let offsetY = 0;

  if (imgRatio > canvasRatio) {
    drawWidth = height * imgRatio;
    offsetX = (width - drawWidth) / 2;
  } else {
    drawHeight = width / imgRatio;
    offsetY = (height - drawHeight) / 2;
  }

  const transformX = params.transformX ?? 0;
  const transformY = params.transformY ?? 0;

  const finalWidth = drawWidth * scale;
  const finalHeight = drawHeight * scale;
  const finalX = offsetX + transformX + (drawWidth - finalWidth) / 2;
  const finalY = offsetY + transformY + (drawHeight - finalHeight) / 2;

  return { x: finalX, y: finalY, width: finalWidth, height: finalHeight };
}

export function hashStringToInteger(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export function renderRecipe(
  recipe: DesignRecipe,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dragOverrides?: Record<string, { dx: number, dy: number, scale?: number }>
): void {
  const scaleX = width / recipe.width;
  const scaleY = height / recipe.height;

  ctx.save();
  ctx.scale(scaleX, scaleY);

  // Iterate through layers bottom to top (we reversed them in ForgeCanvas)
  for (let i = 0; i < recipe.layers.length; i++) {
    const layer = recipe.layers[i];
    if (!layer.visible) continue;

    const layerSeed = recipe.seed + hashStringToInteger(String(layer.id));
    const rng = new RNG(layerSeed);

    ctx.save();
    ctx.globalCompositeOperation = (layer.params.blendMode as GlobalCompositeOperation) || "source-over";
    ctx.globalAlpha = layer.params.opacity ?? 1;

    if (layer.type === "shader") {
      const shaderCanvas = document.querySelector<HTMLCanvasElement>(`#shader-${layer.id} canvas`);
      if (shaderCanvas && shaderCanvas.width > 0 && shaderCanvas.height > 0) {
        try {
          ctx.drawImage(shaderCanvas, 0, 0, recipe.width, recipe.height);
        } catch (e) {
          console.warn("Failed to draw shader canvas", e);
        }
      }
    } else if (layer.type === "image" && !layer.params.image && layer.params.fillColor) {
      ctx.fillStyle = layer.params.fillColor.hex || layer.params.fillColor;
      ctx.fillRect(0, 0, recipe.width, recipe.height);
    } else if (layer.type === "image" && layer.params.image) {
      let params = layer.params;
      if (dragOverrides && dragOverrides[layer.id] && dragOverrides[layer.id].scale !== undefined) {
         params = { ...params, scale: dragOverrides[layer.id].scale };
      }

      const bounds = getImageLayerBounds(recipe.width, recipe.height, layer.params.image, params);
      
      let finalX = bounds.x;
      let finalY = bounds.y;
      
      // Apply ephemeral drag overrides if available
      if (dragOverrides && dragOverrides[layer.id]) {
        finalX += dragOverrides[layer.id].dx;
        finalY += dragOverrides[layer.id].dy;
      }
      
      const hasShader = layer.params.imageShaderFilter && layer.params.imageShaderFilter !== "none";
      const preserveTransparency = layer.params.preserveTransparency ?? true;

      if (hasShader) {
         const shaderCanvas = document.querySelector<HTMLCanvasElement>(`#shader-${layer.id} canvas`);
         if (shaderCanvas && shaderCanvas.width > 0 && shaderCanvas.height > 0) {
            if (preserveTransparency) {
               const offCanvas = document.createElement('canvas');
               offCanvas.width = bounds.width;
               offCanvas.height = bounds.height;
               const offCtx = offCanvas.getContext('2d')!;
               
               // Draw the original image first to establish the alpha mask
               offCtx.drawImage(layer.params.image, 0, 0, bounds.width, bounds.height);
               // Switch composite mode to clip the shader inside the image pixels
               offCtx.globalCompositeOperation = "source-in";
               offCtx.drawImage(shaderCanvas, 0, 0, bounds.width, bounds.height);
               
               // Draw the composited offscreen canvas to the main canvas
               ctx.globalCompositeOperation = (layer.params.blendMode as GlobalCompositeOperation) || "source-over";
               ctx.drawImage(offCanvas, finalX, finalY, bounds.width, bounds.height);
            } else {
               // Draw the shader directly as a rectangle
               ctx.drawImage(shaderCanvas, finalX, finalY, bounds.width, bounds.height);
            }
         } else {
             // Fallback to normal image if shader canvas isn't ready
             ctx.drawImage(layer.params.image, finalX, finalY, bounds.width, bounds.height);
         }
      } else {
         // Standard image rendering
         ctx.drawImage(layer.params.image, finalX, finalY, bounds.width, bounds.height);
      }
    } else if (layer.type === "techOverlay") {
      renderTechOverlayLayer(ctx, recipe.width, recipe.height, rng, layer.params);
    } else if (layer.type === "halftone") {
      renderHalftoneLayer(ctx, recipe.width, recipe.height, rng, layer.params);
    } else if (layer.type === "imageLayout") {
      renderImageLayoutLayer(ctx, recipe.width, recipe.height, new RNG(layer.params.layoutSeed ?? recipe.seed), layer.params);
    } else {
      // Pixel-based effects that need unscaled physical coordinates
      ctx.save();
      // We must operate on the actual physical pixels of the canvas, 
      // because the export engine might have applied its own pixelRatio scale
      const pWidth = ctx.canvas.width || (recipe.width * scaleX);
      const pHeight = ctx.canvas.height || (recipe.height * scaleY);
      
      const physicalScaleX = pWidth / recipe.width;
      const physicalScaleY = pHeight / recipe.height;

      ctx.resetTransform();
      const pParams = { ...layer.params };

      if (layer.type === "bloom") {
        pParams.bloomBlur = (pParams.bloomBlur ?? 10) * physicalScaleX;
        renderBloomLayer(ctx, pWidth, pHeight, rng, pParams);
      } else if (layer.type === "grain") {
        renderGrainLayer(ctx, pWidth, pHeight, rng, pParams);
      } else if (layer.type === "pixelate") {
        pParams.pixelateSize = (pParams.pixelateSize ?? 10) * physicalScaleX;
        renderPixelateLayer(ctx, pWidth, pHeight, rng, pParams);
      } else if (layer.type === "dither") {
        renderDitherLayer(ctx, pWidth, pHeight, rng, pParams);
      } else if (layer.type === "dataGrid") {
        pParams.gridDensity = (pParams.gridDensity ?? 20) * physicalScaleX;
        pParams.gridMaxRadius = (pParams.gridMaxRadius ?? 10) * physicalScaleX;
        renderDataGridLayer(ctx, pWidth, pHeight, rng, pParams);
      } else if (layer.type === "dataCascade") {
        pParams.fontSize = 14 * physicalScaleX;
        renderDataCascadeLayer(ctx, pWidth, pHeight, rng, pParams);
      } else if (layer.type === "ascii") {
        pParams.asciiFontSize = (pParams.asciiFontSize ?? 10) * physicalScaleX;
        renderAsciiLayer(ctx, pWidth, pHeight, rng, pParams);
      } else if (layer.type === "glitch") {
        renderGlitchLayer(ctx, pWidth, pHeight, rng, pParams);
      }
      ctx.restore();
    }

    ctx.restore();
  }

  ctx.restore();
}

export function generatePreview(recipe: DesignRecipe, canvas: HTMLCanvasElement, dragOverrides?: Record<string, { dx: number, dy: number, scale?: number }>): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height } = recipe;
  
  // Set canvas resolution
  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  renderRecipe(recipe, ctx, canvas.width, canvas.height, dragOverrides);
}

export function generateSVG(recipe: DesignRecipe): string {
  const { width, height } = recipe;
  let svgContent = '';

  for (let i = 0; i < recipe.layers.length; i++) {
    const layer = recipe.layers[i];
    if (!layer.visible) continue;

    const layerSeed = recipe.seed + hashStringToInteger(String(layer.id));
    const rng = new RNG(layerSeed);
    
    if (layer.type === "techOverlay") {
      svgContent += generateTechOverlayLayerSVG(width, height, rng, layer.params);
    } else if (layer.type === "halftone") {
      svgContent += generateHalftoneLayerSVG(width, height, rng, layer.params);
    } else if (layer.type === "glitch") {
      svgContent += generateGlitchLayerSVG(width, height, rng, layer.params);
    } else if (layer.type === "imageLayout") {
      svgContent += generateImageLayoutLayerSVG(width, height, new RNG(layer.params.layoutSeed ?? recipe.seed), layer.params);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%">
    <rect width="${width}" height="${height}" fill="transparent" />
    ${svgContent}
  </svg>`;
}

export function randomizeRecipe(baseRecipe: DesignRecipe, mode: 'full' | 'unlocked' | 'light'): DesignRecipe {
  const newSeed = mode === 'full' ? Math.floor(Math.random() * 1000000) : baseRecipe.seed + (mode === 'light' ? 1 : 100);
  const newRecipe: DesignRecipe = JSON.parse(JSON.stringify(baseRecipe));
  newRecipe.seed = newSeed;
  return newRecipe;
}

export function createDefaultRecipe(width: number, height: number): DesignRecipe {
  return {
    seed: 12345,
    width,
    height,
    layers: []
  };
}

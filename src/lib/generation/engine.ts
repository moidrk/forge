import { DesignRecipe, DesignRecipeLayer, Seed } from './types';
import { RNG } from './rng';

import { renderHalftoneLayer, generateHalftoneLayerSVG } from './modules/halftone';
import { renderTechOverlayLayer, generateTechOverlayLayerSVG } from './modules/techOverlay';
import { renderGlitchLayer, generateGlitchLayerSVG } from './modules/glitch';
import { renderImageLayoutLayer, generateImageLayoutLayerSVG } from './modules/imageLayout';

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

  ctx.save();
  ctx.scale(pixelRatio, pixelRatio);

  // Iterate through layers bottom to top (we reversed them in ForgeCanvas)
  for (let i = 0; i < recipe.layers.length; i++) {
    const layer = recipe.layers[i];
    if (!layer.visible) continue;

    const rng = new RNG(recipe.seed + i);

    ctx.save();
    ctx.globalCompositeOperation = (layer.params.blendMode as GlobalCompositeOperation) || "source-over";
    ctx.globalAlpha = layer.params.opacity ?? 1;

    if (layer.type === "shader") {
      const shaderCanvas = document.querySelector<HTMLCanvasElement>(`#shader-${layer.id} canvas`);
      if (shaderCanvas && shaderCanvas.width > 0 && shaderCanvas.height > 0) {
        try {
          ctx.drawImage(shaderCanvas, 0, 0, width, height);
        } catch (e) {
          console.warn("Failed to draw shader canvas", e);
        }
      }
    } else if (layer.type === "image" && layer.params.image) {
      let params = layer.params;
      if (dragOverrides && dragOverrides[layer.id] && dragOverrides[layer.id].scale !== undefined) {
         params = { ...params, scale: dragOverrides[layer.id].scale };
      }

      const bounds = getImageLayerBounds(width, height, layer.params.image, params);
      
      let finalX = bounds.x;
      let finalY = bounds.y;
      
      // Apply ephemeral drag overrides if available
      if (dragOverrides && dragOverrides[layer.id]) {
        finalX += dragOverrides[layer.id].dx;
        finalY += dragOverrides[layer.id].dy;
      }
      
      ctx.drawImage(layer.params.image, finalX, finalY, bounds.width, bounds.height);
    } else if (layer.type === "techOverlay") {
      renderTechOverlayLayer(ctx, width, height, rng, layer.params);
    } else if (layer.type === "halftone") {
      renderHalftoneLayer(ctx, width, height, rng, layer.params);
    } else if (layer.type === "glitch") {
      renderGlitchLayer(ctx, width, height, rng, layer.params);
    } else if (layer.type === "imageLayout") {
      renderImageLayoutLayer(ctx, width, height, new RNG(layer.params.layoutSeed ?? recipe.seed), layer.params);
    }

    ctx.restore();
  }

  ctx.restore();
}

export function generateSVG(recipe: DesignRecipe): string {
  const { width, height } = recipe;
  let svgContent = '';

  for (let i = 0; i < recipe.layers.length; i++) {
    const layer = recipe.layers[i];
    if (!layer.visible) continue;

    const rng = new RNG(recipe.seed + i);
    
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

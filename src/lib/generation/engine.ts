import { DesignRecipe, LayerConfig, Seed } from './types';
import { RNG } from './rng';

import { renderBaseLayer, generateBaseLayerSVG } from './modules/base';
import { renderHalftoneLayer, generateHalftoneLayerSVG } from './modules/halftone';
import { renderColorGradeLayer, generateColorGradeLayerSVG } from './modules/colorGrade';
import { renderPaperLayer, generatePaperLayerSVG } from './modules/paper';
import { renderTechOverlayLayer, generateTechOverlayLayerSVG } from './modules/techOverlay';
import { renderTypographyLayer, generateTypographyLayerSVG } from './modules/typography';
import { renderGlitchLayer, generateGlitchLayerSVG } from './modules/glitch';
import { renderImageLayoutLayer, generateImageLayoutLayerSVG } from './modules/imageLayout';

export function generatePreview(recipe: DesignRecipe, canvas: HTMLCanvasElement, shaderCanvas?: HTMLCanvasElement | null, pixelRatio: number = 1): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height } = recipe;
  
  // Set canvas resolution
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.scale(pixelRatio, pixelRatio);

  // 0. Draw WebGL shader layer first as the absolute bottom background
  if (shaderCanvas && shaderCanvas.width > 0 && shaderCanvas.height > 0) {
    try {
      ctx.drawImage(shaderCanvas, 0, 0, width, height);
    } catch (e) {
      console.warn("Failed to draw shader canvas", e);
    }
  }

  // Initialize RNG with the recipe seed
  const rng = new RNG(recipe.seed);

  // Define strictly ordered rendering pipeline
  // 1. Base / Background
  if (recipe.layers.base?.enabled) {
    renderBaseLayer(ctx, width, height, rng, recipe.layers.base.params);
  }

  // 2. Image Layout Grid Collage
  if (recipe.layers.imageLayout?.enabled) {
    renderImageLayoutLayer(ctx, width, height, rng, recipe.layers.imageLayout.params);
  }

  // 3. Halftone
  if (recipe.layers.halftone?.enabled) {
    ctx.globalCompositeOperation = 'overlay';
    renderHalftoneLayer(ctx, width, height, rng, recipe.layers.halftone.params);
    ctx.globalCompositeOperation = 'source-over';
  }

  // 4. Color Grading
  if (recipe.layers.colorGrade?.enabled) {
    renderColorGradeLayer(ctx, width, height, rng, recipe.layers.colorGrade.params);
  }

  // 5. Paper Effects
  if (recipe.layers.paper?.enabled) {
    ctx.globalCompositeOperation = 'multiply';
    renderPaperLayer(ctx, width, height, rng, recipe.layers.paper.params);
    ctx.globalCompositeOperation = 'source-over';
  }

  // 6. Tech Overlays
  if (recipe.layers.techOverlay?.enabled) {
    renderTechOverlayLayer(ctx, width, height, rng, recipe.layers.techOverlay.params);
  }

  // 7. Typography
  if (recipe.layers.typography?.enabled) {
    renderTypographyLayer(ctx, width, height, rng, recipe.layers.typography.params);
  }

  // 8. Glitch / Post-processing
  if (recipe.layers.glitch?.enabled) {
    renderGlitchLayer(ctx, width, height, rng, recipe.layers.glitch.params);
  }

  ctx.restore();
}

export function generateSVG(recipe: DesignRecipe): string {
  const { width, height } = recipe;
  const rng = new RNG(recipe.seed);

  let svgContent = '';

  if (recipe.layers.shader?.enabled) {
    // Shaders are WebGL-based and cannot be directly exported as SVG vectors.
    // We add a fallback placeholder here.
    svgContent += `
      <!-- Shader Fallback -->
      <rect width="${width}" height="${height}" fill="#000000" />
      <text x="${width/2}" y="${height/2}" fill="#ffffff" font-family="sans-serif" font-size="24" text-anchor="middle">
        [ ${recipe.layers.shader.params.type || 'Shader'} Effect (Requires Raster Export) ]
      </text>
    `;
  }
  if (recipe.layers.base?.enabled) {
    svgContent += generateBaseLayerSVG(width, height, rng, recipe.layers.base.params);
  }
  if (recipe.layers.imageLayout?.enabled) {
    svgContent += generateImageLayoutLayerSVG(width, height, rng, recipe.layers.imageLayout.params);
  }
  if (recipe.layers.halftone?.enabled) {
    svgContent += generateHalftoneLayerSVG(width, height, rng, recipe.layers.halftone.params);
  }
  if (recipe.layers.colorGrade?.enabled) {
    svgContent += generateColorGradeLayerSVG(width, height, rng, recipe.layers.colorGrade.params);
  }
  if (recipe.layers.paper?.enabled) {
    svgContent += generatePaperLayerSVG(width, height, rng, recipe.layers.paper.params);
  }
  if (recipe.layers.techOverlay?.enabled) {
    svgContent += generateTechOverlayLayerSVG(width, height, rng, recipe.layers.techOverlay.params);
  }
  if (recipe.layers.typography?.enabled) {
    svgContent += generateTypographyLayerSVG(width, height, rng, recipe.layers.typography.params);
  }
  if (recipe.layers.glitch?.enabled) {
    svgContent += generateGlitchLayerSVG(width, height, rng, recipe.layers.glitch.params);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <filter id="noiseFilter">
      <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" stitchTiles="stitch"/>
    </filter>
  </defs>
  ${svgContent}
</svg>`;
}

export function randomizeRecipe(baseRecipe: DesignRecipe, mode: 'full' | 'unlocked' | 'light'): DesignRecipe {
  const newSeed = mode === 'full' ? Math.floor(Math.random() * 1000000) : baseRecipe.seed + (mode === 'light' ? 1 : 100);
  
  // Here we would implement complex parameter mutations depending on the mode.
  // For 'unlocked', we only change non-locked layer parameters.
  // For 'light', we slightly jitter the values.
  
  // Simple full clone for now (to be extended)
  const newRecipe: DesignRecipe = JSON.parse(JSON.stringify(baseRecipe));
  newRecipe.seed = newSeed;

  return newRecipe;
}

export function createDefaultRecipe(width: number, height: number): DesignRecipe {
  return {
    seed: 12345,
    width,
    height,
    layers: {
      shader: {
        enabled: true,
        params: {
          type: 'MeshGradient',
          // We will inject the specific shader parameters via UI.
          // By default, just some generic ones or empty.
          color1: '#ff0000',
          color2: '#00ff00',
          color3: '#0000ff',
          color4: '#ffff00',
        }
      },
      base: {
        enabled: true,
        params: {
          color1: '#111111',
          color2: '#333333',
          type: 'gradient'
        }
      },
      imageLayout: {
        enabled: false,
        params: {
          images: [], // Array of data URLs or sources
          columns: 3,
          rows: 3,
          gap: 10,
          objectFit: 'cover',
          opacity: 1.0,
          layoutStyle: 'asymmetrical' // symmetrical or asymmetrical BSP
        }
      },
      halftone: {
        enabled: false,
        params: {
          dotSize: 4,
          spacing: 6,
          color: '#ffffff'
        }
      },
      colorGrade: {
        enabled: false,
        params: {
          hue: 0,
          saturation: 1.2,
          contrast: 1.1
        }
      },
      paper: {
        enabled: true,
        params: {
          texture: 'grain',
          grainIntensity: 0.1,
          grainSize: 1,
          paperColor: '#f4f0ec',
          inkBleed: 0,
          printImperfection: 0.2
        }
      },
      techOverlay: {
        enabled: false,
        params: {
          density: 0.5,
          color: '#00ff00',
          showBarcodes: true
        }
      },
      typography: {
        enabled: false,
        params: {
          text: 'FORGE',
          fontSize: 120,
          fontFamily: 'Inter',
          color: '#ffffff',
          x: width / 2,
          y: height / 2,
          align: 'center'
        }
      },
      glitch: {
        enabled: false,
        params: {
          intensity: 0.5,
          slices: 5
        }
      }
    }
  };
}

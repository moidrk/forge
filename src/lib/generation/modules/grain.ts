import { RNG } from '../rng';

// Cache the noise buffer so we don't recreate it every frame unless params change
let cachedNoiseCanvas: HTMLCanvasElement | null = null;
let cachedColored: boolean | null = null;
let cachedSeed: number | null = null;

function getNoiseCanvas(rng: RNG, colored: boolean): HTMLCanvasElement {
  if (cachedNoiseCanvas && cachedColored === colored && cachedSeed === rng.seed) {
    return cachedNoiseCanvas;
  }

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  // We use a fresh RNG seeded from the passed RNG to ensure deterministic noise for this layer
  const noiseRng = new RNG(rng.seed);

  for (let i = 0; i < data.length; i += 4) {
    if (colored) {
      data[i] = Math.floor(noiseRng.random() * 255);
      data[i + 1] = Math.floor(noiseRng.random() * 255);
      data[i + 2] = Math.floor(noiseRng.random() * 255);
    } else {
      const val = Math.floor(noiseRng.random() * 255);
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
    data[i + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  
  cachedNoiseCanvas = canvas;
  cachedColored = colored;
  cachedSeed = rng.seed;
  
  return canvas;
}

export function renderGrainLayer(ctx: CanvasRenderingContext2D, width: number, height: number, rng: RNG, params: Record<string, any>): void {
  const intensity = params.grainIntensity ?? 0.5;
  if (intensity <= 0) return;

  const colored = params.grainColor ?? false;
  const noiseCanvas = getNoiseCanvas(rng, colored);

  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = intensity;

  // Tile the noise canvas over the entire width/height
  const pattern = ctx.createPattern(noiseCanvas, 'repeat');
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.restore();
}

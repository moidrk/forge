import { RNG } from '../rng';

// Simple 2D Value Noise
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

function random2D(x: number, y: number, seed: number) {
  let n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453123;
  return n - Math.floor(n);
}

function noise2D(x: number, y: number, seed: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  const a = random2D(ix, iy, seed);
  const b = random2D(ix + 1, iy, seed);
  const c = random2D(ix, iy + 1, seed);
  const d = random2D(ix + 1, iy + 1, seed);

  const ux = smoothstep(fx);
  const uy = smoothstep(fy);

  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}

export function renderDataGridLayer(ctx: CanvasRenderingContext2D, width: number, height: number, rng: RNG, params: Record<string, any>): void {
  const density = params.gridDensity ?? 20; // grid cell size
  if (density <= 0) return;
  
  const maxRadius = params.gridMaxRadius ?? 10;
  const color = params.gridColor?.hex || '#ffffff';

  ctx.save();
  ctx.fillStyle = color;

  const seed = rng.seed;
  const noiseScale = 0.05; // frequency of the noise

  for (let y = 0; y < height; y += density) {
    for (let x = 0; x < width; x += density) {
      // Sample noise for this cell
      let n = noise2D(x * noiseScale, y * noiseScale, seed);
      
      // Add a second octave of noise for complexity
      n += 0.5 * noise2D(x * noiseScale * 2, y * noiseScale * 2, seed + 100);
      n = n / 1.5; // normalize

      // Map noise [0, 1] to radius, but heavily bias toward small/zero to make clusters
      // E.g., if noise < 0.4, radius is 0. If > 0.4, it scales up.
      let radius = 0;
      if (n > 0.4) {
         const factor = (n - 0.4) / 0.6; // 0 to 1
         radius = factor * maxRadius;
      }

      if (radius > 0) {
        ctx.beginPath();
        ctx.arc(x + density/2, y + density/2, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
}

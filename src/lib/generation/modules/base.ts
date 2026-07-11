import { RNG } from '../rng';

export function renderBaseLayer(ctx: CanvasRenderingContext2D, width: number, height: number, rng: RNG, params: Record<string, any>): void {
  const type = params.type || 'solid';
  const color1 = params.color1 || '#111111';
  const color2 = params.color2 || '#333333';

  if (type === 'solid') {
    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, width, height);
  } else if (type === 'gradient') {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
}

export function generateBaseLayerSVG(width: number, height: number, rng: RNG, params: Record<string, any>): string {
  const type = params.type || 'solid';
  const color1 = params.color1 || '#111111';
  const color2 = params.color2 || '#333333';

  if (type === 'solid') {
    return `<rect width="${width}" height="${height}" fill="${color1}" />\n`;
  } else if (type === 'gradient') {
    const gradId = `baseGrad_${rng.rangeInt(0, 1000)}`;
    return `
      <defs>
        <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${color1}" />
          <stop offset="100%" stop-color="${color2}" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#${gradId})" />
    `;
  }
  return '';
}

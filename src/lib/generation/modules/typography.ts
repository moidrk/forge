import { RNG } from '../rng';

export function renderTypographyLayer(ctx: CanvasRenderingContext2D, width: number, height: number, rng: RNG, params: Record<string, any>): void {
  const text = params.text || 'FORGE';
  const fontSize = params.fontSize || 120;
  const fontFamily = params.fontFamily || 'Inter, sans-serif';
  const color = params.color || '#ffffff';
  const x = params.x !== undefined ? params.x : width / 2;
  const y = params.y !== undefined ? params.y : height / 2;
  const align = params.align || 'center';

  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  ctx.textAlign = align as CanvasTextAlign;
  ctx.textBaseline = 'middle';
  
  // Draw the text
  ctx.fillText(text, x, y);
  
  ctx.restore();
}

export function generateTypographyLayerSVG(width: number, height: number, rng: RNG, params: Record<string, any>): string {
  const text = params.text || 'FORGE';
  const fontSize = params.fontSize || 120;
  const fontFamily = params.fontFamily || 'Inter, sans-serif';
  const color = params.color || '#ffffff';
  const x = params.x !== undefined ? params.x : width / 2;
  const y = params.y !== undefined ? params.y : height / 2;
  const align = params.align || 'middle';

  // Map canvas align to SVG text-anchor
  let textAnchor = 'middle';
  if (align === 'left') textAnchor = 'start';
  if (align === 'right') textAnchor = 'end';

  return `
    <text 
      x="${x}" 
      y="${y}" 
      fill="${color}" 
      font-family="${fontFamily}" 
      font-size="${fontSize}" 
      font-weight="bold"
      text-anchor="${textAnchor}" 
      dominant-baseline="central"
    >
      ${text}
    </text>
  `;
}

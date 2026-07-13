import { RNG } from '../rng';

const ASCII_MAP = "@%#*+=-:. ".split("");

export function renderAsciiLayer(ctx: CanvasRenderingContext2D, width: number, height: number, rng: RNG, params: Record<string, any>): void {
  const fontSize = params.asciiFontSize ?? 10;
  const textColor = params.asciiColor?.hex || '#ffffff';
  const bgColor = params.asciiBackground?.hex || '#000000';

  // 1. Get current image data
  let imageData: ImageData | null = null;
  try {
    imageData = ctx.getImageData(0, 0, width, height);
  } catch(e) {
    return;
  }

  // 2. Clear canvas with background color
  ctx.save();
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // 3. Draw ASCII
  ctx.fillStyle = textColor;
  ctx.font = `${fontSize}px monospace`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  for (let y = 0; y < height; y += fontSize) {
    for (let x = 0; x < width; x += fontSize) {
      // Sample pixel in center of this block
      const px = Math.min(x + Math.floor(fontSize / 2), width - 1);
      const py = Math.min(y + Math.floor(fontSize / 2), height - 1);
      const idx = (py * width + px) * 4;

      const r = imageData.data[idx];
      const g = imageData.data[idx+1];
      const b = imageData.data[idx+2];
      
      const luma = r*0.299 + g*0.587 + b*0.114;
      // Map 0-255 to 0-(ASCII_MAP.length-1)
      const charIdx = Math.floor((luma / 255) * (ASCII_MAP.length - 1));
      const char = ASCII_MAP[charIdx];

      ctx.fillText(char, x, y);
    }
  }

  ctx.restore();
}

import { RNG } from '../rng';

const CHARSETS: Record<string, string[]> = {
  standard: "@%#*+=-:. ".split(""),
  binary: "01 ".split(""),
  blocks: "█▓▒░ ".split(""),
  matrix: "日ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ ".split(""),
  math: "∑∫π∆Ω∞µ≈≠± ".split(""),
  minimal: "+-.".split("")
};

export function renderAsciiLayer(ctx: CanvasRenderingContext2D, width: number, height: number, rng: RNG, params: Record<string, any>): void {
  const fontSize = params.asciiFontSize ?? 10;
  const textColor = params.asciiColor?.hex || '#ffffff';
  const bgColor = params.asciiBackground?.hex || '#000000';
  const charsetName = params.asciiCharset || "standard";
  const charMap = CHARSETS[charsetName] || CHARSETS["standard"];

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

  const fontFamily = params.asciiFontFamily || "monospace";

  // 3. Draw ASCII
  ctx.fillStyle = textColor;
  ctx.font = `${fontSize}px ${fontFamily}`;
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
      // Map 0-255 to 0-(charMap.length-1)
      const charIdx = Math.floor((luma / 255) * (charMap.length - 1));
      const char = charMap[charIdx];

      ctx.fillText(char, x, y);
    }
  }

  ctx.restore();
}

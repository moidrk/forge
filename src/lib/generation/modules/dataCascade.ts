import { RNG } from '../rng';

const CHAR_SET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#%&";

export function renderDataCascadeLayer(ctx: CanvasRenderingContext2D, width: number, height: number, rng: RNG, params: Record<string, any>): void {
  const density = params.cascadeDensity ?? 0.5; // 0 to 1
  const baseColor = params.cascadeColor?.hex || '#00ff00';
  
  ctx.save();
  
  const fontSize = 14;
  ctx.font = `${fontSize}px monospace`;
  ctx.textBaseline = "top";
  
  const columns = Math.floor(width / fontSize);
  const rows = Math.floor(height / fontSize);

  // We grab the background to sample color if possible
  // In canvas 2D, this grabs whatever has been drawn so far
  let imageData: ImageData | null = null;
  try {
    imageData = ctx.getImageData(0, 0, width, height);
  } catch(e) {}

  const cascadeRng = new RNG(rng.seed);

  for (let c = 0; c < columns; c++) {
    // Only some columns have streams based on density
    if (cascadeRng.random() > density) continue;

    // How long is the stream?
    const streamLength = Math.floor(cascadeRng.random() * (rows * 0.8)) + 5;
    // Where does it start?
    const startRow = Math.floor(cascadeRng.random() * rows);

    for (let r = 0; r < streamLength; r++) {
      const currentRow = (startRow + r) % rows;
      
      const char = CHAR_SET[Math.floor(cascadeRng.random() * CHAR_SET.length)];
      const x = c * fontSize;
      const y = currentRow * fontSize;

      let rCol = parseInt(baseColor.substring(1,3), 16);
      let gCol = parseInt(baseColor.substring(3,5), 16);
      let bCol = parseInt(baseColor.substring(5,7), 16);

      // Blend with underlying image if we got the data
      if (imageData) {
        const idx = (Math.floor(y + fontSize/2) * width + Math.floor(x + fontSize/2)) * 4;
        if (idx < imageData.data.length) {
          // If the pixel is dark, the stream is dark. If bright, it's bright.
          const luma = imageData.data[idx]*0.3 + imageData.data[idx+1]*0.59 + imageData.data[idx+2]*0.11;
          const factor = luma / 255;
          rCol = Math.floor(rCol * factor);
          gCol = Math.floor(gCol * factor);
          bCol = Math.floor(bCol * factor);
        }
      }

      // Fade out the tail of the stream
      const alpha = 1.0 - (r / streamLength);
      
      ctx.fillStyle = `rgba(${rCol}, ${gCol}, ${bCol}, ${alpha})`;
      ctx.fillText(char, x, y);
    }
  }

  ctx.restore();
}

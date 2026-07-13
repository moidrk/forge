import { RNG } from '../rng';

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  if (c.length === 3) return [parseInt(c[0]+c[0], 16), parseInt(c[1]+c[1], 16), parseInt(c[2]+c[2], 16)];
  return [parseInt(c.substring(0, 2), 16), parseInt(c.substring(2, 4), 16), parseInt(c.substring(4, 6), 16)];
}

export function renderDitherLayer(ctx: CanvasRenderingContext2D, width: number, height: number, rng: RNG, params: Record<string, any>): void {
  const algorithm = params.ditherAlgorithm || "atkinson";
  const bias = params.ditherBias ?? 0.5;
  const darkColor = hexToRgb(params.ditherDark?.hex || "#000000");
  const lightColor = hexToRgb(params.ditherLight?.hex || "#ffffff");

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  // Brightness threshold mapping
  const thresholdMap = Math.floor(bias * 255);

  if (algorithm === "threshold") {
    for (let i = 0; i < data.length; i += 4) {
      // Perceived luminance
      const luma = data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114;
      if (luma > thresholdMap) {
        data[i] = lightColor[0];
        data[i+1] = lightColor[1];
        data[i+2] = lightColor[2];
      } else {
        data[i] = darkColor[0];
        data[i+1] = darkColor[1];
        data[i+2] = darkColor[2];
      }
    }
  } else if (algorithm === "atkinson") {
    // We need to operate on a 1D array as a 2D grid
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const luma = data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114;
        
        let newLuma = luma > thresholdMap ? 255 : 0;
        const err = Math.floor((luma - newLuma) / 8);

        // Set output color
        if (newLuma === 255) {
          data[i] = lightColor[0]; data[i+1] = lightColor[1]; data[i+2] = lightColor[2];
        } else {
          data[i] = darkColor[0]; data[i+1] = darkColor[1]; data[i+2] = darkColor[2];
        }

        // Diffuse error
        const distribute = (dx: number, dy: number) => {
          if (x + dx >= 0 && x + dx < width && y + dy >= 0 && y + dy < height) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            // Add error to R,G,B evenly so luma calculations on future pixels are affected
            data[idx] += err;
            data[idx+1] += err;
            data[idx+2] += err;
          }
        };

        distribute(1, 0);
        distribute(2, 0);
        distribute(-1, 1);
        distribute(0, 1);
        distribute(1, 1);
        distribute(0, 2);
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

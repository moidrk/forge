import React, { useEffect, useRef } from 'react';

// Converts a hex color to an array of [r, g, b] floats in 0-1
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ] : [0, 0, 0];
}

const vertexShaderSource = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision highp float;
  uniform vec2 u_resolution;
  uniform vec3 u_colors[4];
  uniform vec2 u_points[4];
  
  void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    st.y = 1.0 - st.y;
    
    float totalWeight = 0.0;
    vec3 color = vec3(0.0);
    
    // Smoothness controls the falloff.
    float smoothness = 2.0;

    for (int i = 0; i < 4; i++) {
      float d = distance(st, u_points[i]);
      float w = 1.0 / pow(d + 0.001, smoothness);
      color += u_colors[i] * w;
      totalWeight += w;
    }
    
    color /= totalWeight;
    gl_FragColor = vec4(color, 1.0);
  }
`;

function compileShader(gl: WebGLRenderingContext, source: string, type: number) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compilation failed:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function CustomMesh({
  colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00'],
  nodes = [
    { x: 0.1, y: 0.1 },
    { x: 0.9, y: 0.1 },
    { x: 0.1, y: 0.9 },
    { x: 0.9, y: 0.9 }
  ],
  style,
  gl: glOptions
}: {
  colors: string[];
  nodes?: { x: number, y: number }[];
  style?: React.CSSProperties;
  gl?: any;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const gl = (canvas.getContext('webgl', glOptions) || canvas.getContext('experimental-webgl', glOptions)) as WebGLRenderingContext | null;
    if (!gl) return;
    
    const resizeCanvas = () => {
       const displayWidth  = canvas.clientWidth;
       const displayHeight = canvas.clientHeight;
       if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
          canvas.width  = displayWidth;
          canvas.height = displayHeight;
       }
    };
    resizeCanvas();
    
    const vs = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
    const fs = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;
    
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
       console.error('Program link failed:', gl.getProgramInfoLog(program));
       return;
    }
    
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
       1.0,  1.0,
    ]), gl.STATIC_DRAW);
    
    const positionLocation = gl.getAttribLocation(program, "a_position");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const colorsLocation = gl.getUniformLocation(program, "u_colors");
    const pointsLocation = gl.getUniformLocation(program, "u_points");
    
    let animationFrameId: number;
    const render = () => {
       resizeCanvas();
       gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
       
       gl.useProgram(program);
       
       gl.enableVertexAttribArray(positionLocation);
       gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
       gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
       
       gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);
       
       const rgbArray = [];
       for (let i = 0; i < 4; i++) {
         const rgb = hexToRgb(colors[i] || '#000000');
         rgbArray.push(...rgb);
       }
       gl.uniform3fv(colorsLocation, new Float32Array(rgbArray));
       
       const ptArray = [];
       for (let i = 0; i < 4; i++) {
         const pt = nodes[i] || { x: 0.5, y: 0.5 };
         ptArray.push(pt.x, pt.y);
       }
       gl.uniform2fv(pointsLocation, new Float32Array(ptArray));
       
       gl.drawArrays(gl.TRIANGLES, 0, 6);
       
       animationFrameId = requestAnimationFrame(render);
    };
    
    render();
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(positionBuffer);
    };
  }, [colors, JSON.stringify(nodes), glOptions]);

  return <canvas ref={canvasRef} style={{ ...style, display: 'block' }} />;
}

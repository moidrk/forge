import * as React from "react";
import { useToolcraft } from "@/toolcraft/runtime/react";
import { Slider, Color, Select, Checkbox, ControlFieldLabel } from "@/toolcraft/ui";

function ShaderFineTuners({ props, updateProp, isFilter = false }: { props: any, updateProp: (key: string, val: any) => void, isFilter?: boolean }) {
  const type = isFilter ? props.imageShaderFilter : (props.shaderType || "MeshGradient");
  return (
    <>
      <Checkbox
        name="Pause Animation"
        checked={props.shaderPaused || false}
        onCheckedChange={(val) => updateProp("shaderPaused", val)}
      />

      {type === "LiquidMetal" && (
        <>
          <Slider name="Distortion" value={props.liquidDistortion ?? 1.5} min={0} max={5} step={0.1} onValueChange={(val) => updateProp("liquidDistortion", val)} />
          <Slider name="Contour" value={props.liquidContour ?? 1.0} min={0.1} max={5} step={0.1} onValueChange={(val) => updateProp("liquidContour", val)} />
        </>
      )}
      {type === "Warp" && (
        <>
          <Slider name="Rotation" value={props.warpRotation ?? 0} min={0} max={360} step={1} onValueChange={(val) => updateProp("warpRotation", val)} />
          <Slider name="Softness" value={props.warpSoftness ?? 0.5} min={0} max={1} step={0.05} onValueChange={(val) => updateProp("warpSoftness", val)} />
        </>
      )}
      {type === "Water" && (
        <>
          <Slider name="Highlights" value={props.waterHighlights ?? 1.0} min={0} max={3} step={0.1} onValueChange={(val) => updateProp("waterHighlights", val)} />
          <Slider name="Layering" value={props.waterLayering ?? 1.0} min={0} max={5} step={0.1} onValueChange={(val) => updateProp("waterLayering", val)} />
        </>
      )}
      {type === "GemSmoke" && (
        <>
          <Slider name="Inner Glow" value={props.smokeInnerGlow ?? 1.0} min={0} max={5} step={0.1} onValueChange={(val) => updateProp("smokeInnerGlow", val)} />
          <Slider name="Outer Glow" value={props.smokeOuterGlow ?? 1.0} min={0} max={5} step={0.1} onValueChange={(val) => updateProp("smokeOuterGlow", val)} />
        </>
      )}
      {type === "MeshGradient" && (
        <>
          <Slider name="Distortion" value={props.meshDistortion ?? 1.0} min={0} max={5} step={0.1} onValueChange={(val) => updateProp("meshDistortion", val)} />
          <Slider name="Swirl" value={props.meshSwirl ?? 1.0} min={0} max={5} step={0.1} onValueChange={(val) => updateProp("meshSwirl", val)} />
        </>
      )}

      <div className="grid grid-cols-2 gap-2 mt-2">
         <Color name="Color 1" hex={props.shaderColor1?.hex || "#ff0000"} onValueChange={(val) => updateProp("shaderColor1", val)} />
         <Color name="Color 2" hex={props.shaderColor2?.hex || "#00ff00"} onValueChange={(val) => updateProp("shaderColor2", val)} />
         <Color name="Color 3" hex={props.shaderColor3?.hex || "#0000ff"} onValueChange={(val) => updateProp("shaderColor3", val)} />
         <Color name="Color 4" hex={props.shaderColor4?.hex || "#ffff00"} onValueChange={(val) => updateProp("shaderColor4", val)} />
      </div>
    </>
  );
}

function AlignmentButtons({ layerId, props, store, state, dispatch, currentType }: any) {
  if (currentType !== "image") return null;
  const asset = state.mediaAssets.find((a: any) => a.layerId === layerId || a.id === layerId);
  if (!asset) return null;

  const handleAlign = async (alignment: "left" | "centerH" | "right" | "top" | "centerV" | "bottom") => {
    const canvasW = state.canvas.size.width;
    const canvasH = state.canvas.size.height;
    
    // Get natural dimensions
    let imgW = asset.size?.width;
    let imgH = asset.size?.height;

    if (!imgW || !imgH) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          imgW = img.width;
          imgH = img.height;
          resolve();
        };
        img.src = asset.dataUrl;
      });
    }

    if (!imgW || !imgH) return; // Fallback

    const scale = props.scale ?? 1.0;
    const imgRatio = imgW / imgH;
    const canvasRatio = canvasW / canvasH;

    let drawWidth = canvasW;
    let drawHeight = canvasH;
    let offsetX = 0;
    let offsetY = 0;

    if (imgRatio > canvasRatio) {
      drawWidth = canvasH * imgRatio;
      offsetX = (canvasW - drawWidth) / 2;
    } else {
      drawHeight = canvasW / imgRatio;
      offsetY = (canvasH - drawHeight) / 2;
    }

    const finalWidth = drawWidth * scale;
    const finalHeight = drawHeight * scale;

    let newTransformX = props.transformX ?? 0;
    let newTransformY = props.transformY ?? 0;

    switch (alignment) {
      case "left":
        newTransformX = -offsetX - (drawWidth - finalWidth) / 2;
        break;
      case "centerH":
        newTransformX = 0;
        break;
      case "right":
        newTransformX = canvasW - offsetX - finalWidth - (drawWidth - finalWidth) / 2;
        break;
      case "top":
        newTransformY = -offsetY - (drawHeight - finalHeight) / 2;
        break;
      case "centerV":
        newTransformY = 0;
        break;
      case "bottom":
        newTransformY = canvasH - offsetY - finalHeight - (drawHeight - finalHeight) / 2;
        break;
    }

    const newStore = { 
      ...store, 
      [layerId]: { 
        ...props, 
        transformX: newTransformX, 
        transformY: newTransformY, 
        type: currentType 
      } 
    };

    dispatch({
      type: "controls.setValue",
      target: "layerPropertiesStore",
      value: JSON.stringify(newStore)
    });
  };

  return (
    <div className="flex flex-col gap-2 mt-2 mb-2">
      <div className="text-xs uppercase text-neutral-500 font-semibold">Alignment</div>
      <div className="flex bg-neutral-900 rounded p-1 justify-between gap-1">
        <button onClick={() => handleAlign("left")} className="flex-1 p-1.5 hover:bg-neutral-800 rounded flex items-center justify-center text-neutral-400 hover:text-white" title="Align Left">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22V2M14 6H6v12h8V6z"/></svg>
        </button>
        <button onClick={() => handleAlign("centerH")} className="flex-1 p-1.5 hover:bg-neutral-800 rounded flex items-center justify-center text-neutral-400 hover:text-white" title="Align Center Horizontally">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M18 6H6v12h12V6z"/></svg>
        </button>
        <button onClick={() => handleAlign("right")} className="flex-1 p-1.5 hover:bg-neutral-800 rounded flex items-center justify-center text-neutral-400 hover:text-white" title="Align Right">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 22V2M18 6h-8v12h8V6z"/></svg>
        </button>
        <div className="w-px bg-neutral-800 mx-1"></div>
        <button onClick={() => handleAlign("top")} className="flex-1 p-1.5 hover:bg-neutral-800 rounded flex items-center justify-center text-neutral-400 hover:text-white" title="Align Top">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4h20M6 14v-8h12v8H6z"/></svg>
        </button>
        <button onClick={() => handleAlign("centerV")} className="flex-1 p-1.5 hover:bg-neutral-800 rounded flex items-center justify-center text-neutral-400 hover:text-white" title="Align Center Vertically">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20M6 18V6h12v12H6z"/></svg>
        </button>
        <button onClick={() => handleAlign("bottom")} className="flex-1 p-1.5 hover:bg-neutral-800 rounded flex items-center justify-center text-neutral-400 hover:text-white" title="Align Bottom">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h20M6 18v-8h12v8H6z"/></svg>
        </button>
      </div>
    </div>
  );
}

export function LayerPropertiesPanel() {
  const { state, dispatch } = useToolcraft();
  
  const layerId = state.selectedLayerId;
  const storeStr = (state.values.layerPropertiesStore as string) || "{}";
  
  let store: Record<string, any> = {};
  try {
    store = JSON.parse(storeStr);
  } catch(e) {}
  
  const selectedLayer = state.layers.find((l: any) => l.id === layerId);
  const layerProps = layerId ? store[layerId] : null;

  if (!layerId || !selectedLayer) {
    return <div className="p-4 text-sm text-neutral-500">Select a layer to edit its properties.</div>;
  }

  // If the layer doesn't have custom props (e.g. standard uploaded image), it might just have opacity/blend mode.
  const props = layerProps || { imageBlendMode: "source-over", imageOpacity: 1 };
  const currentType = props.type || "image";

  const hasMediaAsset = state.mediaAssets.some((a: any) => a.layerId === layerId || a.id === layerId);
  const isToolcraftImage = ((selectedLayer as any).type === "image" && (selectedLayer as any).params?.image) || hasMediaAsset;
  const isCustomEffect = layerProps?.type && layerProps.type !== "image";
  const isPending = !isCustomEffect && !isToolcraftImage && selectedLayer.kind !== "group";

  const updateProp = (key: string, value: any) => {
    const newStore = { ...store, [layerId]: { ...props, [key]: value, type: currentType } };
    dispatch({
      type: "controls.setValue",
      target: "layerPropertiesStore",
      value: JSON.stringify(newStore)
    });
  };

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Layer Properties</div>
        <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-neutral-700/50 rounded-lg text-neutral-500 bg-neutral-900/20">
          <svg className="mb-3 opacity-30" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          <div className="text-sm font-medium text-neutral-400">Empty Layer</div>
          <div className="text-xs mt-1 mb-4">Select an effect below, or pick a fill color.</div>
          <Color name="Fill Color" hex={props.fillColor?.hex || "#ffffff"} onValueChange={(val) => updateProp("fillColor", val)} />
        </div>
      </div>
    );
  }

  const isGenericGroup = selectedLayer.kind === "group" && !isCustomEffect;

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
        {isGenericGroup ? "Group" : currentType} Properties
      </div>
      
      {currentType === "shader" && (
        <>
          <Select
            name="Shader Type"
            options={[ { label: "Mesh Gradient", value: "MeshGradient" }, { label: "Liquid Metal", value: "LiquidMetal" }, { label: "Metaballs", value: "Metaballs" }, { label: "God Rays", value: "GodRays" }, { label: "Neuro Noise", value: "NeuroNoise" }, { label: "Grain Gradient", value: "GrainGradient" }, { label: "Gem Smoke", value: "GemSmoke" }, { label: "Warp", value: "Warp" }, { label: "Water", value: "Water" } ]}
            value={props.shaderType || "MeshGradient"}
            onValueChange={(val) => updateProp("shaderType", val)}
          />
          <Checkbox
            name="Warp Image"
            checked={props.shaderWarpImage || false}
            onCheckedChange={(val) => updateProp("shaderWarpImage", val)}
          />
          <ShaderFineTuners props={props} updateProp={updateProp} isFilter={false} />
        </>
      )}

      {currentType === "techOverlay" && (
        <>
          <Select
            name="Style"
            options={[ { label: "Cyberpunk HUD", value: "cyberpunk" }, { label: "Minimalist Print", value: "minimalist" }, { label: "Blueprint", value: "blueprint" }, { label: "AI Tracking", value: "tracking" }, { label: "Topography", value: "topography" } ]}
            value={props.techStyle || "cyberpunk"}
            onValueChange={(val) => updateProp("techStyle", val)}
          />
          <Color name="Color" hex={props.techColor?.hex || "#000000"} onValueChange={(val) => updateProp("techColor", val)} />
          <Slider name="Density" value={props.techDensity ?? 0.5} min={0} max={1} step={0.05} onValueChange={(val) => updateProp("techDensity", val)} />
          {props.techStyle !== "tracking" && props.techStyle !== "topography" && (
            <Checkbox name="Show Barcodes" checked={props.showBarcodes ?? true} onCheckedChange={(val) => updateProp("showBarcodes", val)} />
          )}
        </>
      )}

      {currentType === "bloom" && (
        <>
          <Slider name="Intensity" value={props.bloomIntensity ?? 0.5} min={0} max={2} step={0.05} onValueChange={(val) => updateProp("bloomIntensity", val)} />
          <Slider name="Radius" value={props.bloomRadius ?? 20} min={1} max={100} step={1} onValueChange={(val) => updateProp("bloomRadius", val)} />
          <Select
            name="Blend Mode"
            options={[ { label: "Screen", value: "screen" }, { label: "Color Dodge", value: "color-dodge" }, { label: "Lighter", value: "lighter" } ]}
            value={props.bloomBlendMode || "screen"}
            onValueChange={(val) => updateProp("bloomBlendMode", val)}
          />
        </>
      )}

      {currentType === "grain" && (
        <>
          <Slider name="Intensity" value={props.grainIntensity ?? 0.5} min={0} max={1} step={0.01} onValueChange={(val) => updateProp("grainIntensity", val)} />
          <Checkbox name="Colored Noise" checked={props.grainColor ?? false} onCheckedChange={(val) => updateProp("grainColor", val)} />
        </>
      )}

      {currentType === "pixelate" && (
        <>
          <Slider name="Block Size" value={props.pixelSize ?? 10} min={2} max={100} step={1} onValueChange={(val) => updateProp("pixelSize", val)} />
        </>
      )}

      {currentType === "dither" && (
        <>
          <Select
            name="Algorithm"
            options={[ { label: "Atkinson", value: "atkinson" }, { label: "Threshold (1-bit)", value: "threshold" } ]}
            value={props.ditherAlgorithm || "atkinson"}
            onValueChange={(val) => updateProp("ditherAlgorithm", val)}
          />
          <Color name="Dark Color" hex={props.ditherDark?.hex || "#000000"} onValueChange={(val) => updateProp("ditherDark", val)} />
          <Color name="Light Color" hex={props.ditherLight?.hex || "#ffffff"} onValueChange={(val) => updateProp("ditherLight", val)} />
          <Slider name="Threshold Bias" value={props.ditherBias ?? 0.5} min={0} max={1} step={0.01} onValueChange={(val) => updateProp("ditherBias", val)} />
        </>
      )}

      {currentType === "dataGrid" && (
        <>
          <Slider name="Grid Density" value={props.gridDensity ?? 20} min={5} max={100} step={1} onValueChange={(val) => updateProp("gridDensity", val)} />
          <Slider name="Max Radius" value={props.gridMaxRadius ?? 10} min={1} max={50} step={0.5} onValueChange={(val) => updateProp("gridMaxRadius", val)} />
          <Color name="Dot Color" hex={props.gridColor?.hex || "#ffffff"} onValueChange={(val) => updateProp("gridColor", val)} />
        </>
      )}

      {currentType === "dataCascade" && (
        <>
          <Slider name="Stream Density" value={props.cascadeDensity ?? 0.5} min={0.1} max={1} step={0.05} onValueChange={(val) => updateProp("cascadeDensity", val)} />
          <Color name="Text Color" hex={props.cascadeColor?.hex || "#00ff00"} onValueChange={(val) => updateProp("cascadeColor", val)} />
        </>
      )}

      {currentType === "ascii" && (
        <>
          <Slider name="Font Size" value={props.asciiFontSize ?? 10} min={4} max={40} step={1} onValueChange={(val) => updateProp("asciiFontSize", val)} />
          <Color name="Text Color" hex={props.asciiColor?.hex || "#ffffff"} onValueChange={(val) => updateProp("asciiColor", val)} />
          <Color name="Background" hex={props.asciiBackground?.hex || "#000000"} onValueChange={(val) => updateProp("asciiBackground", val)} />
        </>
      )}

      {currentType === "glitch" && (
        <>
          <Slider name="Intensity" value={props.glitchIntensity ?? 0.5} min={0} max={1} step={0.05} onValueChange={(val) => updateProp("glitchIntensity", val)} />
          <Checkbox name="RGB Split (VHS)" checked={props.glitchRGB ?? false} onCheckedChange={(val) => updateProp("glitchRGB", val)} />
        </>
      )}

      {currentType === "halftone" && (
        <>
          <Select
            name="Style"
            options={[ { label: "Dots", value: "dots" }, { label: "Lines", value: "lines" }, { label: "Crosshatch", value: "crosshatch" } ]}
            value={props.halftoneStyle || "dots"}
            onValueChange={(val) => updateProp("halftoneStyle", val)}
          />
          <Color name="Color" hex={props.halftoneColor?.hex || "#ffffff"} onValueChange={(val) => updateProp("halftoneColor", val)} />
          <Slider name="Size" value={props.halftoneSize ?? 4} min={1} max={20} step={1} onValueChange={(val) => updateProp("halftoneSize", val)} />
          <Slider name="Spacing" value={props.halftoneSpacing ?? 6} min={2} max={40} step={1} onValueChange={(val) => updateProp("halftoneSpacing", val)} />
          <Slider name="Angle" value={props.halftoneAngle ?? 45} min={0} max={180} step={1} onValueChange={(val) => updateProp("halftoneAngle", val)} />
        </>
      )}

      {currentType === "imageLayout" && (
        <>
          <Slider name="Layout Seed" value={props.layoutSeed ?? 446331} min={0} max={1000000} step={1} onValueChange={(val) => updateProp("layoutSeed", val)} />
          <Select
            name="Grid Style"
            options={[ { label: "Asymmetrical", value: "asymmetrical" }, { label: "Symmetrical", value: "symmetrical" }, { label: "Brutalist (Overlap)", value: "brutalist" } ]}
            value={props.layoutStyle || "asymmetrical"}
            onValueChange={(val) => updateProp("layoutStyle", val)}
          />
          <Slider name="Complexity X" value={props.columns ?? 3} min={1} max={10} step={1} onValueChange={(val) => updateProp("columns", val)} />
          <Slider name="Complexity Y" value={props.rows ?? 3} min={1} max={10} step={1} onValueChange={(val) => updateProp("rows", val)} />
          <Slider name="Gap Size" value={props.gap ?? 10} min={0} max={100} step={1} onValueChange={(val) => updateProp("gap", val)} />
        </>
      )}

      {currentType === "image" && !isGenericGroup && (
        <>
          <Select
             name="Shader Filter"
             options={[ { label: "None", value: "none" }, { label: "Liquid Metal", value: "LiquidMetal" }, { label: "Warp", value: "Warp" }, { label: "Water", value: "Water" }, { label: "Gem Smoke", value: "GemSmoke" }, { label: "Mesh Gradient", value: "MeshGradient" } ]}
             value={props.imageShaderFilter || "none"}
             onValueChange={(val) => updateProp("imageShaderFilter", val)}
          />
          {props.imageShaderFilter && props.imageShaderFilter !== "none" && (
             <div className="p-3 border border-neutral-800 rounded bg-neutral-900/50 flex flex-col gap-3">
               <div className="text-xs uppercase text-neutral-500 font-semibold mb-1">Filter Settings</div>
               <Checkbox name="Preserve Transparency" checked={props.preserveTransparency ?? true} onCheckedChange={(val) => updateProp("preserveTransparency", val)} />
               <ShaderFineTuners props={props} updateProp={updateProp} isFilter={true} />
             </div>
          )}

          {/* Alignment Actions */}
          <AlignmentButtons
            layerId={layerId}
            props={props}
            store={store}
            state={state}
            dispatch={dispatch}
            currentType={currentType}
          />

          <Slider name="Scale" value={props.scale ?? 1.0} min={0.1} max={5.0} step={0.01} onValueChange={(val) => updateProp("scale", val)} />
          <Slider name="X Position" value={props.transformX ?? 0} min={-2000} max={2000} step={1} onValueChange={(val) => updateProp("transformX", val)} />
          <Slider name="Y Position" value={props.transformY ?? 0} min={-2000} max={2000} step={1} onValueChange={(val) => updateProp("transformY", val)} />
        </>
      )}

      {/* Universal Blend Controls */}
      <Select
        name="Blend Mode"
        options={[
          { label: "Normal", value: "source-over" },
          { label: "Multiply", value: "multiply" },
          { label: "Screen", value: "screen" },
          { label: "Overlay", value: "overlay" },
          { label: "Darken", value: "darken" },
          { label: "Lighten", value: "lighten" },
          { label: "Color Dodge", value: "color-dodge" },
          { label: "Color Burn", value: "color-burn" },
          { label: "Hard Light", value: "hard-light" },
          { label: "Soft Light", value: "soft-light" },
          { label: "Difference", value: "difference" },
          { label: "Exclusion", value: "exclusion" },
          { label: "Hue", value: "hue" },
          { label: "Saturation", value: "saturation" },
          { label: "Color", value: "color" },
          { label: "Luminosity", value: "luminosity" }
        ]}
        value={props.blendMode || props.imageBlendMode || "source-over"}
        onValueChange={(val) => updateProp("blendMode", val)}
      />
      <Slider name="Opacity" value={props.opacity ?? props.imageOpacity ?? 1} min={0} max={1} step={0.01} onValueChange={(val) => updateProp("opacity", val)} />
    </div>
  );
}

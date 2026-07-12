import * as React from "react";
import { useToolcraft } from "@/toolcraft/runtime/react";
import { Slider, Color, Select, Checkbox, ControlFieldLabel } from "@/toolcraft/ui";

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
  const props = layerProps || { type: "image", imageBlendMode: "source-over", imageOpacity: 1 };

  const updateProp = (key: string, value: any) => {
    const newStore = { ...store, [layerId]: { ...props, [key]: value } };
    dispatch({
      type: "controls.setValue",
      target: "layerPropertiesStore",
      value: JSON.stringify(newStore)
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">{props.type} Properties</div>
      
      {props.type === "shader" && (
        <>
          <Select
            name="Shader Type"
            options={[ { label: "Mesh Gradient", value: "MeshGradient" }, { label: "Liquid Metal", value: "LiquidMetal" }, { label: "Metaballs", value: "Metaballs" }, { label: "God Rays", value: "GodRays" }, { label: "Neuro Noise", value: "NeuroNoise" }, { label: "Grain Gradient", value: "GrainGradient" }, { label: "Gem Smoke", value: "GemSmoke" }, { label: "Warp", value: "Warp" } ]}
            value={props.shaderType || "MeshGradient"}
            onValueChange={(val) => updateProp("shaderType", val)}
          />
          <Checkbox
            name="Warp Image"
            checked={props.shaderWarpImage || false}
            onCheckedChange={(val) => updateProp("shaderWarpImage", val)}
          />
          <Checkbox
            name="Pause Animation"
            checked={props.shaderPaused || false}
            onCheckedChange={(val) => updateProp("shaderPaused", val)}
          />
          <div className="grid grid-cols-2 gap-2 mt-2">
             <Color name="Color 1" hex={props.shaderColor1?.hex || "#ff0000"} onValueChange={(val) => updateProp("shaderColor1", val)} />
             <Color name="Color 2" hex={props.shaderColor2?.hex || "#00ff00"} onValueChange={(val) => updateProp("shaderColor2", val)} />
             <Color name="Color 3" hex={props.shaderColor3?.hex || "#0000ff"} onValueChange={(val) => updateProp("shaderColor3", val)} />
             <Color name="Color 4" hex={props.shaderColor4?.hex || "#ffff00"} onValueChange={(val) => updateProp("shaderColor4", val)} />
          </div>
        </>
      )}

      {props.type === "techOverlay" && (
        <>
          <Select
            name="Style"
            options={[ { label: "Cyberpunk HUD", value: "cyberpunk" }, { label: "Minimalist Print", value: "minimalist" }, { label: "Blueprint", value: "blueprint" } ]}
            value={props.techStyle || "cyberpunk"}
            onValueChange={(val) => updateProp("techStyle", val)}
          />
          <Color name="Color" hex={props.techColor?.hex || "#000000"} onValueChange={(val) => updateProp("techColor", val)} />
          <Slider name="Density" value={props.techDensity ?? 0.5} min={0} max={1} step={0.05} onValueChange={(val) => updateProp("techDensity", val)} />
          <Checkbox name="Show Barcodes" checked={props.showBarcodes ?? true} onCheckedChange={(val) => updateProp("showBarcodes", val)} />
        </>
      )}

      {props.type === "glitch" && (
        <>
          <Slider name="Intensity" value={props.glitchIntensity ?? 0.5} min={0} max={1} step={0.05} onValueChange={(val) => updateProp("glitchIntensity", val)} />
          <Checkbox name="RGB Split (VHS)" checked={props.glitchRGB ?? false} onCheckedChange={(val) => updateProp("glitchRGB", val)} />
        </>
      )}

      {props.type === "halftone" && (
        <>
          <Select
            name="Style"
            options={[ { label: "Dots", value: "dots" }, { label: "Lines", value: "lines" } ]}
            value={props.halftoneStyle || "dots"}
            onValueChange={(val) => updateProp("halftoneStyle", val)}
          />
          <Color name="Color" hex={props.halftoneColor?.hex || "#ffffff"} onValueChange={(val) => updateProp("halftoneColor", val)} />
          <Slider name="Size" value={props.halftoneSize ?? 4} min={1} max={20} step={1} onValueChange={(val) => updateProp("halftoneSize", val)} />
          <Slider name="Spacing" value={props.halftoneSpacing ?? 6} min={2} max={40} step={1} onValueChange={(val) => updateProp("halftoneSpacing", val)} />
          <Slider name="Angle" value={props.halftoneAngle ?? 45} min={0} max={180} step={1} onValueChange={(val) => updateProp("halftoneAngle", val)} />
        </>
      )}

      {props.type === "imageLayout" && (
        <>
          <Slider name="Layout Seed" value={props.layoutSeed ?? 446331} min={0} max={1000000} step={1} onValueChange={(val) => updateProp("layoutSeed", val)} />
          <Select
            name="Grid Style"
            options={[ { label: "Asymmetrical", value: "asymmetrical" }, { label: "Symmetrical", value: "symmetrical" } ]}
            value={props.layoutStyle || "asymmetrical"}
            onValueChange={(val) => updateProp("layoutStyle", val)}
          />
          <Slider name="Complexity X" value={props.columns ?? 3} min={1} max={10} step={1} onValueChange={(val) => updateProp("columns", val)} />
          <Slider name="Complexity Y" value={props.rows ?? 3} min={1} max={10} step={1} onValueChange={(val) => updateProp("rows", val)} />
          <Slider name="Gap Size" value={props.gap ?? 10} min={0} max={100} step={1} onValueChange={(val) => updateProp("gap", val)} />
        </>
      )}

      {props.type === "image" && (
        <>
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

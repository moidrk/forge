import * as React from "react";
import { useToolcraft } from "@/toolcraft/runtime/react";
import * as Dialog from "@radix-ui/react-dialog";

const TEMPLATES = [
  { id: "aurora", name: "Aurora", image: "linear-gradient(135deg, #00C9FF 0%, #92FE9D 100%)" },
  { id: "corv", name: "Corv", image: "linear-gradient(135deg, #ff4b1f 0%, #ff9068 100%)" },
  { id: "friday", name: "Friday", image: "linear-gradient(135deg, #1f4037 0%, #99f2c8 100%)" },
  { id: "giger", name: "Giger", image: "linear-gradient(135deg, #434343 0%, #000000 100%)" },
  { id: "hlo", name: "HLO", image: "linear-gradient(135deg, #4b6cb7 0%, #182848 100%)" },
  { id: "kinmino", name: "Kinmino", image: "linear-gradient(135deg, #f12711 0%, #f5af19 100%)" },
  { id: "lau", name: "Lau", image: "linear-gradient(135deg, #654ea3 0%, #eaafc8 100%)" },
  { id: "lo", name: "LO", image: "linear-gradient(135deg, #0052D4 0%, #4364F7 50%, #6FB1FC 100%)" },
  { id: "lunix", name: "Lunix", image: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" },
  { id: "magma", name: "Magma", image: "linear-gradient(135deg, #cb2d3e 0%, #ef473a 100%)" },
  { id: "plasma", name: "Plasma", image: "linear-gradient(135deg, #1c92d2 0%, #f2fcfe 100%)" },
  { id: "polumia", name: "Polumia", image: "linear-gradient(135deg, #f79d00 0%, #64f38c 100%)" },
  { id: "potik", name: "Potik", image: "linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)" },
  { id: "promin", name: "Promin", image: "linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)" },
  { id: "vertex", name: "Vertex", image: "linear-gradient(135deg, #83a4d4 0%, #b6fbff 100%)" },
  { id: "zelen", name: "Zelen", image: "linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)" },
];

function applyTemplate(id: string, state: any, dispatch: any) {
  const baseLayerId = `shader-${Date.now()}`;
  
  // Setup store and layers
  let shaderType = "MeshGradient";
  let c1 = "#000000", c2 = "#000000", c3 = "#000000", c4 = "#000000";

  switch (id) {
    case "aurora":
      c1 = "#00C9FF"; c2 = "#92FE9D"; c3 = "#0047AB"; c4 = "#008080";
      shaderType = "GodRays";
      break;
    case "magma":
      c1 = "#cb2d3e"; c2 = "#ef473a"; c3 = "#000000"; c4 = "#4A00E0";
      shaderType = "LiquidMetal";
      break;
    case "plasma":
      c1 = "#1c92d2"; c2 = "#f2fcfe"; c3 = "#cb2d3e"; c4 = "#00C9FF";
      shaderType = "Metaballs";
      break;
    // ... we can expand these setups ...
    default:
      c1 = "#ee0979"; c2 = "#ff6a00"; c3 = "#4b6cb7"; c4 = "#182848";
      break;
  }

  // Preserve existing store or clear it out
  const storeStr = state.values.layerPropertiesStore || "{}";
  const store = JSON.parse(storeStr);

  store[baseLayerId] = {
    type: "shader",
    shaderType,
    shaderColor1: { hex: c1 },
    shaderColor2: { hex: c2 },
    shaderColor3: { hex: c3 },
    shaderColor4: { hex: c4 }
  };

  const ppLayerId = `pp-${Date.now()}`;
  let hasPP = false;
  if (id === "magma" || id === "promin") {
    hasPP = true;
    store[ppLayerId] = { type: "glitter", glitterDensity: 200, glitterOpacity: 0.8, blendMode: "screen" };
  } else if (id === "giger" || id === "hlo") {
    hasPP = true;
    store[ppLayerId] = { type: "grain", grainIntensity: 0.6, blendMode: "overlay" };
  }

  // 1. Delete existing layers
  const existingRootLayers = state.layers.filter((l: any) => !l.parentGroupId);
  for (const layer of existingRootLayers) {
     dispatch({ type: "layers.delete", layerId: layer.id });
  }

  // 2. Add new layers (bottom up because insertIndex default is top or bottom?)
  // Toolcraft adds to top if insertIndex is 0
  dispatch({
    type: "layers.add",
    layer: { id: baseLayerId, name: "Base Gradient", kind: "layer", visible: true },
    insertIndex: 0
  });

  if (hasPP) {
    dispatch({
      type: "layers.add",
      layer: { id: ppLayerId, name: store[ppLayerId].type === "glitter" ? "Glitter" : "Grain", kind: "layer", visible: true },
      insertIndex: 0
    });
  }

  dispatch({ type: "controls.setValue", target: "layerPropertiesStore", value: JSON.stringify(store) });
  
  setTimeout(() => {
    dispatch({ type: "layers.select", layerId: baseLayerId });
  }, 10);
}

export function TemplatesGallery() {
  const { state, dispatch } = useToolcraft();
  const [open, setOpen] = React.useState(false);
  const [confirmId, setConfirmId] = React.useState<string | null>(null);

  const handleSelect = (id: string) => {
    setConfirmId(id);
  };

  const handleConfirm = () => {
    if (confirmId) {
      applyTemplate(confirmId, state, dispatch);
      setOpen(false);
      setConfirmId(null);
    }
  };

  return (
    <div className="mb-4">
      <Dialog.Root open={open} onOpenChange={(val) => { setOpen(val); if (!val) setConfirmId(null); }}>
        <Dialog.Trigger asChild>
          <button className="w-full flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-md py-2 px-4 text-sm font-medium transition-colors border border-neutral-700">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
            Curated Templates
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-4xl max-h-[85vh] bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-[101] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-neutral-800">
              <Dialog.Title className="text-lg font-semibold text-white">Curated Templates</Dialog.Title>
              <Dialog.Close className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </Dialog.Close>
            </div>

            {confirmId ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
                <div className="w-16 h-16 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Overwrite Current Canvas?</h3>
                <p className="text-neutral-400 max-w-md mb-8">
                  Applying a template will completely replace your current layers and effects to provide a fresh starting point. This action cannot be easily undone.
                </p>
                <div className="flex gap-4">
                  <button onClick={() => setConfirmId(null)} className="px-6 py-2 rounded bg-neutral-800 text-white hover:bg-neutral-700 transition-colors font-medium">Cancel</button>
                  <button onClick={handleConfirm} className="px-6 py-2 rounded bg-orange-500 text-white hover:bg-orange-600 transition-colors font-medium shadow-lg shadow-orange-500/20">Yes, Start Fresh</button>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {TEMPLATES.map(t => (
                    <div 
                      key={t.id} 
                      className="group cursor-pointer rounded-lg bg-neutral-800/50 border border-neutral-800 hover:border-neutral-600 transition-all overflow-hidden flex flex-col"
                      onClick={() => handleSelect(t.id)}
                    >
                      <div className="aspect-[16/9] w-full" style={{ background: t.image }}></div>
                      <div className="p-3 text-center text-sm font-medium text-neutral-300 group-hover:text-white transition-colors">
                        {t.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

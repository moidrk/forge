export type Seed = number;

export interface LayerConfig {
  enabled: boolean;
  locked?: boolean;
  params: Record<string, any>;
}

export interface DesignRecipe {
  seed: Seed;
  width: number;
  height: number;
  layers: {
    shader?: LayerConfig;
    base?: LayerConfig;
    imageLayout?: LayerConfig;
    halftone?: LayerConfig;
    colorGrade?: LayerConfig;
    paper?: LayerConfig;
    techOverlay?: LayerConfig;
    typography?: LayerConfig;
    glitch?: LayerConfig;
  };
}

export type Seed = number;

export interface DesignRecipeLayer {
  id: string;
  type: string;
  visible: boolean;
  params: Record<string, any>;
}

export interface DesignRecipe {
  seed: Seed;
  width: number;
  height: number;
  layers: DesignRecipeLayer[];
}


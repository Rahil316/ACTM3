import data from "../plugin/ThemShopItems/presets.json";
import { ProjectStoreSnapshot } from "@/types/state";

export interface Preset {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  badge?: string;
  swatches?: string[];
  config: Partial<ProjectStoreSnapshot>;
}

export const PRESETS = data as Preset[];

import { Affinity } from "./Affinity";
import { IHasTags } from "./IHasTags";

export interface Merit extends IHasTags {
  id: string;
  name: string;
  cost: number;
  rarity: number;
  conflictingTraits: string[];
  description: string;
  affinities: Affinity[];
}

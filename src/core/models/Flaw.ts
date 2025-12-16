import { Affinity } from "./Affinity";
import { IHasTags } from "./IHasTags";

export interface Flaw extends IHasTags {
  id: string;
  name: string;
  cost: number;
  rarity: number;
  conflictingTraits: string[];
  description: string;
  affinities: Affinity[];
}

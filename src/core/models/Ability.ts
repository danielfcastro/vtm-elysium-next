import { Affinity } from "./Affinity";
import { IHasTags } from "./IHasTags";

export interface Ability extends IHasTags {
  id: string;
  name: string;
  category: string;
  affinities: Affinity[];
}

import { Affinity } from "./Affinity";
import { IHasTags } from "./IHasTags";

export interface Nature extends IHasTags {
  id: string;
  name: string;
  description: string;
  affinities: Affinity[];
}

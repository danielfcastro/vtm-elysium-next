import { Affinity } from "./Affinity";
import { IHasTags } from "./IHasTags";

export interface Discipline extends IHasTags {
  id: string;
  name: string;
  description: string;
  affinities: Affinity[];
}

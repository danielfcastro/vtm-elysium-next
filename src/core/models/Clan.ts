import { Affinity } from "./Affinity";
import { IHasTags } from "./IHasTags";

export interface Clan extends IHasTags {
  id: string;
  name: string;
  nickname: string;
  disciplines: string[];
  weakness: string;
  affinities: Affinity[];
}

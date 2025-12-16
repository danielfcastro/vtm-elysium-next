import { IHasTags } from "./IHasTags";
import { VtMAttribute } from "./VtMAttribute";

export interface AttributeCategory extends IHasTags {
  id: string;
  name: string;
  description: string;
  attributes: VtMAttribute[];
}

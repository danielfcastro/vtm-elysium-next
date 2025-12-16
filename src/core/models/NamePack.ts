import { IHasTags } from "./IHasTags";

export interface NamePack extends IHasTags {
  Id: string;
  Type: string; // FirstName | LastName
  Era: string; // Ancient | Medieval | EarlyModern | Modern
  LinkedLastNameId?: string;
  Values: string[];
}

import { Clan } from "./Clan";
import { Concept } from "./Concept";
import { Nature } from "./Nature";

export interface Persona {
  concept?: Concept | null;
  clan?: Clan | null;
  nature?: Nature | null;
  demeanor?: Nature | null;
  name?: string | null;
  generation?: number | null;
  age?: number | null;
  ageCategory?: string | null;
}

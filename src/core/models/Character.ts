import { Clan } from "./Clan";
import { Concept } from "./Concept";
import { Nature } from "./Nature";
import { Merit } from "./Merit";
import { Flaw } from "./Flaw";

export interface Character {
  concept?: Concept | null;
  clan?: Clan | null;
  nature?: Nature | null;
  demeanor?: Nature | null;
  ageCategory?: string | null;
  name: string;
  player?: string;
  chronicle?: string;
  sire?: string;
  age?: number | null;
  totalExperience: number;
  spentExperience: number;

  attributes: Record<string, number>;
  abilities: Record<string, number>;
  backgrounds: Record<string, number>;
  virtues: Record<string, number>;
  disciplines: Record<string, number>;

  merits: Merit[];
  flaws: Flaw[];
  debugLog: string[];
  spendEvents?: any[];

  generation?: number | null;
  maxTraitRating: number;
  maximumBloodPool: number;
  bloodPointsPerTurn: number;
  humanity: number;
  willpower: number;
}

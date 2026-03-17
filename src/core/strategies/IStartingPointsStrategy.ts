import { FreebieType } from "../enums/FreebieType";
import { TraitType } from "../enums/TraitType";

export interface IStartingPointsStrategy {
  getPoints(type: TraitType | FreebieType): number[];
  isDarkAges: boolean;
}

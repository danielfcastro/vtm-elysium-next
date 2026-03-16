import { FreebieType } from "../enums/FreebieType";
import { TraitType } from "../enums/TraitType";
import { IStartingPointsStrategy } from "./IStartingPointsStrategy";

export class AncillaeStartingPointStrategy implements IStartingPointsStrategy {
  isDarkAges = false;

  getPoints(type: TraitType | FreebieType): number[] {
    switch (type) {
      case TraitType.Attribute:
        return [9, 6, 4];
      case TraitType.Ability:
        return [18, 9, 3];
      case TraitType.Discipline:
        return [6];
      case TraitType.Background:
        return [7];
      case TraitType.Virtue:
        return [7];
      case TraitType.Humanity:
      case TraitType.Willpower:
      case TraitType.Merit:
      case TraitType.Flaw:
      case FreebieType.Ancillae:
        return [FreebieType.Ancillae];
      default:
        return [0];
    }
  }
}

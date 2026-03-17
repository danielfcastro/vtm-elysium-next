import { FreebieType } from "../enums/FreebieType";
import { TraitType } from "../enums/TraitType";
import { IStartingPointsStrategy } from "./IStartingPointsStrategy";

export class HumanStartingPointStrategy implements IStartingPointsStrategy {
  isDarkAges = false;

  getPoints(type: TraitType | FreebieType): number[] {
    switch (type) {
      case TraitType.Attribute:
        return [6, 4, 3];
      case TraitType.Ability:
        return [11, 7, 4];
      case TraitType.Discipline:
        return [0];
      case TraitType.Background:
        return [5];
      case TraitType.Virtue:
        return [7];
      case TraitType.Humanity:
      case TraitType.Willpower:
      case TraitType.Merit:
      case TraitType.Flaw:
      case FreebieType.Neophite:
      case FreebieType.Ancillae:
      case FreebieType.Elder:
      case FreebieType.ElderElysium:
      case FreebieType.ElderBelladona:
      case FreebieType.Human:
        return [FreebieType.Human];
      default:
        return [0];
    }
  }
}

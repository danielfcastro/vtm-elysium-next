import { FreebieType } from "../../enums/FreebieType";
import { TraitType } from "../../enums/TraitType";
import { BaseStartingPointStrategy } from "./BaseStartingPointStrategy";

export class NeophiteStartingPointStrategy extends BaseStartingPointStrategy {
  isDarkAges = false;

  getPoints(type: TraitType | FreebieType): number[] {
    switch (type) {
      case TraitType.Attribute:
        return [7, 5, 3];
      case TraitType.Ability:
        return [13, 9, 5];
      case TraitType.Discipline:
        if (this.isDarkAges) return [4];
        return [3];
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
        return [FreebieType.Neophite];
      default:
        return [0];
    }
  }
}

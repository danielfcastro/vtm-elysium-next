import { FreebieType } from "../../enums/FreebieType";
import { TraitType } from "../../enums/TraitType";
import { BaseStartingPointStrategy } from "./BaseStartingPointStrategy";

export class ElderStartingPointStrategy extends BaseStartingPointStrategy {
  isDarkAges = false;

  getPoints(type: TraitType | FreebieType): number[] {
    switch (type) {
      case TraitType.Attribute:
        return [10, 7, 5];
      case TraitType.Ability:
        return [21, 9, 3];
      case TraitType.Discipline:
        return [10];
      case TraitType.Background:
        return [12];
      case TraitType.Virtue:
        return [6];
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
        return [FreebieType.Elder];
      default:
        return [0];
    }
  }
}

import { FreebieType } from "../../enums/FreebieType";
import { TraitType } from "../../enums/TraitType";
import { BaseStartingPointStrategy } from "./BaseStartingPointStrategy";

export class RevenantStartingPointStrategy extends BaseStartingPointStrategy {
  isDarkAges = false;

  getPoints(type: TraitType | FreebieType): number[] {
    switch (type) {
      case TraitType.Attribute:
        return [6, 4, 3];
      case TraitType.Ability:
        return [11, 7, 4];
      case TraitType.Discipline:
        // Revenants get 1 + 1 dot: first position is Potence (fixed), second is free to use on family disciplines
        return [1, 1];
      case TraitType.Background:
        return [5];
      case TraitType.Virtue:
        return [5];
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
      case FreebieType.Revenant:
        return [FreebieType.Revenant];
      default:
        return [0];
    }
  }
}

import { TraitType } from "../../enums/TraitType";
import { FreebieType } from "../../enums/FreebieType";
import { BaseStartingPointStrategy } from "./BaseStartingPointStrategy";

// Non-revenant human ghouls
export class GhoulStartingPointStrategy extends BaseStartingPointStrategy {
  isDarkAges = false;

  getPoints(type: TraitType | FreebieType): number[] {
    switch (type) {
      case TraitType.Attribute:
        return [6, 4, 3];
      case TraitType.Ability:
        return [11, 7, 4];
      case TraitType.Discipline:
        // Non-revenant ghouls get 1 discipline dot
        return [1];
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
      case FreebieType.Revenant:
      case FreebieType.Human:
        return [FreebieType.Human];
      default:
        return [0];
    }
  }
}

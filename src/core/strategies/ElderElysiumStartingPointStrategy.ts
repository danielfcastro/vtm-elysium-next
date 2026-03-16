import { AGE_BACKGROUND_FREEBIES_BY_DOTS } from "../data/records/AgeFreebies";
import { FreebieType } from "../enums/FreebieType";
import { TraitType } from "../enums/TraitType";
import { IStartingPointsStrategy } from "./IStartingPointsStrategy";

export class ElderElysiumStartingPointStrategy implements IStartingPointsStrategy {
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
        return [7];
      case TraitType.Humanity:
      case TraitType.Willpower:
      case TraitType.Merit:
      case TraitType.Flaw:
      case FreebieType.Neophite:
      case FreebieType.Ancillae:
      case FreebieType.Elder:
      case FreebieType.ElderElysium:
        return [AGE_BACKGROUND_FREEBIES_BY_DOTS[0]];
      case FreebieType.ElderBelladona:
      case FreebieType.Human:
      default:
        return [0];
    }
  }
}

import { TraitType } from "../enums/TraitType";
import { ITraitCostStrategy } from "./ITraitCostStrategy";

export class FreebiePointCostStrategy implements ITraitCostStrategy {
  getCost(
    type: TraitType,
    _currentRating = 0,
    _isClanTrait = false,
    _isSecondaryPath = false,
  ): number {
    switch (type) {
      case TraitType.Attribute:
        return 5;
      case TraitType.Ability:
        return 2;
      case TraitType.Discipline:
        return 7;
      case TraitType.Background:
        return 1;
      case TraitType.Virtue:
        return 2;
      case TraitType.Humanity:
        return 2;
      case TraitType.Willpower:
        return 1;
      case TraitType.Merit:
      case TraitType.Flaw:
      default:
        return 0;
    }
  }
}

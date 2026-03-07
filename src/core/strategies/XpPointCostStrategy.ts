import { TraitType } from "../enums/TraitType";
import { ITraitCostStrategy } from "./ITraitCostStrategy";

export class XpPointCostStrategy implements ITraitCostStrategy {
  getCost(
    type: TraitType,
    currentRating = 0,
    isClanTrait = false,
    isSecondaryPath = false,
    isBackgroundAllowed = false,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isMeritFlawAllowed = false,
  ): number {
    switch (type) {
      case TraitType.Attribute:
        return currentRating * 4;
      case TraitType.Ability:
        return currentRating === 0 ? 3 : currentRating * 2;
      case TraitType.Discipline:
        if (isSecondaryPath) {
          if (currentRating === 0) return 7;
          return currentRating * 4;
        }
        if (currentRating === 0) return 10;
        return currentRating * (isClanTrait ? 5 : 7);
      case TraitType.Virtue:
        return currentRating * 2;
      case TraitType.Humanity:
        return currentRating * 2;
      case TraitType.Willpower:
        return currentRating;
      case TraitType.Background:
        if (isBackgroundAllowed) return currentRating;
        return 9999;
      case TraitType.Merit:
      case TraitType.Flaw:
        if (isBackgroundAllowed) return currentRating;
        return 9999;
      default:
        return 0;
    }
  }
}

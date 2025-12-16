import { TraitType } from "../enums/TraitType";

export interface ITraitCostStrategy {
  getCost(
    type: TraitType,
    currentRating?: number,
    isClanTrait?: boolean,
    isSecondaryPath?: boolean,
  ): number;
}

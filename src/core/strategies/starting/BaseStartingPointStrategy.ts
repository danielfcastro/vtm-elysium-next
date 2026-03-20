import { FreebieType } from "../../enums/FreebieType";
import { TraitType } from "../../enums/TraitType";
import { IStartingPointsStrategy } from "../IStartingPointsStrategy";

export abstract class BaseStartingPointStrategy implements IStartingPointsStrategy {
  abstract isDarkAges: boolean;

  abstract getPoints(type: TraitType | FreebieType): number[];

  getFreebiePointsTotal(
    _draft: Partial<{ backgrounds: Record<string, number> }>,
  ): number {
    return this.getPoints(FreebieType.Neophite)[0] || 15;
  }
}

import { AGE_FREEBIES } from "../../data/records/AgeElderFreebies";
import { FreebieType } from "../../enums/FreebieType";
import { TraitType } from "../../enums/TraitType";
import { BaseStartingPointStrategy } from "./BaseStartingPointStrategy";

export class ElderBelladonaStartingPointStrategy extends BaseStartingPointStrategy {
  isDarkAges = false;

  getFreebiePointsTotal(
    draft: Partial<{ backgrounds?: Record<string, number> }>,
  ): number {
    const ageDots = Number((draft.backgrounds as any)?.age ?? 0);
    const clamped = Math.max(0, Math.min(5, Math.floor(ageDots)));
    return AGE_FREEBIES[clamped] ?? super.getFreebiePointsTotal(draft);
  }

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
        return [AGE_FREEBIES[0]];
      case FreebieType.Human:
      default:
        return [0];
    }
  }
}

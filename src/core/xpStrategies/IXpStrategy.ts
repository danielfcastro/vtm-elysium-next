import { TraitType } from "../enums/TraitType";
import { Character } from "../models/Character";

export interface IXpStrategy {
  type: TraitType;
  minRequiredXp: number;
  isAvailable: boolean;
  resetAvailability(): void;
  trySpendXp(
    character: Character,
    affinityProfile: Record<string, number>,
    budget: number,
    spentXp: { value: number },
  ): boolean;
}

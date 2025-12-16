import { TraitType } from "../enums/TraitType";
import { Character } from "../models/Character";
import { IXpStrategy } from "./IXpStrategy";

export abstract class BaseXpStrategy implements IXpStrategy {
  protected _isAvailable = true;
  abstract type: TraitType;
  abstract minRequiredXp: number;
  get isAvailable() {
    return this._isAvailable;
  }
  resetAvailability() {
    this._isAvailable = true;
  }
  abstract trySpendXp(
    character: Character,
    affinityProfile: Record<string, number>,
    budget: number,
    spentXp: { value: number },
  ): boolean;
}

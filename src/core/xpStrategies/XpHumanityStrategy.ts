import { BaseXpStrategy } from "./BaseXpStrategy";
import { TraitType } from "../enums/TraitType";
import { ITraitCostStrategy } from "../strategies/ITraitCostStrategy";
import { Character } from "../models/Character";

export class XpHumanityStrategy extends BaseXpStrategy {
  type = TraitType.Humanity;
  minRequiredXp = 2;
  constructor(private readonly cost: ITraitCostStrategy) {
    super();
  }

  trySpendXp(
    character: Character,
    _affinityProfile: Record<string, number>,
    budget: number,
    spentXp: { value: number },
  ): boolean {
    if (character.humanity >= 10) {
      this._isAvailable = false;
      return false;
    }
    const current = character.humanity;
    const cost = this.cost.getCost(TraitType.Humanity, current);
    if (cost > budget) {
      this._isAvailable = false;
      return false;
    }

    character.humanity++;
    spentXp.value += cost;

    // Track spend events for UI tooltips
    const cAny = character as any;
    if (!Array.isArray(cAny.spendEvents)) cAny.spendEvents = [];
    cAny.spendEvents.push({
      source: "xp",
      type: TraitType.Humanity,
      traitId: "humanity",
      delta: 1,
      cost,
      before: current,
      after: current + 1,
    });
    character.debugLog.push(
      `[Spend][XP] ${TraitType.Humanity}: 'humanity' (+1 dot) - Cost: ${cost} (${current} -> ${current + 1})`,
    );
    character.debugLog.push(
      `[XP] Increased Humanity to ${character.humanity} (Cost: ${cost})`,
    );
    return true;
  }
}

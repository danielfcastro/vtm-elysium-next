import { BaseXpStrategy } from "./BaseXpStrategy";
import { TraitType } from "../enums/TraitType";
import { ITraitCostStrategy } from "../strategies/ITraitCostStrategy";
import { Character } from "../models/Character";

export class XpWillpowerStrategy extends BaseXpStrategy {
  type = TraitType.Willpower;
  minRequiredXp = 1;
  constructor(private readonly cost: ITraitCostStrategy) {
    super();
  }

  trySpendXp(
    character: Character,
    _affinityProfile: Record<string, number>,
    budget: number,
    spentXp: { value: number },
  ): boolean {
    if (character.willpower >= 10) {
      this._isAvailable = false;
      return false;
    }
    const current = character.willpower;
    const cost = this.cost.getCost(TraitType.Willpower, current);
    if (cost > budget) {
      this._isAvailable = false;
      return false;
    }
    character.willpower++;
    spentXp.value += cost;

    // Track spend events for UI tooltips
    const cAny = character as any;
    if (!Array.isArray(cAny.spendEvents)) cAny.spendEvents = [];
    cAny.spendEvents.push({
      source: "xp",
      type: TraitType.Willpower,
      traitId: "willpower",
      delta: 1,
      cost,
      before: current,
      after: current + 1,
    });
    character.debugLog.push(
      `[Spend][XP] ${TraitType.Willpower}: 'willpower' (+1 dot) - Cost: ${cost} (${current} -> ${current + 1})`,
    );
    character.debugLog.push(
      `[XP] Increased Willpower to ${character.willpower} (Cost: ${cost})`,
    );
    return true;
  }
}

import { BaseXpStrategy } from "./BaseXpStrategy";
import { TraitType } from "../enums/TraitType";
import { GameDataProvider } from "../data/GameDataProvider";
import { ITraitCostStrategy } from "../strategies/ITraitCostStrategy";
import { Character } from "../models/Character";
import { Rng } from "../utils/rng";

export class XpVirtueStrategy extends BaseXpStrategy {
  type = TraitType.Virtue;
  minRequiredXp = 2;

  constructor(
    private readonly data: GameDataProvider,
    private readonly cost: ITraitCostStrategy,
    private readonly rng: Rng,
  ) {
    super();
  }

  trySpendXp(
    character: Character,
    affinityProfile: Record<string, number>,
    budget: number,
    spentXp: { value: number },
  ): boolean {
    const candidates = new Map<any, number>();
    let total = 0;

    for (const virtue of this.data.virtues) {
      if (character.virtues[virtue.id] === undefined) continue;
      const current = character.virtues[virtue.id];
      if (current >= 5) continue;

      const c = this.cost.getCost(TraitType.Virtue, current);
      if (c > budget) continue;

      let score = 0;
      for (const tag of virtue.tags ?? []) {
        const key = (tag ?? "").trim().toLowerCase();
        if (affinityProfile[key] !== undefined) score += affinityProfile[key];
      }
      if (current === 3) score -= 20;
      else if (current === 4) score -= 40;

      if (score < 1) score = 1;
      candidates.set(virtue, score);
      total += score;
    }

    if (!candidates.size) {
      this._isAvailable = false;
      return false;
    }

    let roll = this.rng.int(0, total);
    let selected: any = null;
    for (const [virtue, w] of candidates.entries()) {
      if (roll < w) {
        selected = virtue;
        break;
      }
      roll -= w;
    }
    if (!selected) selected = Array.from(candidates.keys()).at(-1);

    const id = selected.id;
    const rating = character.virtues[id];
    const finalCost = this.cost.getCost(TraitType.Virtue, rating);
    character.virtues[id] = rating + 1;
    spentXp.value += finalCost;

    // Track spend events for UI tooltips
    const cAny = character as any;
    if (!Array.isArray(cAny.spendEvents)) cAny.spendEvents = [];
    cAny.spendEvents.push({
      source: "xp",
      type: TraitType.Virtue,
      traitId: id,
      delta: 1,
      cost: finalCost,
      before: rating,
      after: rating + 1,
    });
    character.debugLog.push(
      `[Spend][XP] ${TraitType.Virtue}: '${id}' (+1 dot) - Cost: ${finalCost} (${rating} -> ${rating + 1})`,
    );
    character.debugLog.push(
      `[XP] Increased Virtue ${selected.name} to ${character.virtues[id]} (Cost: ${finalCost})`,
    );
    return true;
  }
}

import { BaseXpStrategy } from "./BaseXpStrategy";
import { TraitType } from "../enums/TraitType";
import { GameDataProvider } from "../data/GameDataProvider";
import { ITraitCostStrategy } from "../strategies/ITraitCostStrategy";
import {
  AffinityProcessorService,
  TaggableItem,
} from "../affinity/AffinityProcessorService";
import { Character } from "../models/Character";

export class XpAbilityStrategy extends BaseXpStrategy {
  type = TraitType.Ability;
  minRequiredXp = 2;

  constructor(
    private readonly data: GameDataProvider,
    private readonly cost: ITraitCostStrategy,
    private readonly affinity: AffinityProcessorService,
  ) {
    super();
  }

  trySpendXp(
    character: Character,
    affinityProfile: Record<string, number>,
    budget: number,
    spentXp: { value: number },
  ): boolean {
    const validGroups: Record<string, any[]> = {};

    for (const ability of this.data.abilities) {
      const currentRating = character.abilities[ability.id] ?? 0;
      if (currentRating >= character.maxTraitRating) continue;
      const c = this.cost.getCost(TraitType.Ability, currentRating);
      if (c <= budget) {
        (validGroups[ability.category] ??= []).push(ability);
      }
    }

    const keys = Object.keys(validGroups);
    if (!keys.length) {
      this._isAvailable = false;
      return false;
    }

    const categoryCandidates: TaggableItem[] = keys.map((k) => ({
      id: k,
      tags: [k.toLowerCase()],
    }));
    const selectedCategory = this.affinity.getWeightedRandom(
      categoryCandidates as any,
      affinityProfile,
    ) as any as TaggableItem | null;
    if (!selectedCategory) return false;

    const abilitiesInCategory = validGroups[selectedCategory.id];
    const selectedAbility = this.affinity.getWeightedRandom(
      abilitiesInCategory as any,
      affinityProfile,
    ) as any;
    if (!selectedAbility) return false;

    const id = selectedAbility.id;
    const rating = character.abilities[id] ?? 0;
    const finalCost = this.cost.getCost(TraitType.Ability, rating);
    if (finalCost > budget) return false;

    character.abilities[id] = rating + 1;
    spentXp.value += finalCost;

    // Track spend events for UI tooltips
    const cAny = character as any;
    if (!Array.isArray(cAny.spendEvents)) cAny.spendEvents = [];
    cAny.spendEvents.push({
      source: "xp",
      type: TraitType.Ability,
      traitId: id,
      delta: 1,
      cost: finalCost,
      before: rating,
      after: rating + 1,
    });
    character.debugLog.push(
      `[Spend][XP] ${TraitType.Ability}: '${id}' (+1 dot) - Cost: ${finalCost} (${rating} -> ${rating + 1})`,
    );

    this.affinity.processAffinities(
      affinityProfile,
      selectedAbility.affinities,
    );
    character.debugLog.push(
      `[XP] Increased Ability ${selectedAbility.name} to ${character.abilities[id]} (Cost: ${finalCost})`,
    );
    return true;
  }
}

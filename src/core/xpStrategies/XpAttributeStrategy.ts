import { BaseXpStrategy } from "./BaseXpStrategy";
import { TraitType } from "../enums/TraitType";
import { GameDataProvider } from "../data/GameDataProvider";
import { ITraitCostStrategy } from "../strategies/ITraitCostStrategy";
import {
  AffinityProcessorService,
  TaggableItem,
} from "../affinity/AffinityProcessorService";
import { Character } from "../models/Character";

export class XpAttributeStrategy extends BaseXpStrategy {
  type = TraitType.Attribute;
  minRequiredXp = 4;

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
    const validCategories: TaggableItem[] = [];

    for (const category of this.data.attributeCategories) {
      let hasValid = false;
      for (const attr of category.attributes) {
        if (character.clan?.id === "nosferatu" && attr.id === "appearance")
          continue;
        if (character.attributes[attr.id] === undefined) continue;
        const current = character.attributes[attr.id];
        if (current >= character.maxTraitRating) continue;
        const c = this.cost.getCost(TraitType.Attribute, current);
        if (c <= budget) {
          hasValid = true;
          break;
        }
      }
      if (hasValid)
        validCategories.push({
          id: category.id,
          tags: [category.name.toLowerCase()],
        });
    }

    if (!validCategories.length) {
      this._isAvailable = false;
      return false;
    }

    const selectedCategoryItem = this.affinity.getWeightedRandom(
      validCategories as any,
      affinityProfile,
    ) as any as TaggableItem | null;
    if (!selectedCategoryItem) return false;

    const selectedCategory = this.data.attributeCategories.find(
      (c) => c.id === selectedCategoryItem.id,
    );
    if (!selectedCategory) return false;

    const validAttributes = selectedCategory.attributes.filter((attr) => {
      if (character.clan?.id === "nosferatu" && attr.id === "appearance")
        return false;
      const current = character.attributes[attr.id];
      if (current >= character.maxTraitRating) return false;
      const c = this.cost.getCost(TraitType.Attribute, current);
      return c <= budget;
    });

    if (!validAttributes.length) return false;

    const finalAttribute = this.affinity.getWeightedRandom(
      validAttributes as any,
      affinityProfile,
    ) as any;
    if (!finalAttribute) return false;

    const id = finalAttribute.id;
    const rating = character.attributes[id];
    const finalCost = this.cost.getCost(TraitType.Attribute, rating);
    if (finalCost > budget) return false;

    character.attributes[id] = rating + 1;
    spentXp.value += finalCost;
    // Track spend events for UI tooltips
    const cAny = character as any;
    if (!Array.isArray(cAny.spendEvents)) cAny.spendEvents = [];
    cAny.spendEvents.push({
      source: "xp",
      type: TraitType.Attribute,
      traitId: id,
      delta: 1,
      cost: finalCost,
      before: rating,
      after: rating + 1,
    });
    character.debugLog.push(
      `[Spend][XP] ${TraitType.Attribute}: '${id}' (+1 dot) - Cost: ${finalCost} (${rating} -> ${rating + 1})`,
    );

    this.affinity.processAffinities(affinityProfile, finalAttribute.affinities);
    character.debugLog.push(
      `[XP] Attribute Upgraded: ${finalAttribute.name} (${rating} -> ${rating + 1}) Cost: ${finalCost}`,
    );
    return true;
  }
}

import { TraitType } from "../enums/TraitType";
import { Character } from "../models/Character";
import { ITraitCostStrategy } from "../strategies/ITraitCostStrategy";
import { Merit } from "../models/Merit";
import { Flaw } from "../models/Flaw";

export type SpendSource = "freebie" | "xp" | "unknown";

export interface SpendEvent {
  source: SpendSource;
  type: TraitType;
  traitId: string;
  delta: number;
  cost: number;
  before?: number;
  after?: number;
}

export class TraitManagerService {
  tryIncreaseTrait(
    character: Character,
    type: TraitType,
    traitId: string,
    costStrategy: ITraitCostStrategy,
    currentPoints: { value: number },
    source: SpendSource = "unknown",
  ): boolean {
    const cost = costStrategy.getCost(type);
    if (currentPoints.value < cost) return false;

    // Cap dinâmico por geração (3ª=10 … 7ª=6 … 8ª-15ª=5)
    const maxTrait = character.maxTraitRating ?? 5;

    let success = false;
    switch (type) {
      case TraitType.Attribute:
        success = this.tryIncreaseDict(character.attributes, traitId, maxTrait);
        break;

      case TraitType.Ability:
        success = this.tryIncreaseDict(character.abilities, traitId, maxTrait);
        break;

      case TraitType.Discipline:
        success = this.tryIncreaseDict(
          character.disciplines,
          traitId,
          maxTrait,
        );
        break;

      // Regras padrão: esses continuam em 5
      case TraitType.Background:
        success = this.tryIncreaseDict(character.backgrounds, traitId, 5);
        break;

      case TraitType.Virtue:
        success = this.tryIncreaseDict(character.virtues, traitId, 5);
        break;

      // Regras padrão: continuam em 10
      case TraitType.Humanity:
        if (character.humanity < 10) {
          character.humanity++;
          success = true;
        }
        break;

      case TraitType.Willpower:
        if (character.willpower < 10) {
          character.willpower++;
          success = true;
        }
        break;

      default:
        success = false;
    }

    if (success) {
      currentPoints.value -= cost;

      // Track spend events for UI tooltips (no debugLog parsing required)
      const cAny = character as any;
      if (!Array.isArray(cAny.spendEvents)) cAny.spendEvents = [];
      cAny.spendEvents.push({
        source,
        type,
        traitId,
        delta: 1,
        cost,
      } as SpendEvent);

      character.debugLog.push(
        `[Spend][${String(source).toUpperCase()}] ${type}: '${traitId}' (+1 dot) - Cost: ${cost}`,
      );
    }

    return success;
  }

  tryAddMerit(
    character: Character,
    merit: Merit,
    currentPoints: { value: number },
  ): boolean {
    if (character.merits.some((m) => m.id === merit.id)) return false;
    if (currentPoints.value < merit.cost) return false;

    character.merits.push(merit);
    currentPoints.value -= merit.cost;
    character.debugLog.push(
      `[Merit] Added '${merit.name}' - Cost: ${merit.cost}`,
    );
    return true;
  }

  tryAddFlaw(
    character: Character,
    flaw: Flaw,
    currentPoints: { value: number },
  ): boolean {
    if (character.flaws.some((f) => f.id === flaw.id)) return false;

    character.flaws.push(flaw);
    currentPoints.value += flaw.cost;
    character.debugLog.push(
      `[Flaw] Added '${flaw.name}' - Gained: ${flaw.cost}`,
    );
    return true;
  }

  private tryIncreaseDict(
    dict: Record<string, number>,
    key: string,
    maxLimit: number,
  ): boolean {
    if (dict[key] === undefined) dict[key] = 0;
    if (dict[key] >= maxLimit) return false;
    dict[key]++;
    return true;
  }
}

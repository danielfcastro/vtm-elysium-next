import { IXpStrategy } from "../xpStrategies/IXpStrategy";
import { TraitType } from "../enums/TraitType";
import { Character } from "../models/Character";
import { Rng } from "../utils/rng";

export class XpSpendingService {
  constructor(
    private readonly strategies: IXpStrategy[],
    private readonly rng: Rng,
  ) {}

  distributeXp(character: Character, affinityProfile: Record<string, number>) {
    for (const s of this.strategies) s.resetAvailability();

    let consecutiveFailures = 0;

    while (character.spentExperience < character.totalExperience) {
      const remaining = character.totalExperience - character.spentExperience;
      const localSpent = { value: character.spentExperience };

      const weights = this.getTierWeights(character.spentExperience);
      this.applyTagModifiers(weights, affinityProfile);
      this.applyHardLogicModifiers(weights, character);

      const valid = this.strategies.filter(
        (s) =>
          weights[s.type] !== undefined &&
          s.isAvailable &&
          s.minRequiredXp <= remaining,
      );

      if (!valid.length) break;

      const selected = this.selectStrategy(valid, weights);
      const success = selected.trySpendXp(
        character,
        affinityProfile,
        remaining,
        localSpent,
      );

      character.spentExperience = localSpent.value;

      if (success) consecutiveFailures = 0;
      else {
        consecutiveFailures++;
        if (consecutiveFailures >= 10) {
          character.debugLog.push(
            "[XP] Stopped early due to consecutive failures.",
          );
          break;
        }
      }
    }
  }

  private getTierWeights(spentXp: number): Record<TraitType, number> {
    if (spentXp < 75) {
      return {
        [TraitType.Discipline]: 16,
        [TraitType.Attribute]: 10,
        [TraitType.Ability]: 20,
        [TraitType.Willpower]: 10,
        [TraitType.Virtue]: 3,
        [TraitType.Humanity]: 8,
      } as any;
    } else if (spentXp < 250) {
      return {
        [TraitType.Discipline]: 14,
        [TraitType.Attribute]: 8,
        [TraitType.Ability]: 20,
        [TraitType.Willpower]: 4,
        [TraitType.Virtue]: 3,
        [TraitType.Humanity]: 2,
      } as any;
    }
    return {
      [TraitType.Discipline]: 10,
      [TraitType.Attribute]: 4,
      [TraitType.Ability]: 10,
      [TraitType.Willpower]: 2,
      [TraitType.Virtue]: 1,
      [TraitType.Humanity]: 1,
    } as any;
  }

  private applyTagModifiers(
    weights: Record<TraitType, number>,
    affinityProfile: Record<string, number>,
  ) {
    for (const type of Object.keys(weights) as TraitType[]) {
      const tag = `xp${String(type).toLowerCase()}`;
      const modifier = affinityProfile[tag];
      if (modifier === undefined) continue;
      const clamped = Math.max(-50, Math.min(50, modifier));
      const percent = clamped / 100.0;
      weights[type] *= 1.0 + percent;
      if (weights[type] < 1) weights[type] = 1;
    }
  }

  private applyHardLogicModifiers(
    weights: Record<TraitType, number>,
    character: Character,
  ) {
    if (weights[TraitType.Willpower] === undefined) return;
    const current = character.willpower;
    let penalty = 0;
    if (current === 5) penalty = -2;
    else if (current === 6) penalty = -4;
    else if (current === 7) penalty = -6;
    else if (current >= 8) penalty = -8;

    if (penalty !== 0) {
      weights[TraitType.Willpower] += penalty;
      if (weights[TraitType.Willpower] < 1) weights[TraitType.Willpower] = 1;
    }
  }

  private selectStrategy(
    candidates: IXpStrategy[],
    weights: Record<TraitType, number>,
  ): IXpStrategy {
    const total = candidates.reduce((s, st) => s + (weights[st.type] ?? 0), 0);
    let roll = this.rng.next() * total;
    for (const st of candidates) {
      const w = weights[st.type] ?? 0;
      if (roll < w) return st;
      roll -= w;
    }
    return candidates[candidates.length - 1];
  }
}

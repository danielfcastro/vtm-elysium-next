import { GameDataProvider } from "../data/GameDataProvider";
import { TraitManagerService } from "./TraitManagerService";
import { AffinityProcessorService } from "../affinity/AffinityProcessorService";
import { ITraitCostStrategy } from "../strategies/ITraitCostStrategy";
import { FreebiePointCostStrategy } from "../strategies/freebies/FreebiePointCostStrategy";
import { TraitType } from "../enums/TraitType";
import { Character } from "../models/Character";
import { Rng } from "../utils/rng";

export class FreebieSpendingService {
  private readonly costStrategy: ITraitCostStrategy =
    new FreebiePointCostStrategy();
  private readonly baseWeights: Record<TraitType, number> = {
    [TraitType.Background]: 15,
    [TraitType.Ability]: 15,
    [TraitType.Willpower]: 18,
    [TraitType.Virtue]: 12,
    [TraitType.Humanity]: 12,
    [TraitType.Attribute]: 9,
    [TraitType.Merit]: 9,
    [TraitType.Discipline]: 6,
    [TraitType.Flaw]: 0, // not purchased by category
  };

  constructor(
    private readonly data: GameDataProvider,
    private readonly traitManager: TraitManagerService,
    private readonly affinity: AffinityProcessorService,
    private readonly rng: Rng,
  ) {}

  distributeFreebiePoints(
    character: Character,
    affinityProfile: Record<string, number>,
  ) {
    const points = { value: 15 };
    this.applyMandatoryFlavor(character, affinityProfile, points);

    const purchaseCounts: Record<string, number> = {};
    for (const k of Object.values(TraitType)) purchaseCounts[k] = 0;

    while (points.value > 0) {
      const weighted = this.calculateCategoryWeights(
        points.value,
        purchaseCounts,
        affinityProfile,
      );
      const keys = Object.keys(weighted) as TraitType[];
      if (!keys.length) break;

      const selected = this.selectWeightedCategory(weighted);
      const ok = this.executePurchase(
        character,
        selected,
        affinityProfile,
        points,
      );
      if (ok) purchaseCounts[selected] = (purchaseCounts[selected] ?? 0) + 1;
      else {
        // if failed, prevent tight loops by reducing weight next time via count bump
        purchaseCounts[selected] = (purchaseCounts[selected] ?? 0) + 1;
      }
    }
  }

  private calculateCategoryWeights(
    currentPoints: number,
    purchaseCounts: Record<string, number>,
    affinityProfile: Record<string, number>,
  ) {
    const weighted: Partial<Record<TraitType, number>> = {};

    for (const [typeStr, base] of Object.entries(this.baseWeights)) {
      const type = typeStr as TraitType;
      let weight = base;

      let estimatedCost = this.costStrategy.getCost(type);
      if (type === TraitType.Merit) estimatedCost = 1;
      if (currentPoints < estimatedCost) continue;

      const count = purchaseCounts[type] ?? 0;
      let penalty = 0;
      if (count >= 1) penalty += 3;
      if (count >= 2) penalty += 4;
      if (count >= 3) penalty += 5;
      weight -= penalty;

      const affinityTag = `spending:${String(type).toLowerCase()}`;
      if (affinityProfile[affinityTag] !== undefined) {
        weight *= 1 + affinityProfile[affinityTag] / 100.0;
      }

      if (weight < 1) weight = 1;
      weighted[type] = weight;
    }

    return weighted as Record<TraitType, number>;
  }

  private applyMandatoryFlavor(
    character: Character,
    affinityProfile: Record<string, number>,
    points: { value: number },
  ) {
    if (this.data.flaws?.length) {
      const flaw = this.affinity.getWeightedRandom(
        this.data.flaws as any,
        affinityProfile,
      ) as any;
      if (flaw && this.traitManager.tryAddFlaw(character, flaw, points)) {
        this.affinity.processAffinities(affinityProfile, flaw.affinities);
      }
    }

    if (this.data.merits?.length) {
      const budget = points.value;
      const affordable = this.data.merits.filter((m) => m.cost <= budget);
      if (affordable.length) {
        const merit = this.affinity.getWeightedRandom(
          affordable as any,
          affinityProfile,
        ) as any;
        if (merit && this.traitManager.tryAddMerit(character, merit, points)) {
          this.affinity.processAffinities(affinityProfile, merit.affinities);
        }
      }
    }
  }

  private selectWeightedCategory(
    weighted: Record<TraitType, number>,
  ): TraitType {
    const entries = Object.entries(weighted) as Array<[TraitType, number]>;
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let r = this.rng.next() * total;
    for (const [t, w] of entries) {
      if (r < w) return t;
      r -= w;
    }
    return entries[entries.length - 1][0];
  }

  private executePurchase(
    character: Character,
    type: TraitType,
    affinityProfile: Record<string, number>,
    points: { value: number },
  ): boolean {
    switch (type) {
      case TraitType.Attribute:
        return this.buyAttribute(character, affinityProfile, points);
      case TraitType.Ability:
        return this.buyAbility(character, affinityProfile, points);
      case TraitType.Discipline:
        return this.buyDiscipline(character, affinityProfile, points);
      case TraitType.Background:
        return this.buyBackground(character, affinityProfile, points);
      case TraitType.Virtue:
        return this.buyVirtue(character, affinityProfile, points);
      case TraitType.Willpower:
        return this.traitManager.tryIncreaseTrait(
          character,
          TraitType.Willpower,
          "willpower",
          this.costStrategy,
          points,
          "freebie",
        );
      case TraitType.Humanity:
        return this.traitManager.tryIncreaseTrait(
          character,
          TraitType.Humanity,
          "humanity",
          this.costStrategy,
          points,
          "freebie",
        );
      case TraitType.Merit:
        return this.buyMerit(character, affinityProfile, points);
      default:
        return false;
    }
  }

  private buyAttribute(
    character: Character,
    affinityProfile: Record<string, number>,
    points: { value: number },
  ) {
    const all = this.data.attributeCategories.flatMap((c) => c.attributes);
    const candidates = all.filter((a) => {
      if (character.clan?.id === "nosferatu" && a.id === "appearance")
        return false;
      return (character.attributes[a.id] ?? 0) < 5;
    });
    if (!candidates.length) return false;
    const selected = this.affinity.getWeightedRandom(
      candidates as any,
      affinityProfile,
    ) as any;
    if (!selected) return false;
    if (
      this.traitManager.tryIncreaseTrait(
        character,
        TraitType.Attribute,
        selected.id,
        this.costStrategy,
        points,
        "freebie",
      )
    ) {
      this.affinity.processAffinities(affinityProfile, selected.affinities);
      return true;
    }
    return false;
  }

  private buyAbility(
    character: Character,
    affinityProfile: Record<string, number>,
    points: { value: number },
  ) {
    const candidates = this.data.abilities.filter(
      (a) => (character.abilities[a.id] ?? 0) < 5,
    );
    if (!candidates.length) return false;
    const selected = this.affinity.getWeightedRandom(
      candidates as any,
      affinityProfile,
    ) as any;
    if (!selected) return false;
    if (
      this.traitManager.tryIncreaseTrait(
        character,
        TraitType.Ability,
        selected.id,
        this.costStrategy,
        points,
        "freebie",
      )
    ) {
      this.affinity.processAffinities(affinityProfile, selected.affinities);
      return true;
    }
    return false;
  }

  private buyDiscipline(
    character: Character,
    affinityProfile: Record<string, number>,
    points: { value: number },
  ) {
    const knownIds = Object.keys(character.disciplines);
    const candidates = this.data.disciplines.filter(
      (d) => knownIds.includes(d.id) && (character.disciplines[d.id] ?? 0) < 5,
    );
    if (!candidates.length) return false;
    const selected = this.affinity.getWeightedRandom(
      candidates as any,
      affinityProfile,
    ) as any;
    if (!selected) return false;
    if (
      this.traitManager.tryIncreaseTrait(
        character,
        TraitType.Discipline,
        selected.id,
        this.costStrategy,
        points,
        "freebie",
      )
    ) {
      this.affinity.processAffinities(affinityProfile, selected.affinities);
      return true;
    }
    return false;
  }

  private buyBackground(
    character: Character,
    affinityProfile: Record<string, number>,
    points: { value: number },
  ) {
    const candidates = this.data.backgrounds.filter(
      (b) => (character.backgrounds[b.id] ?? 0) < 5,
    );
    if (!candidates.length) return false;
    const selected = this.affinity.getWeightedRandom(
      candidates as any,
      affinityProfile,
    ) as any;
    if (!selected) return false;
    if (
      this.traitManager.tryIncreaseTrait(
        character,
        TraitType.Background,
        selected.id,
        this.costStrategy,
        points,
        "freebie",
      )
    ) {
      this.affinity.processAffinities(affinityProfile, selected.affinities);
      return true;
    }
    return false;
  }

  private buyVirtue(
    character: Character,
    affinityProfile: Record<string, number>,
    points: { value: number },
  ) {
    const candidates = this.data.virtues.filter(
      (v) => (character.virtues[v.id] ?? 0) < 5,
    );
    if (!candidates.length) return false;
    const selected = this.affinity.getWeightedRandom(
      candidates as any,
      affinityProfile,
    ) as any;
    if (!selected) return false;
    if (
      this.traitManager.tryIncreaseTrait(
        character,
        TraitType.Virtue,
        selected.id,
        this.costStrategy,
        points,
        "freebie",
      )
    ) {
      this.affinity.processAffinities(affinityProfile, selected.affinities);
      return true;
    }
    return false;
  }

  private buyMerit(
    character: Character,
    affinityProfile: Record<string, number>,
    points: { value: number },
  ) {
    const budget = points.value;
    const candidates = this.data.merits.filter(
      (m) => m.cost <= budget && !character.merits.some((x) => x.id === m.id),
    );
    if (!candidates.length) return false;
    const selected = this.affinity.getWeightedRandom(
      candidates as any,
      affinityProfile,
    ) as any;
    if (!selected) return false;
    if (this.traitManager.tryAddMerit(character, selected, points)) {
      this.affinity.processAffinities(affinityProfile, selected.affinities);
      return true;
    }
    return false;
  }
}

import { GameDataProvider } from "../data/GameDataProvider";
import {
  AffinityProcessorService,
  TaggableItem,
} from "../affinity/AffinityProcessorService";
import { Character } from "../models/Character";
import { Rng } from "../utils/rng";

export class AbilityDistributionService {
  constructor(
    private readonly data: GameDataProvider,
    private readonly affinity: AffinityProcessorService,
    private readonly rng: Rng,
  ) {}

  distributeAbilities(
    character: Character,
    affinityProfile: Record<string, number>,
  ) {
    const byCategory: Record<string, any[]> = {};
    for (const a of this.data.abilities) {
      (byCategory[a.category] ??= []).push(a);
    }

    const categories = ["Talents", "Skills", "Knowledges"];
    let points = [13, 9, 5];
    points = points.sort(() => this.rng.next() - 0.5);

    const categoryScores: Record<string, number> = {};
    for (const pv of points) {
      const weighted: TaggableItem[] = categories
        .filter((c) => categoryScores[c] === undefined)
        .map((c) => ({ id: c, name: c, tags: [c.toLowerCase()] }));
      const chosen = this.affinity.getWeightedRandom(
        weighted as any,
        affinityProfile,
      ) as any as TaggableItem | null;
      if (!chosen) continue;
      categoryScores[chosen.id] = pv;
    }

    for (const [categoryName, pts] of Object.entries(categoryScores)) {
      const available = byCategory[categoryName] ?? [];
      for (let i = 0; i < pts; i++) {
        const chosenAbility = this.affinity.getWeightedRandom(
          available as any,
          affinityProfile,
        ) as any;
        if (!chosenAbility) continue;
        const id = chosenAbility.id;
        character.abilities[id] = character.abilities[id] ?? 0;

        if (character.abilities[id] < 3) {
          character.abilities[id]++;
          this.affinity.processAffinities(
            affinityProfile,
            chosenAbility.affinities,
          );
        } else {
          i--;
        }
      }
    }
  }
}

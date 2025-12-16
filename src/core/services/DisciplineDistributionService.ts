import { GameDataProvider } from "../data/GameDataProvider";
import { AffinityProcessorService } from "../affinity/AffinityProcessorService";
import { Character } from "../models/Character";

export class DisciplineDistributionService {
  private readonly pointsToDistribute = 3;

  constructor(
    private readonly data: GameDataProvider,
    private readonly affinity: AffinityProcessorService,
  ) {}

  distributeDisciplines(
    character: Character,
    affinityProfile: Record<string, number>,
  ) {
    const clanDisciplineIds = character.clan?.disciplines ?? [];
    if (!clanDisciplineIds.length) return;

    const available = this.data.disciplines.filter((d) =>
      clanDisciplineIds.includes(d.id),
    );
    if (!available.length) return;

    // Cap dinâmico por geração
    const maxTrait = character.maxTraitRating ?? 5;

    for (let i = 0; i < this.pointsToDistribute; i++) {
      const eligible = available.filter(
        (d) => (character.disciplines[d.id] ?? 0) < maxTrait,
      );
      if (!eligible.length) break;

      const chosen = this.affinity.getWeightedRandom(
        eligible as any,
        affinityProfile,
      ) as any;
      if (!chosen) continue;

      character.disciplines[chosen.id] =
        (character.disciplines[chosen.id] ?? 0) + 1;
      this.affinity.processAffinities(affinityProfile, chosen.affinities);
    }
  }
}

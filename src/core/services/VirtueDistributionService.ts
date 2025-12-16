import { GameDataProvider } from "../data/GameDataProvider";
import { AffinityProcessorService } from "../affinity/AffinityProcessorService";
import { Character } from "../models/Character";

export class VirtueDistributionService {
  private readonly pointsToDistribute = 7;
  private readonly startingValue = 1;
  private readonly maxValue = 5;

  constructor(
    private readonly data: GameDataProvider,
    private readonly affinity: AffinityProcessorService,
  ) {}

  distributeVirtues(
    character: Character,
    affinityProfile: Record<string, number>,
  ) {
    if (!this.data.virtues?.length) return;

    const available = [...this.data.virtues];
    for (const v of available) character.virtues[v.id] = this.startingValue;

    for (let i = 0; i < this.pointsToDistribute; i++) {
      const eligible = available.filter(
        (v) => (character.virtues[v.id] ?? 0) < this.maxValue,
      );
      if (!eligible.length) break;
      const chosen = this.affinity.getWeightedRandom(
        eligible as any,
        affinityProfile,
      ) as any;
      if (!chosen) continue;
      character.virtues[chosen.id] = (character.virtues[chosen.id] ?? 0) + 1;
      this.affinity.processAffinities(affinityProfile, chosen.affinities);
    }
  }
}

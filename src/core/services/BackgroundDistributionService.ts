import { GameDataProvider } from "../data/GameDataProvider";
import { AffinityProcessorService } from "../affinity/AffinityProcessorService";
import { Character } from "../models/Character";

export class BackgroundDistributionService {
  private readonly pointsToDistribute = 5;
  constructor(
    private readonly data: GameDataProvider,
    private readonly affinity: AffinityProcessorService,
  ) {}

  distributeBackgrounds(
    character: Character,
    affinityProfile: Record<string, number>,
  ) {
    if (!this.data.backgrounds?.length) return;
    const available = [...this.data.backgrounds];

    for (let i = 0; i < this.pointsToDistribute; i++) {
      const chosen = this.affinity.getWeightedRandom(
        available as any,
        affinityProfile,
      ) as any;
      if (!chosen) continue;
      const id = chosen.id;
      character.backgrounds[id] = character.backgrounds[id] ?? 0;
      if (character.backgrounds[id] < 5) {
        character.backgrounds[id]++;
        this.affinity.processAffinities(affinityProfile, chosen.affinities);
      } else {
        i--;
      }
    }
  }
}

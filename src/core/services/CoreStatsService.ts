import { GameDataProvider } from "../data/GameDataProvider";
import { Character } from "../models/Character";
import { Rng } from "../utils/rng";

export class CoreStatsService {
  constructor(
    private readonly data: GameDataProvider,
    private readonly rng: Rng,
  ) {}

  calculateCoreStats(character: Character) {
    let chosen = null as any;

    if (character.generation != null) {
      chosen = this.data.generations.find(
        (g) => g.generation === character.generation,
      );
    }

    if (character.generation != null && character.generation <= 2) {
      throw new Error("Generation 1-2 is not allowed.");
    }
    if (!chosen) chosen = this.selectWeightedGeneration();

    if (chosen) {
      character.generation = chosen.generation;
      character.maxTraitRating = chosen.maxTraitRating;
      character.maximumBloodPool = chosen.maxBloodPool;
      character.bloodPointsPerTurn = chosen.bloodPerTurn;
    } else {
      character.generation = 13;
      character.maxTraitRating = 5;
      character.maximumBloodPool = 10;
      character.bloodPointsPerTurn = 1;
    }
    const conscience = character.virtues["conscience"] ?? 1;
    const selfControl = character.virtues["self_control"] ?? 1;
    const courage = character.virtues["courage"] ?? 1;

    character.humanity = conscience + selfControl;
    character.willpower = courage;

    console.log(
      `Generation: ${character.generation} - 
                  Max Trait Rating: ${character.maxTraitRating} - 
                  maximumBloodPool: ${character.maximumBloodPool} - 
                  bloodPointsPerTurn: ${character.bloodPointsPerTurn}`,
    );
  }

  private selectWeightedGeneration() {
    if (!this.data.generations?.length) return null;
    const total = this.data.generations.reduce(
      (s, g) => s + (g.weight ?? 0),
      0,
    );
    let n = this.rng.int(1, total + 1);
    const ordered = [...this.data.generations].sort(
      (a, b) => a.generation - b.generation,
    );
    for (const g of ordered) {
      if (n <= g.weight) return g;
      n -= g.weight;
    }
    return ordered[ordered.length - 1] ?? null;
  }
}

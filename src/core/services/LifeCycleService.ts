import { GameDataProvider } from "../data/GameDataProvider";
import { Character } from "../models/Character";
import { AffinityProcessorService } from "../affinity/AffinityProcessorService";
import { Rng } from "../utils/rng";

export class LifeCycleService {
  constructor(
    private readonly data: GameDataProvider,
    private readonly affinity: AffinityProcessorService,
    private readonly rng: Rng,
  ) {}

  determineLifeCycle(character: Character) {
    if (character.age != null) {
      character.ageCategory = this.getCategoryFromAge(character.age);
    } else if (character.ageCategory) {
      character.age = this.determineAge(character.ageCategory);
    } else {
      const generation = character.generation ?? 13;
      character.ageCategory =
        this.determineRandomCategoryByGeneration(generation);
      character.age = this.determineAge(character.ageCategory);
    }

    character.totalExperience = this.determineXp(
      character.ageCategory ?? "Neonate",
      character.age ?? 0,
    );
    character.spentExperience = 0;
  }

  private getCategoryFromAge(age: number) {
    if (age < 100) return "Neonate";
    if (age < 200) return "Ancilla";
    if (age < 1000) return "Elder";
    return "Methuselah";
  }

  private determineRandomCategoryByGeneration(generation: number) {
    const roll = this.rng.int(1, 101);
    if (generation >= 12) {
      if (roll <= 80) return "Neonate";
      if (roll <= 99) return "Ancilla";
      return "Elder";
    } else if (generation >= 10) {
      if (roll <= 40) return "Neonate";
      if (roll <= 90) return "Ancilla";
      return "Elder";
    } else if (generation >= 8) {
      if (roll <= 1) return "Neonate";
      if (roll <= 15) return "Ancilla";
      return "Elder";
    } else if (generation >= 6) {
      if (roll <= 5) return "Ancilla";
      return "Elder";
    } else if (generation >= 4) {
      return "Methuselah";
    }
    return "Elder";
  }

  private determineAge(category: string) {
    switch (category) {
      case "Neonate":
        return this.rng.int(0, 100);
      case "Ancilla":
        return this.rng.int(100, 200);
      case "Elder":
        return this.rng.int(200, 1000);
      case "Methuselah":
        return this.rng.int(1000, 3001);
      default:
        return 0;
    }
  }

  private determineXp(category: string, age: number) {
    let minAge = 0,
      maxAge = 100,
      minXp = 0,
      maxXp = 75;
    if (category === "Neonate" || age <= 100) {
      minAge = 0;
      maxAge = 100;
      minXp = 0;
      maxXp = 75;
    } else if (category === "Ancilla" || age <= 200) {
      minAge = 100;
      maxAge = 200;
      minXp = 75;
      maxXp = 250;
    } else if (category === "Elder" || age <= 1000) {
      minAge = 200;
      maxAge = 1000;
      minXp = 250;
      maxXp = 1000;
    } else {
      minAge = 1000;
      maxAge = 3000;
      minXp = 1000;
      maxXp = 2250;
    }

    const effectiveAge = Math.min(age, maxAge);
    let ratio = (effectiveAge - minAge) / (maxAge - minAge);
    if (maxAge === minAge) ratio = 0;

    const baseXp = minXp + ratio * (maxXp - minXp);
    const variancePercent = this.rng.next() * 0.4 - 0.2;
    const finalXp = Math.floor(baseXp * (1.0 + variancePercent));
    return Math.max(0, finalXp);
  }

  evolveBackgrounds(
    character: Character,
    affinityProfile: Record<string, number>,
  ) {
    const currentAge = character.age ?? 0;
    if (currentAge <= 50) return;

    let bonusPoints = 0;

    if (currentAge > 50) {
      const effectiveAge = Math.min(currentAge, 100);
      const checks = Math.floor((effectiveAge - 50) / 10);
      for (let i = 0; i < checks; i++) if (this.rng.next() < 0.4) bonusPoints++;
    }

    if (currentAge > 100) {
      const effectiveAge = Math.min(currentAge, 400);
      const checks = Math.floor((effectiveAge - 100) / 10);
      for (let i = 0; i < checks; i++) if (this.rng.next() < 0.5) bonusPoints++;
    }

    if (currentAge > 400) {
      const checks = Math.floor((currentAge - 400) / 50);
      for (let i = 0; i < checks; i++) if (this.rng.next() < 0.5) bonusPoints++;
    }

    if (currentAge > 1000) {
      const checks = Math.floor((currentAge - 1000) / 100);
      for (let i = 0; i < checks; i++) if (this.rng.next() < 0.5) bonusPoints++;
    }

    if (bonusPoints === 0) return;

    while (bonusPoints > 0) {
      const candidates = this.data.backgrounds.filter(
        (bg) => (character.backgrounds[bg.id] ?? 0) < 5,
      );
      if (!candidates.length) break;

      const selected = this.affinity.getWeightedRandom(
        candidates as any,
        affinityProfile,
      ) as any;
      if (!selected) break;

      const id = selected.id;
      character.backgrounds[id] = (character.backgrounds[id] ?? 0) + 1;
      bonusPoints--;
      this.affinity.processAffinities(affinityProfile, selected.affinities);
      character.debugLog.push(
        `[Evolution] Gained Background point: ${selected.name} -> ${character.backgrounds[id]} (Age: ${currentAge})`,
      );
    }
  }

  applyHumanityDegeneration(character: Character) {
    const currentAge = character.age ?? 0;
    if (currentAge <= 50) return;

    const decayCycles = Math.floor((currentAge - 50) / 50);

    for (let i = 0; i < decayCycles; i++) {
      if (character.humanity <= 3) break;
      let chanceToLose = character.humanity / 10.0;

      if (character.ageCategory === "Elder") chanceToLose += 0.1;
      if (character.ageCategory === "Methuselah") chanceToLose += 0.1;
      if (character.ageCategory === "Ancilla") chanceToLose += 0.05;

      chanceToLose = Math.min(chanceToLose, 0.95);
      if (this.rng.next() < chanceToLose) {
        character.humanity--;
        character.debugLog.push(
          `[Decay] Humanity eroded to ${character.humanity} (Cycle ${i + 1}/${decayCycles})`,
        );
      }
    }
  }
}

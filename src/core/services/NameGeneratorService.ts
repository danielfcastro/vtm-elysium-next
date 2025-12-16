import { GameDataProvider } from "../data/GameDataProvider";
import { Character } from "../models/Character";
import { NamePack } from "../models/NamePack";
import { AffinityProcessorService } from "../affinity/AffinityProcessorService";
import { Rng } from "../utils/rng";

export class NameGeneratorService {
  constructor(
    private readonly data: GameDataProvider,
    private readonly affinity: AffinityProcessorService,
    private readonly rng: Rng,
  ) {}

  generateName(
    character: Character,
    affinityProfile: Record<string, number>,
  ): string {
    if (character.name) return character.name;
    if (!this.data.namePacks.length) return "Unknown Kindred";

    const nativeEra = this.determineEraByAge(character.age ?? 0);
    const targetEra = this.selectTargetEra(nativeEra);

    const first = this.selectFirstNamePack(targetEra, affinityProfile);
    if (!first) return "Nameless";

    const last = this.selectLastNamePack(first, targetEra);

    const firstName = this.getRandomValue(first);
    const lastName = last ? this.getRandomValue(last) : "";
    return `${firstName} ${lastName}`.trim();
  }

  private determineEraByAge(age: number): string {
    if (age >= 1525) return "Ancient";
    if (age >= 525) return "Medieval";
    if (age >= 125) return "EarlyModern";
    return "Modern";
  }

  private selectTargetEra(nativeEra: string): string {
    const all = ["Ancient", "Medieval", "EarlyModern", "Modern"];
    const roll = this.rng.int(1, 101);
    if (roll <= 97) return nativeEra;
    const others = all.filter((e) => e !== nativeEra);
    if (others.length) return others[this.rng.int(0, others.length)];
    return nativeEra;
  }

  private selectFirstNamePack(
    era: string,
    affinityProfile: Record<string, number>,
  ): NamePack | null {
    const candidates = this.data.namePacks.filter(
      (p) => p.Era === era && p.Type === "FirstName",
    );
    if (!candidates.length) return null;

    const weights = new Map<NamePack, number>();
    let total = 0;

    for (const pack of candidates) {
      let score = 100;
      for (const tag of pack.Tags ?? []) {
        const key = (tag ?? "").trim().toLowerCase();
        if (affinityProfile[key] !== undefined) score += affinityProfile[key];
      }
      if (score < 1) score = 1;
      weights.set(pack, score);
      total += score;
    }

    let choice = this.rng.int(0, total);
    for (const [pack, w] of weights.entries()) {
      if (choice < w) return pack;
      choice -= w;
    }
    return candidates[candidates.length - 1] ?? null;
  }

  private selectLastNamePack(first: NamePack, era: string): NamePack | null {
    const roll = this.rng.int(1, 101);

    if (roll <= 97 && first.LinkedLastNameId) {
      const linked = this.data.namePacks.find(
        (p) => p.Id === first.LinkedLastNameId,
      );
      if (linked) return linked;
    }

    if (roll <= 99) {
      const eraPacks = this.data.namePacks.filter(
        (p) => p.Type === "LastName" && p.Era === era,
      );
      if (eraPacks.length) return eraPacks[this.rng.int(0, eraPacks.length)];
    }

    const all = this.data.namePacks.filter((p) => p.Type === "LastName");
    if (all.length) return all[this.rng.int(0, all.length)];
    return null;
  }

  private getRandomValue(pack: NamePack): string {
    if (!pack?.Values?.length) return "";
    return pack.Values[this.rng.int(0, pack.Values.length)];
  }
}

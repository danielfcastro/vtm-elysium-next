import { Affinity } from "../models/Affinity";
import { IHasTags } from "../models/IHasTags";
import { Persona } from "../models/Persona";
import { Rng } from "../utils/rng";

export class AffinityProcessorService {
  private readonly baseScore: number;
  private readonly minClamp: number;
  private readonly maxClamp: number;
  private readonly rng: Rng;

  constructor(
    rng: Rng,
    baseScore = 25,
    minAffinityClamp = -1000,
    maxAffinityClamp = 100000,
  ) {
    this.rng = rng;
    this.baseScore = baseScore;
    this.minClamp = minAffinityClamp;
    this.maxClamp = maxAffinityClamp;
  }

  buildAffinityProfile(persona: Persona): Record<string, number> {
    const profile: Record<string, number> = {};
    this.processAffinities(profile, persona.concept?.affinities);
    this.processAffinities(profile, persona.clan?.affinities);
    this.processAffinities(profile, persona.nature?.affinities);
    this.processAffinities(profile, persona.demeanor?.affinities);
    return profile;
  }

  processAffinities(
    profile: Record<string, number>,
    affinities?: Affinity[] | null,
  ) {
    if (!affinities) return;
    for (const a of affinities) {
      if (!a?.tag) continue;
      const key = a.tag.trim().toLowerCase();
      profile[key] = (profile[key] ?? 0) + a.value;
      profile[key] = Math.max(
        this.minClamp,
        Math.min(this.maxClamp, profile[key]),
      );
    }
  }

  getWeightedRandom<T extends IHasTags>(
    items: T[],
    affinityProfile?: Record<string, number> | null,
  ): T | null {
    if (!items?.length) return null;
    const prof: Record<string, number> = {};
    if (affinityProfile) {
      for (const [k, v] of Object.entries(affinityProfile)) {
        const key = (k ?? "").trim().toLowerCase();
        prof[key] = Math.max(this.minClamp, Math.min(this.maxClamp, v ?? 0));
      }
    }

    let total = 0;
    const weighted: Array<{ item: T; score: number }> = [];
    for (const item of items) {
      let score = this.baseScore;
      for (const tag of item.tags ?? []) {
        const tk = (tag ?? "").trim().toLowerCase();
        if (tk && prof[tk] !== undefined) score += prof[tk];
      }
      score = Math.max(this.baseScore, score);
      weighted.push({ item, score });
      total += score;
    }
    if (total <= 0) return items[0] ?? null;

    let roll = this.rng.int(0, total);
    for (const w of weighted) {
      if (roll < w.score) return w.item;
      roll -= w.score;
    }
    return weighted[weighted.length - 1]?.item ?? null;
  }
}

export interface TaggableItem extends IHasTags {
  id: string;
  name?: string;
}

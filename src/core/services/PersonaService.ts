import { GameDataProvider } from "../data/GameDataProvider";
import { Persona } from "../models/Persona";
import { Nature } from "../models/Nature";
import { AffinityProcessorService } from "../affinity/AffinityProcessorService";

export class PersonaService {
  constructor(
    private readonly data: GameDataProvider,
    private readonly affinity: AffinityProcessorService,
  ) {}

  completePersona(input: Persona): Persona {
    const finalPersona: Persona = {
      concept: input?.concept ?? null,
      clan: input?.clan ?? null,
      nature: input?.nature ?? null,
      demeanor: input?.demeanor ?? null,
      name: input?.name ?? null,
      generation: input?.generation ?? null,
      age: input?.age ?? null,
      ageCategory: input?.ageCategory ?? null,
    };

    const mergeInto = (
      target: Record<string, number>,
      source?: Record<string, number> | null,
    ) => {
      if (!source) return;
      for (const [k, v] of Object.entries(source)) {
        const key = (k ?? "").trim().toLowerCase();
        target[key] = (target[key] ?? 0) + (v ?? 0);
      }
    };

    const running: Record<string, number> = {};

    const preAdd = (p: Persona) =>
      mergeInto(running, this.affinity.buildAffinityProfile(p));

    if (finalPersona.concept) preAdd({ concept: finalPersona.concept });
    if (finalPersona.clan) preAdd({ clan: finalPersona.clan });
    if (finalPersona.nature) preAdd({ nature: finalPersona.nature });

    if (
      finalPersona.demeanor &&
      finalPersona.nature &&
      finalPersona.demeanor.id === finalPersona.nature.id
    ) {
      finalPersona.demeanor = null;
    }
    if (finalPersona.demeanor) preAdd({ demeanor: finalPersona.demeanor });

    if (!finalPersona.concept && this.data.concepts?.length) {
      const chosen = this.affinity.getWeightedRandom(
        this.data.concepts,
        running,
      );
      if (chosen) {
        finalPersona.concept = chosen;
        preAdd({ concept: chosen });
      }
    }

    if (!finalPersona.clan && this.data.clans?.length) {
      const chosen = this.affinity.getWeightedRandom(this.data.clans, running);
      if (chosen) {
        finalPersona.clan = chosen;
        preAdd({ clan: chosen });
      }
    }

    if (!finalPersona.nature && this.data.natures?.length) {
      const chosen = this.affinity.getWeightedRandom(
        this.data.natures,
        running,
      );
      if (chosen) {
        finalPersona.nature = chosen;
        preAdd({ nature: chosen });
      }
    }

    if (
      finalPersona.demeanor &&
      finalPersona.nature &&
      finalPersona.demeanor.id === finalPersona.nature.id
    ) {
      finalPersona.demeanor = null;
    }

    if (!finalPersona.demeanor) {
      const available: Nature[] = (this.data.natures ?? []).filter(
        (n) => !finalPersona.nature || n.id !== finalPersona.nature.id,
      );
      if (available.length) {
        const chosen = this.affinity.getWeightedRandom(available, running);
        if (chosen) {
          finalPersona.demeanor = chosen;
          preAdd({ demeanor: chosen });
        }
      }
    }

    return finalPersona;
  }
}

import { GameDataProvider } from "../data/GameDataProvider";
import { AffinityProcessorService } from "../affinity/AffinityProcessorService";
import { Clan } from "../models/Clan";

export class AttributeService {
  constructor(
    private readonly data: GameDataProvider,
    private readonly affinity: AffinityProcessorService,
  ) {}

  distributeAttributes(
    affinityProfile: Record<string, number>,
    clan: Clan | null = null,
  ): Record<string, number> {
    const attributes: Record<string, number> = {};
    const all = this.data.attributeCategories.flatMap((c) => c.attributes);

    for (const attr of all) {
      if (clan?.id === "nosferatu" && attr.id === "appearance")
        attributes[attr.id] = 0;
      else attributes[attr.id] = 1;
    }

    const pointsToDistribute = [7, 5, 3];
    const assigned: Record<string, number> = {};
    const remaining = [...this.data.attributeCategories];

    for (const pts of pointsToDistribute) {
      const chosen = this.affinity.getWeightedRandom(
        remaining,
        affinityProfile,
      );
      if (!chosen) continue;
      assigned[chosen.name] = pts;
      const idx = remaining.findIndex((x) => x.id === chosen.id);
      if (idx >= 0) remaining.splice(idx, 1);
    }

    for (const [categoryName, pts] of Object.entries(assigned)) {
      const category = this.data.attributeCategories.find(
        (c) => c.name === categoryName,
      );
      if (!category?.attributes?.length) continue;

      for (let i = 0; i < pts; i++) {
        const available = category.attributes.filter((a) => {
          if (clan?.id === "nosferatu" && a.id === "appearance") return false;
          return (attributes[a.id] ?? 0) < 5;
        });
        if (!available.length) break;
        const chosenAttr = this.affinity.getWeightedRandom(
          available,
          affinityProfile,
        );
        if (!chosenAttr) continue;
        attributes[chosenAttr.id] = (attributes[chosenAttr.id] ?? 0) + 1;
        this.affinity.processAffinities(affinityProfile, chosenAttr.affinities);
      }
    }

    return attributes;
  }
}

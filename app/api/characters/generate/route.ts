import { NextResponse } from "next/server";
import path from "node:path";

import { seedFromString, mulberry32 } from "@/core/utils/rng";
import { GameDataProvider } from "@/core/data/GameDataProvider";
import { AffinityProcessorService } from "@/core/affinity/AffinityProcessorService";
import { PersonaService } from "@/core/services/PersonaService";
import { AttributeService } from "@/core/services/AttributeService";
import { AbilityDistributionService } from "@/core/services/AbilityDistributionService";
import { BackgroundDistributionService } from "@/core/services/BackgroundDistributionService";
import { VirtueDistributionService } from "@/core/services/VirtueDistributionService";
import { DisciplineDistributionService } from "@/core/services/DisciplineDistributionService";
import { TraitManagerService } from "@/core/services/TraitManagerService";
import { FreebieSpendingService } from "@/core/services/FreebieSpendingService";
import { CoreStatsService } from "@/core/services/CoreStatsService";
import { LifeCycleService } from "@/core/services/LifeCycleService";
import { NameGeneratorService } from "@/core/services/NameGeneratorService";
import { CharacterGeneratorService } from "@/core/services/CharacterGeneratorService";
import { XpPointCostStrategy } from "@/core/strategies/XpPointCostStrategy";
import { XpSpendingService } from "@/core/services/XpSpendingService";

import { XpAbilityStrategy } from "@/core/xpStrategies/XpAbilityStrategy";
import { XpAttributeStrategy } from "@/core/xpStrategies/XpAttributeStrategy";
import { XpDisciplineStrategy } from "@/core/xpStrategies/XpDisciplineStrategy";
import { XpVirtueStrategy } from "@/core/xpStrategies/XpVirtueStrategy";
import { XpHumanityStrategy } from "@/core/xpStrategies/XpHumanityStrategy";
import { XpWillpowerStrategy } from "@/core/xpStrategies/XpWillpowerStrategy";

let cachedProvider: GameDataProvider | null = null;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const seedStr = String(body?.seed ?? Date.now());
  const seed = seedFromString(seedStr);
  const rng = mulberry32(seed);

  // data path: src/core/data/raw
  const dataPath = path.join(process.cwd(), "src", "core", "data", "raw");
  if (!cachedProvider) cachedProvider = new GameDataProvider(dataPath);

  const affinity = new AffinityProcessorService(rng);
  const personaService = new PersonaService(cachedProvider, affinity);
  const attributeService = new AttributeService(cachedProvider, affinity);
  const abilityService = new AbilityDistributionService(
    cachedProvider,
    affinity,
    rng,
  );
  const backgroundService = new BackgroundDistributionService(
    cachedProvider,
    affinity,
  );
  const virtueService = new VirtueDistributionService(cachedProvider, affinity);
  const disciplineService = new DisciplineDistributionService(
    cachedProvider,
    affinity,
  );
  const traitManager = new TraitManagerService();
  const freebieService = new FreebieSpendingService(
    cachedProvider,
    traitManager,
    affinity,
    rng,
  );
  const coreStats = new CoreStatsService(cachedProvider, rng);
  const lifeCycle = new LifeCycleService(cachedProvider, affinity, rng);
  const nameGen = new NameGeneratorService(cachedProvider, affinity, rng);

  const xpCost = new XpPointCostStrategy();
  const xpStrategies = [
    new XpDisciplineStrategy(cachedProvider, xpCost, affinity, rng),
    new XpAttributeStrategy(cachedProvider, xpCost, affinity),
    new XpAbilityStrategy(cachedProvider, xpCost, affinity),
    new XpWillpowerStrategy(xpCost),
    new XpVirtueStrategy(cachedProvider, xpCost, rng),
    new XpHumanityStrategy(xpCost),
  ];
  const xpService = new XpSpendingService(xpStrategies, rng);

  const generator = new CharacterGeneratorService(
    personaService,
    attributeService,
    abilityService,
    affinity,
    backgroundService,
    virtueService,
    disciplineService,
    coreStats,
    freebieService,
    lifeCycle,
    xpService,
    nameGen,
  );

  const character = generator.generateCharacter({
    concept: body?.concept ?? null,
    clan: body?.clan ?? null,
    nature: body?.nature ?? null,
    demeanor: body?.demeanor ?? null,
    name: body?.name ?? null,
    generation: body?.generation ?? null,
    age: body?.age ?? null,
    ageCategory: body?.ageCategory ?? null,
  });

  return NextResponse.json({ seed: seedStr, character });
}

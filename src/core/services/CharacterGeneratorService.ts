import { Persona } from "../models/Persona";
import { Character } from "../models/Character";
import { PersonaService } from "./PersonaService";
import { AttributeService } from "./AttributeService";
import { AbilityDistributionService } from "./AbilityDistributionService";
import { AffinityProcessorService } from "../affinity/AffinityProcessorService";
import { BackgroundDistributionService } from "./BackgroundDistributionService";
import { VirtueDistributionService } from "./VirtueDistributionService";
import { DisciplineDistributionService } from "./DisciplineDistributionService";
import { CoreStatsService } from "./CoreStatsService";
import { FreebieSpendingService } from "./FreebieSpendingService";
import { LifeCycleService } from "./LifeCycleService";
import { XpSpendingService } from "./XpSpendingService";
import { NameGeneratorService } from "./NameGeneratorService";

export class CharacterGeneratorService {
  constructor(
    private readonly personaService: PersonaService,
    private readonly attributeService: AttributeService,
    private readonly abilityDistributionService: AbilityDistributionService,
    private readonly affinity: AffinityProcessorService,
    private readonly backgroundDistributionService: BackgroundDistributionService,
    private readonly virtueDistributionService: VirtueDistributionService,
    private readonly disciplineDistributionService: DisciplineDistributionService,
    private readonly coreStatsService: CoreStatsService,
    private readonly freebieSpendingService: FreebieSpendingService,
    private readonly lifeCycleService: LifeCycleService,
    private readonly xpSpendingService: XpSpendingService,
    private readonly nameGeneratorService: NameGeneratorService,
  ) {}

  generateCharacter(inputPersona: Persona): Character {
    const finalPersona = this.personaService.completePersona(inputPersona);
    const affinityProfile = this.affinity.buildAffinityProfile(finalPersona);

    const character: Character = {
      concept: finalPersona.concept ?? null,
      clan: finalPersona.clan ?? null,
      nature: finalPersona.nature ?? null,
      demeanor: finalPersona.demeanor ?? null,
      name: finalPersona.name ?? "",
      generation: finalPersona.generation ?? null,
      age: finalPersona.age ?? null,
      ageCategory: finalPersona.ageCategory ?? null,

      totalExperience: 0,
      spentExperience: 0,

      attributes: {},
      abilities: {},
      backgrounds: {},
      virtues: {},
      disciplines: {},

      merits: [],
      flaws: [],
      debugLog: [],
      // Events describing how dots were purchased (Freebies/XP). Used by UI tooltips.
      spendEvents: [],

      maxTraitRating: 5,
      maximumBloodPool: 10,
      bloodPointsPerTurn: 1,
      humanity: 0,
      willpower: 0,
    };

    // 1) Base stats (fases iniciais)
    character.attributes = this.attributeService.distributeAttributes(
      affinityProfile,
      character.clan ?? null,
    );
    this.abilityDistributionService.distributeAbilities(
      character,
      affinityProfile,
    );
    this.backgroundDistributionService.distributeBackgrounds(
      character,
      affinityProfile,
    );

    // 2) Virtues antes de CoreStats (porque CoreStats deriva humanity/willpower delas)
    this.virtueDistributionService.distributeVirtues(
      character,
      affinityProfile,
    );

    // 3) Agora sim: define Generation + maxTraitRating + blood pool + humanity/willpower
    //    (maxTraitRating será usado como cap por Disciplines/Attributes/Abilities nos passos seguintes)
    this.coreStatsService.calculateCoreStats(character);

    // 4) Disciplines iniciais e Freebies respeitando maxTraitRating (após CoreStats)
    this.disciplineDistributionService.distributeDisciplines(
      character,
      affinityProfile,
    );
    this.freebieSpendingService.distributeFreebiePoints(
      character,
      affinityProfile,
    );

    // 5) Define idade e XP total (não depende do cap de geração)
    this.lifeCycleService.determineLifeCycle(character);

    // 6) Nome pode vir depois (não afeta mecânica)
    character.name = this.nameGeneratorService.generateName(
      character,
      affinityProfile,
    );

    // 7) XP spending respeitando maxTraitRating (TraitManager já usa character.maxTraitRating)
    this.xpSpendingService.distributeXp(character, affinityProfile);

    // 8) Evolução/degeneração final
    this.lifeCycleService.evolveBackgrounds(character, affinityProfile);
    this.lifeCycleService.applyHumanityDegeneration(character);

    return character;
  }
}

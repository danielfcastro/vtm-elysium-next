import { IStartingPointsStrategy } from "../IStartingPointsStrategy";
import { HumanStartingPointStrategy } from "./HumanStartingPointStrategy";
import { RevenantStartingPointStrategy } from "./RevenantStartingPointStrategy";
import { GhoulStartingPointStrategy } from "./GhoulStartingPointStrategy";
import { NeophiteStartingPointStrategy } from "./NeophiteStartingPointStrategy";
import { AncillaeStartingPointStrategy } from "./AncillaeStartingPointStrategy";
import { ElderStartingPointStrategy } from "./ElderStartingPointStrategy";
import { ElderElysiumStartingPointStrategy } from "./ElderElysiumStartingPointStrategy";
import { ElderBelladonaStartingPointStrategy } from "./ElderBelladonaStartingPointStrategy";
import { TraitType } from "../../enums/TraitType";
import { FreebieType } from "../../enums/FreebieType";
export type TemplateKey =
  | "neophyte"
  | "ancillae"
  | "elder_vtm"
  | "elder_elysium"
  | "elder_belladona"
  | "human"
  | "animal"
  | "revenant"
  | "ghoul";

export type CharacterCreationContext = {
  templateKey: TemplateKey;
  isDarkAges?: boolean;
  domitorId?: string;
  domitorGeneration?: number;
  isGhoul?: boolean;
  ghoulType?: "human" | "animal";
  hasFamily?: boolean; // true if human ghoul has selected a family (revenant)
};

export interface TemplateRules {
  attributes: [number, number, number];
  abilities: [number, number, number];
  disciplines: number;
  backgrounds: number;
  virtues: number;
  baseFreebies: number;
  usesAgeFreebies: boolean;
}

export class StartingPointStrategyResolver {
  private static strategies: Omit<
    Record<TemplateKey, IStartingPointsStrategy>,
    "animal"
  > = {
    neophyte: new NeophiteStartingPointStrategy(),
    ancillae: new AncillaeStartingPointStrategy(),
    elder_vtm: new ElderStartingPointStrategy(),
    elder_elysium: new ElderElysiumStartingPointStrategy(),
    elder_belladona: new ElderBelladonaStartingPointStrategy(),
    human: new HumanStartingPointStrategy(),
    revenant: new RevenantStartingPointStrategy(),
    ghoul: new GhoulStartingPointStrategy(),
  };

  static resolve(context: CharacterCreationContext): IStartingPointsStrategy {
    const { templateKey, isDarkAges, isGhoul, ghoulType, hasFamily } = context;

    // Animal ghouls don't use starting point strategies - use human as fallback
    if (templateKey === "animal" || ghoulType === "animal") {
      return this.strategies.human;
    }

    // Human ghouls with family are revenants
    if (isGhoul && ghoulType === "human" && hasFamily) {
      return this.strategies.revenant;
    }

    // Human ghouls without family use ghoul strategy
    if (isGhoul && ghoulType === "human") {
      return this.strategies.ghoul;
    }

    const strategy =
      this.strategies[templateKey as keyof typeof this.strategies];
    if (!strategy) {
      throw new Error(`Unknown template key: ${templateKey}`);
    }

    if (isDarkAges && templateKey === "neophyte") {
      return new DarkAgesNeophiteStrategy();
    }

    return strategy;
  }

  static getAvailableStrategies(): Array<{ key: TemplateKey; label: string }> {
    return [
      { key: "neophyte", label: "Neophyte" },
      { key: "ancillae", label: "Ancillae" },
      { key: "elder_vtm", label: "Elder - VtM" },
      { key: "elder_elysium", label: "Elder - Sistema Elysium" },
      { key: "elder_belladona", label: "Elder - Belladona" },
      { key: "human", label: "Human" },
      { key: "animal", label: "Animal" },
      { key: "revenant", label: "Revenant" },
      { key: "ghoul", label: "Ghoul" },
    ];
  }

  static getStrategyLabel(key: TemplateKey): string {
    const labels: Record<TemplateKey, string> = {
      neophyte: "Neophyte",
      ancillae: "Ancillae",
      elder_vtm: "Elder - VtM",
      elder_elysium: "Elder - Sistema Elysium",
      elder_belladona: "Elder - Belladona",
      human: "Human",
      animal: "Animal",
      revenant: "Revenant",
      ghoul: "Ghoul",
    };
    return labels[key] || key;
  }

  static toTemplateRules(
    strategy: IStartingPointsStrategy,
    _isDarkAges: boolean = false,
  ): TemplateRules {
    const freebieValue = strategy.getPoints(FreebieType.Neophite)[0];

    const usesAgeFreebies =
      freebieValue === FreebieType.ElderElysium ||
      freebieValue === FreebieType.ElderBelladona;

    const baseFreebies =
      freebieValue === FreebieType.ElderElysium ||
      freebieValue === FreebieType.ElderBelladona
        ? 20
        : freebieValue === FreebieType.Human ||
            freebieValue === FreebieType.Revenant
          ? 21
          : 15;

    return {
      attributes: strategy.getPoints(TraitType.Attribute) as [
        number,
        number,
        number,
      ],
      abilities: strategy.getPoints(TraitType.Ability) as [
        number,
        number,
        number,
      ],
      disciplines: strategy
        .getPoints(TraitType.Discipline)
        .reduce((a, b) => a + b, 0),
      backgrounds: strategy.getPoints(TraitType.Background)[0] || 0,
      virtues: strategy.getPoints(TraitType.Virtue)[0] || 0,
      baseFreebies,
      usesAgeFreebies,
    };
  }
}

class DarkAgesNeophiteStrategy implements IStartingPointsStrategy {
  private baseStrategy = new NeophiteStartingPointStrategy();

  get isDarkAges(): boolean {
    return true;
  }

  getFreebiePointsTotal(
    draft: Partial<{ backgrounds?: Record<string, number> }>,
  ): number {
    return this.baseStrategy.getFreebiePointsTotal(draft);
  }

  getPoints(type: any): number[] {
    if (type === TraitType.Discipline) {
      return [4];
    }
    return this.baseStrategy.getPoints(type);
  }
}

export const TEMPLATE_LABEL: Record<TemplateKey, string> = {
  neophyte: "Neophyte",
  ancillae: "Ancillae",
  elder_vtm: "Elder - VtM",
  elder_elysium: "Elder - Sistema Elysium",
  elder_belladona: "Elder - Belladona",
  human: "Human",
  animal: "Animal",
  revenant: "Revenant",
  ghoul: "Ghoul",
};

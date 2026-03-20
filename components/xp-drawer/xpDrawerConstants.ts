import { XpPointCostStrategy } from "@/core/strategies/XpPointCostStrategy";
import { TraitType } from "@/core/enums/TraitType";

import alligator from "@/core/data/raw/bestiary/alligator.json";
import ape from "@/core/data/raw/bestiary/ape.json";
import bats from "@/core/data/raw/bestiary/bats.json";
import bear from "@/core/data/raw/bestiary/bear.json";
import birdLarge from "@/core/data/raw/bestiary/bird_large.json";
import birdSubstantial from "@/core/data/raw/bestiary/bird_substantial.json";
import bratovichHellhound from "@/core/data/raw/bestiary/bratovich_hellhound.json";
import constrictorSnakes from "@/core/data/raw/bestiary/constrictor_snakes.json";
import largeDog from "@/core/data/raw/bestiary/large_dog.json";
import leopard from "@/core/data/raw/bestiary/leopard.json";
import lion from "@/core/data/raw/bestiary/lion.json";
import poisonousSnake from "@/core/data/raw/bestiary/poisonous_snake.json";
import rats from "@/core/data/raw/bestiary/rats.json";
import regularHorse from "@/core/data/raw/bestiary/regular_horse.json";
import warhorse from "@/core/data/raw/bestiary/warhorse.json";
import wolf from "@/core/data/raw/bestiary/wolf.json";

export const xpCostStrategy = new XpPointCostStrategy();

export type SpendType =
  | "attribute"
  | "ability"
  | "discipline"
  | "background"
  | "virtue"
  | "willpower"
  | "road"
  | "combo"
  | "specialty";

export interface SpendChange {
  type: SpendType;
  key: string;
  from: number;
  to: number;
  specialtyName?: string;
  specialtyDescription?: string;
}

export const TRAIT_TYPE_MAP: Record<SpendType, TraitType> = {
  attribute: TraitType.Attribute,
  ability: TraitType.Ability,
  discipline: TraitType.Discipline,
  background: TraitType.Background,
  virtue: TraitType.Virtue,
  willpower: TraitType.Willpower,
  road: TraitType.Humanity,
  combo: TraitType.Discipline,
  specialty: TraitType.Ability, // Default to Ability, will be used for both
};

export const ANIMAL_TEMPLATES: Record<string, any> = {
  alligator: alligator,
  ape: ape,
  ape_or_gorilla: ape,
  bats: bats,
  bear: bear,
  bird_large: birdLarge,
  bird_large_json: birdLarge,
  bird_substantial: birdSubstantial,
  bird_substantial_json: birdSubstantial,
  bratovich_hellhound: bratovichHellhound,
  constrictor_snakes: constrictorSnakes,
  large_dog: largeDog,
  leopard: leopard,
  lion: lion,
  lion_or_tiger: lion,
  poisonous_snake: poisonousSnake,
  rats: rats,
  regular_horse: regularHorse,
  warhorse: warhorse,
  wolf: wolf,
};

export function getTemplateAvailableDisciplines(
  templateName: string,
): string[] {
  if (!templateName) return [];

  const normalizedName = templateName.toLowerCase().replace(/\s+/g, "_");
  const template = ANIMAL_TEMPLATES[normalizedName];

  if (!template) {
    return [];
  }

  const disciplines = template.traits?.disciplines?.available || [];
  return disciplines.map((d: any) => d.name || d);
}

export function getXpCost(
  type: SpendType,
  currentRating: number,
  options?: {
    isBackgroundAllowed?: boolean;
    isMeritFlawAllowed?: boolean;
  },
): number {
  return xpCostStrategy.getCost(
    TRAIT_TYPE_MAP[type],
    currentRating,
    false,
    false,
    options?.isBackgroundAllowed,
    options?.isMeritFlawAllowed,
  );
}

export const ATTRIBUTES = [
  { key: "strength", label: "Strength", category: "Physical" },
  { key: "dexterity", label: "Dexterity", category: "Physical" },
  { key: "stamina", label: "Stamina", category: "Physical" },
  { key: "charisma", label: "Charisma", category: "Social" },
  { key: "manipulation", label: "Manipulation", category: "Social" },
  { key: "appearance", label: "Appearance", category: "Social" },
  { key: "perception", label: "Perception", category: "Mental" },
  { key: "intelligence", label: "Intelligence", category: "Mental" },
  { key: "wits", label: "Wits", category: "Mental" },
];

export const TALENTS = [
  { key: "alertness", label: "Alertness", category: "Talents" },
  { key: "athletics", label: "Athletics", category: "Talents" },
  { key: "awareness", label: "Awareness", category: "Talents" },
  { key: "brawl", label: "Brawl", category: "Talents" },
  { key: "empathy", label: "Empathy", category: "Talents" },
  { key: "expression", label: "Expression", category: "Talents" },
  { key: "intimidation", label: "Intimidation", category: "Talents" },
  { key: "leadership", label: "Leadership", category: "Talents" },
  { key: "streetwise", label: "Streetwise", category: "Talents" },
  { key: "subterfuge", label: "Subterfuge", category: "Talents" },
];

export const SKILLS = [
  { key: "animal_ken", label: "Animal Ken", category: "Skills" },
  { key: "crafts", label: "Crafts", category: "Skills" },
  { key: "drive", label: "Drive", category: "Skills" },
  { key: "etiquette", label: "Etiquette", category: "Skills" },
  { key: "firearms", label: "Firearms", category: "Skills" },
  { key: "larceny", label: "Larceny", category: "Skills" },
  { key: "melee", label: "Melee", category: "Skills" },
  { key: "performance", label: "Performance", category: "Skills" },
  { key: "stealth", label: "Stealth", category: "Skills" },
  { key: "survival", label: "Survival", category: "Skills" },
];

export const KNOWLEDGES = [
  { key: "academics", label: "Academics", category: "Knowledges" },
  { key: "computer", label: "Computer", category: "Knowledges" },
  { key: "finance", label: "Finance", category: "Knowledges" },
  { key: "investigation", label: "Investigation", category: "Knowledges" },
  { key: "law", label: "Law", category: "Knowledges" },
  { key: "medicine", label: "Medicine", category: "Knowledges" },
  { key: "occult", label: "Occult", category: "Knowledges" },
  { key: "politics", label: "Politics", category: "Knowledges" },
  { key: "science", label: "Science", category: "Knowledges" },
  { key: "technology", label: "Technology", category: "Knowledges" },
];

export const DISCIPLINES = [
  { key: "animalism", label: "Animalism" },
  { key: "auspex", label: "Auspex" },
  { key: "blood_sorcery", label: "Blood Sorcery" },
  { key: "celerity", label: "Celerity" },
  { key: "chimerstry", label: "Chimerstry" },
  { key: "dementation", label: "Dementation" },
  { key: "dominate", label: "Dominate" },
  { key: "fortitude", label: "Fortitude" },
  { key: "necromancy", label: "Necromancy" },
  { key: "obfuscate", label: "Obfuscate" },
  { key: "obtenebration", label: "Obtenebration" },
  { key: "ogham", label: "Ogham" },
  { key: "potence", label: "Potence" },
  { key: "presence", label: "Presence" },
  { key: "protean", label: "Protean" },
  { key: "quietus", label: "Quietus" },
  { key: "serpentis", label: "Serpentis" },
  { key: "thaumaturgy", label: "Thaumaturgy" },
  { key: "thanatosis", label: "Thanatosis" },
  { key: "vicissitude", label: "Vicissitude" },
  { key: "visceratika", label: "Visceratika" },
];

export const BACKGROUNDS = [
  { key: "allies", label: "Allies" },
  { key: "alternate_identity", label: "Alternate Identity" },
  { key: "ancestors", label: "Ancestors" },
  { key: "appearance", label: "Appearance" },
  { key: "arcane", label: "Arcane" },
  { key: "armory", label: "Armory" },
  { key: "backup", label: "Backup" },
  { key: "contacts", label: "Contacts" },
  { key: "domain", label: "Domain" },
  { key: "equipment", label: "Equipment" },
  { key: "fame", label: "Fame" },
  { key: "generation", label: "Generation" },
  { key: "herd", label: "Herd" },
  { key: "influence", label: "Influence" },
  { key: "kitain", label: "Kinfolk" },
  { key: "mentor", label: "Mentor" },
  { key: "resources", label: "Resources" },
  { key: "retainers", label: "Retainers" },
  { key: "rite", label: "Rite" },
  { key: "rituals", label: "Rituals" },
  { key: "sanctuary", label: "Sanctuary" },
  { key: "status", label: "Status" },
];

export const VIRTUES = [
  { key: "conscience", label: "Conscience" },
  { key: "self_control", label: "Self-Control" },
  { key: "courage", label: "Courage" },
];

export function getNestedValue(obj: any, path: string[]): number {
  let current = obj;
  for (const key of path) {
    if (current == null) return 0;
    current = current[key];
  }
  return typeof current === "number" ? current : 0;
}

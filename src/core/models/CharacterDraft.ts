// src/core/models/CharacterDraft.ts
import type { Character } from "./Character";

export interface CharacterDraft {
  virtues?: Record<string, number>;
  // Persona básica
  name: string;
  player?: string;
  chronicle?: string;
  sire?: string;

  conceptId?: string | null;
  clanId?: string | null;
  natureId?: string | null;
  demeanorId?: string | null;

  // Dicionários id -> dots
  attributes?: Record<string, number>;
  abilities?: Record<string, number>;
  backgrounds: Record<string, number>;
  disciplines: Record<string, number>;

  // Specialty: Record<traitId, { name: string; description?: string }>
  // ex: { strength: { name: "lifting", description: "..." }, academics: { name: "history" } }
  specialties?: Record<string, { name: string; description?: string }>;

  // Merits: array of { id, name, cost, category?, description }
  merits?: {
    id: string;
    name: string;
    cost: number;
    category?: string;
    description?: string;
  }[];

  // Flaws: array of { id, name, value, category?, description }
  flaws?: {
    id: string;
    name: string;
    value: number;
    category?: string;
    description?: string;
  }[];

  // Derivados de geração (preenchidos em Issues futuras)
  generation?: number | null;
  maxTraitRating?: number | null;
  maximumBloodPool?: number | null;
  bloodPointsPerTurn?: number | null;

  willpower?: number | null;
  road?: number | null;
}

/**
 * Estado inicial padrão para o formulário de criação de ficha.
 * Para M1, assumimos 13ª geração como default até mexer no Background Generation.
 */
export function createEmptyCharacterDraft(
  overrides: Partial<CharacterDraft> = {},
): CharacterDraft {
  return {
    name: "",
    conceptId: null,
    clanId: null,
    natureId: null,
    demeanorId: null,
    attributes: {},
    abilities: {},
    backgrounds: {},
    disciplines: {},
    virtues: {},
    specialties: {},
    merits: [],
    flaws: [],
    generation: 13, // default antes de mexer no Background Generation
    maxTraitRating: null,
    maximumBloodPool: null,
    bloodPointsPerTurn: null,
    ...overrides,
  };
}

/**
 * Converte o CharacterDraft em um objeto compatível com o CharacterSheet.
 * Os campos que ainda não fazem parte do M1 recebem defaults seguros.
 */
export function draftToCharacter(draft: CharacterDraft): Character {
  return {
    // Persona / meta
    name: draft.name || "Unknown Kindred",
    player: draft.player,
    chronicle: draft.chronicle,
    sire: draft.sire,
    concept: undefined,
    clan: undefined,
    nature: undefined,
    demeanor: undefined,
    ageCategory: null,
    age: null,

    // Experiência
    totalExperience: 0,
    spentExperience: 0,

    // Traits numéricos – vazios por enquanto; o CharacterSheet já lida com defaults
    attributes: draft.attributes ?? {},
    abilities: draft.abilities ?? {},
    backgrounds: draft.backgrounds ?? {},
    virtues: {},
    disciplines: draft.disciplines ?? {},

    // Specialty - convert from draft format to character format
    specialties: (() => {
      const spec = draft.specialties ?? {};
      const result: Record<string, string> = {};
      for (const [key, value] of Object.entries(spec)) {
        if (value && typeof value === "object" && "name" in value) {
          result[key] = (value as { name: string }).name;
        }
      }
      return result;
    })(),

    // Merits / Flaws / Debug
    merits: [],
    flaws: [],
    debugLog: [],

    // Geração e derivados
    generation: draft.generation ?? 13,
    maxTraitRating: draft.maxTraitRating ?? 5, // o sheet faz Math.max(5, ...)
    maximumBloodPool: draft.maximumBloodPool ?? 0,
    bloodPointsPerTurn: draft.bloodPointsPerTurn ?? 1,

    // Humanidade / Vontade – defaults razoáveis para V20
    humanity: 7,
    willpower: 5,
  };
}

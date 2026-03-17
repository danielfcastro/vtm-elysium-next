export interface SheetData {
  root: any;
  sheetWrapper: any;
  draft: any;
}

export interface CharacterBasicInfo {
  name: string;
  player: string;
  chronicle: string;
  nature: string;
  demeanor: string;
  concept: string;
}

export interface AttributesData {
  physical: Record<string, number>;
  social: Record<string, number>;
  mental: Record<string, number>;
}

export interface AbilitiesData {
  talents: Record<string, number>;
  skills: Record<string, number>;
  knowledges: Record<string, number>;
}

export interface DisciplinesData {
  [key: string]: number | { dots: number; powers?: any[] };
}

export interface BackgroundsData {
  [key: string]: number;
}

export interface HealthWillpowerData {
  healthLevels: { total: number; damaged: number };
  willpower: { current: number; max: number };
}

export interface GhoulInfo {
  isGhoul: boolean;
  ghoulType?: "human" | "animal";
  familyName?: string;
  familyWeakness?: string;
  familyDisciplines?: Record<string, number>;
  domitorName?: string;
}

export function getBasicInfo(draft: any): CharacterBasicInfo {
  return {
    name: draft.name ?? "",
    player: draft.player ?? "",
    chronicle: draft.chronicle ?? "",
    nature: draft.natureId ?? "",
    demeanor: draft.demeanorId ?? "",
    concept: draft.conceptId ?? "",
  };
}

export function getGhoulInfo(sheetWrapper: any, draft: any): GhoulInfo {
  return {
    isGhoul: sheetWrapper?.isGhoul ?? draft?.isGhoul ?? false,
    ghoulType: sheetWrapper?.ghoulType ?? draft?.ghoulType,
    familyName: sheetWrapper?.familyName ?? draft?.familyName,
    familyWeakness: sheetWrapper?.familyWeakness ?? draft?.familyWeakness,
    familyDisciplines:
      sheetWrapper?.familyDisciplines ?? draft?.familyDisciplines,
    domitorName: sheetWrapper?.domitorName ?? draft?.domitorName,
  };
}

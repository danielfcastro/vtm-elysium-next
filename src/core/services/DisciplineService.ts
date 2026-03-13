import { XpPointCostStrategy } from "@/core/strategies/XpPointCostStrategy";
import { TraitType } from "@/core/enums/TraitType";

import animalismData from "@/core/data/raw/disciplines/animalism.json";
import auspexData from "@/core/data/raw/disciplines/auspex.json";
import celerityData from "@/core/data/raw/disciplines/celerity.json";
import dominateData from "@/core/data/raw/disciplines/dominate.json";
import fortitudeData from "@/core/data/raw/disciplines/fortitude.json";
import obfuscateData from "@/core/data/raw/disciplines/obfuscate.json";
import obtainebrationData from "@/core/data/raw/disciplines/obtenebration.json";
import presenceData from "@/core/data/raw/disciplines/presence.json";
import proteanData from "@/core/data/raw/disciplines/protean.json";
import potenceData from "@/core/data/raw/disciplines/potence.json";
import thaumaturgyData from "@/core/data/raw/disciplines/thaumaturgy.json";
import necromancyData from "@/core/data/raw/disciplines/necromancy.json";
import serpentisData from "@/core/data/raw/disciplines/serpentis.json";
import vicissitudeData from "@/core/data/raw/disciplines/vicissitude.json";
import quietusData from "@/core/data/raw/disciplines/quietus.json";
import valerenData from "@/core/data/raw/disciplines/valeren.json";
import wangaData from "@/core/data/raw/disciplines/wanga.json";
import temporisData from "@/core/data/raw/disciplines/temporis.json";
import thanatosisData from "@/core/data/raw/disciplines/thanatosis.json";
import visceratikaData from "@/core/data/raw/disciplines/visceratika.json";
import obeahData from "@/core/data/raw/disciplines/obeah.json";
import chimerstryData from "@/core/data/raw/disciplines/chimerstry.json";
import dur_an_kiData from "@/core/data/raw/disciplines/dur_an_ki.json";
import bardoData from "@/core/data/raw/disciplines/bardo.json";
import comboData from "@/core/data/raw/disciplines/combo/combo-disciplines.json";

const xpCostStrategy = new XpPointCostStrategy();

export interface DisciplinePower {
  name: string;
  alias: string[];
  rolls: string[];
  effects: string[];
  description: string;
  references: string[];
  wikiUrl: string;
  activation?: string;
  relevantTraits?: string[];
}

export interface DisciplineLevel {
  level: number;
  powers: DisciplinePower[];
}

export type DisciplineType = "common" | "clan-specific" | "blood_magic";

export interface BloodMagicPath {
  id: string;
  name: string;
  levels: Record<string, DisciplinePower[]>;
}

export interface Discipline {
  id: string;
  name: string;
  type: DisciplineType;
  clans: string[];
  levels: DisciplineLevel[];
  paths?: Record<string, BloodMagicPath>;
}

export interface ComboPrerequisite {
  discipline: string;
  level: number;
}

export interface ComboDiscipline {
  id: string;
  name: string;
  prerequisites: ComboPrerequisite[];
  cost: number;
  description: string;
  system: string;
  source: string;
}

interface RawDisciplineData {
  id: string;
  name: string;
  type?: string;
  clans?: string[];
  levels?: Record<string, DisciplinePower[]>;
  wikiUrl?: string;
  paths?: Record<string, any>;
}

const DISCIPLINES = [
  animalismData,
  auspexData,
  celerityData,
  dominateData,
  fortitudeData,
  obfuscateData,
  obtainebrationData,
  presenceData,
  proteanData,
  potenceData,
  thaumaturgyData,
  necromancyData,
  serpentisData,
  vicissitudeData,
  quietusData,
  valerenData,
  wangaData,
  temporisData,
  thanatosisData,
  visceratikaData,
  obeahData,
  chimerstryData,
  dur_an_kiData,
  bardoData,
] as const;

function transformDiscipline(data: RawDisciplineData): Discipline {
  const levels: DisciplineLevel[] = [];

  if (data.levels && typeof data.levels === "object") {
    for (const [levelStr, powers] of Object.entries(data.levels)) {
      const level = parseInt(levelStr, 10);
      if (!isNaN(level) && Array.isArray(powers)) {
        levels.push({
          level,
          powers: powers as DisciplinePower[],
        });
      }
    }
  }

  // Handle blood magic paths (like Thaumaturgy, Necromancy)
  const paths: Record<string, BloodMagicPath> = {};
  if (data.type === "blood_magic" && (data as any).paths) {
    const rawPaths = (data as any).paths;
    for (const [pathId, pathData] of Object.entries(rawPaths)) {
      const pd = pathData as any;
      paths[pathId] = {
        id: pd.id || pathId,
        name: pd.name || pathId,
        levels: pd.levels || {},
      };
    }
  }

  return {
    id: data.id,
    name: data.name,
    type: (data.type as DisciplineType) || "common",
    clans: data.clans || [],
    levels,
    paths: Object.keys(paths).length > 0 ? paths : undefined,
  };
}

class DisciplineService {
  private disciplines: Map<string, Discipline> = new Map();
  private initialized = false;

  private initialize() {
    if (this.initialized) return;

    for (const data of DISCIPLINES) {
      try {
        const discipline = transformDiscipline(data);
        this.disciplines.set(discipline.id, discipline);
      } catch (err) {
        console.error(`Error loading discipline ${data.id}:`, err);
      }
    }

    this.initialized = true;
  }

  getAllDisciplines(): Discipline[] {
    this.initialize();
    return Array.from(this.disciplines.values());
  }

  getDisciplineById(id: string): Discipline | undefined {
    this.initialize();
    return this.disciplines.get(id.toLowerCase());
  }

  getDisciplineLevels(disciplineId: string): DisciplineLevel[] {
    const disc = this.getDisciplineById(disciplineId);
    return disc?.levels || [];
  }

  getPowersForLevel(disciplineId: string, level: number): DisciplinePower[] {
    const disc = this.getDisciplineById(disciplineId);
    return disc?.levels.find((l) => l.level === level)?.powers || [];
  }

  hasMultiplePowers(disciplineId: string, level: number): boolean {
    return this.getPowersForLevel(disciplineId, level).length > 1;
  }

  getDisciplineLevel(
    disciplineId: string,
    level: number,
  ): DisciplineLevel | undefined {
    return this.getDisciplineLevels(disciplineId).find(
      (l) => l.level === level,
    );
  }

  calculateDisciplineCost(
    disciplineId: string,
    currentLevel: number,
    isClanDiscipline: boolean = false,
  ): number {
    return xpCostStrategy.getCost(
      TraitType.Discipline,
      currentLevel,
      isClanDiscipline,
    );
  }

  getEligibleCombos(currentDisciplines: Record<string, number>): {
    eligible: ComboDiscipline[];
    ineligible: { combo: ComboDiscipline; missing: string[] }[];
  } {
    const eligible: ComboDiscipline[] = [];
    const ineligible: { combo: ComboDiscipline; missing: string[] }[] = [];

    const combos = comboData.combos as unknown as ComboDiscipline[];

    const normalizeKey = (key: string) => key.toLowerCase();

    const safeNumber = (val: unknown): number => {
      if (typeof val === "number" && !isNaN(val)) return val;
      if (typeof val === "string") {
        const parsed = Number(val);
        if (!isNaN(parsed)) return parsed;
      }
      if (val && typeof val === "object" && "level" in val) {
        return safeNumber((val as any).level);
      }
      return 0;
    };

    const normalizedDisciplines: Record<string, number> = {};
    for (const [key, value] of Object.entries(currentDisciplines)) {
      normalizedDisciplines[normalizeKey(key)] = safeNumber(value);
    }

    for (const combo of combos) {
      const missing: string[] = [];
      let canLearn = true;

      for (const prereq of combo.prerequisites) {
        const prereqKey = normalizeKey(prereq.discipline);
        const currentLevel = normalizedDisciplines[prereqKey] || 0;
        if (currentLevel < prereq.level) {
          canLearn = false;
          missing.push(`${prereq.discipline} ${prereq.level}`);
        }
      }

      if (canLearn) {
        eligible.push(combo);
      } else {
        ineligible.push({ combo, missing });
      }
    }

    return { eligible, ineligible };
  }

  isBloodMagic(disciplineId: string): boolean {
    const disc = this.getDisciplineById(disciplineId);
    return disc?.type === "blood_magic";
  }

  getBloodMagicPaths(disciplineId: string): BloodMagicPath[] {
    const disc = this.getDisciplineById(disciplineId);
    if (!disc?.paths) return [];
    return Object.values(disc.paths);
  }

  getPowersForBloodMagicPath(
    disciplineId: string,
    pathId: string,
    level: number,
  ): DisciplinePower[] {
    const disc = this.getDisciplineById(disciplineId);
    if (!disc?.paths?.[pathId]) return [];
    const pathLevels = disc.paths[pathId].levels;
    const powers = pathLevels[level];
    if (!powers) return [];
    return powers;
  }

  calculateBloodMagicPathCost(
    disciplineId: string,
    pathId: string,
    currentLevel: number,
    isMainPath: boolean,
    isClanDiscipline: boolean = false,
  ): number {
    // Main path (Path of Blood for Thaumaturgy, etc.) follows standard discipline rules
    // Secondary paths: first dot costs 7 XP, subsequent dots cost 4× current level
    if (isMainPath) {
      return xpCostStrategy.getCost(
        TraitType.Discipline,
        currentLevel,
        isClanDiscipline,
      );
    }
    // Secondary path costs
    if (currentLevel === 0) return 7;
    return currentLevel * 4;
  }

  getBloodMagicDisciplines(): Discipline[] {
    return this.getAllDisciplines().filter((d) => d.type === "blood_magic");
  }
}

export const disciplineService = new DisciplineService();

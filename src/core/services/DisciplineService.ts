import disciplinesData from "@/core/data/raw/disciplines-enhanced.json";

export interface DisciplineLevel {
  level: number;
  name: string;
  description: string;
  activation: string;
  effects: string;
  relevantTraits: string[];
  references: string[];
}

export interface Discipline {
  id: string;
  name: string;
  type: "common" | "clan-specific";
  levels: DisciplineLevel[];
}

export interface ComboPrerequisite {
  discipline: string;
  level: number;
}

export interface ComboDiscipline {
  name: string;
  prerequisites: ComboPrerequisite[];
  cost: number | null;
  description: string;
  system: string;
  source: string;
}

export interface DisciplinesData {
  disciplines: Discipline[];
  combos: ComboDiscipline[];
}

class DisciplineService {
  private data: DisciplinesData;

  constructor() {
    this.data = disciplinesData as DisciplinesData;
  }

  getAllDisciplines(): Discipline[] {
    return this.data.disciplines;
  }

  getDisciplineById(id: string): Discipline | undefined {
    return this.data.disciplines.find((d) => d.id === id);
  }

  getDisciplineByName(name: string): Discipline | undefined {
    return this.data.disciplines.find(
      (d) => d.name.toLowerCase() === name.toLowerCase(),
    );
  }

  getDisciplineLevel(
    disciplineId: string,
    level: number,
  ): DisciplineLevel | undefined {
    const discipline = this.getDisciplineById(disciplineId);
    return discipline?.levels.find((l) => l.level === level);
  }

  getAllCombos(): ComboDiscipline[] {
    return this.data.combos;
  }

  getEligibleCombos(currentDisciplines: Record<string, number>): {
    eligible: ComboDiscipline[];
    ineligible: { combo: ComboDiscipline; missing: string[] }[];
  } {
    const eligible: ComboDiscipline[] = [];
    const ineligible: { combo: ComboDiscipline; missing: string[] }[] = [];

    for (const combo of this.data.combos) {
      const missing: string[] = [];
      let canBuy = true;

      for (const prereq of combo.prerequisites) {
        const currentLevel =
          currentDisciplines[prereq.discipline.toLowerCase()] || 0;
        if (currentLevel < prereq.level) {
          canBuy = false;
          missing.push(`${prereq.discipline} ${prereq.level}`);
        }
      }

      if (canBuy) {
        eligible.push(combo);
      } else {
        ineligible.push({ combo, missing });
      }
    }

    return { eligible, ineligible };
  }

  calculateDisciplineCost(
    disciplineId: string,
    currentLevel: number,
    isClanDiscipline: boolean = false,
  ): number {
    const discipline = this.getDisciplineById(disciplineId);
    if (!discipline) return 0;

    if (currentLevel === 0) {
      return isClanDiscipline ? 10 : 10;
    }

    return currentLevel * (isClanDiscipline ? 5 : 7);
  }
}

export const disciplineService = new DisciplineService();

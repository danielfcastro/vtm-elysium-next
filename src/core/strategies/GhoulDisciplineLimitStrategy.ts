import { CharacterDraft } from "../models/CharacterDraft";

/**
 * Strategy to enforce discipline dot limits for ghouls based on domitor generation.
 * Rule:
 * - Domitor 13th to 8th: 1 level MAX
 * - Domitor 7th: 2 levels MAX
 * - Domitor 6th: 3 levels MAX
 * - Domitor 5th: 4 levels MAX
 * - Domitor 4th: 5 levels MAX
 */
export class GhoulDisciplineLimitStrategy {
  static getMaxDisciplineLevel(domitorGeneration: number | undefined): number {
    if (!domitorGeneration) return 1;

    if (domitorGeneration >= 8) return 1;
    if (domitorGeneration === 7) return 2;
    if (domitorGeneration === 6) return 3;
    if (domitorGeneration === 5) return 4;
    if (domitorGeneration <= 4) return 5;

    return 1;
  }

  static validateDraft(
    draft: CharacterDraft,
    domitorGeneration: number | undefined,
  ): string | null {
    const maxLevel = this.getMaxDisciplineLevel(domitorGeneration);
    const disciplines = draft.disciplines || {};

    for (const [id, level] of Object.entries(disciplines)) {
      if (level > maxLevel) {
        return `Discipline ${id} cannot exceed level ${maxLevel} for a ghoul of this domitor generation (${domitorGeneration}th).`;
      }
    }

    return null;
  }
}

// types/sheet.ts

/**
 * Por enquanto, o objetivo é NÃO acoplar a UI nova ao shape completo da ficha.
 * Você já tem um JSON grande em characters.sheet. Vamos encaixar depois.
 */
export type CharacterSheetModel = Record<string, unknown>;

/**
 * Metadados úteis para o viewer da ficha no dashboard.
 * (Opcional, mas costuma ajudar no layout e no debug.)
 */
export interface CharacterSheetState {
  characterId: string;
  gameId: string;

  /**
   * JSON da ficha (characters.sheet).
   * Em modo readonly, a UI apenas renderiza.
   */
  sheet: CharacterSheetModel | null;

  /** controle para loading/error quando você plugar as APIs */
  isLoading?: boolean;
  error?: string | null;

  /** XP (caso você queira mostrar no header do painel direito ou topo) */
  totalXp?: number;
  spentXp?: number;
}

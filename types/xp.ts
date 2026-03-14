// types/xp.ts

/**
 * Payload enviado pelo Storyteller ao confirmar a modals.
 * A API pode receber este payload e criar 1 grant por characterId.
 */
export type GrantXpRequest =
  | {
      mode: "SAME_FOR_ALL";
      gameId: string;
      amount: number; // >= 0 (inteiro)
      note?: string;
      sessionDate?: string; // ISO, opcional
      characterIds: string[]; // personagens do jogo selecionado
    }
  | {
      mode: "PER_CHARACTER";
      gameId: string;
      note?: string;
      sessionDate?: string; // ISO, opcional
      grants: Array<{
        characterId: string;
        amount: number; // >= 0 (inteiro)
      }>;
    };

/**
 * Estado interno do formulário da modals (UI state).
 * Aqui permitimos "" para inputs ainda vazios.
 */
export interface GrantXpFormState {
  open: boolean;

  sameForAll: boolean;

  // Quando sameForAll = true
  amountForAll: number | "";

  // Quando sameForAll = false
  amountsByCharacterId: Record<string, number | "">;

  note: string;
  sessionDate: string; // pode ser "" se não usar

  isSubmitting: boolean;
  error: GrantXpError | null;
}
/**
 * Resposta típica da API após conceder XP.
 * O backend pode retornar a lista de grants criados (ou apenas contagens).
 */
export interface GrantXpResponse {
  gameId: string;
  createdCount: number;
  createdGrantIds?: string[];
}

/**
 * Erro padronizado para exibir na modals.
 */
export interface GrantXpError {
  message: string;
  fieldErrors?: Record<string, string>; // ex: { amount: "Must be >= 0" }
}

export interface GrantXpFormState {
  open: boolean;

  sameForAll: boolean;

  // Quando sameForAll = true
  amountForAll: number | "";

  // Quando sameForAll = false
  amountsByCharacterId: Record<string, number | "">;

  note: string;
  sessionDate: string; // pode ser "" se não usar

  isSubmitting: boolean;
  error: GrantXpError | null;
}

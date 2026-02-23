// types/app.ts

export type Role = "PLAYER" | "STORYTELLER";

export interface Me {
  id: string;
  email: string;
  name: string;
  isActive: boolean;

  /**
   * Roles por jogo (derivado de user_game_roles).
   * Um mesmo usuário pode ter múltiplos papéis em jogos diferentes.
   */
  rolesByGameId: Record<string, Role[]>;
}

export interface GameOption {
  id: string;
  name: string;
}

/**
 * Item mínimo para listar e selecionar personagens na toolbar.
 * Observação: o UI pode "grayar" via isDisabled.
 */
export interface CharacterListItem {
  id: string;
  name: string;

  /** jogo ao qual este personagem pertence (characters.game_id) */
  gameId: string;

  /** dono do personagem (characters.owner_user_id) */
  ownerUserId?: string;

  /** status do personagem (draft/submitted/etc). Ajuste conforme seu enum real */
  status?:
    | "DRAFT"
    | "DRAFT_PHASE1"
    | "DRAFT_PHASE2"
    | "SUBMITTED"
    | "APPROVED"
    | "XP"
    | "REJECTED"
    | "ARCHIVED"
    | "DELETED";

  /** status description from character_status table */
  statusDescription?: string;

  /** UI-only: se true, item fica desabilitado/grayed */
  isDisabled?: boolean;
}

/** Útil para top bar */
export interface SelectedContext {
  selectedGameId: string | null;
  selectedCharacterId: string | null;
}

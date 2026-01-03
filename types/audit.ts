// types/audit.ts

export type AuditEntryType = "GRANT" | "SPEND" | "SYSTEM";

export interface AuditEntry {
  /**
   * Identificador estável do item no front.
   * Pode ser o id do xp_grants/xp_spend_logs, ou um id sintético ao mesclar listas.
   */
  id: string;

  /** timestamp ISO (ex: 2025-12-31T11:29:50.167Z) */
  ts: string;

  /** tipo de entrada (concessão, gasto, ou system/misc) */
  type: AuditEntryType;

  /**
   * Texto curto para listagem (ex: "XP Granted", "Spent XP: Attribute +1")
   */
  label: string;

  /**
   * Delta de XP:
   * - grant => +N
   * - spend => -N
   * - system => 0
   */
  deltaXp: number;

  /**
   * Texto secundário opcional (ex: "Session: Vallaki 04", "Reason: Milestone")
   */
  note?: string;

  /**
   * Detalhes estruturados (ex: payload do xp_spend_logs, ou metadata do grant).
   * Mantemos unknown para permitir evoluir sem quebrar contrato.
   */
  details?: unknown;

  /** contexto para debug/filtros (opcional) */
  characterId?: string;
  gameId?: string;
  actorUserId?: string; // quem causou o evento (storyteller no grant, player no spend)
}

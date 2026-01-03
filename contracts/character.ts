// src/contracts/character.ts
import type { ISODateTime, UUID } from "./base";

export type CharacterStatus =
  | "DRAFT_PHASE1"
  | "DRAFT_PHASE2"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED";

export type CharacterSummaryDto = {
  id: UUID;
  gameId: UUID;
  ownerUserId: UUID;

  name: string; // pode ser vazio no começo, mas no front trate como "(Sem nome)"
  status: CharacterStatus;

  totalExperience: number; // cache (derivado do ledger)
  spentExperience: number; // cache (derivado do ledger)

  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  deletedAt?: ISODateTime | null;
};

export type CharacterDto = {
  id: UUID;
  gameId: UUID;
  ownerUserId: UUID;
  status: CharacterStatus;

  submittedAt?: ISODateTime | null;
  approvedAt?: ISODateTime | null;
  approvedByUserId?: UUID | null;
  rejectedAt?: ISODateTime | null;
  rejectedByUserId?: UUID | null;
  rejectionReason?: string | null;

  sheet: CharacterSheet; // JSON completo
  totalExperience: number;
  spentExperience: number;

  version: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  deletedAt?: ISODateTime | null;
};

/**
 * IMPORTANTE:
 * - Você já tem uma estrutura "sheet.draft" no xpSpendService.
 * - Não vamos tipar 100% da ficha aqui agora (para não travar evolução).
 * - Tipamos apenas o que o XP service precisa garantir.
 */
export type CharacterSheet = {
  draft: {
    // buckets comuns (você já usa)
    attributes?: Record<string, number>;
    abilities?: Record<string, number>;
    disciplines?: Record<string, number>;
    backgrounds?: Record<string, number>;
    virtues?: Record<string, number>;

    willpower?: number;
    roadRating?: number;

    maxTraitRating?: number;

    // outros campos livres do draft atual (nome, clanId, etc.)
    [k: string]: unknown;
  };

  // demais campos da sheet (ex: snapshots, metadata, etc.)
  [k: string]: unknown;
};

// src/contracts/xp.ts
import type { ISODate, ISODateTime, UUID } from "./base";

export type XpTotalsDto = {
  granted: number;
  spent: number;
  remaining: number;
};

// Derivado de xpSpendService.ts
export type SpendType =
  | "attribute"
  | "ability"
  | "discipline"
  | "background"
  | "virtue"
  | "willpower"
  | "road";

export type SpendItemDto = {
  type: SpendType;
  key: string;
  from: number;
  to: number;
  cost?: number; // o service calcula e pode persistir no payload
};

export type XpGrantDto = {
  id: UUID;
  characterId: UUID;
  grantedById: UUID;
  amount: number;
  sessionDate: ISODate;
  note?: string | null;
  createdAt: ISODateTime;
};

export type XpSpendStatus = "PENDING" | "APPROVED" | "REJECTED";

export type XpSpendLogDto = {
  id: UUID;
  characterId: UUID;
  requestedById: UUID;
  resolvedById?: UUID | null;
  status: XpSpendStatus;
  xpCost: number;
  payload: unknown; // contém {spends, totalCost, totalsBefore} hoje
  reasonRejected?: string | null;
  createdAt: ISODateTime;
  resolvedAt?: ISODateTime | null;
};

/**
 * “Ledger” normalizado para a UI do painel direito (audit trail).
 * Assim você consegue ordenar tudo por data e renderizar com um componente só.
 */
export type XpLedgerEntry =
  | {
      kind: "GRANT";
      at: ISODateTime;
      grant: XpGrantDto;
    }
  | {
      kind: "SPEND";
      at: ISODateTime;
      spend: XpSpendLogDto;
      // opcional: já “parseado” do payload quando status APPROVED
      spends?: SpendItemDto[];
    };

/**
 * Grant XP modals
 */
export type GrantXpItem = {
  characterId: UUID;
  amount: number;
};

export type GrantXpRequest = {
  gameId: UUID;
  sessionDate: ISODate; // recomendo obrigar; default = hoje no front
  note?: string | null;

  grantAllSame: boolean;
  amount?: number; // quando grantAllSame = true

  perCharacter?: GrantXpItem[]; // quando grantAllSame = false
};

export type GrantXpResponse = {
  appliedTo: Array<{
    characterId: UUID;
    amount: number;
    xpTotalsAfter?: XpTotalsDto; // opcional (se você quiser retornar)
  }>;
};

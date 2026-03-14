// src/contracts/endpoints.ts
import type { ApiResponse } from "./base";
import type { LoginRequest, LoginResponse, MeResponse } from "./auth";
import type { GameDto } from "./game";
import type { CharacterDto, CharacterSummaryDto } from "./character";
import type {
  GrantXpRequest,
  GrantXpResponse,
  XpLedgerEntry,
  XpTotalsDto,
} from "./xp";

export type PostLogin = {
  req: LoginRequest;
  res: ApiResponse<LoginResponse>;
};

export type GetMe = {
  res: ApiResponse<MeResponse>;
};

export type GetGames = {
  res: ApiResponse<GameDto[]>;
};

export type GetMyCharactersByGame = {
  // GET /api/games/:gameId/characters/me (ou equivalente)
  res: ApiResponse<CharacterSummaryDto[]>;
};

export type GetCharacterById = {
  res: ApiResponse<CharacterDto>;
};

export type GetCharacterXpTotals = {
  res: ApiResponse<XpTotalsDto>;
};

export type GetCharacterLedger = {
  res: ApiResponse<XpLedgerEntry[]>;
};

export type PostGrantXp = {
  req: GrantXpRequest;
  res: ApiResponse<GrantXpResponse>;
};

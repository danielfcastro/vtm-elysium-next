// src/contracts/game.ts
import type { ISODateTime, UUID } from "./base";

export type GameDto = {
  id: UUID;
  name: string;
  description?: string | null;
  storytellerId: UUID;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

// src/contracts/auth.ts
import type { ISODateTime, UUID } from "./base";

export type GameRole = "PLAYER" | "STORYTELLER";

export type UserDto = {
  id: UUID;
  email: string;
  name: string;
  isActive: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type UserGameRoleDto = {
  userId: UUID;
  gameId: UUID;
  role: GameRole;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string; // Bearer
  expiresIn: string; // ex: "1d" (ou segundos, se preferir)
  user: UserDto;
};

export type MeResponse = {
  user: UserDto;
  roles: UserGameRoleDto[]; // lista de jogos + papel
};

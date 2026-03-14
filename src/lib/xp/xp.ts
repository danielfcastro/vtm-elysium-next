// src/lib/xp.ts
import type { CharacterListItem } from "@/types/app";
import type {
  GrantXpFormState,
  GrantXpRequest,
  GrantXpError,
} from "@/types/xp";

export function buildGrantXpRequest(params: {
  gameId: string;
  characters: CharacterListItem[];
  state: Pick<
    GrantXpFormState,
    | "sameForAll"
    | "amountForAll"
    | "amountsByCharacterId"
    | "note"
    | "sessionDate"
  >;
}): GrantXpRequest {
  const { gameId, characters, state } = params;

  const note = state.note?.trim() || undefined;
  const sessionDate = state.sessionDate?.trim() || undefined;

  if (state.sameForAll) {
    const amount =
      typeof state.amountForAll === "number" ? state.amountForAll : NaN;

    return {
      mode: "SAME_FOR_ALL",
      gameId,
      amount,
      note,
      sessionDate,
      characterIds: characters.map((c) => c.id),
    };
  }

  const grants = characters.map((c) => {
    const raw = state.amountsByCharacterId[c.id];
    const amount = typeof raw === "number" ? raw : NaN;
    return { characterId: c.id, amount };
  });

  return {
    mode: "PER_CHARACTER",
    gameId,
    grants,
    note,
    sessionDate,
  };
}

export function validateGrantXpRequest(
  payload: GrantXpRequest,
): GrantXpError | null {
  const fieldErrors: Record<string, string> = {};

  const isInt = (n: number) => Number.isFinite(n) && Math.floor(n) === n;

  if (payload.mode === "SAME_FOR_ALL") {
    if (!isInt(payload.amount) || payload.amount < 0) {
      fieldErrors.amount = "XP must be an integer >= 0.";
    }
    if (!payload.characterIds.length) {
      fieldErrors.characterIds = "No characters found for this game.";
    }
  } else {
    if (!payload.grants.length) {
      fieldErrors.grants = "No characters found for this game.";
    }
    payload.grants.forEach((g, idx) => {
      if (!isInt(g.amount) || g.amount < 0) {
        fieldErrors[`grants.${idx}.amount`] = "XP must be an integer >= 0.";
      }
    });
  }

  if (Object.keys(fieldErrors).length) {
    return { message: "Please fix the highlighted fields.", fieldErrors };
  }
  return null;
}

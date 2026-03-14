import type { CharacterListItem } from "@/types/app";
import type { GrantXpRequest } from "@/types/xp";

export function buildGrantXpRequest(args: {
  gameId: string;
  characters: CharacterListItem[];
  state: {
    sameForAll: boolean;
    amountForAll: number | "";
    amountsByCharacterId: Record<string, number | "">;
    note?: string;
    sessionDate?: string;
  };
}): GrantXpRequest {
  const { gameId, characters, state } = args;

  const note = (state.note ?? "").trim();
  const sessionDate = (state.sessionDate ?? "").trim();

  if (state.sameForAll) {
    const amount = state.amountForAll === "" ? NaN : Number(state.amountForAll);

    return {
      mode: "SAME_FOR_ALL",
      gameId,
      amount,
      note: note || undefined,
      sessionDate: sessionDate || undefined,
      characterIds: characters.map((c) => c.id),
    };
  }

  return {
    mode: "PER_CHARACTER",
    gameId,
    note: note || undefined,
    sessionDate: sessionDate || undefined,
    grants: characters.map((c) => {
      const raw = state.amountsByCharacterId[c.id];
      const amount = raw === "" || raw == null ? NaN : Number(raw);
      return { characterId: c.id, amount };
    }),
  };
}

export function validateGrantXpRequest(
  payload: GrantXpRequest,
): { message: string; fieldErrors?: Record<string, string> } | null {
  const fieldErrors: Record<string, string> = {};

  if (!payload.gameId) fieldErrors.gameId = "gameId is required.";

  const isInt = (n: number) => Number.isFinite(n) && Math.floor(n) === n;

  if (payload.mode === "SAME_FOR_ALL") {
    if (!isInt(payload.amount) || payload.amount <= 0) {
      fieldErrors.amount = "XP must be an integer > 0.";
    }
    if (!payload.characterIds?.length) {
      fieldErrors.characterIds = "No characters found for this game.";
    }
  } else {
    if (!payload.grants?.length) {
      fieldErrors.grants = "At least one character must receive XP.";
    } else {
      payload.grants.forEach((g, idx) => {
        if (!g.characterId)
          fieldErrors[`grants.${idx}.characterId`] = "characterId is required.";
        if (!isInt(g.amount) || g.amount <= 0) {
          fieldErrors[`grants.${idx}.amount`] = "XP must be an integer > 0.";
        }
      });
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { message: "Please fix the form errors.", fieldErrors };
  }
  return null;
}

//app/storyteller/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CharacterListItem, GameOption } from "@/types/app";
import type { GrantXpRequest } from "@/types/xp";

import AppShell from "@/components/app-shell/App-shell";
import TopBar from "@/components/app-shell/TopBar";
import LeftToolbar from "@/components/app-shell/LeftToolbar";
import RightPanel from "@/components/app-shell/RightPanel";
import GrantXpModal from "@/components/modals/GrantXpModal";
import CharacterSheet from "@/components/character-sheet/CharacterSheet";

const TOKEN_KEY = "vtm_token";

type ApiGamesResponse = {
  games: GameOption[];
};

type ApiCharactersResponse = {
  items: CharacterListItem[];
};

type ApiCharacterResponse = {
  character: {
    id: string;
    gameId: string;
    sheet: any;
    [key: string]: any;
  };
};

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function fetchJson(url: string, token: string) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const text = await res.text().catch(() => "");
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { _raw: text };
  }

  return {
    ok: res.ok,
    status: res.status,
    body,
  };
}

export default function StorytellerPage() {
  const router = useRouter();

  const [games, setGames] = useState<GameOption[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>("");

  const [characters, setCharacters] = useState<CharacterListItem[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    null,
  );

  const [sheetBundle, setSheetBundle] = useState<any | null>(null);

  const [grantOpen, setGrantOpen] = useState(false);

  const [loadingSheet, setLoadingSheet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedGame = useMemo(
    () => games.find((g) => g.id === selectedGameId) ?? null,
    [games, selectedGameId],
  );

  // Carregar jogos do storyteller
  useEffect(() => {
    let cancelled = false;

    async function run() {
      const token = getToken();
      if (!token) {
        router.push("/login");
        return;
      }

      setError(null);

      const { ok, status, body } = await fetchJson(
        "/api/storyteller/games",
        token,
      );

      if (cancelled) return;

      if (status === 401) {
        router.push("/login");
        return;
      }

      if (!ok) {
        setError(body?.error || `Failed to load games (${status})`);
        setGames([]);
        setSelectedGameId("");
        return;
      }

      const data = body as ApiGamesResponse;
      const nextGames = data.games ?? [];
      setGames(nextGames);

      setSelectedGameId((prev) => {
        if (prev && nextGames.some((g) => g.id === prev)) {
          return prev;
        }
        return nextGames[0]?.id ?? "";
      });
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Carregar personagens do jogo selecionado
  useEffect(() => {
    if (!selectedGameId) {
      setCharacters([]);
      setSelectedCharacterId(null);
      return;
    }

    let cancelled = false;

    async function run() {
      const token = getToken();
      if (!token) {
        router.push("/login");
        return;
      }

      setError(null);

      const { ok, status, body } = await fetchJson(
        `/api/storyteller/characters?gameId=${encodeURIComponent(
          selectedGameId,
        )}`,
        token,
      );

      if (cancelled) return;

      if (status === 401) {
        router.push("/login");
        return;
      }

      if (!ok) {
        setError(body?.error || `Failed to load characters (${status})`);
        setCharacters([]);
        setSelectedCharacterId(null);
        return;
      }

      const data = body as ApiCharactersResponse;
      const items = data.items ?? [];
      setCharacters(items);

      setSelectedCharacterId((prev) => {
        if (prev && items.some((c) => c.id === prev)) {
          return prev;
        }
        return items[0]?.id ?? null;
      });
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router, selectedGameId]);

  // Carregar ficha do personagem selecionado
  useEffect(() => {
    if (!selectedCharacterId) {
      setSheetBundle(null);
      return;
    }

    let cancelled = false;

    async function run() {
      const token = getToken();
      if (!token) {
        router.push("/login");
        return;
      }

      setLoadingSheet(true);
      setError(null);

      const { ok, status, body } = await fetchJson(
        `/api/characters/${selectedCharacterId}`,
        token,
      );

      if (cancelled) return;

      if (status === 401) {
        router.push("/login");
        return;
      }

      if (!ok) {
        // não vazar diferença entre "não existe" e "sem permissão"
        setError(body?.error || "Character not found or not accessible.");
        setSheetBundle(null);
        setLoadingSheet(false);
        return;
      }

      const data = body as ApiCharacterResponse | any;
      const envelope = data?.character?.sheet ?? data?.sheet ?? data ?? null;

      setSheetBundle(envelope);
      setLoadingSheet(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router, selectedCharacterId]);

  async function handleGrantConfirm(payload: GrantXpRequest) {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    const grants =
      payload.mode === "SAME_FOR_ALL"
        ? payload.characterIds.map((id) => ({
            characterId: id,
            amount: payload.amount,
          }))
        : payload.grants;

    for (const g of grants) {
      const res = await fetch(
        `/api/storyteller/characters/${g.characterId}/xp/grant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: g.amount,
            note: payload.note ?? null,
            sessionDate: payload.sessionDate ?? null,
          }),
        },
      );

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Grant XP failed (${res.status})`);
      }
    }

    setGrantOpen(false);
  }

  // A ficha, por enquanto, é apenas leitura. Mantemos o hook caso no futuro
  // queiramos permitir edição + submit pelo Storyteller.
  async function handleSubmitSheet(next: any) {
    const token = getToken();
    if (!token || !selectedCharacterId) {
      router.push("/login");
      return;
    }

    const res = await fetch(`/api/characters/${selectedCharacterId}/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        sheet: next,
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || `Submit failed (${res.status})`);
    }

    setSheetBundle(next);
  }

  return (
    <>
      <AppShell
        top={
          <TopBar
            titleLeft="Storyteller"
            games={games}
            selectedGameId={selectedGameId}
            onGameChange={setSelectedGameId}
            actions={
              <button
                type="button"
                className="btnPrimary"
                onClick={() => setGrantOpen(true)}
                disabled={!selectedGameId || !characters.length}
              >
                Grant XP
              </button>
            }
          />
        }
        left={
          <LeftToolbar
            title="Characters"
            items={characters}
            selectedId={selectedCharacterId}
            onSelect={(id) => setSelectedCharacterId(id)}
          />
        }
        main={
          <div className="p-4">
            {error && (
              <div className="errorBox" style={{ marginBottom: 8 }}>
                {error}
              </div>
            )}
            {loadingSheet && <div>Loading sheet…</div>}
            {!loadingSheet && !sheetBundle && (
              <div className="muted">Select a character to view the sheet.</div>
            )}
            {!loadingSheet && sheetBundle && (
              <div className="sheetActive">
                <CharacterSheet
                  mode="readonly"
                  sheet={sheetBundle}
                  onSubmit={handleSubmitSheet}
                />
              </div>
            )}
          </div>
        }
        right={
          <RightPanel title="Audit Trail">
            <div className="muted">XP audit coming soon.</div>
          </RightPanel>
        }
      />

      <GrantXpModal
        open={grantOpen}
        gameId={selectedGame?.id ?? ""}
        characters={characters}
        onClose={() => setGrantOpen(false)}
        onConfirm={handleGrantConfirm}
      />
    </>
  );
}

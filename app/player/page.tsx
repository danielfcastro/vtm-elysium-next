// app/player/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { CharacterListItem, GameOption } from "@/types/app";

import AppShell from "@/components/app-shell/App-shell";
import TopBar from "@/components/app-shell/TopBar";
import LeftToolbar from "@/components/app-shell/LeftToolbar";
import RightPanel from "@/components/app-shell/RightPanel";
import CharacterSheet from "@/components/character-sheet/CharacterSheet";

const TOKEN_KEY = "vtm_token";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

type GamesApi = { games: GameOption[] };
type MyCharsApi = { items: CharacterListItem[] };

export default function PlayerPage() {
  const router = useRouter();

  const [fatal, setFatal] = useState<string | null>(null);

  const [games, setGames] = useState<GameOption[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>("");

  const selectedGame = useMemo(
    () => games.find((g) => g.id === selectedGameId) ?? null,
    [games, selectedGameId],
  );

  const [myCharacters, setMyCharacters] = useState<CharacterListItem[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>("");

  const selectedCharacter = useMemo(
    () => myCharacters.find((c) => c.id === selectedCharacterId) ?? null,
    [myCharacters, selectedCharacterId],
  );

  const activeCharName = selectedCharacter?.name ?? "(No character selected)";

  const [sheetPayload, setSheetPayload] = useState<any | null>(null);
  const [loadingSheet, setLoadingSheet] = useState(false);

  // 1) Load games
  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/games", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          setFatal(`GET /api/games failed (${res.status})`);
          return;
        }

        const data = (await res.json()) as GamesApi;
        const list = data.games ?? [];
        setGames(list);

        const first = list[0]?.id ?? "";
        setSelectedGameId(first);
      } catch (e: any) {
        setFatal(`Exception loading games: ${e?.message ?? String(e)}`);
      }
    })();
  }, [router]);

  // 2) Load my characters for selected game
  useEffect(() => {
    if (!selectedGameId) {
      setMyCharacters([]);
      setSelectedCharacterId("");
      setSheetPayload(null);
      return;
    }

    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    (async () => {
      try {
        const res = await fetch(
          `/api/games/${encodeURIComponent(selectedGameId)}/characters/me`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (!res.ok) {
          setFatal(
            `GET /api/games/${selectedGameId}/characters/me failed (${res.status})`,
          );
          setMyCharacters([]);
          setSelectedCharacterId("");
          setSheetPayload(null);
          return;
        }

        const data = (await res.json()) as MyCharsApi;
        const items = data.items ?? [];
        setMyCharacters(items);

        const firstCharId = items[0]?.id ?? "";
        setSelectedCharacterId(firstCharId);
      } catch (e: any) {
        setFatal(`Exception loading characters: ${e?.message ?? String(e)}`);
        setMyCharacters([]);
        setSelectedCharacterId("");
        setSheetPayload(null);
      }
    })();
  }, [selectedGameId, router]);

  // 3) Load sheet for selected character
  useEffect(() => {
    if (!selectedCharacterId) {
      setSheetPayload(null);
      return;
    }

    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    setLoadingSheet(true);

    (async () => {
      try {
        const res = await fetch(`/api/characters/${selectedCharacterId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          // 404 = não existe OU não autorizado (sem leak)
          setSheetPayload(null);
          return;
        }

        const data = await res.json();
        setSheetPayload(data);
      } catch {
        setSheetPayload(null);
      } finally {
        setLoadingSheet(false);
      }
    })();
  }, [selectedCharacterId, router]);

  // toolbar: grayed os que não pertencem ao game selecionado
  const toolbarItems = useMemo(() => {
    return myCharacters.map((c) => ({
      ...c,
      isDisabled: Boolean(selectedGameId) && c.gameId !== selectedGameId,
    }));
  }, [myCharacters, selectedGameId]);

  if (fatal) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 18, marginBottom: 12 }}>Player Page Failed</h1>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            background: "#111",
            color: "#f55",
            padding: 12,
            borderRadius: 8,
          }}
        >
          {fatal}
        </pre>
      </div>
    );
  }

  return (
    <AppShell
      top={
        <TopBar
          title={activeCharName}
          subtitle={selectedGame?.name ?? ""}
          games={games}
          selectedGameId={selectedGameId}
          onGameChange={setSelectedGameId}
        />
      }
      left={
        <LeftToolbar
          title="My Characters"
          items={toolbarItems}
          selectedId={selectedCharacterId || null}
          onSelect={(id) => {
            const c = myCharacters.find((x) => x.id === id);
            if (!c) return;
            setSelectedCharacterId(id);
          }}
          disabledIds={toolbarItems
            .filter((x) => x.isDisabled)
            .map((x) => x.id)}
        />
      }
      main={
        <div className="p-4">
          {loadingSheet ? (
            <div className="muted">Loading sheet…</div>
          ) : sheetPayload ? (
            <CharacterSheet mode="readonly" sheet={sheetPayload} />
          ) : (
            <div className="muted">Select a character to view the sheet.</div>
          )}
        </div>
      }
      right={
        <RightPanel title="Audit Trail">
          Placeholder (XP audit entra aqui depois).
        </RightPanel>
      }
    />
  );
}

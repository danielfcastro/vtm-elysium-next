// app/storyteller/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { CharacterListItem, GameOption } from "@/types/app";

import AppShell from "@/components/app-shell/App-shell";
import TopBar from "@/components/app-shell/TopBar";
import LeftToolbar from "@/components/app-shell/LeftToolbar";
import RightPanel from "@/components/app-shell/RightPanel";
// Se seu modal já existe e está ok, descomente e ajuste o import:
// import GrantXpModal from "@/components/modals/GrantXpModal";

const TOKEN_KEY = "vtm_token";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

type StorytellerGamesApi = { games: GameOption[] };
type StorytellerCharsApi = { items: CharacterListItem[] };

export default function StorytellerPage() {
  const router = useRouter();

  const [fatal, setFatal] = useState<string | null>(null);

  const [games, setGames] = useState<GameOption[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>("");

  const selectedGame = useMemo(
      () => games.find((g) => g.id === selectedGameId) ?? null,
      [games, selectedGameId],
  );

  const [characters, setCharacters] = useState<CharacterListItem[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>("");

  const selectedCharacter = useMemo(
      () => characters.find((c) => c.id === selectedCharacterId) ?? null,
      [characters, selectedCharacterId],
  );

  // Grant XP (placeholder – mantenha o seu se já existe)
  const [grantOpen, setGrantOpen] = useState(false);

  // 1) Load games (storyteller)
  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/storyteller/games", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          setFatal(`GET /api/storyteller/games failed (${res.status})`);
          return;
        }

        const data = (await res.json()) as StorytellerGamesApi;
        const list = data.games ?? [];
        setGames(list);

        const first = list[0]?.id ?? "";
        setSelectedGameId(first);
      } catch (e: any) {
        setFatal(`Exception loading storyteller games: ${e?.message ?? String(e)}`);
      }
    })();
  }, [router]);

  // 2) Load characters for selected game
  useEffect(() => {
    if (!selectedGameId) {
      setCharacters([]);
      setSelectedCharacterId("");
      return;
    }

    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    (async () => {
      try {
        const url = `/api/storyteller/characters?gameId=${encodeURIComponent(
            selectedGameId,
        )}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          setFatal(`${url} failed (${res.status})`);
          setCharacters([]);
          setSelectedCharacterId("");
          return;
        }

        const data = (await res.json()) as StorytellerCharsApi;
        const items = data.items ?? [];
        setCharacters(items);

        const firstCharId = items[0]?.id ?? "";
        setSelectedCharacterId(firstCharId);
      } catch (e: any) {
        setFatal(`Exception loading storyteller characters: ${e?.message ?? String(e)}`);
        setCharacters([]);
        setSelectedCharacterId("");
      }
    })();
  }, [selectedGameId, router]);

  const toolbarItems = useMemo(() => {
    return characters.map((c) => ({
      ...c,
      isDisabled: Boolean(selectedGameId) && c.gameId !== selectedGameId,
    }));
  }, [characters, selectedGameId]);

  const activeTitle = "Storyteller";
  const activeSubtitle = selectedGame?.name ?? "";

  // 3) URL da ficha canônica
  const createUrl = useMemo(() => {
    if (!selectedCharacterId) return null;

    // mode=readonly é só um sinal; se o /create ainda não lê isso, ignore por enquanto
    const params = new URLSearchParams();
    params.set("characterId", selectedCharacterId);
    params.set("mode", "readonly");

    return `/create?${params.toString()}`;
  }, [selectedCharacterId]);

  if (fatal) {
    return (
        <div style={{ padding: 24 }}>
          <h1 style={{ fontSize: 18, marginBottom: 12 }}>Storyteller Page Failed</h1>
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
      <>
        <AppShell
            top={
              <TopBar
                  title={activeTitle}
                  subtitle={activeSubtitle}
                  games={games}
                  selectedGameId={selectedGameId}
                  onGameChange={setSelectedGameId}
                  // Se seu TopBar tiver prop "actions", descomente:
                  // actions={
                  //   <button className="btnPrimary" onClick={() => setGrantOpen(true)}>
                  //     Grant XP
                  //   </button>
                  // }
              />
            }
            left={
              <LeftToolbar
                  title="Characters"
                  items={toolbarItems}
                  selectedId={selectedCharacterId || null}
                  onSelect={(id) => {
                    const c = characters.find((x) => x.id === id);
                    if (!c) return;
                    setSelectedCharacterId(id);
                  }}
                  disabledIds={toolbarItems
                      .filter((x) => x.isDisabled)
                      .map((x) => x.id)}
              />
            }
            main={
              <div className="p-4" style={{ height: "100%" }}>
                {!createUrl ? (
                    <div className="muted">Select a character to view the sheet.</div>
                ) : (
                    <div style={{ height: "calc(100vh - 140px)" }}>
                      <div className="muted" style={{ marginBottom: 8 }}>
                        Game: {selectedGame?.name ?? "-"} | Character:{" "}
                        {selectedCharacter?.name ?? selectedCharacterId}
                      </div>

                      <iframe
                          src={createUrl}
                          style={{
                            width: "100%",
                            height: "100%",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 8,
                            background: "transparent",
                          }}
                      />
                    </div>
                )}
              </div>
            }
            right={
              <RightPanel title="Audit Trail">
                Placeholder (XP audit entra aqui depois).
              </RightPanel>
            }
        />

        {/* Se o seu modal já existe, reative aqui:
      <GrantXpModal
        open={grantOpen}
        gameId={selectedGameId}
        characters={characters}
        onClose={() => setGrantOpen(false)}
        onConfirm={async (payload) => {
          // page chama API grant XP e atualiza UI
          setGrantOpen(false);
        }}
      />
      */}
      </>
  );
}

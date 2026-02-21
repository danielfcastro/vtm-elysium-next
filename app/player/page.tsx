// app/player/page.tsx
"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter } from "next/navigation";

import type { CharacterListItem, GameOption } from "@/types/app";

import AppShell from "@/components/app-shell/App-shell";
import TopBar from "@/components/app-shell/TopBar";
import LeftToolbar from "@/components/app-shell/LeftToolbar";
import RightPanel from "@/components/app-shell/RightPanel";
import CharacterSheet from "@/components/character-sheet/CharacterSheet";
import CreateCharacterPage from "@/app/create/page";

const TOKEN_KEY = "vtm_token";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

type GamesApi = { games: GameOption[] };
type MyCharsApi = { items: CharacterListItem[] };
type CreateCharacterResponse = { character: CharacterListItem };

export default function PlayerPage() {
  const router = useRouter();

  const [fatal, setFatal] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Track if we're editing a character (create/edit mode)
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(
    null,
  );

  const [games, setGames] = useState<GameOption[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>("");

  //const selectedGame = useMemo(() => games.find((g) => g.id === selectedGameId) ?? null,[games, selectedGameId],);

  const [myCharacters, setMyCharacters] = useState<CharacterListItem[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>("");

  const selectedCharacter = useMemo(
    () => myCharacters.find((c) => c.id === selectedCharacterId) ?? null,
    [myCharacters, selectedCharacterId],
  );

  const activeCharName = selectedCharacter?.name ?? "(No character selected)";

  const [sheetPayload, setSheetPayload] = useState<any | null>(null);
  const [characterStatus, setCharacterStatus] = useState<string | null>(null);
  const [loadingSheet, setLoadingSheet] = useState(false);

  // Audit logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

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
        setSheetPayload(data.character ?? data);
        setCharacterStatus(data.character?.status ?? null);
      } catch {
        setSheetPayload(null);
      } finally {
        setLoadingSheet(false);
      }
    })();
  }, [selectedCharacterId, router]);

  // 4) Load audit logs for selected character
  useEffect(() => {
    if (!selectedCharacterId) {
      setAuditLogs([]);
      return;
    }

    const token = getToken();
    if (!token) return;

    setLoadingAudit(true);

    (async () => {
      try {
        const res = await fetch(
          `/api/characters/${selectedCharacterId}/audit?limit=100`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (!res.ok) {
          setAuditLogs([]);
          return;
        }

        const data = await res.json();
        setAuditLogs(data.items ?? []);
      } catch {
        setAuditLogs([]);
      } finally {
        setLoadingAudit(false);
      }
    })();
  }, [selectedCharacterId, editingCharacterId]);

  // toolbar: grayed os que não pertencem ao game selecionado
  const toolbarItems = useMemo(() => {
    return myCharacters.map((c) => ({
      ...c,
      isDisabled: Boolean(selectedGameId) && c.gameId !== selectedGameId,
    }));
  }, [myCharacters, selectedGameId]);

  // Create a new character for the selected game
  async function handleCreateCharacter() {
    if (!selectedGameId) {
      setFatal("Select a game first.");
      return;
    }

    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    setIsCreating(true);
    setFatal(null);

    try {
      const res = await fetch(`/api/games/${selectedGameId}/characters`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setFatal(`Failed to create character: ${err.error ?? res.statusText}`);
        return;
      }

      const data = (await res.json()) as CreateCharacterResponse;
      const newCharacter = data.character;

      // Set editing mode with the new character ID
      setEditingCharacterId(newCharacter.id);
      setSelectedCharacterId(newCharacter.id);
    } catch (e: any) {
      setFatal(`Exception creating character: ${e?.message ?? String(e)}`);
    } finally {
      setIsCreating(false);
    }
  }

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
          titleLeft={activeCharName}
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
          headerAction={
            <button
              type="button"
              className="btn"
              onClick={handleCreateCharacter}
              disabled={!selectedGameId || isCreating}
              style={{ padding: "4px 8px", fontSize: 12 }}
            >
              {isCreating ? "..." : "+ New"}
            </button>
          }
        />
      }
      main={
        <div className="p-4">
          {editingCharacterId ? (
            <Suspense fallback={<div className="muted">Loading...</div>}>
              <CreateCharacterPageWrapper characterId={editingCharacterId} />
            </Suspense>
          ) : loadingSheet ? (
            <div className="muted">Loading sheet…</div>
          ) : sheetPayload ? (
            <>
              {characterStatus !== "SUBMITTED" &&
                characterStatus !== "APPROVED" &&
                characterStatus !== "XP" && (
                  <div style={{ marginBottom: 16, display: "flex", gap: 12 }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        if (selectedCharacterId) {
                          setEditingCharacterId(selectedCharacterId);
                        }
                      }}
                    >
                      Edit Character
                    </button>
                  </div>
                )}
              <CharacterSheet
                mode="readonly"
                sheet={sheetPayload}
                characterStatus={characterStatus}
              />
            </>
          ) : (
            <div className="muted">
              <p>Select a character to view the sheet.</p>
            </div>
          )}
        </div>
      }
      right={
        <RightPanel
          title={editingCharacterId ? "Character Info" : "Audit Trail"}
        >
          {editingCharacterId ? (
            <>
              {sheetPayload?.clan?.weakness && (
                <div style={{ marginBottom: 16 }}>
                  <h4
                    className="h4"
                    style={{ color: "#ff6b6b", marginBottom: 4 }}
                  >
                    Weakness
                  </h4>
                  <p className="muted" style={{ fontSize: 12 }}>
                    {sheetPayload.clan.weakness}
                  </p>
                </div>
              )}
              <div>
                <h4 className="h4" style={{ marginBottom: 8 }}>
                  Recent Changes
                </h4>
                {loadingAudit ? (
                  <div className="muted">Loading...</div>
                ) : auditLogs.length > 0 ? (
                  <div style={{ flex: 1, overflowY: "auto" }}>
                    {auditLogs.map((log: any, idx: number) => {
                      const message = log.payload?.message ?? log.action_type;
                      const isFreebieLine = message?.startsWith("Freebie |");
                      const isStartingLine = message?.startsWith("Start");
                      const isXPAwardedLine =
                        message?.startsWith("XP | Awarded");
                      const isXPSpentLine = message?.startsWith("XP | Spent");
                      const isSpecialtyLine =
                        message?.startsWith("Specialization |");
                      const isMeritLine = message?.startsWith("Merit |");
                      const isFlawLine = message?.startsWith("Flaw |");

                      let style: React.CSSProperties = { fontSize: 12 };
                      if (isFreebieLine) {
                        style = {
                          color: "#0070f3",
                          fontWeight: 700,
                          fontSize: 12,
                        };
                      } else if (isStartingLine) {
                        style = {
                          color: "#ffffff",
                          fontWeight: 700,
                          fontSize: 12,
                        };
                      } else if (isXPAwardedLine) {
                        style = {
                          color: "#c0c0c0",
                          fontWeight: 700,
                          fontSize: 12,
                        };
                      } else if (isXPSpentLine) {
                        style = {
                          color: "#ff8c00",
                          fontWeight: 700,
                          fontSize: 12,
                        };
                      } else if (isSpecialtyLine) {
                        style = {
                          color: "#90ee90",
                          fontWeight: 700,
                          fontSize: 12,
                        };
                      } else if (isMeritLine) {
                        style = {
                          color: "#90ee90",
                          fontWeight: 700,
                          fontSize: 12,
                        };
                      } else if (isFlawLine) {
                        style = {
                          color: "#ff6b6b",
                          fontWeight: 700,
                          fontSize: 12,
                        };
                      }

                      return (
                        <div
                          key={log.id ?? idx}
                          style={{
                            padding: "6px 0",
                            borderBottom: "1px solid var(--border-color)",
                          }}
                        >
                          <div className="muted" style={{ fontSize: 10 }}>
                            {new Date(log.created_at).toLocaleString()}
                          </div>
                          <div style={style}>{message}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="muted">No changes yet.</p>
                )}
              </div>
            </>
          ) : loadingAudit ? (
            <div className="muted">Loading audit...</div>
          ) : auditLogs.length > 0 ? (
            <div style={{ flex: 1, overflowY: "auto" }}>
              {auditLogs.map((log: any, idx: number) => {
                const message = log.payload?.message ?? log.action_type;
                const isFreebieLine = message?.startsWith("Freebie |");
                const isStartingLine = message?.startsWith("Start");
                const isXPAwardedLine = message?.startsWith("XP | Awarded");
                const isXPSpentLine = message?.startsWith("XP | Spent");
                const isSpecialtyLine = message?.startsWith("Specialization |");
                const isMeritLine = message?.startsWith("Merit |");
                const isFlawLine = message?.startsWith("Flaw |");

                let style: React.CSSProperties = { fontSize: 12 };
                if (isFreebieLine) {
                  style = { color: "#0070f3", fontWeight: 700, fontSize: 12 };
                } else if (isStartingLine) {
                  style = { color: "#ffffff", fontWeight: 700, fontSize: 12 };
                } else if (isXPAwardedLine) {
                  style = { color: "#c0c0c0", fontWeight: 700, fontSize: 12 };
                } else if (isXPSpentLine) {
                  style = { color: "#ff8c00", fontWeight: 700, fontSize: 12 };
                } else if (isSpecialtyLine) {
                  style = { color: "#90ee90", fontWeight: 700, fontSize: 12 };
                } else if (isMeritLine) {
                  style = { color: "#90ee90", fontWeight: 700, fontSize: 12 };
                } else if (isFlawLine) {
                  style = { color: "#ff6b6b", fontWeight: 700, fontSize: 12 };
                }

                return (
                  <div
                    key={log.id ?? idx}
                    style={{
                      padding: "6px 0",
                      borderBottom: "1px solid var(--border-color)",
                    }}
                  >
                    <div className="muted">
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                    <div style={style}>{message}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="muted">No audit logs found.</p>
          )}
        </RightPanel>
      }
    />
  );
}

function CreateCharacterPageWrapper({ characterId }: { characterId: string }) {
  return (
    <CreateCharacterPage searchParams={Promise.resolve({ characterId })} />
  );
}

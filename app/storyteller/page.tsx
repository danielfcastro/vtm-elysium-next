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
  const [characterStatus, setCharacterStatus] = useState<string | null>(null);

  const [grantOpen, setGrantOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [loadingSheet, setLoadingSheet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Audit trail state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

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
      setCharacterStatus(data?.character?.status ?? null);
      setLoadingSheet(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router, selectedCharacterId]);

  // Load audit logs for selected character
  useEffect(() => {
    if (!selectedCharacterId) {
      setAuditLogs([]);
      return;
    }

    let cancelled = false;

    async function run() {
      const token = getToken();
      if (!token) return;

      setLoadingAudit(true);

      const { ok, body } = await fetchJson(
        `/api/characters/${selectedCharacterId}/audit?limit=100`,
        token,
      );

      if (cancelled) return;

      if (ok && body?.items) {
        setAuditLogs(body.items);
      } else {
        setAuditLogs([]);
      }
      setLoadingAudit(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [selectedCharacterId]);

  async function handleApprove() {
    if (!selectedCharacterId || actionLoading) return;

    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/storyteller/characters/${selectedCharacterId}/approve`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error ?? "Failed to approve");
        return;
      }

      const data = await res.json();
      setCharacterStatus(data.character.status);
    } catch (e: any) {
      setError(e?.message ?? "Error approving character");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!selectedCharacterId || actionLoading || !rejectReason.trim()) return;

    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/storyteller/characters/${selectedCharacterId}/reject`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason: rejectReason.trim() }),
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error ?? "Failed to reject");
        return;
      }

      const data = await res.json();
      setCharacterStatus(data.character.status);
      setRejectOpen(false);
      setRejectReason("");
    } catch (e: any) {
      setError(e?.message ?? "Error rejecting character");
    } finally {
      setActionLoading(false);
    }
  }

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
            {characterStatus === "SUBMITTED" && (
              <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="btn"
                  onClick={handleApprove}
                  disabled={actionLoading}
                  style={{ flex: 1, backgroundColor: "#2a5a2a" }}
                >
                  {actionLoading ? "..." : "Approve"}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setRejectOpen(true)}
                  disabled={actionLoading}
                  style={{ flex: 1, backgroundColor: "#5a2a2a" }}
                >
                  Reject
                </button>
              </div>
            )}

            {rejectOpen && (
              <div style={{ marginBottom: 12 }}>
                <textarea
                  className="textInput"
                  placeholder="Rejection reason..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  style={{ width: "100%", marginBottom: 8 }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleReject}
                    disabled={actionLoading || !rejectReason.trim()}
                    style={{ flex: 1, backgroundColor: "#5a2a2a" }}
                  >
                    {actionLoading ? "..." : "Confirm Reject"}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setRejectOpen(false);
                      setRejectReason("");
                    }}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {characterStatus && characterStatus !== "SUBMITTED" && (
              <p className="muted" style={{ marginBottom: 12 }}>
                Status: <strong>{characterStatus}</strong>
              </p>
            )}

            {loadingAudit ? (
              <div className="muted">Loading audit...</div>
            ) : auditLogs.length > 0 ? (
              <div style={{ flex: 1, overflowY: "auto" }}>
                {auditLogs.map((log: any, idx: number) => {
                  const message = log.payload?.message ?? log.action_type;
                  const isFreebieLine = message.startsWith("Freebie |");
                  const isStartingLine = message.startsWith("Start");
                  const isXPLine = message.startsWith("XP");
                  const isSpecialtyLine =
                    message.startsWith("Specialization |");

                  let style: React.CSSProperties = { fontSize: 12 };
                  if (isFreebieLine) {
                    style = { color: "#0070f3", fontWeight: 700, fontSize: 12 };
                  } else if (isStartingLine) {
                    style = { color: "#ffffff", fontWeight: 700, fontSize: 12 };
                  } else if (isXPLine) {
                    style = { color: "#00a000", fontWeight: 700, fontSize: 12 };
                  } else if (isSpecialtyLine) {
                    style = { color: "#90ee90", fontWeight: 700, fontSize: 12 };
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
              <div className="muted">No audit logs found.</div>
            )}
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

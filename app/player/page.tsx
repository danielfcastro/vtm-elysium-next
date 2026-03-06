// app/player/page.tsx
"use client";

import { useEffect, useMemo, useState, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";

import type { CharacterListItem, GameOption } from "@/types/app";

import AppShell from "@/components/app-shell/App-shell";
import TopBar from "@/components/app-shell/TopBar";
import LeftToolbar from "@/components/app-shell/LeftToolbar";
import RightPanel from "@/components/app-shell/RightPanel";
import CharacterSheet from "@/components/character-sheet/CharacterSheet";
import { CreateCharacterPage } from "@/app/create/page";
import XpDrawer from "@/components/xp-drawer/XpDrawer";
import { useI18n } from "@/i18n";

const TOKEN_KEY = "vtm_token";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

async function startXpMode(characterId: string) {
  const token = getToken();
  if (!token) return null;

  const res = await fetch(`/api/characters/${characterId}/xp/start`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return null;
  return res.json();
}

type GamesApi = { games: GameOption[] };
type MyCharsApi = { items: CharacterListItem[] };
type CreateCharacterResponse = { character: CharacterListItem };

export default function PlayerPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [fatal, setFatal] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // User info for TopBar - loaded on client only to avoid hydration mismatch
  const [userName, setUserName] = useState<string | undefined>(undefined);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);

  useEffect(() => {
    setUserName(localStorage.getItem("vtm_user_name") || undefined);
    setUserEmail(localStorage.getItem("vtm_user_email") || undefined);
  }, []);

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

  const activeCharName =
    selectedCharacter?.name ?? t("player.noCharacterSelected");

  const [sheetPayload, setSheetPayload] = useState<any | null>(null);
  const [characterStatus, setCharacterStatus] = useState<string | null>(null);
  const [loadingSheet, setLoadingSheet] = useState(false);

  // XP drawer state
  const [xpDrawerOpen, setXpDrawerOpen] = useState(false);
  const [savingXp, setSavingXp] = useState(false);
  const [pendingXpData, setPendingXpData] = useState<{
    pendingSpends: any[];
    totalPendingXp: number;
  } | null>(null);

  // Audit logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditPage, setAuditPage] = useState(0);
  const [auditPageSize, setAuditPageSize] = useState(20);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditActionType, setAuditActionType] = useState<string>("");
  const prevAuditCharacterId = useRef<string | null>(null);

  // Edit profile
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCurrentPassword, setEditCurrentPassword] = useState("");
  const [editNewPassword, setEditNewPassword] = useState("");
  const [editConfirmPassword, setEditConfirmPassword] = useState("");
  const [editProfileLoading, setEditProfileLoading] = useState(false);
  const [editProfileError, setEditProfileError] = useState<string | null>(null);
  const [editProfileSuccess, setEditProfileSuccess] = useState(false);

  useEffect(() => {
    if (editProfileOpen) {
      setEditName(localStorage.getItem("vtm_user_name") || "");
      setEditEmail(localStorage.getItem("vtm_user_email") || "");
      setEditCurrentPassword("");
      setEditNewPassword("");
      setEditConfirmPassword("");
      setEditProfileError(null);
      setEditProfileSuccess(false);
    }
  }, [editProfileOpen]);

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

  // Track if we've already selected a character after initial load
  const [hasInitiallySelectedCharacter, setHasInitiallySelectedCharacter] =
    useState(false);

  // 2) Load my characters for selected game
  useEffect(() => {
    if (!selectedGameId) {
      setMyCharacters([]);
      setSelectedCharacterId("");
      setSheetPayload(null);
      setHasInitiallySelectedCharacter(false);
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

        // Only auto-select first character on initial load or if current selection is invalid
        const firstCharId = items[0]?.id ?? "";
        if (
          !hasInitiallySelectedCharacter ||
          !selectedCharacterId ||
          !items.find((c: any) => c.id === selectedCharacterId)
        ) {
          setSelectedCharacterId(firstCharId);
          setHasInitiallySelectedCharacter(true);
        }
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

  // 4) Load audit logs for selected character (or editing character)
  const auditCharacterId = editingCharacterId || selectedCharacterId;

  useEffect(() => {
    // Check if character changed - if so, reset page and clear logs
    if (prevAuditCharacterId.current !== auditCharacterId) {
      prevAuditCharacterId.current = auditCharacterId;
      setAuditPage(0);
      setAuditLogs([]);
      setAuditTotal(0);
    }

    if (!auditCharacterId) {
      return;
    }

    const token = getToken();
    if (!token) return;

    setLoadingAudit(true);

    (async () => {
      // Capture the characterId at the time of the request
      const characterIdAtRequest = auditCharacterId;

      try {
        const offset = auditPage * auditPageSize;
        const params = new URLSearchParams({
          limit: String(auditPageSize),
          offset: String(offset),
        });
        if (auditActionType) params.set("actionType", auditActionType);

        const res = await fetch(
          `/api/characters/${characterIdAtRequest}/audit?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        // Ignore stale responses - only update if we're still on the same character
        if (characterIdAtRequest !== auditCharacterId) {
          return;
        }

        if (!res.ok) {
          setAuditLogs([]);
          return;
        }

        const data = await res.json();

        // Double-check after fetching
        if (characterIdAtRequest !== auditCharacterId) {
          return;
        }

        setAuditLogs(data.items ?? []);
        setAuditTotal(data.total ?? 0);
      } catch {
        // Ignore stale responses
        if (characterIdAtRequest !== auditCharacterId) {
          return;
        }
        setAuditLogs([]);
      } finally {
        // Only update loading state if we're still on the same character
        if (characterIdAtRequest === auditCharacterId) {
          setLoadingAudit(false);
        }
      }
    })();
  }, [auditCharacterId, auditPage, auditPageSize, auditActionType]);

  // Fetch pending XP data when drawer opens OR when character loads
  useEffect(() => {
    const token = getToken();
    if (!token || !selectedCharacterId) return;

    (async () => {
      try {
        const res = await fetch(
          `/api/characters/${selectedCharacterId}/xp/spend-draft`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (res.ok) {
          const data = await res.json();
          setPendingXpData(data);
        }
      } catch {
        setPendingXpData(null);
      }
    })();
  }, [selectedCharacterId, xpDrawerOpen]);

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

  // Submit XP spends for storyteller approval (keeps as PENDING)
  async function handleSubmitForApproval(characterId: string) {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      // Just refresh the data - the XP spends are already PENDING from the drawer save
      // Storyteller will approve them later
      setPendingXpData(null);

      // Refresh the character data
      setSelectedCharacterId("");
      setTimeout(() => {
        setSelectedCharacterId(characterId);
      }, 300);
    } catch (e: any) {
      setFatal(`Failed to submit XP: ${e?.message ?? "Unknown error"}`);
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
    <>
      <AppShell
        top={
          <TopBar
            titleLeft={activeCharName}
            games={games}
            selectedGameId={selectedGameId}
            onGameChange={setSelectedGameId}
            userName={userName}
            userEmail={userEmail}
            onLogout={() => {
              localStorage.removeItem("vtm_token");
              localStorage.removeItem("vtm_user_name");
              localStorage.removeItem("vtm_user_email");
              router.push("/login");
            }}
            onEditProfile={() => {
              setEditProfileOpen(true);
            }}
          />
        }
        left={
          <LeftToolbar
            title={t("player.myCharacters")}
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
            compact={true}
            renderActions={(item) => {
              const status = item.status;
              const canSpendXp = status === "XP" || status === "APPROVED";
              const canEdit =
                status === "DRAFT_PHASE1" ||
                status === "DRAFT_PHASE2" ||
                status === "REJECTED";
              if (!canSpendXp && !canEdit) return null;
              return (
                <>
                  {canEdit && (
                    <button
                      type="button"
                      className="btn-mini"
                      title={t("player.editCharacter")}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCharacterId(item.id);
                        setEditingCharacterId(item.id);
                      }}
                      style={{
                        padding: "2px 6px",
                        fontSize: 10,
                        backgroundColor: "#2a4a2a",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t("common.edit")}
                    </button>
                  )}
                  {canSpendXp && (
                    <>
                      <button
                        type="button"
                        className="btn-mini"
                        title={t("player.spendXp")}
                        onClick={async (e) => {
                          e.stopPropagation();
                          // Start XP mode if coming from APPROVED status
                          if (item.status === "APPROVED") {
                            await startXpMode(item.id);
                            // Update the character in the list to show XP status
                            setMyCharacters((prev) =>
                              prev.map((c) =>
                                c.id === item.id ? { ...c, status: "XP" } : c,
                              ),
                            );
                          }
                          setSelectedCharacterId(item.id);
                          setXpDrawerOpen(true);
                        }}
                        style={{
                          padding: "2px 6px",
                          fontSize: 10,
                          backgroundColor: "#2a4a2a",
                        }}
                      >
                        XP
                      </button>
                      <button
                        type="button"
                        className="btn-mini"
                        title={t("player.submitForApproval")}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSubmitForApproval(item.id);
                        }}
                        style={{
                          padding: "2px 6px",
                          fontSize: 10,
                          backgroundColor: "#4a2a4a",
                        }}
                      >
                        ✓
                      </button>
                    </>
                  )}
                </>
              );
            }}
            headerAction={
              <button
                type="button"
                className="btn"
                onClick={handleCreateCharacter}
                disabled={!selectedGameId || isCreating}
                style={{ padding: "4px 8px", fontSize: 12 }}
              >
                {isCreating ? "..." : "+ " + t("player.newCharacter")}
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
              <div className="muted">{t("player.loadingSheet")}</div>
            ) : sheetPayload ? (
              <>
                <CharacterSheet
                  mode="readonly"
                  sheet={sheetPayload?.sheet ?? sheetPayload}
                  characterStatus={characterStatus}
                  pendingSpends={pendingXpData?.pendingSpends ?? []}
                />
              </>
            ) : (
              <div className="muted">
                <p>{t("player.selectCharacter")}</p>
              </div>
            )}
          </div>
        }
        right={
          <RightPanel
            title={
              editingCharacterId
                ? t("player.characterInfo")
                : t("player.auditTrail")
            }
          >
            {editingCharacterId ? (
              <>
                {sheetPayload?.clan?.weakness && (
                  <div style={{ marginBottom: 16 }}>
                    <h4
                      className="h4"
                      style={{ color: "#ff6b6b", marginBottom: 4 }}
                    >
                      {t("player.weakness")}
                    </h4>
                    <p className="muted" style={{ fontSize: 12 }}>
                      {sheetPayload.clan.weakness}
                    </p>
                  </div>
                )}
                <div>
                  <h4 className="h4" style={{ marginBottom: 8 }}>
                    {t("player.recentChanges")}
                  </h4>
                  {loadingAudit ? (
                    <div className="muted">Loading...</div>
                  ) : auditLogs.length > 0 ? (
                    <>
                      <div
                        style={{
                          marginBottom: 4,
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span className="muted" style={{ fontSize: 10 }}>
                          Rows per page:
                        </span>
                        <select
                          value={auditPageSize}
                          onChange={(e) => {
                            setAuditPageSize(Number(e.target.value));
                            setAuditPage(0);
                          }}
                          style={{
                            fontSize: 10,
                            padding: "1px 2px",
                            background: "#222",
                            color: "#aaa",
                            border: "1px solid #444",
                          }}
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                        <span className="muted" style={{ fontSize: 10 }}>
                          Filter:
                        </span>
                        <select
                          value={auditActionType}
                          onChange={(e) => {
                            setAuditActionType(e.target.value);
                            setAuditPage(0);
                          }}
                          style={{
                            fontSize: 10,
                            padding: "1px 2px",
                            background: "#222",
                            color: "#aaa",
                            border: "1px solid #444",
                          }}
                        >
                          <option value="">All</option>
                          <option value="1">Starting Points</option>
                          <option value="2">Freebie</option>
                          <option value="3">XP</option>
                          <option value="4">Specialty</option>
                          <option value="5">Merit/Flaw</option>
                        </select>
                      </div>
                      <div
                        style={{
                          marginBottom: 8,
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <button
                          type="button"
                          className="btn-mini"
                          disabled={auditPage === 0}
                          onClick={() => setAuditPage(0)}
                          style={{
                            opacity: auditPage === 0 ? 0.5 : 1,
                            padding: "2px 4px",
                            fontSize: 10,
                          }}
                        >
                          ««
                        </button>
                        <button
                          type="button"
                          className="btn-mini"
                          disabled={auditPage === 0}
                          onClick={() =>
                            setAuditPage((p) => Math.max(0, p - 1))
                          }
                          style={{
                            opacity: auditPage === 0 ? 0.5 : 1,
                            padding: "2px 4px",
                            fontSize: 10,
                          }}
                        >
                          «
                        </button>
                        <span className="muted" style={{ fontSize: 10 }}>
                          {auditPage + 1}/
                          {Math.ceil(auditTotal / auditPageSize)}
                        </span>
                        <button
                          type="button"
                          className="btn-mini"
                          disabled={
                            (auditPage + 1) * auditPageSize >= auditTotal
                          }
                          onClick={() => setAuditPage((p) => p + 1)}
                          style={{
                            opacity:
                              (auditPage + 1) * auditPageSize >= auditTotal
                                ? 0.5
                                : 1,
                            padding: "2px 4px",
                            fontSize: 10,
                          }}
                        >
                          »
                        </button>
                        <button
                          type="button"
                          className="btn-mini"
                          disabled={
                            (auditPage + 1) * auditPageSize >= auditTotal
                          }
                          onClick={() =>
                            setAuditPage(
                              Math.ceil(auditTotal / auditPageSize) - 1,
                            )
                          }
                          style={{
                            opacity:
                              (auditPage + 1) * auditPageSize >= auditTotal
                                ? 0.5
                                : 1,
                            padding: "2px 4px",
                            fontSize: 10,
                          }}
                        >
                          »»
                        </button>
                      </div>
                      <div style={{ flex: 1, overflowY: "auto" }}>
                        {auditLogs.map((log: any, idx: number) => {
                          const message =
                            log.payload?.message ?? log.action_type;
                          const isFreebieLine =
                            message?.startsWith("Freebie |");
                          const isStartingLine = message?.startsWith("Start");
                          const isXPAwardedLine =
                            message?.startsWith("XP | Awarded");
                          const isXPSpentLine =
                            message?.startsWith("XP | Spent");
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
                    </>
                  ) : (
                    <p className="muted">{t("player.noChangesYet")}</p>
                  )}
                </div>
              </>
            ) : loadingAudit ? (
              <div className="muted">{t("player.loading")}</div>
            ) : auditLogs.length > 0 ? (
              <>
                <div
                  style={{
                    marginBottom: 4,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span className="muted" style={{ fontSize: 10 }}>
                    Rows per page:
                  </span>
                  <select
                    value={auditPageSize}
                    onChange={(e) => {
                      setAuditPageSize(Number(e.target.value));
                      setAuditPage(0);
                    }}
                    style={{
                      fontSize: 10,
                      padding: "1px 2px",
                      background: "#222",
                      color: "#aaa",
                      border: "1px solid #444",
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="muted" style={{ fontSize: 10 }}>
                    Filter:
                  </span>
                  <select
                    value={auditActionType}
                    onChange={(e) => {
                      setAuditActionType(e.target.value);
                      setAuditPage(0);
                    }}
                    style={{
                      fontSize: 10,
                      padding: "1px 2px",
                      background: "#222",
                      color: "#aaa",
                      border: "1px solid #444",
                    }}
                  >
                    <option value="">All</option>
                    <option value="1">Starting Points</option>
                    <option value="2">Freebie</option>
                    <option value="3">XP</option>
                    <option value="4">Specialty</option>
                    <option value="5">Merit/Flaw</option>
                  </select>
                </div>
                <div
                  style={{
                    marginBottom: 8,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <button
                    type="button"
                    className="btn-mini"
                    disabled={auditPage === 0}
                    onClick={() => setAuditPage(0)}
                    style={{
                      opacity: auditPage === 0 ? 0.5 : 1,
                      padding: "2px 4px",
                      fontSize: 10,
                    }}
                  >
                    ««
                  </button>
                  <button
                    type="button"
                    className="btn-mini"
                    disabled={auditPage === 0}
                    onClick={() => setAuditPage((p) => Math.max(0, p - 1))}
                    style={{
                      opacity: auditPage === 0 ? 0.5 : 1,
                      padding: "2px 4px",
                      fontSize: 10,
                    }}
                  >
                    «
                  </button>
                  <span className="muted" style={{ fontSize: 10 }}>
                    {auditPage + 1}/{Math.ceil(auditTotal / auditPageSize)}
                  </span>
                  <button
                    type="button"
                    className="btn-mini"
                    disabled={(auditPage + 1) * auditPageSize >= auditTotal}
                    onClick={() => setAuditPage((p) => p + 1)}
                    style={{
                      opacity:
                        (auditPage + 1) * auditPageSize >= auditTotal ? 0.5 : 1,
                      padding: "2px 4px",
                      fontSize: 10,
                    }}
                  >
                    »
                  </button>
                  <button
                    type="button"
                    className="btn-mini"
                    disabled={(auditPage + 1) * auditPageSize >= auditTotal}
                    onClick={() =>
                      setAuditPage(Math.ceil(auditTotal / auditPageSize) - 1)
                    }
                    style={{
                      opacity:
                        (auditPage + 1) * auditPageSize >= auditTotal ? 0.5 : 1,
                      padding: "2px 4px",
                      fontSize: 10,
                    }}
                  >
                    »»
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: "auto" }}>
                  {auditLogs.map((log: any, idx: number) => {
                    const message = log.payload?.message ?? log.action_type;
                    const isFreebieLine = message?.startsWith("Freebie |");
                    const isStartingLine = message?.startsWith("Start");
                    const isXPAwardedLine = message?.startsWith("XP | Awarded");
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
                        <div className="muted">
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                        <div style={style}>{message}</div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="muted">{t("player.noChangesYet")}</p>
            )}
          </RightPanel>
        }
      />

      <XpDrawer
        isOpen={xpDrawerOpen}
        onClose={() => setXpDrawerOpen(false)}
        sheet={sheetPayload?.sheet ?? sheetPayload}
        baseAvailableXp={Math.max(
          0,
          (sheetPayload?.totalExperience ?? 0) -
            (sheetPayload?.spentExperience ?? 0),
        )}
        pendingSpends={pendingXpData?.pendingSpends ?? []}
        onCancelPending={async () => {
          const token = getToken();
          if (!token) {
            router.push("/login");
            return;
          }

          setSavingXp(true);
          try {
            const res = await fetch(
              `/api/characters/${selectedCharacterId}/xp/spend-draft`,
              {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            );

            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(
                err.error?.message ?? "Failed to cancel pending XP",
              );
            }

            setPendingXpData(null);
            setXpDrawerOpen(false);
          } finally {
            setSavingXp(false);
          }
        }}
        onSave={async (spends) => {
          const token = getToken();
          if (!token) {
            router.push("/login");
            return;
          }

          setSavingXp(true);
          try {
            const res = await fetch(
              `/api/characters/${selectedCharacterId}/xp/spend-draft`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ spends }),
              },
            );

            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err.error?.message ?? "Failed to save XP draft");
            }

            const data = await res.json();
            setSheetPayload(data.sheet ?? sheetPayload);

            const res2 = await fetch(
              `/api/characters/${selectedCharacterId}/xp/spend-draft`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );
            if (res2.ok) {
              const data2 = await res2.json();
              setPendingXpData(data2);
            }

            setXpDrawerOpen(false);
          } finally {
            setSavingXp(false);
          }
        }}
      />

      {editProfileOpen && (
        <div
          className="drawer-overlay"
          onClick={() => setEditProfileOpen(false)}
        >
          <div
            className="drawer"
            onClick={(e) => e.stopPropagation()}
            style={{ width: 400 }}
          >
            <div className="drawer-header">
              <h3 className="h3">Editar Perfil</h3>
              <button
                type="button"
                className="drawer-close"
                onClick={() => setEditProfileOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="drawer-body">
              {editProfileError && (
                <div
                  style={{
                    border: "1px solid #7a2b2b",
                    background: "rgba(197, 37, 37, 0.10)",
                    borderRadius: 6,
                    padding: "10px 12px",
                    marginBottom: 14,
                  }}
                >
                  {editProfileError}
                </div>
              )}

              {editProfileSuccess && (
                <div
                  style={{
                    border: "1px solid #2a5a2a",
                    background: "rgba(42, 90, 42, 0.10)",
                    borderRadius: 6,
                    padding: "10px 12px",
                    marginBottom: 14,
                  }}
                >
                  Perfil atualizado com sucesso!
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 6 }}>
                  Nome
                </label>
                <input
                  className="textInput"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={editProfileLoading}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 6 }}>
                  Email
                </label>
                <input
                  className="textInput"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  disabled={editProfileLoading}
                  style={{ width: "100%" }}
                />
              </div>

              <hr style={{ borderColor: "#333", margin: "20px 0" }} />

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 6 }}>
                  Senha Atual (para alterar senha)
                </label>
                <input
                  className="textInput"
                  type="password"
                  value={editCurrentPassword}
                  onChange={(e) => setEditCurrentPassword(e.target.value)}
                  disabled={editProfileLoading}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 6 }}>
                  Nova Senha
                </label>
                <input
                  className="textInput"
                  type="password"
                  value={editNewPassword}
                  onChange={(e) => setEditNewPassword(e.target.value)}
                  disabled={editProfileLoading}
                  minLength={6}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 6 }}>
                  Confirmar Nova Senha
                </label>
                <input
                  className="textInput"
                  type="password"
                  value={editConfirmPassword}
                  onChange={(e) => setEditConfirmPassword(e.target.value)}
                  disabled={editProfileLoading}
                  minLength={6}
                  style={{ width: "100%" }}
                />
              </div>

              <button
                type="button"
                className="btn"
                style={{ width: "100%", backgroundColor: "#2a5a2a" }}
                onClick={async () => {
                  setEditProfileError(null);
                  setEditProfileSuccess(false);

                  if (
                    editNewPassword &&
                    editNewPassword !== editConfirmPassword
                  ) {
                    setEditProfileError("As senhas não conferem.");
                    return;
                  }

                  const token = getToken();
                  if (!token) {
                    router.push("/login");
                    return;
                  }

                  setEditProfileLoading(true);
                  try {
                    const res = await fetch("/api/profile", {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        name: editName,
                        email: editEmail,
                        currentPassword: editCurrentPassword || null,
                        newPassword: editNewPassword || null,
                      }),
                    });

                    const data = await res.json().catch(() => null);

                    if (!res.ok) {
                      const msg =
                        (data &&
                          typeof data === "object" &&
                          (data as any).error) ||
                        "Erro ao atualizar perfil.";
                      throw new Error(String(msg));
                    }

                    if (editName) {
                      localStorage.setItem("vtm_user_name", editName);
                    }
                    if (editEmail) {
                      localStorage.setItem("vtm_user_email", editEmail);
                    }

                    setEditProfileSuccess(true);
                    setEditCurrentPassword("");
                    setEditNewPassword("");
                    setEditConfirmPassword("");
                  } catch (err) {
                    setEditProfileError(
                      err instanceof Error
                        ? err.message
                        : "Erro ao atualizar perfil.",
                    );
                  } finally {
                    setEditProfileLoading(false);
                  }
                }}
                disabled={editProfileLoading}
              >
                {editProfileLoading ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CreateCharacterPageWrapper({
  characterId,
}: {
  characterId: string | null;
}) {
  if (characterId) {
    return <CreateCharacterPage characterId={characterId} />;
  }
  return <CreateCharacterPage />;
}

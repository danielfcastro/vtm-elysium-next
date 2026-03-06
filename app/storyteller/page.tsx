//app/storyteller/page.tsx
"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { CharacterListItem, GameOption } from "@/types/app";
import type { GrantXpRequest } from "@/types/xp";

import AppShell from "@/components/app-shell/App-shell";
import TopBar from "@/components/app-shell/TopBar";
import LeftToolbar from "@/components/app-shell/LeftToolbar";
import RightPanel from "@/components/app-shell/RightPanel";
import GrantXpModal from "@/components/modals/GrantXpModal";
import CharacterSheet from "@/components/character-sheet/CharacterSheet";
import { useI18n } from "@/i18n";

const TOKEN_KEY = "vtm_token";

type ApiGamesResponse = {
  games: GameOption[];
};

type ApiCreateGameResponse = {
  game: GameOption & { description?: string; createdAt?: string };
};

type PlayerInfo = {
  id: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
  character: {
    id: string;
    name: string;
    statusId: number;
  } | null;
};

type ApiPlayersResponse = {
  players: PlayerInfo[];
};

type ApiCreatePlayerResponse = {
  player: PlayerInfo & { generatedPassword?: string | null };
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
  const { t } = useI18n();

  const [games, setGames] = useState<GameOption[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>("");

  // User info for TopBar - loaded on client only to avoid hydration mismatch
  const [userName, setUserName] = useState<string | undefined>(undefined);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);

  useEffect(() => {
    setUserName(localStorage.getItem("vtm_user_name") || undefined);
    setUserEmail(localStorage.getItem("vtm_user_email") || undefined);
  }, []);

  const [characters, setCharacters] = useState<CharacterListItem[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    null,
  );

  const [sheetBundle, setSheetBundle] = useState<any | null>(null);
  const [characterStatus, setCharacterStatus] = useState<string | null>(null);

  const [pendingXp, setPendingXp] = useState<any[]>([]);
  const [loadingPendingXp, setLoadingPendingXp] = useState(false);

  const [grantOpen, setGrantOpen] = useState(false);
  const [grantXpCharacterId, setGrantXpCharacterId] = useState<string | null>(
    null,
  );
  const [grantXpAmount, setGrantXpAmount] = useState<string>("");
  const [grantXpSameForAll, setGrantXpSameForAll] = useState(false);
  const [grantXpLoading, setGrantXpLoading] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [loadingSheet, setLoadingSheet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Create chronicle modal
  const [createGameOpen, setCreateGameOpen] = useState(false);
  const [newGameName, setNewGameName] = useState("");
  const [newGameDescription, setNewGameDescription] = useState("");
  const [createGameLoading, setCreateGameLoading] = useState(false);

  // Player management
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [createPlayerOpen, setCreatePlayerOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerEmail, setNewPlayerEmail] = useState("");
  const [newPlayerPassword, setNewPlayerPassword] = useState("");
  const [newPlayerNature, setNewPlayerNature] = useState("");
  const [newPlayerDemeanor, setNewPlayerDemeanor] = useState("");
  const [createPlayerLoading, setCreatePlayerLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(
    null,
  );

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

  // Audit trail state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditPage, setAuditPage] = useState(0);
  const [auditPageSize, setAuditPageSize] = useState(20);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditActionType, setAuditActionType] = useState<string>("");
  const prevAuditCharacterId = useRef<string | null>(null);

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

  // Carregar jogadores da crônica
  useEffect(() => {
    if (!selectedGameId) {
      setPlayers([]);
      return;
    }

    let cancelled = false;

    async function run() {
      const token = getToken();
      if (!token) return;

      setLoadingPlayers(true);

      const { ok, body } = await fetchJson(
        `/api/storyteller/games/${encodeURIComponent(selectedGameId)}/players`,
        token,
      );

      if (cancelled) return;

      if (ok && body?.players) {
        setPlayers(body.players);
      } else {
        setPlayers([]);
      }
      setLoadingPlayers(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [selectedGameId]);

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

  // Load pending XP for selected character
  useEffect(() => {
    if (!selectedCharacterId) {
      setPendingXp([]);
      return;
    }

    let cancelled = false;

    async function run() {
      const token = getToken();
      if (!token) return;

      setLoadingPendingXp(true);

      const { ok, body } = await fetchJson(
        `/api/characters/${selectedCharacterId}/xp/spend-draft`,
        token,
      );

      if (cancelled) return;

      if (ok && body?.pendingSpends) {
        setPendingXp(body.pendingSpends);
      } else {
        setPendingXp([]);
      }
      setLoadingPendingXp(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [selectedCharacterId]);

  // Load audit logs for selected character
  useEffect(() => {
    // Check if character changed - if so, reset page and clear logs
    if (prevAuditCharacterId.current !== selectedCharacterId) {
      prevAuditCharacterId.current = selectedCharacterId;
      setAuditPage(0);
      setAuditLogs([]);
      setAuditTotal(0);
    }

    if (!selectedCharacterId) {
      return;
    }

    let cancelled = false;

    async function run() {
      const token = getToken();
      if (!token) return;

      setLoadingAudit(true);

      // Capture the characterId at the time of the request
      const characterIdAtRequest = selectedCharacterId;
      const offset = auditPage * auditPageSize;

      const params = new URLSearchParams({
        limit: String(auditPageSize),
        offset: String(offset),
      });
      if (auditActionType) params.set("actionType", auditActionType);

      const { ok, body } = await fetchJson(
        `/api/characters/${characterIdAtRequest}/audit?${params.toString()}`,
        token,
      );

      // Ignore stale responses
      if (cancelled || characterIdAtRequest !== selectedCharacterId) {
        return;
      }

      if (ok && body?.items) {
        setAuditLogs(body.items);
        setAuditTotal(body.total ?? 0);
      } else {
        setAuditLogs([]);
      }
      setLoadingAudit(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [selectedCharacterId, auditPage, auditPageSize, auditActionType]);

  async function handleCreateGame() {
    const token = getToken();
    if (!token || !newGameName.trim()) return;

    setCreateGameLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/storyteller/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newGameName.trim(),
          description: newGameDescription.trim() || null,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          (data && typeof data === "object" && (data as any).error) ||
          "Erro ao criar crônica.";
        throw new Error(String(msg));
      }

      const gameData = data as ApiCreateGameResponse;
      const newGame = gameData.game;

      setGames((prev) => [newGame, ...prev]);
      setSelectedGameId(newGame.id);
      setCreateGameOpen(false);
      setNewGameName("");
      setNewGameDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar crônica.");
    } finally {
      setCreateGameLoading(false);
    }
  }

  async function handleCreatePlayer() {
    const token = getToken();
    if (
      !token ||
      !selectedGameId ||
      !newPlayerName.trim() ||
      !newPlayerEmail.trim()
    ) {
      return;
    }

    setCreatePlayerLoading(true);
    setError(null);
    setGeneratedPassword(null);

    try {
      const res = await fetch(
        `/api/storyteller/games/${encodeURIComponent(selectedGameId)}/players`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: newPlayerName.trim(),
            email: newPlayerEmail.trim(),
            password: newPlayerPassword || null,
            nature: newPlayerNature || null,
            demeanor: newPlayerDemeanor || null,
          }),
        },
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          (data && typeof data === "object" && (data as any).error) ||
          "Erro ao criar jogador.";
        throw new Error(String(msg));
      }

      const playerData = data as ApiCreatePlayerResponse;
      const newPlayer = playerData.player;

      if (newPlayer.generatedPassword) {
        setGeneratedPassword(newPlayer.generatedPassword);
      }

      setPlayers((prev) => [newPlayer, ...prev]);
      setNewPlayerName("");
      setNewPlayerEmail("");
      setNewPlayerPassword("");
      setNewPlayerNature("");
      setNewPlayerDemeanor("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar jogador.");
    } finally {
      setCreatePlayerLoading(false);
    }
  }

  async function handleRemovePlayer(playerId: string) {
    const token = getToken();
    if (!token || !selectedGameId) return;

    if (!confirm("Remover este jogador da crônica?")) return;

    try {
      const res = await fetch(
        `/api/storyteller/games/${encodeURIComponent(selectedGameId)}/players/${playerId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        setPlayers((prev) => prev.filter((p) => p.id !== playerId));
      }
    } catch (err) {
      console.error("Error removing player:", err);
    }
  }

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

      // Update the character in the list to reflect the new status
      setCharacters((prev) =>
        prev.map((c) =>
          c.id === selectedCharacterId
            ? { ...c, status: data.character.status }
            : c,
        ),
      );
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

  async function handleApproveXp() {
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
        `/api/storyteller/characters/${selectedCharacterId}/xp/approve`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error ?? "Failed to approve XP");
        return;
      }

      const data = await res.json();
      console.log("Approve XP response:", data);
      setPendingXp([]);
      // Refresh character data
      setSelectedCharacterId("");
      setTimeout(() => {
        setSelectedCharacterId(selectedCharacterId!);
      }, 300);
    } catch (e: any) {
      setError(e?.message ?? "Error approving XP");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRejectXp() {
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
        `/api/characters/${selectedCharacterId}/xp/spend-draft`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error ?? "Failed to reject XP");
        return;
      }

      setPendingXp([]);
    } catch (e: any) {
      setError(e?.message ?? "Error rejecting XP");
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

  async function handleQuickGrantXp() {
    if (!grantXpAmount) {
      setError("Please enter an XP amount");
      return;
    }

    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    const amount = parseInt(grantXpAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid positive XP amount");
      return;
    }

    console.log("[XP Grant] Starting grant process:", {
      amount,
      grantXpCharacterId,
      grantXpSameForAll,
      characterCount: characters.length,
    });

    setGrantXpLoading(true);
    setError(null);
    try {
      if (grantXpSameForAll) {
        console.log(
          "[XP Grant] Granting to ALL characters:",
          characters.map((c) => c.id),
        );
        for (const char of characters) {
          console.log("[XP Grant] Calling API for character:", char.id);
          const res = await fetch(
            `/api/storyteller/characters/${char.id}/xp/grant`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ amount }),
            },
          );
          const resText = await res.text();
          console.log(
            "[XP Grant] Response for",
            char.id,
            ":",
            res.status,
            resText,
          );
          if (!res.ok) {
            console.error("[XP Grant] Failed for", char.id, ":", resText);
          }
        }
      } else {
        console.log(
          "[XP Grant] Granting to single character:",
          grantXpCharacterId,
        );
        const res = await fetch(
          `/api/storyteller/characters/${grantXpCharacterId}/xp/grant`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ amount }),
          },
        );
        const resText = await res.text();
        console.log("[XP Grant] Response:", res.status, resText);
        if (!res.ok) {
          console.error("[XP Grant] Failed:", resText);
          setError("Failed to grant XP: " + resText);
          setGrantXpLoading(false);
          return;
        }
      }

      setGrantOpen(false);
      setGrantXpCharacterId(null);
      setGrantXpAmount("");
      setGrantXpSameForAll(false);

      setSelectedCharacterId(null);
      setTimeout(() => {
        if (selectedCharacterId) {
          setSelectedCharacterId(selectedCharacterId);
        }
      }, 100);
    } catch (err) {
      console.error("Failed to grant XP:", err);
    } finally {
      setGrantXpLoading(false);
    }
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
            titleLeft={t("storyteller.title")}
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
            actions={<></>}
          />
        }
        left={
          <LeftToolbar
            title={t("storyteller.characters")}
            items={characters}
            selectedId={selectedCharacterId}
            onSelect={(id) => setSelectedCharacterId(id)}
            compact={true}
            headerAction={
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setCreatePlayerOpen(true)}
                  disabled={!selectedGameId}
                  style={{ fontSize: 12, padding: "4px 8px" }}
                >
                  + Jogador
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setCreateGameOpen(true)}
                  style={{ fontSize: 12, padding: "4px 8px" }}
                >
                  + Crônica
                </button>
              </div>
            }
            renderActions={(item) => (
              <>
                <button
                  type="button"
                  className="btn-mini"
                  title={t("storyteller.addXp")}
                  onClick={(e) => {
                    e.stopPropagation();
                    setGrantXpCharacterId(item.id);
                    setGrantOpen(true);
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
                  title={t("storyteller.meritsFlaws")}
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log("Unblock merits/flaws for", item.id);
                  }}
                  style={{
                    padding: "2px 6px",
                    fontSize: 10,
                    backgroundColor: "#4a2a4a",
                  }}
                >
                  M&F
                </button>
              </>
            )}
          />
        }
        main={
          <div className="p-4">
            {error && (
              <div className="errorBox" style={{ marginBottom: 8 }}>
                {error}
              </div>
            )}
            {loadingSheet && <div>{t("storyteller.loadingSheet")}</div>}
            {!loadingSheet && !sheetBundle && (
              <div className="muted">{t("storyteller.selectCharacter")}</div>
            )}
            {!loadingSheet && sheetBundle && (
              <div className="sheetActive">
                <CharacterSheet
                  mode="readonly"
                  sheet={sheetBundle}
                  onSubmit={handleSubmitSheet}
                  characterStatus={characterStatus}
                />
              </div>
            )}
          </div>
        }
        right={
          <RightPanel
            title={t("storyteller.auditTrail")}
            rightButton={
              characterStatus === "APPROVED" || characterStatus === "XP" ? (
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    type="button"
                    className="btn"
                    title={t("storyteller.addXp")}
                    onClick={() => {
                      if (selectedCharacterId) {
                        setGrantXpCharacterId(selectedCharacterId);
                        setGrantOpen(true);
                      }
                    }}
                    style={{
                      padding: "4px 8px",
                      fontSize: 12,
                      backgroundColor: "#2a4a2a",
                    }}
                  >
                    XP
                  </button>
                  <button
                    type="button"
                    className="btn"
                    title={t("storyteller.meritsFlaws")}
                    onClick={() => {
                      console.log(
                        "Unblock merits/flaws for",
                        selectedCharacterId,
                      );
                    }}
                    style={{
                      padding: "4px 8px",
                      fontSize: 12,
                      backgroundColor: "#4a2a4a",
                    }}
                  >
                    M&F
                  </button>
                </div>
              ) : null
            }
          >
            {characterStatus === "SUBMITTED" && (
              <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="btn"
                  onClick={handleApprove}
                  disabled={actionLoading}
                  style={{ flex: 1, backgroundColor: "#2a5a2a" }}
                >
                  {actionLoading
                    ? t("storyteller.approving")
                    : t("storyteller.approve")}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setRejectOpen(true)}
                  disabled={actionLoading}
                  style={{ flex: 1, backgroundColor: "#5a2a2a" }}
                >
                  {t("storyteller.reject")}
                </button>
              </div>
            )}

            {rejectOpen && (
              <div style={{ marginBottom: 12 }}>
                <textarea
                  className="textInput"
                  placeholder={t("storyteller.rejectionReason")}
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
                    {actionLoading
                      ? t("storyteller.rejecting")
                      : t("storyteller.confirmReject")}
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
                {t("storyteller.status")}: <strong>{characterStatus}</strong>
              </p>
            )}

            {/* Pending XP Section */}
            {loadingPendingXp ? (
              <div className="muted" style={{ marginBottom: 12 }}>
                Loading pending XP...
              </div>
            ) : pendingXp.length > 0 ? (
              <div
                style={{
                  marginBottom: 12,
                  padding: 12,
                  backgroundColor: "#2a2a1a",
                  borderRadius: 8,
                  border: "1px solid #4a4a2a",
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    marginBottom: 8,
                    color: "#f0d040",
                  }}
                >
                  Pending XP Spends ({pendingXp.length})
                </div>
                {pendingXp.map((spend: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      fontSize: 12,
                      color: "#ccc",
                      marginBottom: 4,
                    }}
                  >
                    {spend.type}: {spend.key} ({spend.from} → {spend.to}) ={" "}
                    {spend.xpCost} XP
                  </div>
                ))}
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 12,
                  }}
                >
                  <button
                    type="button"
                    className="btn"
                    onClick={handleApproveXp}
                    disabled={actionLoading}
                    style={{ flex: 1, backgroundColor: "#2a4a2a" }}
                  >
                    {actionLoading ? "Approving..." : "Approve XP"}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleRejectXp}
                    disabled={actionLoading}
                    style={{ flex: 1, backgroundColor: "#5a2a2a" }}
                  >
                    {actionLoading ? "Rejecting..." : "Reject XP"}
                  </button>
                </div>
              </div>
            ) : null}

            {loadingAudit ? (
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
                    const isFreebieLine = message.startsWith("Freebie |");
                    const isStartingLine = message.startsWith("Start");
                    const isXPAwardedLine = message.startsWith("XP | Awarded");
                    const isXPSpentLine = message.startsWith("XP | Spent");
                    const isSpecialtyLine =
                      message.startsWith("Specialization |");
                    const isMeritLine = message.startsWith("Merit |");
                    const isFlawLine = message.startsWith("Flaw |");

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
              <div className="muted">{t("storyteller.noAuditLogs")}</div>
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

      {/* Quick XP Grant Drawer */}
      {grantOpen && (
        <div className="drawer-overlay" onClick={() => setGrantOpen(false)}>
          <div
            className="drawer"
            onClick={(e) => e.stopPropagation()}
            style={{ width: 320 }}
          >
            <div className="drawer-header">
              <h3 className="h3">{t("storyteller.addXp")}</h3>
              <button
                type="button"
                className="drawer-close"
                onClick={() => setGrantOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="drawer-body">
              <p className="muted" style={{ marginBottom: 12 }}>
                {grantXpSameForAll
                  ? t("storyteller.allPlayers")
                  : (characters.find((c) => c.id === grantXpCharacterId)
                      ?.name ?? "Select a character")}
              </p>

              <div style={{ marginBottom: 16 }}>
                <label
                  className="muted"
                  style={{ display: "block", marginBottom: 4 }}
                >
                  {t("storyteller.xpAmount")}
                </label>
                <input
                  type="number"
                  className="textInput"
                  style={{ width: "100%" }}
                  value={grantXpAmount}
                  onChange={(e) => setGrantXpAmount(e.target.value)}
                  min={0}
                  step={1}
                  placeholder={t("storyteller.enterPositiveInteger")}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={grantXpSameForAll}
                    onChange={(e) => setGrantXpSameForAll(e.target.checked)}
                  />
                  <span className="muted">{t("storyteller.grantToAll")}</span>
                </label>
              </div>

              <button
                type="button"
                className="btn"
                style={{ width: "100%", backgroundColor: "#2a5a2a" }}
                onClick={handleQuickGrantXp}
                disabled={
                  grantXpLoading ||
                  !grantXpAmount ||
                  parseInt(grantXpAmount, 10) <= 0
                }
              >
                {grantXpLoading
                  ? t("storyteller.grantingXp")
                  : t("storyteller.grant")}
              </button>
            </div>
          </div>
        </div>
      )}

      {createGameOpen && (
        <div
          className="drawer-overlay"
          onClick={() => setCreateGameOpen(false)}
        >
          <div
            className="drawer"
            onClick={(e) => e.stopPropagation()}
            style={{ width: 420 }}
          >
            <div className="drawer-header">
              <h3 className="h3">Criar Crônica</h3>
              <button
                type="button"
                className="drawer-close"
                onClick={() => setCreateGameOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="drawer-body">
              {error && (
                <div
                  style={{
                    border: "1px solid #7a2b2b",
                    background: "rgba(197, 37, 37, 0.10)",
                    borderRadius: 6,
                    padding: "10px 12px",
                    marginBottom: 14,
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 6 }}>
                  Nome da Crônica *
                </label>
                <input
                  className="textInput"
                  type="text"
                  value={newGameName}
                  onChange={(e) => setNewGameName(e.target.value)}
                  placeholder="Ex: Noites de São Paulo 1995"
                  disabled={createGameLoading}
                  required
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 6 }}>
                  Descrição (opcional)
                </label>
                <textarea
                  className="textInput"
                  value={newGameDescription}
                  onChange={(e) => setNewGameDescription(e.target.value)}
                  placeholder="Ambientação, tema, etc."
                  disabled={createGameLoading}
                  rows={4}
                  style={{ width: "100%", resize: "vertical" }}
                />
              </div>

              <button
                type="button"
                className="btn"
                style={{ width: "100%", backgroundColor: "#2a5a2a" }}
                onClick={handleCreateGame}
                disabled={createGameLoading || !newGameName.trim()}
              >
                {createGameLoading ? "Criando..." : "Criar Crônica"}
              </button>
            </div>
          </div>
        </div>
      )}

      {createPlayerOpen && (
        <div
          className="drawer-overlay"
          onClick={() => {
            setCreatePlayerOpen(false);
            setGeneratedPassword(null);
          }}
        >
          <div
            className="drawer"
            onClick={(e) => e.stopPropagation()}
            style={{ width: 420 }}
          >
            <div className="drawer-header">
              <h3 className="h3">Adicionar Jogador</h3>
              <button
                type="button"
                className="drawer-close"
                onClick={() => {
                  setCreatePlayerOpen(false);
                  setGeneratedPassword(null);
                }}
              >
                ×
              </button>
            </div>
            <div className="drawer-body">
              {error && (
                <div
                  style={{
                    border: "1px solid #7a2b2b",
                    background: "rgba(197, 37, 37, 0.10)",
                    borderRadius: 6,
                    padding: "10px 12px",
                    marginBottom: 14,
                  }}
                >
                  {error}
                </div>
              )}

              {generatedPassword && (
                <div
                  style={{
                    border: "1px solid #2a5a2a",
                    background: "rgba(42, 90, 42, 0.10)",
                    borderRadius: 6,
                    padding: "10px 12px",
                    marginBottom: 14,
                  }}
                >
                  <strong>Senha gerada:</strong> {generatedPassword}
                  <br />
                  <small>Copie e envie ao jogador.</small>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 6 }}>
                  Nome do Jogador *
                </label>
                <input
                  className="textInput"
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Nome completo"
                  disabled={createPlayerLoading}
                  required
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 6 }}>
                  Email *
                </label>
                <input
                  className="textInput"
                  type="email"
                  value={newPlayerEmail}
                  onChange={(e) => setNewPlayerEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  disabled={createPlayerLoading}
                  required
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 6 }}>
                  Senha (deixe em branco para gerar automaticamente)
                </label>
                <input
                  className="textInput"
                  type="password"
                  value={newPlayerPassword}
                  onChange={(e) => setNewPlayerPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  disabled={createPlayerLoading}
                  minLength={6}
                  style={{ width: "100%" }}
                />
              </div>

              <button
                type="button"
                className="btn"
                style={{ width: "100%", backgroundColor: "#2a5a2a" }}
                onClick={handleCreatePlayer}
                disabled={
                  createPlayerLoading ||
                  !newPlayerName.trim() ||
                  !newPlayerEmail.trim()
                }
              >
                {createPlayerLoading ? "Criando..." : "Criar Jogador"}
              </button>
            </div>
          </div>
        </div>
      )}

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

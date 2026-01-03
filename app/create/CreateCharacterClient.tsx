// app/create/CreateCharacterClient.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Ajuste estes tipos/imports para os seus paths reais do projeto.
// A ideia é: draft e rows são os MESMOS estados que você já tinha no /create antigo.
import type { CharacterDraft } from "@/types/app";

const TOKEN_KEY = "vtm_token";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

type DbGetCharacterResponse = {
  character?: {
    id: string;
    gameId: string;
    ownerUserId?: string;
    status?: string;
    sheet?: any;
    totalExperience?: number;
    spentExperience?: number;
    version?: number;
  };
  // alguns endpoints seus já retornam o “objeto completo” direto
  sheet?: any;
};

export default function CreateCharacterClient({
                                                characterId,
                                                mode,
                                              }: {
  characterId: string | null;
  mode: string | null;
}) {
  const router = useRouter();
  const readOnly = mode === "readonly";

  // =====================================================================================
  // ESTADOS: mantenha os mesmos estados do seu /create antigo.
  // Aqui estão só os essenciais para DB hydration + submit.
  // =====================================================================================
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [loadingDb, setLoadingDb] = useState(false);

  const [draft, setDraft] = useState<CharacterDraft | null>(null);

  const [phase, setPhase] = useState<number>(1);
  const [isDarkAges, setIsDarkAges] = useState<boolean>(false);
  const [templateKey, setTemplateKey] = useState<string>("neophyte");

  const [backgroundRows, setBackgroundRows] = useState<any[]>([]);
  const [disciplineRows, setDisciplineRows] = useState<any[]>([]);

  const [phase1DraftSnapshot, setPhase1DraftSnapshot] = useState<any>(null);
  const [phase1BackgroundRowsSnapshot, setPhase1BackgroundRowsSnapshot] =
      useState<any[] | null>(null);
  const [phase1DisciplineRowsSnapshot, setPhase1DisciplineRowsSnapshot] =
      useState<any[] | null>(null);

  // UX
  const [loadingDb, setLoadingDb] = useState(false);
  const [dbLoadedOnce, setDbLoadedOnce] = useState(false);

  // Toast opcional (se você já tiver, pode substituir pelo seu)
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3200);
  }

  useEffect(() => {
    // lê querystring SEM useSearchParams() (evita erro Next16/Suspense)
    const qs = new URLSearchParams(window.location.search);
    const cid = qs.get("characterId");
    const mode = qs.get("mode");
    setCharacterId(cid);
    setReadOnly(mode === "readonly");

    if (!cid) return;

    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    setLoadingDb(true);

    (async () => {
      try {
        const res = await fetch(`/api/characters/${cid}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          // 404 = não existe ou sem permissão (sem leak)
          setLoadingDb(false);
          return;
        }

        const apiData = await res.json();

        // seu endpoint retorna um objeto com formato:
        // { sheet: { sheet: {...draft}, phase, isDarkAges, templateKey, backgroundRows, disciplineRows, ... } }
        // às vezes vem embrulhado em { character: { sheet: ... } }
        const raw = apiData?.sheet ?? apiData?.character?.sheet ?? null;
        if (!raw?.sheet) return;

        // hidrata os estados do create (os que já existem no seu arquivo)
        setDraft(raw.sheet);

        if (typeof raw.phase === "number") setPhase(raw.phase);
        if (typeof raw.isDarkAges === "boolean") setIsDarkAges(raw.isDarkAges);
        if (typeof raw.templateKey === "string") setTemplateKey(raw.templateKey);

        if (Array.isArray(raw.backgroundRows)) setBackgroundRows(raw.backgroundRows);
        if (Array.isArray(raw.disciplineRows)) setDisciplineRows(raw.disciplineRows);

        if (raw.phase1DraftSnapshot) setPhase1DraftSnapshot(raw.phase1DraftSnapshot);
        if (Array.isArray(raw.phase1BackgroundRowsSnapshot))
          setPhase1BackgroundRowsSnapshot(raw.phase1BackgroundRowsSnapshot);
        if (Array.isArray(raw.phase1DisciplineRowsSnapshot))
          setPhase1DisciplineRowsSnapshot(raw.phase1DisciplineRowsSnapshot);
      } finally {
        setLoadingDb(false);
      }
    })();
  }, [router]);


  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  // =====================================================================================
  // DB MODE: se characterId existe => carrega TUDO do banco e ignora localStorage.
  // =====================================================================================
  useEffect(() => {
    if (!characterId) return;

    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    setLoadingDb(true);

    (async () => {
      try {
        const res = await fetch(`/api/characters/${characterId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          // Sem leak: 404 cobre "não existe" ou "sem acesso"
          showToast("Character not found.");
          router.push("/storyteller");
          return;
        }

        const data = (await res.json()) as DbGetCharacterResponse;

        // Normalização: às vezes vem {character:{sheet:{...}}} e às vezes vem direto.
        const raw =
            (data as any)?.sheet ??
            (data as any)?.character?.sheet ??
            (data as any)?.character?.sheet?.sheet ??
            null;

        // O formato que você colou no chat é:
        // {
        //   sheet: { ...draft... },
        //   phase, isDarkAges, templateKey,
        //   backgroundRows, disciplineRows,
        //   phase1DraftSnapshot, phase1BackgroundRowsSnapshot, phase1DisciplineRowsSnapshot
        // }
        // Então:
        const normalized = raw?.sheet ? raw : null;

        if (!normalized) {
          showToast("Invalid sheet payload.");
          return;
        }

        setDraft(normalized.sheet as CharacterDraft);

        setPhase(typeof normalized.phase === "number" ? normalized.phase : 1);
        setIsDarkAges(Boolean(normalized.isDarkAges));
        setTemplateKey(
            typeof normalized.templateKey === "string"
                ? normalized.templateKey
                : "neophyte",
        );

        setBackgroundRows(
            Array.isArray(normalized.backgroundRows) ? normalized.backgroundRows : [],
        );
        setDisciplineRows(
            Array.isArray(normalized.disciplineRows) ? normalized.disciplineRows : [],
        );

        setPhase1DraftSnapshot(normalized.phase1DraftSnapshot ?? null);
        setPhase1BackgroundRowsSnapshot(
            Array.isArray(normalized.phase1BackgroundRowsSnapshot)
                ? normalized.phase1BackgroundRowsSnapshot
                : null,
        );
        setPhase1DisciplineRowsSnapshot(
            Array.isArray(normalized.phase1DisciplineRowsSnapshot)
                ? normalized.phase1DisciplineRowsSnapshot
                : null,
        );

        setDbLoadedOnce(true);
      } catch (e) {
        console.error(e);
        showToast("Failed to load character.");
      } finally {
        setLoadingDb(false);
      }
    })();
  }, [characterId, router]);

  // =====================================================================================
  // SUBMIT: Save => POST /api/characters/:id/submit
  // =====================================================================================
  async function submitToApi() {
    if (!characterId) return;

    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    if (!draft) {
      showToast("Nothing to save.");
      return;
    }

    const payload = {
      sheet: {
        sheet: draft,
        phase,
        isDarkAges,
        templateKey,
        backgroundRows,
        disciplineRows,
        phase1DraftSnapshot,
        phase1BackgroundRowsSnapshot,
        phase1DisciplineRowsSnapshot,
      },
    };

    const res = await fetch(`/api/characters/${characterId}/submit`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("submit failed", t);
      showToast("Save failed.");
      return;
    }

    showToast("Saved.");
  }

  // =====================================================================================
  // RENDER
  // =====================================================================================

  // Loading inicial do modo DB
  if (characterId && loadingDb && !dbLoadedOnce) {
    return <div className="muted p-4">Loading sheet…</div>;
  }

  // Se está em modo DB e ainda não tem draft, não dá pra renderizar a ficha
  if (characterId && !draft) {
    return <div className="muted p-4">No sheet data.</div>;
  }

  return (
      <div>
        {toast ? (
            <div style={{ padding: 12, color: "#fff" }}>
              <span className="muted">{toast}</span>
            </div>
        ) : null}

        {/* =================================================================================
          AQUI você cola o JSX “canônico” da sua ficha do /create antigo.
          O ponto chave é: use os estados acima (draft, phase, rows, etc).

          - Onde o seu JSX antigo fazia setDraft / setBackgroundRows / etc, continua igual.
          - Onde o botão "Save" existia:
              - se characterId existir => chama submitToApi()
              - senão => mantém a lógica localStorage antiga (se você ainda quiser)
         ================================================================================= */}

        {/* EXEMPLO mínimo só pra você ver que está renderizando algo.
          REMOVA isso e cole seu JSX real no lugar. */}
        <div className="muted p-4">
          Create loaded. characterId={characterId ?? "-"} readOnly={String(readOnly)}
        </div>

        {!readOnly ? (
            <div style={{ padding: 12 }}>
              <button onClick={submitToApi}>Save (submit)</button>
            </div>
        ) : null}
      </div>
  );
}

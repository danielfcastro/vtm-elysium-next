//app/create/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Squares from "@/components/Squares";
import { AutocompleteInput } from "@/components/AutocompleteInput";
import {
  CharacterDraft,
  createEmptyCharacterDraft,
  draftToCharacter,
} from "@/core/models/CharacterDraft";

import concepts from "@/core/data/raw/concepts.json";
import clans from "@/core/data/raw/clans.json";
import natures from "@/core/data/raw/natures.json";
import disciplinesJson from "@/core/data/raw/disciplines.json";
import backgroundsJson from "@/core/data/raw/backgrounds.json";
import generationsJson from "@/core/data/raw/generations.json";
import meritsJson from "@/core/data/raw/merits.json";
import flawsJson from "@/core/data/raw/flaws.json";

import { ATTRIBUTE_CATEGORIES } from "@/core/data/attributes";
import { ABILITY_CATEGORIES } from "@/core/data/abilities";
import {
  getSpecialtiesForTrait,
  isLegendaryRating,
} from "@/core/data/specialties";

import { FreebiePointCostStrategy } from "@/core/strategies/FreebiePointCostStrategy";
import { TraitType } from "@/core/enums/TraitType";

/* ======================================================================
 * Tipos auxiliares
 * ====================================================================*/

interface NamedItem {
  id: string;
  name: string;
}

interface TraitRow {
  key: string;
  id: string | null;
  dots: number;
  locked: boolean; // true = nome já confirmado (readonly), só remove pela lixeira
}

/* ======================================================================
 * Templates / Phases
 * ====================================================================*/

type TemplateKey =
  | "neophyte"
  | "ancillae"
  | "elder_vtm"
  | "elder_elysium"
  | "elder_belladona";

type CreationPhase = 1 | 2;

type TemplateRules = {
  attributes: [number, number, number];
  abilities: [number, number, number];
  disciplines: number;
  backgrounds: number;
  virtues: number;
  baseFreebies: number;
  usesAgeFreebies: boolean;
};

const TEMPLATE_LABEL: Record<TemplateKey, string> = {
  neophyte: "Neophyte",
  ancillae: "Ancillae",
  elder_vtm: "Elder - VtM",
  elder_elysium: "Elder - Sistema Elysium",
  elder_belladona: "Elder - Belladona",
};

const TEMPLATE_RULES: Record<TemplateKey, TemplateRules> = {
  neophyte: {
    attributes: [7, 5, 3],
    abilities: [13, 9, 5],
    disciplines: 3,
    backgrounds: 5,
    virtues: 7,
    baseFreebies: 15,
    usesAgeFreebies: false,
  },
  ancillae: {
    attributes: [9, 6, 4],
    abilities: [18, 9, 3],
    disciplines: 6,
    backgrounds: 7,
    virtues: 13,
    baseFreebies: 15,
    usesAgeFreebies: false,
  },
  elder_vtm: {
    attributes: [10, 7, 5],
    abilities: [21, 9, 3],
    disciplines: 10,
    backgrounds: 12,
    virtues: 6,
    baseFreebies: 15,
    usesAgeFreebies: false,
  },
  elder_elysium: {
    attributes: [10, 7, 5],
    abilities: [20, 12, 8],
    disciplines: 10,
    backgrounds: 15,
    virtues: 7,
    baseFreebies: 20,
    usesAgeFreebies: true,
  },
  elder_belladona: {
    attributes: [10, 7, 5],
    abilities: [20, 12, 8],
    disciplines: 10,
    backgrounds: 15,
    virtues: 7,
    baseFreebies: 20,
    usesAgeFreebies: true,
  },
};
const LOCAL_STORAGE_DRAFT_KEY = "elysium:lastCharacterDraft";

const AGE_FREEBIES_BY_DOTS: Record<number, number> = {
  0: 20,
  1: 50,
  2: 75,
  3: 95,
  4: 110,
  5: 120,
};

const HUMANITY_FREEBIE_COST = 2;
const WILLPOWER_FREEBIE_COST = 1;

// === Helpers para enviar a trilha de auditoria ao backend ===

// === Helpers para enviar a trilha de auditoria ao backend ===

/**
 * Persiste a trilha de auditoria de um personagem:
 * - grava todas as linhas no localStorage (para reabrir o create depois)
 * - replica as mesmas linhas na API /api/characters/:id/audit
 */

/* ======================================================================
 * Helpers de UI (Label + titleCase)
 * ====================================================================*/

function Label({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={className} title={text}>
      {text}
    </span>
  );
}

function titleCaseAndClean(str?: string) {
  if (!str) return "";
  return str
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ======================================================================
 * Rows helpers (Backgrounds / Disciplines)
 * ====================================================================*/

function createRowsFromRecord(
  record: Record<string, number> | undefined,
): TraitRow[] {
  if (!record || Object.keys(record).length === 0) {
    return [
      {
        key: "row-0",
        id: null,
        dots: 0,
        locked: false,
      },
    ];
  }

  return Object.entries(record).map(([id, dots], index) => ({
    key: `row-${index}`,
    id,
    dots: Number(dots ?? 0),
    locked: true,
  }));
}

function rowsToRecord(rows: TraitRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    if (row.id && row.dots > 0) {
      out[row.id] = row.dots;
    }
  }
  return out;
}

/* ======================================================================
 * Geração a partir de Background "Generation" + generations.json
 * ====================================================================*/

const GENERATION_BACKGROUND_ID = "generation";

type GenerationRule = {
  generation: number;
  maxTraitRating: number;
  maxBloodPool: number;
  bloodPerTurn: number;
};

const GENERATION_RULES: GenerationRule[] = (generationsJson as any[]).map(
  (g: any): GenerationRule => ({
    generation: Number(g.generation),
    maxTraitRating: Number(
      g.maxTraitRating ?? g.max_trait_rating ?? g.max_trait ?? 5,
    ),
    maxBloodPool: Number(
      g.maxBloodPool ?? g.max_blood_pool ?? g.maxBloodPool ?? 10,
    ),
    bloodPerTurn: Number(
      g.bloodPerTurn ?? g.blood_per_turn ?? g.bloodPerTurn ?? 1,
    ),
  }),
);

function findGenerationRule(gen: number): GenerationRule | undefined {
  return GENERATION_RULES.find((g) => g.generation === gen);
}

function getGenerationRuleWithFallback(
  gen: number,
): GenerationRule | undefined {
  return findGenerationRule(gen) ?? findGenerationRule(13);
}

function calculateGenerationMasquerade(dots: number): number {
  if (!Number.isFinite(dots) || dots <= 0) {
    return 13;
  }

  const d = Math.floor(dots);
  const minGen = Math.min(...GENERATION_RULES.map((r) => r.generation));
  const gen = 13 - d;
  return Math.max(minGen, gen);
}

function calculateGenerationDarkAges(dots: number): number {
  if (!Number.isFinite(dots) || dots <= 0) {
    return 12;
  }

  const d = Math.floor(dots);
  const minGen = Math.min(...GENERATION_RULES.map((r) => r.generation));
  const gen = 12 - d;
  return Math.max(minGen, gen);
}

function computeGenerationFromBackgroundRows(
  rows: TraitRow[],
  isDarkAges: boolean,
): number {
  const genRow = rows.find((r) => r.id === GENERATION_BACKGROUND_ID);
  const dots = Number(genRow?.dots ?? 0);
  return isDarkAges
    ? calculateGenerationDarkAges(dots)
    : calculateGenerationMasquerade(dots);
}

/* ======================================================================
 * DotsSelector – visual idêntico ao Dots, mas clicável
 * ====================================================================*/

function DotsSelector({
  value,
  max,
  onChange,
  disabled,
}: {
  value: number;
  max: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  const safeMax = Math.max(1, max || 5);
  const current = Math.max(0, Math.min(safeMax, value || 0));

  return (
    <span className={`dots dotsSelector${disabled ? " dotsDisabled" : ""}`}>
      {Array.from({ length: safeMax }).map((_, index) => {
        const dotValue = index + 1;
        const filled = dotValue <= current;

        const handleClick = () => {
          if (disabled) return;

          if (dotValue > current) {
            onChange(dotValue);
          } else if (dotValue === current) {
            onChange(current - 1);
          } else {
            return;
          }
        };

        return (
          <span
            key={dotValue}
            className={`dot${filled ? " dotFilled" : ""} dotInteractive`}
            onClick={handleClick}
          />
        );
      })}
    </span>
  );
}

/* ======================================================================
 * Validação de Name
 * ====================================================================*/

function validateName(name: string): string | null {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "Name é obrigatório.";
  if (trimmed.length < 2) return "Name deve ter pelo menos 2 caracteres.";
  return null;
}

/* ======================================================================
 * Helpers de pontos (envelope dinâmico)
 * ====================================================================*/

function sortDesc(arr: number[]) {
  return [...arr].sort((a, b) => b - a);
}

function envelopeFits(
  spendByGroup: Record<string, number>,
  caps: [number, number, number],
): boolean {
  const spends = sortDesc(
    Object.values(spendByGroup).map((n) => Math.max(0, Number(n) || 0)),
  );
  const limits = sortDesc([...caps]);
  for (let i = 0; i < 3; i++) {
    if ((spends[i] ?? 0) > (limits[i] ?? 0)) return false;
  }
  return true;
}

function sumRecord(r: Record<string, number>) {
  return Object.values(r).reduce((a, b) => a + (Number(b) || 0), 0);
}

/* ======================================================================
 * Página principal
 * ====================================================================*/

function CreateCharacterPage({ characterId }: { characterId?: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const characterIdFromUrl = searchParams.get("characterId");

  // Use prop if provided, otherwise fall back to URL param
  const initialCharacterId = characterId ?? characterIdFromUrl;

  const [dbCharacterId, setDbCharacterId] = useState<string | null>(null);
  const [characterStatus, setCharacterStatus] = useState<string | null>(null);
  const [isLoadingFromDb, setIsLoadingFromDb] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  const [draft, setDraft] = useState<CharacterDraft>(() => {
    const d = createEmptyCharacterDraft();

    const virtues = { ...((d.virtues as any) ?? {}) };
    virtues.conscience = Number(virtues.conscience ?? 1);
    virtues.self_control = Number(virtues.self_control ?? 1);
    virtues.courage = Number(virtues.courage ?? 1);
    d.virtues = virtues as any;

    d.willpower = virtues.courage;
    d.road = virtues.conscience + virtues.self_control;
    (d as any).roadRating = d.road;

    return d;
  });
  const [nameError, setNameError] = useState<string | null>(null);
  const [isDarkAges, setIsDarkAges] = useState(false);

  const [templateKey, setTemplateKey] = useState<TemplateKey>("neophyte");
  const rules = TEMPLATE_RULES[templateKey];

  const [phase, setPhase] = useState<CreationPhase>(1);
  const [spendError, setSpendError] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  // Specialty drawer state
  const [specialtyDrawer, setSpecialtyDrawer] = useState<{
    open: boolean;
    traitType: "attribute" | "ability" | null;
    traitCategory: string | null;
    traitId: string | null;
    currentValue: number;
  }>({
    open: false,
    traitType: null,
    traitCategory: null,
    traitId: null,
    currentValue: 0,
  });

  // Issue #8: localStorage draft persistence (client-only)
  const [isLocalStorageAvailable, setIsLocalStorageAvailable] = useState(false);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);

  useEffect(() => {
    // localStorage is unavailable during SSR and may be blocked in privacy modes.
    try {
      const testKey = "__elysium_ls_test__";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      setIsLocalStorageAvailable(true);

      const existing = window.localStorage.getItem(LOCAL_STORAGE_DRAFT_KEY);
      setHasSavedDraft(Boolean(existing));
    } catch {
      setIsLocalStorageAvailable(false);
      setHasSavedDraft(false);
    }
  }, []);

  // Load character from database if characterId is provided
  useEffect(() => {
    if (!initialCharacterId) return;

    const token =
      typeof window !== "undefined" ? localStorage.getItem("vtm_token") : null;
    if (!token) {
      setDbError("Not authenticated");
      return;
    }

    setIsLoadingFromDb(true);
    setDbError(null);

    (async () => {
      try {
        const res = await fetch(`/api/characters/${initialCharacterId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          setDbError(`Failed to load character: ${res.status}`);
          return;
        }

        const data = await res.json();
        const sheet = data?.sheet ?? data?.character?.sheet;
        const status = data?.status ?? data?.character?.status;
        const gameName = data?.character?.gameName;

        if (status) {
          setCharacterStatus(status);
        }

        if (!sheet) {
          setDbError("No sheet data found");
          return;
        }

        // Restore draft from database sheet
        if (sheet.sheet) {
          const draftFromSheet = sheet.sheet;
          // Replace chronicle UUID with game name if available
          if (gameName && draftFromSheet.chronicle) {
            draftFromSheet.chronicle = gameName;
          }
          setDraft(draftFromSheet);
        }
        if (typeof sheet.phase === "number") {
          setPhase(sheet.phase as CreationPhase);
        }
        if (typeof sheet.isDarkAges === "boolean") {
          setIsDarkAges(sheet.isDarkAges);
        }
        if (sheet.templateKey) {
          setTemplateKey(sheet.templateKey as TemplateKey);
        }
        if (Array.isArray(sheet.backgroundRows)) {
          setBackgroundRows(sheet.backgroundRows);
        }
        if (Array.isArray(sheet.disciplineRows)) {
          setDisciplineRows(sheet.disciplineRows);
        }
        if (sheet.phase1DraftSnapshot) {
          setPhase1DraftSnapshot(sheet.phase1DraftSnapshot);
        }
        if (Array.isArray(sheet.phase1BackgroundRowsSnapshot)) {
          setPhase1BackgroundRowsSnapshot(sheet.phase1BackgroundRowsSnapshot);
        }
        if (Array.isArray(sheet.phase1DisciplineRowsSnapshot)) {
          setPhase1DisciplineRowsSnapshot(sheet.phase1DisciplineRowsSnapshot);
        }

        setDbCharacterId(initialCharacterId);
      } catch (e: any) {
        setDbError(`Error: ${e?.message ?? String(e)}`);
      } finally {
        setIsLoadingFromDb(false);
      }
    })();
  }, [initialCharacterId]);

  const toastTimerRef = useRef<any>(null);

  // Merits/Flaws drawer state
  const [meritsFlawsDrawer, setMeritsFlawsDrawer] = useState<{
    open: boolean;
    tempMerits: {
      id: string;
      name: string;
      cost: number;
      category?: string;
      description?: string;
    }[];
    tempFlaws: {
      id: string;
      name: string;
      value: number;
      category?: string;
      description?: string;
    }[];
    selectedMeritId: string | null;
    selectedFlawId: string | null;
  }>({
    open: false,
    tempMerits: [],
    tempFlaws: [],
    selectedMeritId: null,
    selectedFlawId: null,
  });

  const totalMeritCost = meritsFlawsDrawer.tempMerits.reduce(
    (sum, m) => sum + m.cost,
    0,
  );
  const totalFlawValue = meritsFlawsDrawer.tempFlaws.reduce(
    (sum, f) => sum + f.value,
    0,
  );

  const [phase1DraftSnapshot, setPhase1DraftSnapshot] =
    useState<CharacterDraft | null>(null);
  const [phase1DisciplineRowsSnapshot, setPhase1DisciplineRowsSnapshot] =
    useState<TraitRow[] | null>(null);
  const [phase1BackgroundRowsSnapshot, setPhase1BackgroundRowsSnapshot] =
    useState<TraitRow[] | null>(null);

  const [backgroundRows, setBackgroundRows] = useState<TraitRow[]>(() =>
    createRowsFromRecord(createEmptyCharacterDraft().backgrounds),
  );
  const [disciplineRows, setDisciplineRows] = useState<TraitRow[]>(() =>
    createRowsFromRecord(createEmptyCharacterDraft().disciplines),
  );

  const conceptOptions = concepts as NamedItem[];
  const clanOptions = clans as NamedItem[];
  const natureOptions = natures as NamedItem[];
  const disciplineOptions = disciplinesJson as NamedItem[];
  const backgroundOptions = backgroundsJson as NamedItem[];
  const meritOptions = (meritsJson as any[]).map((m) => ({
    id: m.id,
    name: m.name,
    cost: m.cost,
    description: m.description,
  }));
  const flawOptions = (flawsJson as any[]).map((f) => ({
    id: f.id,
    name: f.name,
    cost: f.cost,
    description: f.description,
  }));

  const specialtyOptions = useMemo(() => {
    if (!specialtyDrawer.open || !specialtyDrawer.traitId) return [];
    return getSpecialtiesForTrait(
      specialtyDrawer.traitType === "attribute" ? "attributes" : "abilities",
      specialtyDrawer.traitCategory || "",
      specialtyDrawer.traitId,
      isLegendaryRating(specialtyDrawer.currentValue),
    ).map((s) => ({ id: s.name, name: s.name }));
  }, [
    specialtyDrawer.open,
    specialtyDrawer.traitType,
    specialtyDrawer.traitCategory,
    specialtyDrawer.traitId,
    specialtyDrawer.currentValue,
  ]);

  const disciplineNameById = useMemo(() => {
    const map: Record<string, string> = {};
    disciplineOptions.forEach((d) => {
      map[d.id] = d.name;
    });
    return map;
  }, [disciplineOptions]);

  const backgroundNameById = useMemo(() => {
    const map: Record<string, string> = {};
    backgroundOptions.forEach((b) => {
      map[b.id] = b.name;
    });
    return map;
  }, [backgroundOptions]);

  const freebieCost = useMemo(() => new FreebiePointCostStrategy(), []);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 20000);
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  function updateDraft(patch: Partial<CharacterDraft>) {
    setDraft((prev) => ({
      ...prev,
      ...patch,
    }));
  }

  function getAttributeBase(
    attrId: string,
    clanId: string | null | undefined,
  ): number {
    const isNosferatu = clanId === "nosferatu";
    const isAppearance = attrId === "appearance";
    if (isNosferatu && isAppearance) return 0;
    return 1;
  }

  const attributeGroupById = useMemo(() => {
    const map: Record<string, string> = {};
    Object.keys(ATTRIBUTE_CATEGORIES).forEach((group) => {
      (ATTRIBUTE_CATEGORIES as any)[group].forEach((id: string) => {
        map[id] = group;
      });
    });
    return map;
  }, []);

  const abilityGroupById = useMemo(() => {
    const map: Record<string, string> = {};
    Object.keys(ABILITY_CATEGORIES).forEach((group) => {
      (ABILITY_CATEGORIES as any)[group].forEach((id: string) => {
        map[id] = group;
      });
    });
    return map;
  }, []);

  function getFreebieTotalFromDraft(d: CharacterDraft): number {
    if (!rules.usesAgeFreebies) return rules.baseFreebies;

    const ageDots = Number((d.backgrounds as any)?.age ?? 0);
    const clamped = Math.max(0, Math.min(5, Math.floor(ageDots)));
    return AGE_FREEBIES_BY_DOTS[clamped] ?? rules.baseFreebies;
  }

  function applyBackgroundsToDraft(
    nextRows: TraitRow[],
    mode: boolean = isDarkAges,
  ) {
    const generation = computeGenerationFromBackgroundRows(nextRows, mode);
    const rule = getGenerationRuleWithFallback(generation);

    const patch: Partial<CharacterDraft> = {
      backgrounds: rowsToRecord(nextRows),
      generation: rule?.generation ?? generation,
    };

    if (rule) {
      patch.maxTraitRating = rule.maxTraitRating;
      patch.maximumBloodPool = rule.maxBloodPool;
      patch.bloodPointsPerTurn = rule.bloodPerTurn;
    }

    updateDraft(patch);
  }

  /* ===========================
   * Spend computations
   * ========================= */

  const characterForPreview = useMemo(() => draftToCharacter(draft), [draft]);
  const c: any = characterForPreview ?? {};

  const attrs = (c.attributes ?? {}) as Record<string, number>;
  const abilities = (c.abilities ?? {}) as Record<string, number>;
  // CORREÇÃO: sempre usar virtues do draft, não de c.virtues
  const virtues: Record<string, number> = (draft.virtues as
    | Record<string, number>
    | undefined) ?? {
    conscience: 1,
    self_control: 1,
    courage: 1,
  };

  const traitCap = Math.max(5, Number(c.maxTraitRating ?? 5));

  const phase1FloorDraft = phase1DraftSnapshot;

  const spendSnapshot = useMemo(() => {
    const clanId = draft.clanId;

    const attrSpendByGroup: Record<string, number> = {
      Physical: 0,
      Social: 0,
      Mental: 0,
    };

    Object.entries(attributeGroupById).forEach(([attrId, group]) => {
      const rating = Number(attrs[attrId] ?? 0);
      const base = getAttributeBase(attrId, clanId);
      const added = Math.max(0, rating - base);
      attrSpendByGroup[group] = (attrSpendByGroup[group] ?? 0) + added;
    });

    const abilSpendByGroup: Record<string, number> = {
      Talents: 0,
      Skills: 0,
      Knowledges: 0,
    };

    Object.entries(abilityGroupById).forEach(([abilityId, group]) => {
      const rating = Number(abilities[abilityId] ?? 0);
      const added = Math.max(0, rating);
      abilSpendByGroup[group] = (abilSpendByGroup[group] ?? 0) + added;
    });

    const virtueAddedTotal = ["conscience", "self_control", "courage"].reduce(
      (acc, id) => {
        const rating = Number(virtues?.[id] ?? 0);
        const added = Math.max(0, rating - 1);
        return acc + added;
      },
      0,
    );

    const disciplinesTotal = disciplineRows.reduce(
      (acc, r) => acc + (Number(r.dots) || 0),
      0,
    );
    const backgroundsTotal = backgroundRows.reduce(
      (acc, r) => acc + (Number(r.dots) || 0),
      0,
    );

    const startingRemainingAttributes = Math.max(
      0,
      rules.attributes[0] +
        rules.attributes[1] +
        rules.attributes[2] -
        sumRecord(attrSpendByGroup),
    );
    const startingRemainingAbilities = Math.max(
      0,
      rules.abilities[0] +
        rules.abilities[1] +
        rules.abilities[2] -
        sumRecord(abilSpendByGroup),
    );
    const startingRemainingDisciplines = Math.max(
      0,
      rules.disciplines - disciplinesTotal,
    );
    const startingRemainingBackgrounds = Math.max(
      0,
      rules.backgrounds - backgroundsTotal,
    );
    const startingRemainingVirtues = Math.max(
      0,
      rules.virtues - virtueAddedTotal,
    );

    const startingRemainingAll =
      startingRemainingAttributes +
      startingRemainingAbilities +
      startingRemainingDisciplines +
      startingRemainingBackgrounds +
      startingRemainingVirtues;

    const freebieTotal = getFreebieTotalFromDraft(draft);

    let freebieSpent = 0;
    let freebieRemaining = 0;
    let adjustedFreebieTotal = freebieTotal;

    if (phase === 2) {
      const floorDraft: CharacterDraft =
        (phase1FloorDraft as CharacterDraft) ?? draft;

      const floorChar: any = draftToCharacter(floorDraft);
      const nextChar: any = draftToCharacter(draft);

      // Attributes
      for (const [attrId] of Object.entries(attributeGroupById)) {
        const floorRating = Number(floorChar?.attributes?.[attrId] ?? 0);
        const nowRating = Number(nextChar?.attributes?.[attrId] ?? 0);
        const delta = Math.max(0, nowRating - floorRating);
        freebieSpent += delta * freebieCost.getCost(TraitType.Attribute);
      }

      // Abilities
      for (const abilityId of Object.keys(abilityGroupById)) {
        const floorRating = Number(floorChar?.abilities?.[abilityId] ?? 0);
        const nowRating = Number(nextChar?.abilities?.[abilityId] ?? 0);
        const delta = Math.max(0, nowRating - floorRating);
        freebieSpent += delta * freebieCost.getCost(TraitType.Ability);
      }

      // Virtues
      {
        const floorVirtues = (floorDraft.virtues ?? {}) as Record<
          string,
          number
        >;
        const nowVirtues = (draft.virtues ?? {}) as Record<string, number>;
        for (const id of ["conscience", "self_control", "courage"]) {
          const floorRating = Number(floorVirtues[id] ?? 1);
          const nowRating = Number(nowVirtues[id] ?? 1);
          const delta = Math.max(0, nowRating - floorRating);
          freebieSpent += delta * freebieCost.getCost(TraitType.Virtue);
        }
      }

      // Disciplines
      const floorDiscRecord = (floorDraft.disciplines ?? {}) as Record<
        string,
        number
      >;
      const nowDiscRecord = rowsToRecord(disciplineRows);
      for (const [id, nowDots] of Object.entries(nowDiscRecord)) {
        const floorDots = Number(floorDiscRecord[id] ?? 0);
        const delta = Math.max(0, Number(nowDots) - floorDots);
        freebieSpent += delta * freebieCost.getCost(TraitType.Discipline);
      }

      // Backgrounds
      const floorBgRecord = (floorDraft.backgrounds ?? {}) as Record<
        string,
        number
      >;
      const nowBgRecord = rowsToRecord(backgroundRows);
      for (const [id, nowDots] of Object.entries(nowBgRecord)) {
        const floorDots = Number(floorBgRecord[id] ?? 0);
        const delta = Math.max(0, Number(nowDots) - floorDots);
        freebieSpent += delta * freebieCost.getCost(TraitType.Background);
      }

      // Humanity / Road
      {
        const floorRoad = Number(
          (floorDraft as any).road ?? (floorDraft as any).humanity ?? 0,
        );
        const nowRoad = Number(
          (draft as any).road ?? (draft as any).humanity ?? 0,
        );
        if (nowRoad > floorRoad) {
          freebieSpent += (nowRoad - floorRoad) * HUMANITY_FREEBIE_COST;
        }
      }

      // Willpower
      {
        const floorWillpower = Number((floorDraft as any).willpower ?? 0);
        const nowWillpower = Number((draft as any).willpower ?? 0);
        if (nowWillpower > floorWillpower) {
          freebieSpent +=
            (nowWillpower - floorWillpower) * WILLPOWER_FREEBIE_COST;
        }
      }

      // Merits (spend freebies)
      {
        const floorMerits = (floorDraft as any).merits ?? [];
        const nowMerits = (draft as any).merits ?? [];
        // Calculate cost of new/added merits
        const floorMeritIds = new Set(floorMerits.map((m: any) => m.id));
        const newMerits = nowMerits.filter(
          (m: any) => !floorMeritIds.has(m.id),
        );
        for (const merit of newMerits) {
          freebieSpent += merit.cost;
        }
      }

      // Flaws (add freebies) - calculate extra freebies from new flaws
      let flawBonus = 0;
      {
        const floorFlaws = (floorDraft as any).flaws ?? [];
        const nowFlaws = (draft as any).flaws ?? [];
        // Calculate value of new/added flaws
        const floorFlawIds = new Set(floorFlaws.map((f: any) => f.id));
        const newFlaws = nowFlaws.filter((f: any) => !floorFlawIds.has(f.id));
        for (const flaw of newFlaws) {
          flawBonus += flaw.value; // Flaws give freebies
        }
      }

      // Apply flaw bonus to total freebies (capped at 7)
      adjustedFreebieTotal = Math.min(
        freebieTotal + flawBonus,
        freebieTotal + 7,
      );
      freebieRemaining = Math.max(0, adjustedFreebieTotal - freebieSpent);
    } else {
      freebieSpent = 0;
      // Flaws also give freebies in Phase 1
      let flawBonus = 0;
      const nowFlaws = (draft as any).flaws ?? [];
      for (const flaw of nowFlaws) {
        flawBonus += flaw.value;
      }
      adjustedFreebieTotal = freebieTotal + Math.min(flawBonus, 7);
      freebieRemaining = Math.max(0, adjustedFreebieTotal - freebieSpent);
    }

    return {
      attrSpendByGroup,
      abilSpendByGroup,
      virtueAddedTotal,
      disciplinesTotal,
      backgroundsTotal,

      startingRemainingAttributes,
      startingRemainingAbilities,
      startingRemainingDisciplines,
      startingRemainingBackgrounds,
      startingRemainingVirtues,
      startingRemainingAll,

      freebieTotal: adjustedFreebieTotal,
      freebieSpent,
      freebieRemaining,
    };
  }, [
    attrs,
    abilities,
    virtues,
    disciplineRows,
    backgroundRows,
    draft,
    phase,
    phase1FloorDraft,
    rules,
    attributeGroupById,
    abilityGroupById,
    freebieCost,
    templateKey,
  ]);

  const filteredMeritOptions = meritOptions.filter(
    (m) => m.cost <= (spendSnapshot?.freebieRemaining ?? 0) + totalFlawValue,
  );

  const spendAuditLines = useMemo(() => {
    const startingLines: string[] = [];
    const freebieLines: string[] = [];
    const xpLines: string[] = [];
    const otherLines: string[] = [];

    const isPhase2 = phase === 2 && !!phase1DraftSnapshot;
    const floorDraft = isPhase2
      ? (phase1DraftSnapshot as CharacterDraft)
      : null;
    const floorChar: any = floorDraft ? draftToCharacter(floorDraft) : null;
    const nowChar: any = characterForPreview;

    const clanIdBase = floorDraft?.clanId ?? draft.clanId;

    // ===== Attributes =====
    Object.keys(attributeGroupById).forEach((attrId) => {
      const label = titleCaseAndClean(attrId);
      const base = getAttributeBase(attrId, clanIdBase);

      const nowRating = Number(nowChar?.attributes?.[attrId] ?? base);

      if (!isPhase2) {
        if (nowRating > base) {
          startingLines.push(
            `Start | Attribute | ${label}: +${nowRating - base} dots (base ${base} → ${nowRating})`,
          );
        }
      } else {
        const floorRating = Math.max(
          base,
          Number(floorChar?.attributes?.[attrId] ?? base),
        );

        const startingDots = Math.max(0, floorRating - base);
        const freebieDots = Math.max(0, nowRating - floorRating);

        if (startingDots > 0) {
          startingLines.push(
            `Start | Attribute | ${label}: +${startingDots} dots (base ${base} → ${floorRating})`,
          );
        }
        if (freebieDots > 0) {
          const costPerDot = freebieCost.getCost(TraitType.Attribute);
          const cost = freebieDots * costPerDot;
          freebieLines.push(
            `Freebie | Attribute | ${label}: spent ${cost} FB (${floorRating} → ${nowRating})`,
          );
        }
      }
    });

    // ===== Abilities =====
    Object.keys(abilityGroupById).forEach((abilityId) => {
      const label = titleCaseAndClean(abilityId);
      const base = 0;

      const nowRating = Number(nowChar?.abilities?.[abilityId] ?? base);

      if (!isPhase2) {
        if (nowRating > base) {
          startingLines.push(
            `Start | Ability | ${label}: +${nowRating - base} dots (${nowRating} total)`,
          );
        }
      } else {
        const floorRating = Math.max(
          base,
          Number(floorChar?.abilities?.[abilityId] ?? base),
        );

        const startingDots = Math.max(0, floorRating - base);
        const freebieDots = Math.max(0, nowRating - floorRating);

        if (startingDots > 0) {
          startingLines.push(
            `Start | Ability | ${label}: +${startingDots} dots (${floorRating} total)`,
          );
        }
        if (freebieDots > 0) {
          const costPerDot = freebieCost.getCost(TraitType.Ability);
          const cost = freebieDots * costPerDot;
          freebieLines.push(
            `Freebie | Ability | ${label}: spent ${cost} FB (${floorRating} → ${nowRating})`,
          );
        }
      }
    });

    // ===== Virtues =====
    const virtuesDraft = (draft.virtues ?? {}) as Record<string, number>;
    const virtuesFloor = (floorDraft?.virtues ?? {}) as Record<string, number>;

    (["conscience", "self_control", "courage"] as const).forEach((id) => {
      const label = titleCaseAndClean(id);
      const base = 1;
      const nowRating = Number(virtuesDraft[id] ?? base);

      if (!isPhase2) {
        if (nowRating > base) {
          startingLines.push(
            `Start | Virtue | ${label}: +${nowRating - base} dots (base ${base} → ${nowRating})`,
          );
        }
      } else {
        const floorRating = Math.max(base, Number(virtuesFloor[id] ?? base));
        const startingDots = Math.max(0, floorRating - base);
        const freebieDots = Math.max(0, nowRating - floorRating);

        if (startingDots > 0) {
          startingLines.push(
            `Start | Virtue | ${label}: +${startingDots} dots (base ${base} → ${floorRating})`,
          );
        }
        if (freebieDots > 0) {
          const costPerDot = freebieCost.getCost(TraitType.Virtue);
          const cost = freebieDots * costPerDot;
          freebieLines.push(
            `Freebie | Virtue | ${label}: spent ${cost} FB (${floorRating} → ${nowRating})`,
          );
        }
      }
    });

    // ===== Disciplines =====
    const nowDiscRecord = rowsToRecord(disciplineRows);
    const floorDiscRecord =
      isPhase2 && phase1DisciplineRowsSnapshot
        ? rowsToRecord(phase1DisciplineRowsSnapshot)
        : {};
    const allDiscIds = new Set([
      ...Object.keys(floorDiscRecord),
      ...Object.keys(nowDiscRecord),
    ]);

    allDiscIds.forEach((id) => {
      const label = disciplineNameById[id] ?? titleCaseAndClean(id);
      const base = 0;
      const nowDots = Number(nowDiscRecord[id] ?? 0);

      if (!isPhase2) {
        if (nowDots > base) {
          startingLines.push(
            `Start | Discipline | ${label}: +${nowDots - base} dots (${nowDots} total)`,
          );
        }
      } else {
        const floorDots = Number(floorDiscRecord[id] ?? base);
        const startingDots = Math.max(0, floorDots - base);
        const freebieDots = Math.max(0, nowDots - floorDots);

        if (startingDots > 0) {
          startingLines.push(
            `Start | Discipline | ${label}: +${startingDots} dots (${floorDots} total)`,
          );
        }
        if (freebieDots > 0) {
          const costPerDot = freebieCost.getCost(TraitType.Discipline);
          const cost = freebieDots * costPerDot;
          freebieLines.push(
            `Freebie | Discipline | ${label}: spent ${cost} FB (${floorDots} → ${nowDots})`,
          );
        }
      }
    });

    // ===== Backgrounds =====
    const nowBgRecord = rowsToRecord(backgroundRows);
    const floorBgRecord =
      isPhase2 && phase1BackgroundRowsSnapshot
        ? rowsToRecord(phase1BackgroundRowsSnapshot)
        : {};
    const allBgIds = new Set([
      ...Object.keys(floorBgRecord),
      ...Object.keys(nowBgRecord),
    ]);

    allBgIds.forEach((id) => {
      const label = backgroundNameById[id] ?? titleCaseAndClean(id);
      const base = 0;
      const nowDots = Number(nowBgRecord[id] ?? 0);

      if (!isPhase2) {
        if (nowDots > base) {
          startingLines.push(
            `Start | Background | ${label}: +${nowDots - base} dots (${nowDots} total)`,
          );
        }
      } else {
        const floorDots = Number(floorBgRecord[id] ?? base);
        const startingDots = Math.max(0, floorDots - base);
        const freebieDots = Math.max(0, nowDots - floorDots);

        if (startingDots > 0) {
          startingLines.push(
            `Start | Background | ${label}: +${startingDots} dots (${floorDots} total)`,
          );
        }
        if (freebieDots > 0) {
          const costPerDot = freebieCost.getCost(TraitType.Background);
          const cost = freebieDots * costPerDot;
          freebieLines.push(
            `Freebie | Background | ${label}: spent ${cost} FB (${floorDots} → ${nowDots})`,
          );
        }
      }
    });

    // ===== Road / Humanity & Willpower freebies (somente Phase 2) =====
    if (isPhase2 && floorDraft) {
      const floorRoad = Number(
        (floorDraft as any).road ?? (floorDraft as any).humanity ?? 0,
      );
      const nowRoad = Number(
        (draft as any).road ?? (draft as any).humanity ?? 0,
      );
      const deltaRoad = Math.max(0, nowRoad - floorRoad);
      if (deltaRoad > 0) {
        const cost = deltaRoad * HUMANITY_FREEBIE_COST;
        freebieLines.push(
          `Freebie | Road/Humanity | Road: +${deltaRoad} dots (${floorRoad} → ${nowRoad}) [${cost} freebies]`,
        );
      }

      const floorWillpower = Number((floorDraft as any).willpower ?? 0);
      const nowWillpower = Number((draft as any).willpower ?? 0);
      const deltaWp = Math.max(0, nowWillpower - floorWillpower);
      if (deltaWp > 0) {
        const cost = deltaWp * WILLPOWER_FREEBIE_COST;
        freebieLines.push(
          `Freebie | Willpower | Willpower: +${deltaWp} dots (${floorWillpower} → ${nowWillpower}) [${cost} freebies]`,
        );
      }
    }

    // ===== Merits & Flaws (Phase 2) =====
    if (isPhase2) {
      const floorMerits = (floorDraft as any).merits ?? [];
      const nowMerits = (draft as any).merits ?? [];
      const floorMeritIds = new Set(floorMerits.map((m: any) => m.id));
      const newMerits = nowMerits.filter((m: any) => !floorMeritIds.has(m.id));

      for (const merit of newMerits) {
        const tempFlawBonus = Math.min(
          meritsFlawsDrawer.tempFlaws.reduce(
            (sum: number, f: any) => sum + (f.value ?? 0),
            0,
          ),
          7,
        );
        const adjustedTotal = spendSnapshot.freebieTotal + tempFlawBonus;
        freebieLines.push(
          `Merit | ${merit.name} | Spent: ${merit.cost} / ${adjustedTotal} | Remaining: ${spendSnapshot.freebieRemaining}`,
        );
      }

      const floorFlaws = (floorDraft as any).flaws ?? [];
      const nowFlaws = (draft as any).flaws ?? [];
      const floorFlawIds = new Set(floorFlaws.map((f: any) => f.id));
      const newFlaws = nowFlaws.filter((f: any) => !floorFlawIds.has(f.id));

      for (const flaw of newFlaws) {
        const tempFlawBonus = Math.min(
          meritsFlawsDrawer.tempFlaws.reduce(
            (sum: number, f: any) => sum + (f.value ?? 0),
            0,
          ),
          7,
        );
        const adjustedTotal = spendSnapshot.freebieTotal + tempFlawBonus;
        freebieLines.push(
          `Flaw | ${flaw.name} | Value: ${flaw.value} / ${adjustedTotal} | Gives: +${flaw.value} freebies`,
        );
      }
    }

    // ===== Freebie summary (apenas Phase 2) =====
    if (isPhase2) {
      const tempFlawBonus = Math.min(
        meritsFlawsDrawer.tempFlaws.reduce(
          (sum: number, f: any) => sum + (f.value ?? 0),
          0,
        ),
        7,
      );
      const adjustedTotal = spendSnapshot.freebieTotal + tempFlawBonus;
      freebieLines.push(
        `Freebie | Summary | Spent: ${spendSnapshot.freebieSpent} / ${adjustedTotal} | Remaining: ${spendSnapshot.freebieRemaining}`,
      );
    }

    // ===== XP summary =====
    const totalXp = Number((draft as any).totalExperience ?? 0);
    const spentXp = Number((draft as any).spentExperience ?? 0);
    if (totalXp || spentXp) {
      const remainingXp = totalXp - spentXp;
      xpLines.push(
        `XP | Summary | Total XP: ${totalXp} | Spent: ${spentXp} | Remaining: ${remainingXp}`,
      );
    }

    // ===== Specialties =====
    const specialtyLines: string[] = [];
    const nowSpecialties = draft.specialties ?? {};
    const floorSpecialties =
      isPhase2 && (phase1DraftSnapshot as CharacterDraft)?.specialties
        ? (phase1DraftSnapshot as CharacterDraft).specialties
        : {};

    // Compare current specialties with floor (Phase 1 snapshot)
    Object.keys(nowSpecialties).forEach((traitId) => {
      const nowSpec = nowSpecialties[traitId];
      const floorSpec = floorSpecialties?.[traitId];
      const traitName = titleCaseAndClean(traitId);

      if (!floorSpec) {
        // New specialty selected
        specialtyLines.push(
          `Specialization | ${nowSpec.name} | ${traitName} | Chosen`,
        );
      } else if (floorSpec.name !== nowSpec.name) {
        // Specialty changed
        specialtyLines.push(
          `Specialization | ${nowSpec.name} | ${traitName} | Changed from "${floorSpec.name}"`,
        );
      }
    });

    return [
      ...startingLines,
      ...freebieLines,
      ...xpLines,
      ...otherLines,
      ...specialtyLines,
    ];
  }, [
    draft,
    characterForPreview,
    phase,
    phase1DraftSnapshot,
    phase1DisciplineRowsSnapshot,
    phase1BackgroundRowsSnapshot,
    disciplineRows,
    backgroundRows,
    attributeGroupById,
    abilityGroupById,
    disciplineNameById,
    backgroundNameById,
    freebieCost,
    spendSnapshot.freebieSpent,
    spendSnapshot.freebieTotal,
    spendSnapshot.freebieRemaining,
  ]);

  function maybeAdvanceToPhase2() {
    if (phase !== 1) return;

    const attrsOk = envelopeFits(
      spendSnapshot.attrSpendByGroup,
      rules.attributes,
    );
    const abilsOk = envelopeFits(
      spendSnapshot.abilSpendByGroup,
      rules.abilities,
    );
    const discsOk = spendSnapshot.disciplinesTotal === rules.disciplines;
    const bgsOk = spendSnapshot.backgroundsTotal === rules.backgrounds;
    const virtuesOk = spendSnapshot.virtueAddedTotal === rules.virtues;

    if (
      spendSnapshot.startingRemainingAll === 0 &&
      attrsOk &&
      abilsOk &&
      discsOk &&
      bgsOk &&
      virtuesOk
    ) {
      setPhase1DraftSnapshot(draft);
      setPhase1DisciplineRowsSnapshot(disciplineRows);
      setPhase1BackgroundRowsSnapshot(backgroundRows);
      setPhase(2);
      setSpendError(null);
      showToast("Phase 02 initiated: Freebie Points unlocked.");
    }
  }

  useEffect(() => {
    maybeAdvanceToPhase2();
  }, [
    phase,
    spendSnapshot.startingRemainingAll,
    spendSnapshot.attrSpendByGroup,
    spendSnapshot.abilSpendByGroup,
    spendSnapshot.disciplinesTotal,
    spendSnapshot.backgroundsTotal,
    spendSnapshot.virtueAddedTotal,
    rules,
    draft,
    disciplineRows,
    backgroundRows,
  ]);

  /* ===========================
   * Handlers básicos
   * ========================= */

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    updateDraft({ name: value });
    setNameError(null);
  }

  function handleNameBlur() {
    setNameError(validateName(draft.name));
  }

  function validateTraitCapsForSave(d: CharacterDraft): string | null {
    const cap = Number((d as any).maxTraitRating ?? 5);

    // Traits que obedecem maxTraitRating
    const cappedBuckets: any[] = [
      (d as any).attributes,
      (d as any).abilities,
      (d as any).backgrounds,
      (d as any).disciplines,
      (d as any).virtues,
    ];

    for (const b of cappedBuckets) {
      if (!b || typeof b !== "object") continue;
      for (const v of Object.values(b)) {
        const n = Number(v ?? 0);
        if (Number.isFinite(n) && n > cap) {
          return `Nenhum trait pode exceder ${cap} dots (maxTraitRating).`;
        }
      }
    }

    /**
     * IMPORTANT:
     * Willpower, Humanity/Road e derivados NÃO obedecem maxTraitRating.
     * Eles têm seus próprios limites (tipicamente 10).
     */
    const willpower = Number((d as any).willpower ?? 0);
    if (Number.isFinite(willpower) && willpower > 10) {
      return "Willpower não pode exceder 10.";
    }

    const road = Number((d as any).road ?? (d as any).humanity ?? 0);
    if (Number.isFinite(road) && road > 10) {
      return "Road/Humanity não pode exceder 10.";
    }

    // roadRating é derivado; não validar teto aqui (evita falso positivo)
    return null;
  }

  function saveDraftToLocalStorage() {
    if (!isLocalStorageAvailable) {
      setToast("LocalStorage indisponível no navegador.");
      return;
    }

    try {
      const hasSnapshots =
        !!phase1DraftSnapshot &&
        !!phase1DisciplineRowsSnapshot &&
        !!phase1BackgroundRowsSnapshot;

      // Se a UI está em Phase 2 mas não existe baseline, não grave como Phase 2.
      const safePhase: CreationPhase = phase === 2 && !hasSnapshots ? 1 : phase;

      const payload = JSON.stringify({
        templateKey,
        isDarkAges,
        phase: safePhase,
        draft,
        disciplineRows,
        backgroundRows,

        phase1DraftSnapshot: hasSnapshots ? phase1DraftSnapshot : null,
        phase1DisciplineRowsSnapshot: hasSnapshots
          ? phase1DisciplineRowsSnapshot
          : null,
        phase1BackgroundRowsSnapshot: hasSnapshots
          ? phase1BackgroundRowsSnapshot
          : null,
      });

      window.localStorage.setItem(LOCAL_STORAGE_DRAFT_KEY, payload);
      setHasSavedDraft(true);

      if (phase === 2 && !hasSnapshots) {
        setToast(
          "Ficha salva, mas sem baseline da Phase 01. Salvamos como Phase 01.",
        );
      } else {
        setToast("Ficha salva no navegador.");
      }
    } catch {
      setToast("Erro ao salvar ficha no navegador.");
    }
  }

  function reconstructPhase1SnapshotsFromCurrent(params: {
    draft: CharacterDraft;
    disciplineRows: TraitRow[];
    backgroundRows: TraitRow[];
    rules: TemplateRules;
    isDarkAges: boolean;
  }) {
    const { draft, disciplineRows, backgroundRows, rules, isDarkAges } = params;

    // Base helpers
    const clanId = draft.clanId ?? null;

    // ----- ATTRIBUTES (7/5/3 envelope), preserving as much as possible -----
    // We allocate starting points to the biggest deltas first within each group,
    // but we also must respect the 3-group envelope (7/5/3) dynamically.
    const currentChar: any = draftToCharacter(draft);

    const baseAttrById: Record<string, number> = {};
    for (const attrId of Object.keys(attributeGroupById)) {
      baseAttrById[attrId] = getAttributeBase(attrId, clanId);
    }

    // group -> list of { id, delta }
    const attrByGroup: Record<string, { id: string; delta: number }[]> = {
      Physical: [],
      Social: [],
      Mental: [],
    };

    for (const [attrId, group] of Object.entries(attributeGroupById)) {
      const now = Number(
        currentChar?.attributes?.[attrId] ?? baseAttrById[attrId],
      );
      const base = baseAttrById[attrId];
      const delta = Math.max(0, now - base);
      attrByGroup[group].push({ id: attrId, delta });
    }

    // Sort deltas desc in each group
    for (const g of Object.keys(attrByGroup)) {
      attrByGroup[g].sort((a, b) => b.delta - a.delta);
    }

    // Dynamic envelope: we try to fit into rules.attributes by allocating group totals.
    const attrCapsSorted = [...rules.attributes].sort((a, b) => b - a); // e.g. [7,5,3]
    const groupNames = ["Physical", "Social", "Mental"] as const;

    // Compute current totals
    const groupTotals = groupNames.map((g) =>
      attrByGroup[g].reduce((acc, x) => acc + x.delta, 0),
    );

    // Decide which group gets 7/5/3 by ranking totals
    const groupOrder = groupNames
      .map((g, idx) => ({ g, total: groupTotals[idx] }))
      .sort((a, b) => b.total - a.total)
      .map((x) => x.g);

    const groupCapMap: Record<string, number> = {};
    groupOrder.forEach((g, i) => {
      groupCapMap[g] = attrCapsSorted[i] ?? 0;
    });

    // Allocate per trait within each group up to group cap
    const phase1Attributes: Record<string, number> = {
      ...(draft.attributes ?? {}),
    };
    for (const g of groupNames) {
      let remaining = groupCapMap[g];
      for (const item of attrByGroup[g]) {
        const base = baseAttrById[item.id];
        const take = Math.min(item.delta, Math.max(0, remaining));
        phase1Attributes[item.id] = base + take;
        remaining -= take;
      }
    }

    // ----- ABILITIES (13/9/5 envelope) -----
    const abilByGroup: Record<string, { id: string; delta: number }[]> = {
      Talents: [],
      Skills: [],
      Knowledges: [],
    };

    for (const [abilityId, group] of Object.entries(abilityGroupById)) {
      const now = Number(currentChar?.abilities?.[abilityId] ?? 0);
      const delta = Math.max(0, now);
      abilByGroup[group].push({ id: abilityId, delta });
    }

    for (const g of Object.keys(abilByGroup)) {
      abilByGroup[g].sort((a, b) => b.delta - a.delta);
    }

    const abilCapsSorted = [...rules.abilities].sort((a, b) => b - a);
    const abilGroupNames = ["Talents", "Skills", "Knowledges"] as const;
    const abilTotals = abilGroupNames.map((g) =>
      abilByGroup[g].reduce((acc, x) => acc + x.delta, 0),
    );
    const abilOrder = abilGroupNames
      .map((g, idx) => ({ g, total: abilTotals[idx] }))
      .sort((a, b) => b.total - a.total)
      .map((x) => x.g);

    const abilCapMap: Record<string, number> = {};
    abilOrder.forEach((g, i) => {
      abilCapMap[g] = abilCapsSorted[i] ?? 0;
    });

    const phase1Abilities: Record<string, number> = {
      ...(draft.abilities ?? {}),
    };
    for (const g of abilGroupNames) {
      let remaining = abilCapMap[g];
      for (const item of abilByGroup[g]) {
        const take = Math.min(item.delta, Math.max(0, remaining));
        phase1Abilities[item.id] = take;
        remaining -= take;
      }
    }

    // ----- VIRTUES (total points above base 1) -----
    const nowVirtues = (draft.virtues ?? {}) as Record<string, number>;
    const virtueIds = ["conscience", "self_control", "courage"];
    const virtueDeltas = virtueIds
      .map((id) => ({
        id,
        delta: Math.max(0, Number(nowVirtues[id] ?? 1) - 1),
      }))
      .sort((a, b) => b.delta - a.delta);

    let virtuesRemaining = rules.virtues;
    const phase1Virtues: Record<string, number> = { ...nowVirtues };
    for (const v of virtueDeltas) {
      const take = Math.min(v.delta, Math.max(0, virtuesRemaining));
      phase1Virtues[v.id] = 1 + take;
      virtuesRemaining -= take;
    }

    // ----- DISCIPLINES (total dots) -----
    const discSorted = [...disciplineRows]
      .filter((r) => r.id)
      .map((r) => ({ ...r, dots: Number(r.dots) || 0 }))
      .sort((a, b) => b.dots - a.dots);

    let discsRemaining = rules.disciplines;
    const phase1DisciplineRows = discSorted
      .map((r) => {
        const take = Math.min(r.dots, Math.max(0, discsRemaining));
        discsRemaining -= take;
        return { ...r, dots: take, locked: true };
      })
      .filter((r) => (r.id && r.dots > 0) || (r.id && r.dots === 0));

    // Guarantee at least one row shape if empty
    if (phase1DisciplineRows.length === 0) {
      phase1DisciplineRows.push({
        key: "row-0",
        id: null,
        dots: 0,
        locked: false,
      });
    }

    // ----- BACKGROUNDS (total dots) -----
    const bgSorted = [...backgroundRows]
      .filter((r) => r.id)
      .map((r) => ({ ...r, dots: Number(r.dots) || 0 }))
      .sort((a, b) => b.dots - a.dots);

    let bgsRemaining = rules.backgrounds;
    const phase1BackgroundRows = bgSorted
      .map((r) => {
        const take = Math.min(r.dots, Math.max(0, bgsRemaining));
        bgsRemaining -= take;
        return { ...r, dots: take, locked: true };
      })
      .filter((r) => (r.id && r.dots > 0) || (r.id && r.dots === 0));

    if (phase1BackgroundRows.length === 0) {
      phase1BackgroundRows.push({
        key: "row-0",
        id: null,
        dots: 0,
        locked: false,
      });
    }

    // Build draft snapshot from computed records
    const phase1DraftSnapshot: CharacterDraft = {
      ...draft,
      attributes: phase1Attributes,
      abilities: phase1Abilities,
      virtues: phase1Virtues,
      disciplines: rowsToRecord(phase1DisciplineRows),
      backgrounds: rowsToRecord(phase1BackgroundRows),
    };

    // Also ensure background-derived stats are consistent in the snapshot
    try {
      const gen = computeGenerationFromBackgroundRows(
        phase1BackgroundRows,
        isDarkAges,
      );
      const rule = getGenerationRuleWithFallback(gen);
      phase1DraftSnapshot.generation = rule?.generation ?? gen;
      if (rule) {
        phase1DraftSnapshot.maxTraitRating = rule.maxTraitRating;
        phase1DraftSnapshot.maximumBloodPool = rule.maxBloodPool;
        phase1DraftSnapshot.bloodPointsPerTurn = rule.bloodPerTurn;
      }
    } catch {
      // ignore
    }

    // Ensure Phase 1 virtue-derived willpower/road are coherent in snapshot
    try {
      const cCourage = Number(phase1Virtues["courage"] ?? 1);
      const cConscience = Number(phase1Virtues["conscience"] ?? 1);
      const cSelf = Number(phase1Virtues["self_control"] ?? 1);
      phase1DraftSnapshot.willpower = cCourage;
      phase1DraftSnapshot.road = cConscience + cSelf;
      (phase1DraftSnapshot as any).roadRating = cConscience + cSelf;
    } catch {
      // ignore
    }

    return {
      phase1DraftSnapshot,
      phase1DisciplineRowsSnapshot: phase1DisciplineRows,
      phase1BackgroundRowsSnapshot: phase1BackgroundRows,
    };
  }

  function handleLoadSavedDraft() {
    if (!isLocalStorageAvailable) {
      setToast("LocalStorage indisponível no navegador.");
      return;
    }

    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_DRAFT_KEY);
      if (!raw) {
        setToast("Nenhuma ficha salva encontrada.");
        return;
      }

      const parsed = JSON.parse(raw);

      const loadedPhase: CreationPhase = parsed?.phase === 2 ? 2 : 1;

      const hasPhase1Snapshots =
        !!parsed?.phase1DraftSnapshot &&
        Array.isArray(parsed?.phase1DisciplineRowsSnapshot) &&
        Array.isArray(parsed?.phase1BackgroundRowsSnapshot);

      const loadedIsDarkAges =
        typeof parsed?.isDarkAges === "boolean"
          ? parsed.isDarkAges
          : isDarkAges;

      // Restore config first
      if (parsed?.templateKey) setTemplateKey(parsed.templateKey);
      if (typeof parsed?.isDarkAges === "boolean")
        setIsDarkAges(parsed.isDarkAges);

      // Restore main state
      const nextDraft = parsed?.draft ?? null;
      const nextDiscRows = Array.isArray(parsed?.disciplineRows)
        ? parsed.disciplineRows
        : null;
      const nextBgRows = Array.isArray(parsed?.backgroundRows)
        ? parsed.backgroundRows
        : null;

      if (nextDraft) setDraft(nextDraft);
      if (nextDiscRows) setDisciplineRows(nextDiscRows);
      if (nextBgRows) setBackgroundRows(nextBgRows);

      // Re-apply derived stats from backgrounds using the local helper
      if (nextBgRows) {
        try {
          applyBackgroundsToDraft(nextBgRows, loadedIsDarkAges);
        } catch {
          // ignore
        }
      }

      // If we have snapshots, restore them
      if (hasPhase1Snapshots) {
        setPhase1DraftSnapshot(parsed.phase1DraftSnapshot);
        setPhase1DisciplineRowsSnapshot(parsed.phase1DisciplineRowsSnapshot);
        setPhase1BackgroundRowsSnapshot(parsed.phase1BackgroundRowsSnapshot);
      }

      // If Phase 2 but no snapshots, REBASE
      if (
        loadedPhase === 2 &&
        !hasPhase1Snapshots &&
        nextDraft &&
        nextDiscRows &&
        nextBgRows
      ) {
        const rebased = reconstructPhase1SnapshotsFromCurrent({
          draft: nextDraft,
          disciplineRows: nextDiscRows,
          backgroundRows: nextBgRows,
          rules,
          isDarkAges: loadedIsDarkAges,
        });

        setPhase1DraftSnapshot(rebased.phase1DraftSnapshot);
        setPhase1DisciplineRowsSnapshot(rebased.phase1DisciplineRowsSnapshot);
        setPhase1BackgroundRowsSnapshot(rebased.phase1BackgroundRowsSnapshot);

        // Stay in Phase 2
        setPhase(2);
        setSpendError(null);

        showToast(
          "Ficha carregada estava em Phase 02 sem snapshot. Recriamos um baseline de Phase 01 a partir do estado atual para reabilitar Audit/Return.",
        );

        // Persist rebased snapshots so next refresh is consistent
        try {
          const payload = JSON.stringify({
            templateKey: parsed?.templateKey ?? templateKey,
            isDarkAges: loadedIsDarkAges,
            phase: 2,
            draft: nextDraft,
            disciplineRows: nextDiscRows,
            backgroundRows: nextBgRows,
            phase1DraftSnapshot: rebased.phase1DraftSnapshot,
            phase1DisciplineRowsSnapshot: rebased.phase1DisciplineRowsSnapshot,
            phase1BackgroundRowsSnapshot: rebased.phase1BackgroundRowsSnapshot,
          });
          window.localStorage.setItem(LOCAL_STORAGE_DRAFT_KEY, payload);
          setHasSavedDraft(true);
        } catch {
          // ignore
        }

        return;
      }

      // Phase last
      setPhase(loadedPhase);
      setSpendError(null);
      setToast("Ficha carregada com sucesso.");
    } catch {
      setToast("Erro ao carregar ficha salva.");
    }
  }

  async function saveToDatabase(
    statusOverride?: "DRAFT_PHASE1" | "DRAFT_PHASE2",
  ) {
    if (!dbCharacterId) return null;

    const token =
      typeof window !== "undefined" ? localStorage.getItem("vtm_token") : null;
    if (!token) {
      setToast("Not authenticated");
      return null;
    }

    const payload: Record<string, unknown> = {
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

    if (statusOverride) {
      payload.status = statusOverride;
    }

    try {
      const res = await fetch(`/api/characters/${dbCharacterId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setToast(`Failed to save: ${err.error ?? res.statusText}`);
        return null;
      }

      return dbCharacterId;
    } catch (e: any) {
      setToast(`Error saving: ${e?.message ?? String(e)}`);
      return null;
    }
  }

  async function persistAuditToDatabase(characterId: string, lines: string[]) {
    console.log(
      "[DEBUG] persistAuditToDatabase called with",
      lines.length,
      "lines",
    );
    const token =
      typeof window !== "undefined" ? localStorage.getItem("vtm_token") : null;
    if (!token) {
      console.log("[DEBUG] No token found");
      return;
    }

    try {
      // Fetch existing audit logs to filter out duplicates
      const existingRes = await fetch(
        `/api/characters/${characterId}/audit?limit=1000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      let existingMessages: string[] = [];
      if (existingRes.ok) {
        const existingData = await existingRes.json();
        existingMessages = (existingData.items || []).map(
          (log: any) => log.payload?.message,
        );
        console.log(
          "[DEBUG] Existing audit messages:",
          existingMessages.length,
        );
      }

      // Filter out duplicates
      const newLines = lines.filter((line) => !existingMessages.includes(line));
      console.log("[DEBUG] New audit lines to save:", newLines.length);

      for (const line of newLines) {
        console.log("[DEBUG] Saving audit line:", line);

        let actionType: string;
        if (line.startsWith("Start")) {
          actionType = "STARTING_POINTS";
        } else if (line.startsWith("Specialization")) {
          actionType = "SPECIALTY";
        } else if (line.startsWith("Merit") || line.startsWith("Flaw")) {
          actionType = "MERIT_FLAW";
        } else {
          actionType = "FREEBIE";
        }

        const res = await fetch(`/api/characters/${characterId}/audit`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            actionType,
            payload: { message: line },
          }),
        });
        console.log("[DEBUG] Audit save response:", res.status);
        if (!res.ok) {
          const errText = await res.text();
          console.error("[DEBUG] Audit save error:", errText);
        }
      }
    } catch (e) {
      console.error("[DEBUG] Failed to persist audit logs", e);
    }
  }

  async function submitCharacterToApi(characterId: string) {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("vtm_token") : null;
    if (!token) {
      setToast("Not authenticated");
      return false;
    }

    try {
      const res = await fetch(`/api/characters/${characterId}/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setToast(`Failed to submit: ${err.error ?? res.statusText}`);
        return false;
      }

      return true;
    } catch (e: any) {
      setToast(`Error submitting: ${e?.message ?? String(e)}`);
      return false;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("[DEBUG] handleSubmit called, dbCharacterId:", dbCharacterId);
    console.log("[DEBUG] spendAuditLines count:", spendAuditLines.length);

    const err = validateName(draft.name);
    if (err) {
      setNameError(err);
      return;
    }
    const capErr = validateTraitCapsForSave(draft);
    if (capErr) {
      setToast(capErr);
      return;
    }

    // Save to localStorage
    saveDraftToLocalStorage();

    // Determine status based on audit lines
    // DRAFT_PHASE2 if freebies were spent, otherwise DRAFT_PHASE1
    const hasFreebies = spendAuditLines.some((line) =>
      line.startsWith("Freebie"),
    );
    const statusOverride = hasFreebies ? "DRAFT_PHASE2" : "DRAFT_PHASE1";

    // Save to database if we have a characterId
    let savedCharacterId = dbCharacterId;
    if (dbCharacterId) {
      savedCharacterId = await saveToDatabase(statusOverride);
      console.log("[DEBUG] saveToDatabase result:", savedCharacterId);
    }

    // Persist audit logs to database
    if (savedCharacterId && spendAuditLines.length > 0) {
      console.log("[DEBUG] Calling persistAuditToDatabase");
      await persistAuditToDatabase(savedCharacterId, spendAuditLines);
    } else {
      console.log(
        "[DEBUG] NOT calling persistAuditToDatabase, savedCharacterId:",
        savedCharacterId,
        "spendAuditLines:",
        spendAuditLines.length,
      );
    }

    // Just save, don't submit automatically
    if (savedCharacterId) {
      setToast("Character saved!");
    } else if (!dbCharacterId) {
      setToast("Character saved to browser (not yet in database).");
    }
  }

  function enforcePhase2FreebiesOrReject(
    nextDraft: CharacterDraft,
    nextDiscRows: TraitRow[],
    nextBgRows: TraitRow[],
  ) {
    if (phase !== 2 || !phase1DraftSnapshot) return { ok: true } as const;

    const floorChar: any = draftToCharacter(phase1DraftSnapshot);

    // Attributes floors
    for (const [attrId] of Object.entries(attributeGroupById)) {
      const baseNow = getAttributeBase(attrId, nextDraft.clanId);
      const floorRating = Number(floorChar?.attributes?.[attrId] ?? baseNow);
      const nowRating = Number(
        (draftToCharacter(nextDraft) as any)?.attributes?.[attrId] ?? baseNow,
      );
      if (nowRating < floorRating) {
        return {
          ok: false,
          reason:
            "Phase 02: você não pode reduzir dots abaixo do final da Phase 01.",
        } as const;
      }
    }

    // Abilities floors
    for (const abilityId of Object.keys(abilityGroupById)) {
      const floorRating = Number(floorChar?.abilities?.[abilityId] ?? 0);
      const nowRating = Number(
        (draftToCharacter(nextDraft) as any)?.abilities?.[abilityId] ?? 0,
      );
      if (nowRating < floorRating) {
        return {
          ok: false,
          reason:
            "Phase 02: você não pode reduzir dots abaixo do final da Phase 01.",
        } as const;
      }
    }

    // Virtues floors
    for (const id of ["conscience", "self_control", "courage"]) {
      const floorRating = Number(floorChar?.virtues?.[id] ?? 1);
      const nowRating = Number(
        (draftToCharacter(nextDraft) as any)?.virtues?.[id] ?? 1,
      );
      if (nowRating < floorRating) {
        return {
          ok: false,
          reason:
            "Phase 02: você não pode reduzir dots abaixo do final da Phase 01.",
        } as const;
      }
    }

    // Humanity / Road floors
    {
      const floorRoad = Number(
        (phase1DraftSnapshot as any).road ??
          (phase1DraftSnapshot as any).humanity ??
          0,
      );
      const nowRoad = Number(
        (nextDraft as any).road ?? (nextDraft as any).humanity ?? 0,
      );
      if (nowRoad < floorRoad) {
        return {
          ok: false,
          reason:
            "Phase 02: você não pode reduzir dots abaixo do final da Phase 01.",
        } as const;
      }
    }

    // Willpower floors
    {
      const floorWillpowerSnapshot = Number(
        (phase1DraftSnapshot as any).willpower ?? 0,
      );
      const nowWillpowerSnapshot = Number((nextDraft as any).willpower ?? 0);
      if (nowWillpowerSnapshot < floorWillpowerSnapshot) {
        return {
          ok: false,
          reason:
            "Phase 02: você não pode reduzir dots abaixo do final da Phase 01.",
        } as const;
      }

      const floorWillpowerChar = Number(floorChar?.willpower ?? 0);
      const nextChar: any = draftToCharacter(nextDraft);
      const nowWillpowerChar = Number(nextChar?.willpower ?? 0);
      if (nowWillpowerChar < floorWillpowerChar) {
        return {
          ok: false,
          reason:
            "Phase 02: você não pode reduzir dots abaixo do final da Phase 01.",
        } as const;
      }
    }

    // Disciplines floors
    const floorDiscRecord = (phase1DraftSnapshot.disciplines ?? {}) as Record<
      string,
      number
    >;
    const nowDiscRecord = rowsToRecord(nextDiscRows);
    for (const [id, floorDots] of Object.entries(floorDiscRecord)) {
      const nowDots = Number(nowDiscRecord[id] ?? 0);
      if (nowDots < Number(floorDots)) {
        return {
          ok: false,
          reason:
            "Phase 02: você não pode reduzir dots abaixo do final da Phase 01.",
        } as const;
      }
    }

    // Backgrounds floors
    const floorBgRecord = (phase1DraftSnapshot.backgrounds ?? {}) as Record<
      string,
      number
    >;
    const nowBgRecord = rowsToRecord(nextBgRows);
    for (const [id, floorDots] of Object.entries(floorBgRecord)) {
      const nowDots = Number(nowBgRecord[id] ?? 0);
      if (nowDots < Number(floorDots)) {
        return {
          ok: false,
          reason:
            "Phase 02: você não pode reduzir dots abaixo do final da Phase 01.",
        } as const;
      }
    }

    // Freebie budget
    const freebieTotal = getFreebieTotalFromDraft(nextDraft);
    let freebieSpent = 0;

    const nextChar: any = draftToCharacter(nextDraft);

    // Attributes deltas
    for (const [attrId] of Object.entries(attributeGroupById)) {
      const baseNow = getAttributeBase(attrId, nextDraft.clanId);
      const floorRating = Number(floorChar?.attributes?.[attrId] ?? baseNow);
      const nowRating = Number(nextChar?.attributes?.[attrId] ?? baseNow);
      freebieSpent +=
        Math.max(0, nowRating - floorRating) *
        freebieCost.getCost(TraitType.Attribute);
    }

    // Abilities deltas
    for (const abilityId of Object.keys(abilityGroupById)) {
      const floorRating = Number(floorChar?.abilities?.[abilityId] ?? 0);
      const nowRating = Number(nextChar?.abilities?.[abilityId] ?? 0);
      freebieSpent +=
        Math.max(0, nowRating - floorRating) *
        freebieCost.getCost(TraitType.Ability);
    }

    // Virtues deltas
    for (const id of ["conscience", "self_control", "courage"]) {
      const floorRating = Number(floorChar?.virtues?.[id] ?? 1);
      const nowRating = Number(nextChar?.virtues?.[id] ?? 1);
      freebieSpent +=
        Math.max(0, nowRating - floorRating) *
        freebieCost.getCost(TraitType.Virtue);
    }

    // Disciplines deltas
    const floorDiscRecord2 = (phase1DraftSnapshot.disciplines ?? {}) as Record<
      string,
      number
    >;
    const nowDiscRecord2 = rowsToRecord(nextDiscRows);
    for (const [id, nowDots] of Object.entries(nowDiscRecord2)) {
      const floorDots = Number(floorDiscRecord2[id] ?? 0);
      freebieSpent +=
        Math.max(0, Number(nowDots) - floorDots) *
        freebieCost.getCost(TraitType.Discipline);
    }

    // Backgrounds deltas
    const floorBgRecord2 = (phase1DraftSnapshot.backgrounds ?? {}) as Record<
      string,
      number
    >;
    const nowBgRecord2 = rowsToRecord(nextBgRows);
    for (const [id, nowDots] of Object.entries(nowBgRecord2)) {
      const floorDots = Number(floorBgRecord2[id] ?? 0);
      freebieSpent +=
        Math.max(0, Number(nowDots) - floorDots) *
        freebieCost.getCost(TraitType.Background);
    }

    // Humanity / Road deltas
    {
      const floorRoad = Number(
        (phase1DraftSnapshot as any).road ??
          (phase1DraftSnapshot as any).humanity ??
          0,
      );
      const nowRoad = Number(
        (nextDraft as any).road ?? (nextDraft as any).humanity ?? 0,
      );
      freebieSpent += Math.max(0, nowRoad - floorRoad) * HUMANITY_FREEBIE_COST;
    }

    // Willpower deltas
    {
      const floorWillpower = Number(floorChar?.willpower ?? 0);
      const nowWillpower = Number(nextChar?.willpower ?? 0);
      freebieSpent +=
        Math.max(0, nowWillpower - floorWillpower) * WILLPOWER_FREEBIE_COST;
    }

    if (freebieSpent > freebieTotal) {
      return { ok: false, reason: "Not enough Freebie Points." } as const;
    }

    return { ok: true } as const;
  }

  /* ===========================
   * Attributes / Abilities / Virtues handlers
   * ========================= */

  function handleAttributeDotsChange(attrId: string, next: number) {
    setDraft((prev) => {
      const clanId = prev.clanId;
      const base = getAttributeBase(attrId, clanId);
      const max = Math.max(base, Math.min(traitCap, next));

      const candidate: CharacterDraft = {
        ...prev,
        attributes: {
          ...(prev.attributes ?? {}),
          [attrId]: max,
        },
      };

      if (phase === 1) {
        const candidateChar: any = draftToCharacter(candidate);
        const candidateAttrs = (candidateChar?.attributes ?? {}) as Record<
          string,
          number
        >;

        const spendByGroup: Record<string, number> = {
          Physical: 0,
          Social: 0,
          Mental: 0,
        };
        Object.entries(attributeGroupById).forEach(([id, group]) => {
          const rating = Number(candidateAttrs[id] ?? 0);
          const b = getAttributeBase(id, candidate.clanId);
          spendByGroup[group] =
            (spendByGroup[group] ?? 0) + Math.max(0, rating - b);
        });

        if (!envelopeFits(spendByGroup, rules.attributes)) {
          setSpendError(
            "Starting Points (Attributes): limite 7/5/3 dinâmico excedido.",
          );
          return prev;
        }
      }

      const phase2Check = enforcePhase2FreebiesOrReject(
        candidate,
        disciplineRows,
        backgroundRows,
      );
      if (!phase2Check.ok) {
        setSpendError(phase2Check.reason);
        return prev;
      }

      setSpendError(null);
      return candidate;
    });
  }

  function openSpecialtyDrawer(
    traitType: "attribute" | "ability",
    traitCategory: string,
    traitId: string,
    currentValue: number,
  ) {
    setSpecialtyDrawer({
      open: true,
      traitType,
      traitCategory,
      traitId,
      currentValue,
    });
  }

  function closeSpecialtyDrawer() {
    setSpecialtyDrawer((prev) => ({ ...prev, open: false }));
  }

  function openMeritsFlawsDrawer() {
    setMeritsFlawsDrawer({
      open: true,
      tempMerits: [...(draft.merits ?? [])],
      tempFlaws: [...(draft.flaws ?? [])],
      selectedMeritId: null,
      selectedFlawId: null,
    });
  }

  function closeMeritsFlawsDrawer() {
    setMeritsFlawsDrawer({
      open: false,
      selectedMeritId: null,
      selectedFlawId: null,
      tempMerits: [],
      tempFlaws: [],
    });
  }

  function confirmMeritsFlawsDrawer() {
    updateDraft({
      merits: [...meritsFlawsDrawer.tempMerits],
      flaws: [...meritsFlawsDrawer.tempFlaws],
    });
    closeMeritsFlawsDrawer();
  }

  function addTempMerit(merit: {
    id: string;
    name: string;
    cost: number;
    description?: string;
  }) {
    setMeritsFlawsDrawer((prev) => ({
      ...prev,
      tempMerits: [...prev.tempMerits, { ...merit, category: "physical" }],
    }));
  }

  function addTempFlaw(flaw: {
    id: string;
    name: string;
    value: number;
    description?: string;
  }) {
    setMeritsFlawsDrawer((prev) => ({
      ...prev,
      tempFlaws: [...prev.tempFlaws, { ...flaw, category: "physical" }],
    }));
  }

  function selectSpecialty(specialtyItem: {
    name: string;
    description?: string;
  }) {
    if (!specialtyDrawer.traitId) return;

    const traitId = specialtyDrawer.traitId;

    setDraft((prev) => ({
      ...prev,
      specialties: {
        ...(prev.specialties ?? {}),
        [traitId]: specialtyItem,
      },
    }));

    closeSpecialtyDrawer();
  }

  function removeSpecialty(traitId: string) {
    setDraft((prev) => {
      const newSpecialties = { ...(prev.specialties ?? {}) };
      delete newSpecialties[traitId];
      return {
        ...prev,
        specialties: newSpecialties,
      };
    });
  }

  function handleAbilityDotsChange(abilityId: string, next: number) {
    setDraft((prev) => {
      const max = Math.max(0, Math.min(traitCap, next));

      const candidate: CharacterDraft = {
        ...prev,
        abilities: {
          ...(prev.abilities ?? {}),
          [abilityId]: max,
        },
      };

      if (phase === 1) {
        const candidateChar: any = draftToCharacter(candidate);
        const candidateAbils = (candidateChar?.abilities ?? {}) as Record<
          string,
          number
        >;

        const spendByGroup: Record<string, number> = {
          Talents: 0,
          Skills: 0,
          Knowledges: 0,
        };
        Object.entries(abilityGroupById).forEach(([id, group]) => {
          const rating = Number(candidateAbils[id] ?? 0);
          spendByGroup[group] =
            (spendByGroup[group] ?? 0) + Math.max(0, rating);
        });

        if (!envelopeFits(spendByGroup, rules.abilities)) {
          setSpendError(
            "Starting Points (Abilities): limite 13/9/5 dinâmico excedido.",
          );
          return prev;
        }
      }

      const phase2Check = enforcePhase2FreebiesOrReject(
        candidate,
        disciplineRows,
        backgroundRows,
      );
      if (!phase2Check.ok) {
        setSpendError(phase2Check.reason);
        return prev;
      }

      setSpendError(null);
      setTimeout(maybeAdvanceToPhase2, 0);
      return candidate;
    });
  }

  function handleVirtueDotsChange(virtueId: string, next: number) {
    // BLOQUEIO EXPLÍCITO DE FREEBIES PARA VIRTUES
    if (phase === 2) {
      const currentVirtues: Record<string, number> = (draft.virtues as
        | Record<string, number>
        | undefined) ?? {
        conscience: 1,
        self_control: 1,
        courage: 1,
      };
      const current = Number(currentVirtues[virtueId] ?? 1);

      // se está tentando subir e não há Freebies, bloqueia
      if (next > current && spendSnapshot.freebieRemaining <= 0) {
        setSpendError("Not enough Freebie Points para aumentar Virtues.");
        return;
      }
    }

    setDraft((prev) => {
      const base = 1;
      const clamped = Math.max(base, Math.min(5, next));

      const prevVirtues: Record<string, number> = (prev.virtues as
        | Record<string, number>
        | undefined) ?? {
        conscience: 1,
        self_control: 1,
        courage: 1,
      };

      const nextVirtues: Record<string, number> = {
        ...prevVirtues,
        [virtueId]: clamped,
      };

      const candidate: CharacterDraft = {
        ...prev,
        virtues: nextVirtues,
      };

      if (phase === 1) {
        const virtueAddedTotal = [
          "conscience",
          "self_control",
          "courage",
        ].reduce((acc, id) => {
          const rating = Number(nextVirtues[id] ?? base);
          return acc + Math.max(0, rating - base);
        }, 0);

        if (virtueAddedTotal > rules.virtues) {
          setSpendError("Starting Points (Virtues): limite excedido.");
          return prev;
        }

        const cCourage = Number(nextVirtues["courage"] ?? base);
        const cConscience = Number(nextVirtues["conscience"] ?? base);
        const cSelf = Number(nextVirtues["self_control"] ?? base);

        candidate.willpower = cCourage;
        candidate.road = cConscience + cSelf;
        (candidate as any).roadRating = cConscience + cSelf;
      }

      const phase2Check = enforcePhase2FreebiesOrReject(
        candidate,
        disciplineRows,
        backgroundRows,
      );
      if (!phase2Check.ok) {
        setSpendError(phase2Check.reason);
        return prev;
      }

      setSpendError(null);
      setTimeout(maybeAdvanceToPhase2, 0);
      return candidate;
    });
  }

  /* ===========================
   * Others (Willpower / Road handlers)
   * ========================= */

  function handleWillpowerDotsChange(next: number) {
    if (phase !== 2) return;

    // se tentar subir acima do valor atual sem Freebies, bloqueia
    if (next > willpowerPermanent && spendSnapshot.freebieRemaining <= 0) {
      setSpendError("Not enough Freebie Points para aumentar Willpower.");
      return;
    }

    setDraft((prev) => {
      const clamped = Math.max(0, Math.min(10, next));

      const candidate: CharacterDraft = {
        ...prev,
        willpower: clamped,
      };

      const phase2Check = enforcePhase2FreebiesOrReject(
        candidate,
        disciplineRows,
        backgroundRows,
      );
      if (!phase2Check.ok) {
        setSpendError(phase2Check.reason);
        return prev;
      }

      setSpendError(null);
      return candidate;
    });
  }

  function handleRoadDotsChange(next: number) {
    if (phase !== 2) return;

    // se tentar subir acima do valor atual sem Freebies, bloqueia
    if (next > roadRating && spendSnapshot.freebieRemaining <= 0) {
      setSpendError("Not enough Freebie Points para aumentar Road/Humanity.");
      return;
    }

    setDraft((prev) => {
      const clamped = Math.max(0, Math.min(10, next));

      const candidate: CharacterDraft = {
        ...prev,
        road: clamped,
      };
      (candidate as any).roadRating = clamped;

      const phase2Check = enforcePhase2FreebiesOrReject(
        candidate,
        disciplineRows,
        backgroundRows,
      );
      if (!phase2Check.ok) {
        setSpendError(phase2Check.reason);
        return prev;
      }

      setSpendError(null);
      return candidate;
    });
  }

  /* ===========================
   * Disciplines
   * ========================= */

  function handleDisciplineIdChange(rowKey: string, id: string | null) {
    setDisciplineRows((prev) => {
      const next = prev.map((row) => {
        if (row.key !== rowKey) return row;
        if (row.id) return row;

        const normalized = id && id.trim().length > 0 ? id : null;

        return {
          ...row,
          id: normalized,
          locked: Boolean(normalized),
          dots: normalized ? Math.max(1, row.dots) : row.dots,
        };
      });

      const candidateDraft: CharacterDraft = {
        ...draft,
        disciplines: rowsToRecord(next),
      };

      if (phase === 1) {
        const total = next.reduce((acc, r) => acc + (Number(r.dots) || 0), 0);
        if (total > rules.disciplines) {
          setSpendError("Starting Points (Disciplines): limite excedido.");
          return prev;
        }
      }

      const phase2Check = enforcePhase2FreebiesOrReject(
        candidateDraft,
        next,
        backgroundRows,
      );
      if (!phase2Check.ok) {
        setSpendError(phase2Check.reason);
        return prev;
      }

      updateDraft({ disciplines: rowsToRecord(next) });
      setSpendError(null);
      setTimeout(maybeAdvanceToPhase2, 0);
      return next;
    });
  }

  function getClanDisciplineIds(clanId: string | null): string[] {
    if (!clanId) return [];
    const clan = (clans as any[]).find((c) => c.id === clanId);
    if (!clan) return [];

    const candidates =
      clan.disciplines ??
      clan.inClanDisciplines ??
      clan.disciplineIds ??
      clan.disciplinesInClan ??
      clan.clanDisciplines;

    if (Array.isArray(candidates)) {
      return candidates
        .map((d: any) => (typeof d === "string" ? d : d?.id))
        .filter((d: any) => typeof d === "string" && d.length > 0);
    }

    return [];
  }

  function applyClanDisciplines(clanId: string | null) {
    const discIds = getClanDisciplineIds(clanId);

    const nextRows: TraitRow[] = discIds.map((id, idx) => ({
      key: `disc-clan-${id}-${idx}`,
      id,
      dots: 0,
      locked: true,
    }));

    setDisciplineRows(nextRows);
    updateDraft({ disciplines: rowsToRecord(nextRows) });
  }

  function handleClanChange(clanId: string | null) {
    updateDraft({ clanId });
    applyClanDisciplines(clanId);
  }

  function addDisciplineRow() {
    setDisciplineRows((prev) => [
      ...prev,
      {
        key: `disc-${Date.now()}-${prev.length}`,
        id: null,
        dots: 0,
        locked: false,
      },
    ]);
  }

  function removeDisciplineRow(rowKey: string) {
    if (phase === 2 && phase1DraftSnapshot) {
      const floorRecord = (phase1DraftSnapshot.disciplines ?? {}) as Record<
        string,
        number
      >;
      const row = disciplineRows.find((r) => r.key === rowKey);
      if (row?.id && Number(floorRecord[row.id] ?? 0) > 0) {
        setSpendError(
          "Phase 02: você não pode remover uma Discipline que existia na Phase 01.",
        );
        return;
      }
    }

    setDisciplineRows((prev) => {
      let next = prev.filter((row) => row.key !== rowKey);
      if (!next.length) {
        next = [{ key: "disc-0", id: null, dots: 0, locked: false }];
      }

      const candidateDraft: CharacterDraft = {
        ...draft,
        disciplines: rowsToRecord(next),
      };

      const phase2Check = enforcePhase2FreebiesOrReject(
        candidateDraft,
        next,
        backgroundRows,
      );
      if (!phase2Check.ok) {
        setSpendError(phase2Check.reason);
        return prev;
      }

      updateDraft({ disciplines: rowsToRecord(next) });
      setSpendError(null);
      setTimeout(maybeAdvanceToPhase2, 0);
      return next;
    });
  }

  function handleDisciplineDotsChange(rowKey: string, dots: number) {
    setDisciplineRows((prev) => {
      const next = prev.map((r) =>
        r.key === rowKey
          ? {
              ...r,
              dots,
              locked: r.locked || Boolean(r.id),
            }
          : r,
      );

      if (phase === 1) {
        const total = next.reduce((acc, r) => acc + (Number(r.dots) || 0), 0);
        if (total > rules.disciplines) {
          setSpendError("Starting Points (Disciplines): limite excedido.");
          return prev;
        }
      }

      const candidateDraft: CharacterDraft = {
        ...draft,
        disciplines: rowsToRecord(next),
      };

      const phase2Check = enforcePhase2FreebiesOrReject(
        candidateDraft,
        next,
        backgroundRows,
      );
      if (!phase2Check.ok) {
        setSpendError(phase2Check.reason);
        return prev;
      }

      updateDraft({ disciplines: rowsToRecord(next) });
      setSpendError(null);
      setTimeout(maybeAdvanceToPhase2, 0);
      return next;
    });
  }

  /* ===========================
   * Backgrounds
   * ========================= */

  function handleBackgroundIdChange(rowKey: string, id: string | null) {
    setBackgroundRows((prev) => {
      const next = prev.map((row) => {
        if (row.key !== rowKey) return row;
        if (row.id) return row;

        const normalized = id && id.trim().length > 0 ? id : null;

        return {
          ...row,
          id: normalized,
          locked: Boolean(normalized),
          dots: normalized ? Math.max(1, row.dots) : row.dots,
        };
      });

      if (phase === 1) {
        const total = next.reduce((acc, r) => acc + (Number(r.dots) || 0), 0);
        if (total > rules.backgrounds) {
          setSpendError("Starting Points (Backgrounds): limite excedido.");
          return prev;
        }
      }

      const candidateDraft: CharacterDraft = {
        ...draft,
        backgrounds: rowsToRecord(next),
      };

      const phase2Check = enforcePhase2FreebiesOrReject(
        candidateDraft,
        disciplineRows,
        next,
      );
      if (!phase2Check.ok) {
        setSpendError(phase2Check.reason);
        return prev;
      }

      setSpendError(null);
      applyBackgroundsToDraft(next);
      return next;
    });
  }

  function addBackgroundRow() {
    setBackgroundRows((prev) => [
      ...prev,
      {
        key: `bg-${Date.now()}-${prev.length}`,
        id: null,
        dots: 0,
        locked: false,
      },
    ]);
  }

  function removeBackgroundRow(rowKey: string) {
    if (phase === 2 && phase1DraftSnapshot) {
      const floorRecord = (phase1DraftSnapshot.backgrounds ?? {}) as Record<
        string,
        number
      >;
      const row = backgroundRows.find((r) => r.key === rowKey);
      if (row?.id && Number(floorRecord[row.id] ?? 0) > 0) {
        setSpendError(
          "Phase 02: você não pode remover um Background que existia na Phase 01.",
        );
        return;
      }
    }

    setBackgroundRows((prev) => {
      let next = prev.filter((row) => row.key !== rowKey);
      if (!next.length) {
        next = [{ key: "bg-0", id: null, dots: 0, locked: false }];
      }

      const candidateDraft: CharacterDraft = {
        ...draft,
        backgrounds: rowsToRecord(next),
      };

      const phase2Check = enforcePhase2FreebiesOrReject(
        candidateDraft,
        disciplineRows,
        next,
      );
      if (!phase2Check.ok) {
        setSpendError(phase2Check.reason);
        return prev;
      }

      setSpendError(null);
      applyBackgroundsToDraft(next);
      return next;
    });
  }

  function handleBackgroundDotsChange(rowKey: string, dots: number) {
    // precisamos saber o valor atual dessa linha e se está aumentando
    const currentRow = backgroundRows.find((r) => r.key === rowKey);
    const currentDots = Number(currentRow?.dots ?? 0);

    // BLOQUEIO EXPLÍCITO DE FREEBIES PARA BACKGROUNDS (inclui GENERATION)
    if (
      phase === 2 &&
      spendSnapshot.freebieRemaining <= 0 &&
      dots > currentDots
    ) {
      setSpendError(
        "Not enough Freebie Points para aumentar Backgrounds (incluindo Generation).",
      );
      return;
    }

    setBackgroundRows((prev) => {
      const next = prev.map((r) =>
        r.key === rowKey
          ? {
              ...r,
              dots,
              locked: r.locked || Boolean(r.id),
            }
          : r,
      );

      if (phase === 1) {
        const total = next.reduce((acc, r) => acc + (Number(r.dots) || 0), 0);
        if (total > rules.backgrounds) {
          setSpendError("Starting Points (Backgrounds): limite excedido.");
          return prev;
        }
      }

      const candidateDraft: CharacterDraft = {
        ...draft,
        backgrounds: rowsToRecord(next),
      };

      const phase2Check = enforcePhase2FreebiesOrReject(
        candidateDraft,
        disciplineRows,
        next,
      );
      if (!phase2Check.ok) {
        setSpendError(phase2Check.reason);
        return prev;
      }

      setSpendError(null);
      applyBackgroundsToDraft(next);
      return next;
    });
  }

  /* ===========================
   * Toggle Dark Ages / Masquerade
   * ========================= */

  function handleToggleDarkAges(e: React.ChangeEvent<HTMLInputElement>) {
    const nextMode = e.target.checked;
    setIsDarkAges(nextMode);
    applyBackgroundsToDraft(backgroundRows, nextMode);
  }

  /* ===========================
   * Phase controls
   * ========================= */

  function handleReturnPhase01() {
    // Se por algum motivo snapshots não existem, não deixe o usuário preso.
    if (
      !phase1DraftSnapshot ||
      !phase1DisciplineRowsSnapshot ||
      !phase1BackgroundRowsSnapshot
    ) {
      setPhase(1);
      setSpendError(null);
      showToast(
        "Snapshots da Phase 01 não encontrados. Voltando para Phase 01.",
      );
      return;
    }

    // Restaura o estado do fim da Phase 01
    setDraft(phase1DraftSnapshot);
    setDisciplineRows(phase1DisciplineRowsSnapshot);
    setBackgroundRows(phase1BackgroundRowsSnapshot);

    // Volta explicitamente para Phase 01
    setPhase(1);

    // Limpa os snapshots para a próxima ida à Phase 02
    setPhase1DraftSnapshot(null);
    setPhase1DisciplineRowsSnapshot(null);
    setPhase1BackgroundRowsSnapshot(null);

    setSpendError(null);
    showToast(
      "Returned to Phase 01: Starting Points unlocked. Freebie Points serão recalculados na próxima Phase 02.",
    );
  }

  /* ===========================
   * Preview meta
   * ========================= */

  const isNameValid = validateName(draft.name) === null;
  const effectiveGeneration =
    typeof c.generation === "number" && !Number.isNaN(c.generation)
      ? c.generation
      : (draft.generation ?? (isDarkAges ? 12 : 13));

  const roadName = c.road?.name ?? c.roadName ?? "Humanity";

  const draftVirtuesForPreview: Record<string, number> = (draft.virtues as
    | Record<string, number>
    | undefined) ?? {
    conscience: 1,
    self_control: 1,
    courage: 1,
  };

  let roadRating: number;
  let willpowerPermanent: number;

  if (phase === 1) {
    const conscience = Number(draftVirtuesForPreview.conscience ?? 1);
    const selfControl = Number(draftVirtuesForPreview.self_control ?? 1);
    const courage = Number(draftVirtuesForPreview.courage ?? 1);

    roadRating = conscience + selfControl;
    willpowerPermanent = courage;
  } else {
    const draftRoad = (draft as any).road;
    const draftWillpower = (draft as any).willpower;

    roadRating =
      typeof draftRoad === "number" && !Number.isNaN(draftRoad)
        ? draftRoad
        : Number(c.roadRating ?? (c as any).road ?? c.humanity ?? 0);

    willpowerPermanent =
      typeof draftWillpower === "number" && !Number.isNaN(draftWillpower)
        ? draftWillpower
        : Number(c.willpower ?? 0);
  }

  const willpowerTemporary = Number(
    c.willpowerTemporary ?? c.willpowerTemp ?? willpowerPermanent,
  );

  const bloodPoolMax = Math.max(10, Number(c.maximumBloodPool ?? 10));
  const bloodPerTurn = Number(c.bloodPointsPerTurn ?? 0);
  const maxTraitRating = Number(c.maxTraitRating ?? 5);

  const clanWeakness =
    ((clans as any[]).find((clan) => clan.id === draft.clanId) as any)
      ?.weakness ??
    (c as any)?.clan?.weakness ??
    "—";

  const healthLevels = [
    { label: "Bruised", penalty: "" },
    { label: "Hurt", penalty: "-1" },
    { label: "Injured", penalty: "-1" },
    { label: "Wounded", penalty: "-2" },
    { label: "Mauled", penalty: "-2" },
    { label: "Crippled", penalty: "-5" },
    { label: "Incapacitated", penalty: "" },
  ];

  // XP summary (total/granted, spent and available)
  const totalXp = Number((draft as any).totalExperience ?? 0);
  const spentXp = Number((draft as any).spentExperience ?? 0);
  const availableXp = Math.max(0, totalXp - spentXp);

  useEffect(() => {
    // Ao trocar de Template, reinicia completamente o processo de criação
    setPhase(1);
    setPhase1DraftSnapshot(null);
    setPhase1DisciplineRowsSnapshot(null);
    setPhase1BackgroundRowsSnapshot(null);
    setSpendError(null);
  }, [templateKey]);

  return (
    <div className="sheetPage">
      {toast && <div className="toast">{toast}</div>}

      {isLoadingFromDb && (
        <div className="sheetSection">
          <p className="muted">Loading character from database...</p>
        </div>
      )}

      {dbError && !isLoadingFromDb && (
        <div className="sheetSection">
          <p className="fieldError">{dbError}</p>
        </div>
      )}

      <div className="header">
        <h1 className="h1">ELYSIUM</h1>
        <p className="headerSubtitle">V20 Character Generator</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="pageContainer">
          <div className="mainContent">
            <div className="sheetActive">
              {/* ===== Intro ===== */}
              <div className="sheetSection">
                <h2 className="h2">Criar Ficha</h2>
                <p className="muted">Preencha os campos e distribua pontos.</p>
              </div>

              <div className="sheetSection">
                <h2 className="h2" style={{ marginTop: 16 }}>
                  Experience (XP)
                </h2>
                <p className="muted">
                  <span>XP Total: {totalXp}</span>
                  {" | "}
                  <span>XP Gasto: {spentXp}</span>
                  {" | "}
                  <span>XP Disponível: {availableXp}</span>
                </p>
                {/* ===== Persona ===== */}
                <h2 className="h2">Persona</h2>

                <div className="personaGrid personaGridCreate">
                  {/* Linha 1: Name, Nature, Clan */}
                  <p className="personaRow">
                    <strong>Name:</strong>
                    <input
                      className="textInput"
                      value={draft.name ?? ""}
                      onChange={handleNameChange}
                      onBlur={handleNameBlur}
                      placeholder="Nome do personagem"
                    />
                  </p>
                  <p className="personaRow">
                    <strong>Nature:</strong>
                    <AutocompleteInput
                      label=""
                      valueId={draft.natureId}
                      onChangeId={(id) => updateDraft({ natureId: id })}
                      options={natureOptions}
                      placeholder="Selecione uma Nature"
                    />
                  </p>
                  <p className="personaRow">
                    <strong>Clan:</strong>
                    <AutocompleteInput
                      label=""
                      valueId={draft.clanId}
                      onChangeId={(id) => handleClanChange(id)}
                      options={clanOptions}
                      placeholder="Selecione um Clan"
                    />
                  </p>

                  {/* Linha 2: Player, Demeanor, Generation */}
                  <p className="personaRow">
                    <strong>Player:</strong>
                    <input
                      className="textInput"
                      value={draft.player ?? ""}
                      onChange={(e) => updateDraft({ player: e.target.value })}
                      placeholder="Nome do jogador"
                    />
                  </p>
                  <p className="personaRow">
                    <strong>Demeanor:</strong>
                    <AutocompleteInput
                      label=""
                      valueId={draft.demeanorId}
                      onChangeId={(id) => updateDraft({ demeanorId: id })}
                      options={natureOptions}
                      placeholder="Selecione um Demeanor"
                    />
                  </p>
                  <p className="personaRow">
                    <strong>Generation:</strong> {effectiveGeneration}th
                    <label className="generationCheckbox">
                      <input
                        type="checkbox"
                        checked={isDarkAges}
                        onChange={handleToggleDarkAges}
                      />
                      Dark Ages
                    </label>
                  </p>

                  {/* Linha 3: Chronicle, Concept, Sire */}
                  <p className="personaRow">
                    <strong>Chronicle:</strong>
                    <input
                      className="textInput"
                      value={draft.chronicle ?? ""}
                      onChange={(e) =>
                        updateDraft({ chronicle: e.target.value })
                      }
                      placeholder="Nome da crônica"
                    />
                  </p>
                  <p className="personaRow">
                    <strong>Concept:</strong>
                    <AutocompleteInput
                      label=""
                      valueId={draft.conceptId}
                      onChangeId={(id) => updateDraft({ conceptId: id })}
                      options={conceptOptions}
                      placeholder="Selecione um Concept"
                    />
                  </p>
                  <p className="personaRow">
                    <strong>Sire:</strong>
                    <input
                      className="textInput"
                      value={draft.sire ?? ""}
                      onChange={(e) => updateDraft({ sire: e.target.value })}
                      placeholder="Nome do sire"
                    />
                  </p>

                  {nameError && (
                    <p className="personaRowFull fieldError personaFullWidth">
                      {nameError}
                    </p>
                  )}
                </div>

                {/* Metadados de Geração */}
                <div className="personaGrid hrTop">
                  <p>
                    <strong>Max Blood Pool:</strong> {c.maximumBloodPool ?? "—"}
                  </p>
                  <p>
                    <strong>Blood Per Turn:</strong> {bloodPerTurn || "—"}
                  </p>
                  <p>
                    <strong>Max Trait Rating:</strong> {maxTraitRating}
                  </p>
                </div>
              </div>

              {/* ===== Weakness ===== */}
              <div className="sheetSection">
                <h2 className="h2">Weakness</h2>
                <p className="muted">{clanWeakness}</p>
              </div>

              {/* ===== Attributes ===== */}
              <div className="sheetSection">
                <h2 className="h2">Attributes</h2>
                <p className="muted">
                  Starting remaining (Attributes):{" "}
                  {spendSnapshot.startingRemainingAttributes} | Freebies
                  remaining: {spendSnapshot.freebieRemaining}
                </p>
                {spendError && <p className="fieldError">{spendError}</p>}

                <div className="grid3">
                  {Object.keys(ATTRIBUTE_CATEGORIES).map((cat) => (
                    <div key={cat}>
                      <h3 className="h3">{cat}</h3>
                      {(ATTRIBUTE_CATEGORIES as any)[cat].map((id: string) => {
                        let v = Number(attrs[id] ?? 0);

                        const isAppearance = id === "appearance";
                        const isNosferatu = draft.clanId === "nosferatu";
                        if (!isAppearance || !isNosferatu) {
                          v = Math.max(v, 1);
                        }

                        return (
                          <div className="itemRow" key={id}>
                            <Label text={titleCaseAndClean(id)} />
                            <DotsSelector
                              value={v}
                              max={traitCap}
                              onChange={(dots) =>
                                handleAttributeDotsChange(id, dots)
                              }
                            />
                            {v >= 4 && (
                              <button
                                type="button"
                                className="btn-mini"
                                onClick={() =>
                                  openSpecialtyDrawer("attribute", cat, id, v)
                                }
                                title="Add Specialty"
                              >
                                {draft.specialties?.[id] ? "✎" : "+"}
                              </button>
                            )}
                            {draft.specialties?.[id] && (
                              <span
                                className="specialty-badge"
                                title={
                                  draft.specialties[id].description ??
                                  draft.specialties[id].name
                                }
                              >
                                {draft.specialties[id].name}
                                <button
                                  type="button"
                                  className="btn-mini-remove"
                                  onClick={() => removeSpecialty(id)}
                                >
                                  ×
                                </button>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* ===== Abilities ===== */}
              <div className="sheetSection">
                <h2 className="h2">Abilities</h2>
                <p className="muted">
                  Starting remaining (Abilities):{" "}
                  {spendSnapshot.startingRemainingAbilities} | Freebies
                  remaining: {spendSnapshot.freebieRemaining}
                </p>
                {spendError && <p className="fieldError">{spendError}</p>}

                <div className="grid3">
                  {Object.keys(ABILITY_CATEGORIES).map((cat) => (
                    <div key={cat}>
                      <h3 className="h3">{cat}</h3>
                      {(ABILITY_CATEGORIES as any)[cat].map((id: string) => {
                        const v = Number(abilities[id] ?? 0);
                        return (
                          <div className="itemRow" key={id}>
                            <Label
                              text={titleCaseAndClean(id)}
                              className={v === 0 ? "muted" : ""}
                            />
                            <DotsSelector
                              value={v}
                              max={traitCap}
                              onChange={(dots) =>
                                handleAbilityDotsChange(id, dots)
                              }
                            />
                            {v >= 4 && (
                              <button
                                type="button"
                                className="btn-mini"
                                onClick={() =>
                                  openSpecialtyDrawer("ability", cat, id, v)
                                }
                                title="Add Specialty"
                              >
                                {draft.specialties?.[id] ? "✎" : "+"}
                              </button>
                            )}
                            {draft.specialties?.[id] && (
                              <span
                                className="specialty-badge"
                                title={
                                  draft.specialties[id].description ??
                                  draft.specialties[id].name
                                }
                              >
                                {draft.specialties[id].name}
                                <button
                                  type="button"
                                  className="btn-mini-remove"
                                  onClick={() => removeSpecialty(id)}
                                >
                                  ×
                                </button>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* ===== Advantages ===== */}
              <div className="sheetSection">
                <h2 className="h2">Advantages</h2>

                <div className="grid3">
                  {/* Disciplines */}
                  <div>
                    <h3 className="h3">Disciplines</h3>
                    <p className="muted">
                      Starting remaining (Disciplines):{" "}
                      {spendSnapshot.startingRemainingDisciplines} | Freebies
                      remaining: {spendSnapshot.freebieRemaining}
                    </p>

                    {disciplineRows.map((row) => (
                      <div className="itemRow" key={row.key}>
                        <span className="itemRowMain">
                          <button
                            type="button"
                            className="iconButton"
                            onClick={() => removeDisciplineRow(row.key)}
                            aria-label="Remover disciplina"
                          >
                            🗑
                          </button>

                          {row.locked || Boolean(row.id) ? (
                            <span className="fieldValue">
                              {row.id
                                ? (disciplineNameById[row.id] ?? row.id)
                                : "(Selecionado)"}
                            </span>
                          ) : (
                            <span className="fieldAutocomplete">
                              <AutocompleteInput
                                label=""
                                valueId={row.id}
                                onChangeId={(id) =>
                                  handleDisciplineIdChange(row.key, id)
                                }
                                options={disciplineOptions}
                                placeholder="Selecione uma Discipline"
                              />
                            </span>
                          )}
                        </span>

                        <DotsSelector
                          value={row.dots}
                          max={traitCap}
                          onChange={(dots) =>
                            handleDisciplineDotsChange(row.key, dots)
                          }
                        />
                      </div>
                    ))}
                  </div>

                  {/* Backgrounds */}
                  <div>
                    <h3 className="h3">Backgrounds</h3>
                    <p className="muted">
                      Starting remaining (Backgrounds):{" "}
                      {spendSnapshot.startingRemainingBackgrounds} | Freebies
                      remaining: {spendSnapshot.freebieRemaining}
                    </p>

                    {backgroundRows.map((row) => (
                      <div className="itemRow" key={row.key}>
                        <span className="itemRowMain">
                          <button
                            type="button"
                            className="iconButton"
                            onClick={() => removeBackgroundRow(row.key)}
                            aria-label="Remover background"
                          >
                            🗑
                          </button>

                          {row.locked || Boolean(row.id) ? (
                            <span className="fieldValue">
                              {row.id
                                ? (backgroundNameById[row.id] ?? row.id)
                                : "(Selecionado)"}
                            </span>
                          ) : (
                            <span className="fieldAutocomplete">
                              <AutocompleteInput
                                label=""
                                valueId={row.id}
                                onChangeId={(id) =>
                                  handleBackgroundIdChange(row.key, id)
                                }
                                options={backgroundOptions}
                                placeholder="Selecione um Background"
                              />
                            </span>
                          )}
                        </span>

                        <DotsSelector
                          value={row.dots}
                          max={traitCap}
                          onChange={(dots) =>
                            handleBackgroundDotsChange(row.key, dots)
                          }
                        />
                      </div>
                    ))}
                  </div>

                  {/* Virtues */}
                  <div>
                    <h3 className="h3">Virtues</h3>
                    <p className="muted">
                      Starting remaining (Virtues):{" "}
                      {spendSnapshot.startingRemainingVirtues} | Freebies
                      remaining: {spendSnapshot.freebieRemaining}
                    </p>

                    {["conscience", "self_control", "courage"].map((id) => {
                      const v = Number(virtues?.[id] ?? 1);
                      return (
                        <div className="itemRow" key={id}>
                          <span
                            className="itemRowMain"
                            style={{ pointerEvents: "none" }}
                          >
                            <Label text={titleCaseAndClean(id)} />
                          </span>

                          <span
                            style={{
                              pointerEvents: "auto",
                              position: "relative",
                              zIndex: 5,
                            }}
                          >
                            <DotsSelector
                              value={v}
                              max={5}
                              onChange={(dots) =>
                                handleVirtueDotsChange(id, dots)
                              }
                            />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ===== Others ===== */}
              <div className="sheetSection">
                <h2 className="h2">Others</h2>

                <div className="grid3">
                  {/* Column 1: Merits & Flaws - Phase 2 only */}
                  <div>
                    {phase === 2 && (
                      <>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <h3 className="h3">Merits</h3>
                          <button
                            type="button"
                            className="btn-mini"
                            onClick={() => openMeritsFlawsDrawer()}
                          >
                            Add
                          </button>
                        </div>
                        {(draft.merits ?? []).map((merit, idx) => (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              marginBottom: 4,
                              background: "#1a3a1a",
                              padding: "4px 8px",
                              borderRadius: 4,
                            }}
                            key={`merit-${idx}`}
                          >
                            <span
                              style={{
                                color: "#90ee90",
                                fontWeight: 700,
                                width: 30,
                              }}
                            >
                              -{merit.cost}
                            </span>
                            <span style={{ flex: 1, color: "#90ee90" }}>
                              {merit.name}
                            </span>
                          </div>
                        ))}

                        {/* Flaws */}
                        <h3 className="h3" style={{ marginTop: 16 }}>
                          Flaws
                        </h3>
                        <p className="muted">Max -7 (gives +7 freebies)</p>
                        {(draft.flaws ?? []).map((flaw, idx) => (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              marginBottom: 4,
                              background: "#3a1a1a",
                              padding: "4px 8px",
                              borderRadius: 4,
                            }}
                            key={`flaw-${idx}`}
                          >
                            <span
                              style={{
                                color: "#ff6b6b",
                                fontWeight: 700,
                                width: 30,
                              }}
                            >
                              +{flaw.value}
                            </span>
                            <span style={{ flex: 1, color: "#ff6b6b" }}>
                              {flaw.name}
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>

                  {/* Column 2: Willpower/Road/Blood Pool */}
                  <div>
                    <h3 className="h3">Willpower</h3>
                    <DotsSelector
                      value={willpowerPermanent}
                      max={10}
                      onChange={handleWillpowerDotsChange}
                      disabled={phase !== 2}
                    />
                    <div className="willpowerTemporarySpacing">
                      <Squares count={willpowerTemporary} maxScale={10} />
                    </div>

                    <h3 className="h3 othersRoadSpacing">Road: {roadName}</h3>
                    <DotsSelector
                      value={roadRating}
                      max={10}
                      onChange={handleRoadDotsChange}
                      disabled={phase !== 2}
                    />

                    <h3 className="h3 othersBloodPoolSpacing">Blood Pool</h3>
                    <Squares
                      count={bloodPoolMax}
                      maxScale={bloodPoolMax}
                      perRow={10}
                    />
                    <p className="muted othersBloodPoolInfo">
                      Max: {bloodPoolMax} | Per turn: {bloodPerTurn}
                    </p>
                  </div>

                  <div>
                    <h3 className="h3">Health</h3>
                    <div className="healthGrid">
                      {healthLevels.map(({ label, penalty }) => (
                        <div
                          className="healthRow"
                          key={label}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                          }}
                        >
                          <span className="roadLabel" style={{ flex: 1 }}>
                            {label}
                          </span>
                          <span
                            className="healthPenalty"
                            style={{ minWidth: 24, textAlign: "right" }}
                          >
                            {penalty}
                          </span>
                          <div className="healthBox" style={{ marginLeft: 8 }}>
                            <Squares count={1} maxScale={1} perRow={1} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="sidebar">
            <div className="sheetSection">
              <h2 className="h2">Ações</h2>

              <p className="muted sidebarPhaseInfo">
                {phase === 1
                  ? "Phase 01 - Starting Points"
                  : "Phase 02 - Freebie Points"}
              </p>

              <label className="muted sidebarTemplateLabel">Template</label>
              <select
                className="textInput sidebarTemplateSelect"
                value={templateKey}
                disabled={phase === 2}
                onChange={(e) => setTemplateKey(e.target.value as TemplateKey)}
              >
                {Object.entries(TEMPLATE_LABEL).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>

              {phase === 2 && (
                <button
                  type="button"
                  className="btn sidebarReturnButton"
                  onClick={handleReturnPhase01}
                >
                  Return Phase 01
                </button>
              )}

              <hr className="sidebarDivider" />

              <button type="button" className="btn" onClick={addDisciplineRow}>
                + Discipline
              </button>

              <button
                type="button"
                className="btn sidebarAddButton"
                onClick={addBackgroundRow}
              >
                + Background
              </button>

              <hr className="sidebarDivider" />

              {(() => {
                const tempFlawBonus = Math.min(
                  meritsFlawsDrawer.tempFlaws.reduce(
                    (sum: number, f: any) => sum + (f.value ?? 0),
                    0,
                  ),
                  7,
                );
                const totalWithTemp =
                  spendSnapshot.freebieTotal + tempFlawBonus;
                return (
                  <>
                    <p className="muted sidebarSpendingInfo">
                      Starting remaining (all):{" "}
                      {spendSnapshot.startingRemainingAll}
                    </p>
                    <p className="muted sidebarSpendingInfo">
                      Freebies: {spendSnapshot.freebieRemaining} /{" "}
                      {totalWithTemp}
                      {tempFlawBonus > 0 && (
                        <span className="muted" style={{ fontSize: 10 }}>
                          {" "}
                          (+{tempFlawBonus} from new flaws)
                        </span>
                      )}
                    </p>
                  </>
                );
              })()}

              {hasSavedDraft && (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={handleLoadSavedDraft}
                  disabled={!isLocalStorageAvailable}
                >
                  Carregar Ficha Salva
                </button>
              )}

              <button type="submit" className="btn" disabled={!isNameValid}>
                Salvar Ficha
              </button>

              {dbCharacterId && (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() =>
                    router.push(`/player?characterId=${dbCharacterId}`)
                  }
                >
                  View Character
                </button>
              )}

              {dbCharacterId && characterStatus !== "APPROVED" && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!isNameValid}
                  onClick={async () => {
                    if (!dbCharacterId) return;
                    const submitted = await submitCharacterToApi(dbCharacterId);
                    if (submitted) {
                      setToast("Character submitted for approval!");
                    }
                  }}
                >
                  Submit
                </button>
              )}

              {!isNameValid && (
                <p className="muted actionsHint">
                  Informe um Name válido (mín. 2 caracteres) para salvar.
                </p>
              )}
            </div>
          </aside>
        </div>
      </form>

      {/* Specialty Drawer */}
      {specialtyDrawer.open && (
        <div className="drawer-overlay" onClick={closeSpecialtyDrawer}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>
                Select Specialty -{" "}
                {titleCaseAndClean(specialtyDrawer.traitId || "")}
              </h3>
              <button
                type="button"
                className="drawer-close"
                onClick={closeSpecialtyDrawer}
              >
                ×
              </button>
            </div>
            <div className="drawer-body">
              <p className="muted">
                Rating: {specialtyDrawer.currentValue}
                {isLegendaryRating(specialtyDrawer.currentValue) &&
                  " (Legendary)"}
              </p>
              <p className="muted" style={{ marginBottom: 12 }}>
                Choose a specialty for{" "}
                {titleCaseAndClean(specialtyDrawer.traitId || "")} (level 4+)
              </p>

              {(() => {
                const currentSpecialty =
                  draft.specialties?.[specialtyDrawer.traitId || ""];
                const selectedId = currentSpecialty?.name || null;

                return (
                  <>
                    <AutocompleteInput
                      label=""
                      valueId={selectedId}
                      onChangeId={(id) => {
                        if (id) {
                          selectSpecialty({
                            name: id,
                            description: currentSpecialty?.description,
                          });
                        }
                      }}
                      options={specialtyOptions}
                      placeholder="Search specialty..."
                    />

                    <div style={{ marginTop: 16 }}>
                      <label
                        className="muted"
                        style={{ display: "block", marginBottom: 4 }}
                      >
                        Description (optional)
                      </label>
                      <textarea
                        className="textInput"
                        style={{
                          width: "100%",
                          minHeight: 80,
                          resize: "vertical",
                        }}
                        value={currentSpecialty?.description ?? ""}
                        onChange={(e) => {
                          const traitId = specialtyDrawer.traitId;
                          if (!traitId) return;
                          setDraft((prev) => ({
                            ...prev,
                            specialties: {
                              ...(prev.specialties ?? {}),
                              [traitId]: {
                                name: currentSpecialty?.name ?? "",
                                description: e.target.value,
                              },
                            },
                          }));
                        }}
                        placeholder="Add a description for this specialty..."
                      />
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Merits/Flaws Drawer */}
      {meritsFlawsDrawer.open && (
        <div className="drawer-overlay" onClick={closeMeritsFlawsDrawer}>
          <div
            className="drawer"
            style={{ width: 500 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-header">
              <h3>Merits & Flaws</h3>
              <button
                type="button"
                className="drawer-close"
                onClick={closeMeritsFlawsDrawer}
              >
                ×
              </button>
            </div>
            <div className="drawer-body">
              {/* Calculate available freebies based on spendSnapshot */}
              <p className="muted" style={{ marginBottom: 12 }}>
                Available freebies:{" "}
                <span
                  style={{
                    color:
                      spendSnapshot.freebieRemaining > 0
                        ? "#90ee90"
                        : "#ff6b6b",
                    fontWeight: 700,
                  }}
                >
                  {spendSnapshot.freebieRemaining}
                </span>
                {" | "}Merits cost: {totalMeritCost} | Flaws give: +
                {totalFlawValue}
              </p>

              {/* Merits Section */}
              <div style={{ marginBottom: 24 }}>
                <h4
                  className="h4"
                  style={{ color: "#90ee90", marginBottom: 8 }}
                >
                  Merits
                </h4>
                {meritsFlawsDrawer.tempMerits.map((merit, idx) => (
                  <div
                    key={`merit-row-${idx}`}
                    style={{
                      display: "flex",
                      gap: 8,
                      marginBottom: 8,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ flex: 2 }}>
                      <AutocompleteInput
                        label=""
                        valueId={merit.id}
                        onChangeId={(id) => {
                          const selected = meritOptions.find(
                            (m) => m.id === id,
                          );
                          if (selected) {
                            const newMerits = [...meritsFlawsDrawer.tempMerits];
                            newMerits[idx] = selected;
                            setMeritsFlawsDrawer((prev) => ({
                              ...prev,
                              tempMerits: newMerits,
                            }));
                          }
                        }}
                        options={filteredMeritOptions.map((m) => ({
                          id: m.id,
                          name: m.name,
                        }))}
                        placeholder="Select merit"
                      />
                    </div>
                    <div
                      style={{
                        width: 40,
                        textAlign: "center",
                        color: "#90ee90",
                        fontWeight: 700,
                      }}
                    >
                      -{merit.cost}
                    </div>
                    <div
                      style={{
                        width: 80,
                        textAlign: "center",
                        fontSize: 11,
                        color: "#aaa",
                      }}
                    >
                      {merit.category || "physical"}
                    </div>
                    <button
                      type="button"
                      className="btn-mini"
                      style={{ width: 30 }}
                      onClick={() => {
                        const newMerits = meritsFlawsDrawer.tempMerits.filter(
                          (_, i) => i !== idx,
                        );
                        setMeritsFlawsDrawer((prev) => ({
                          ...prev,
                          tempMerits: newMerits,
                        }));
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {spendSnapshot.freebieRemaining +
                  totalFlawValue -
                  totalMeritCost >=
                  0 &&
                  totalMeritCost < 7 && (
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 8,
                        alignItems: "center",
                      }}
                    >
                      <div style={{ flex: 2 }}>
                        <AutocompleteInput
                          label=""
                          valueId={meritsFlawsDrawer.selectedMeritId ?? ""}
                          onChangeId={(id) => {
                            setMeritsFlawsDrawer((prev) => ({
                              ...prev,
                              selectedMeritId: id,
                            }));
                          }}
                          options={filteredMeritOptions.map((m) => ({
                            id: m.id,
                            name: m.name,
                          }))}
                          placeholder="Select merit"
                        />
                      </div>
                      <div
                        style={{
                          width: 40,
                          textAlign: "center",
                          color: "#90ee90",
                          fontWeight: 700,
                        }}
                      >
                        -
                        {meritOptions.find(
                          (m) => m.id === meritsFlawsDrawer.selectedMeritId,
                        )?.cost ?? 0}
                      </div>
                      <div
                        style={{
                          width: 80,
                          textAlign: "center",
                          fontSize: 11,
                          color: "#aaa",
                        }}
                      >
                        {meritOptions
                          .find(
                            (m) => m.id === meritsFlawsDrawer.selectedMeritId,
                          )
                          ?.description?.slice(0, 10) || "physical"}
                      </div>
                      <button
                        type="button"
                        className="btn-mini"
                        style={{ width: 30 }}
                        disabled={!meritsFlawsDrawer.selectedMeritId}
                        onClick={() => {
                          const selected = meritOptions.find(
                            (m) => m.id === meritsFlawsDrawer.selectedMeritId,
                          );
                          if (selected) {
                            addTempMerit(selected);
                            setMeritsFlawsDrawer((prev) => ({
                              ...prev,
                              selectedMeritId: null,
                            }));
                          }
                        }}
                      >
                        +
                      </button>
                    </div>
                  )}
              </div>

              {/* Flaws Section */}
              <div style={{ marginBottom: 24 }}>
                <h4
                  className="h4"
                  style={{ color: "#ff6b6b", marginBottom: 8 }}
                >
                  Flaws
                </h4>
                {meritsFlawsDrawer.tempFlaws.map((flaw, idx) => (
                  <div
                    key={`flaw-row-${idx}`}
                    style={{
                      display: "flex",
                      gap: 8,
                      marginBottom: 8,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ flex: 2 }}>
                      <AutocompleteInput
                        label=""
                        valueId={flaw.id}
                        onChangeId={(id) => {
                          const selected = flawOptions.find((f) => f.id === id);
                          if (selected) {
                            const newFlaws = [...meritsFlawsDrawer.tempFlaws];
                            newFlaws[idx] = {
                              id: selected.id,
                              name: selected.name,
                              value: selected.cost,
                              description: selected.description,
                            };
                            setMeritsFlawsDrawer((prev) => ({
                              ...prev,
                              tempFlaws: newFlaws,
                            }));
                          }
                        }}
                        options={flawOptions.map((f) => ({
                          id: f.id,
                          name: f.name,
                        }))}
                        placeholder="Select flaw"
                      />
                    </div>
                    <div
                      style={{
                        width: 40,
                        textAlign: "center",
                        color: "#ff6b6b",
                        fontWeight: 700,
                      }}
                    >
                      +{flaw.value}
                    </div>
                    <div
                      style={{
                        width: 80,
                        textAlign: "center",
                        fontSize: 11,
                        color: "#aaa",
                      }}
                    >
                      {flaw.category || "physical"}
                    </div>
                    <button
                      type="button"
                      className="btn-mini"
                      style={{ width: 30 }}
                      onClick={() => {
                        const newFlaws = meritsFlawsDrawer.tempFlaws.filter(
                          (_, i) => i !== idx,
                        );
                        setMeritsFlawsDrawer((prev) => ({
                          ...prev,
                          tempFlaws: newFlaws,
                        }));
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {totalFlawValue < 7 && (
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 8,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ flex: 2 }}>
                      <AutocompleteInput
                        label=""
                        valueId={meritsFlawsDrawer.selectedFlawId ?? ""}
                        onChangeId={(id) => {
                          setMeritsFlawsDrawer((prev) => ({
                            ...prev,
                            selectedFlawId: id,
                          }));
                        }}
                        options={flawOptions.map((f) => ({
                          id: f.id,
                          name: f.name,
                        }))}
                        placeholder="Select flaw"
                      />
                    </div>
                    <div
                      style={{
                        width: 40,
                        textAlign: "center",
                        color: "#ff6b6b",
                        fontWeight: 700,
                      }}
                    >
                      +
                      {flawOptions.find(
                        (f) => f.id === meritsFlawsDrawer.selectedFlawId,
                      )?.cost ?? 0}
                    </div>
                    <div
                      style={{
                        width: 80,
                        textAlign: "center",
                        fontSize: 11,
                        color: "#aaa",
                      }}
                    >
                      {flawOptions
                        .find((f) => f.id === meritsFlawsDrawer.selectedFlawId)
                        ?.description?.slice(0, 10) || "physical"}
                    </div>
                    <button
                      type="button"
                      className="btn-mini"
                      style={{ width: 30 }}
                      disabled={!meritsFlawsDrawer.selectedFlawId}
                      onClick={() => {
                        const selected = flawOptions.find(
                          (f) => f.id === meritsFlawsDrawer.selectedFlawId,
                        );
                        if (selected) {
                          addTempFlaw({
                            id: selected.id,
                            name: selected.name,
                            value: selected.cost,
                            description: selected.description,
                          });
                          setMeritsFlawsDrawer((prev) => ({
                            ...prev,
                            selectedFlawId: null,
                          }));
                        }
                      }}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="btn"
                style={{ width: "100%" }}
                onClick={confirmMeritsFlawsDrawer}
              >
                Confirm
              </button>
              <p
                className="muted"
                style={{ marginTop: 8, fontSize: 11, textAlign: "center" }}
              >
                Auto-filter: Only merits costing ≤ available freebies are shown
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreateCharacterPageWrapper({
  searchParams,
}: {
  searchParams: Promise<{ characterId?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="sheetPage">
          <div className="sheetSection">
            <p className="muted">Loading...</p>
          </div>
        </div>
      }
    >
      <CreateCharacterPageWrapperInner searchParams={searchParams} />
    </Suspense>
  );
}

async function CreateCharacterPageWrapperInner({
  searchParams,
}: {
  searchParams: Promise<{ characterId?: string }>;
}) {
  const params = await searchParams;
  const characterId = params?.characterId;
  return <CreateCharacterPage characterId={characterId} />;
}

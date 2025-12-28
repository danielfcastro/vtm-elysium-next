"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dots } from "@/components/Dots";
import { Squares } from "@/components/Squares";
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

import { ATTRIBUTE_CATEGORIES } from "@/core/data/attributes";
import { ABILITY_CATEGORIES } from "@/core/data/abilities";

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
    // Placeholder: mantém os mesmos números do Elysium até você plugar a tabela do link
    attributes: [10, 7, 5],
    abilities: [20, 12, 8],
    disciplines: 10,
    backgrounds: 15,
    virtues: 7,
    baseFreebies: 20,
    usesAgeFreebies: true,
  },
};

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

function CreateCharacterPage() {
  const [draft, setDraft] = useState<CharacterDraft>(() => {
    const d = createEmptyCharacterDraft();

    // Virtues start with 1 dot each by default (VtM/V20 baseline).
    const virtues = { ...((d.virtues as any) ?? {}) };
    virtues.conscience = Number(virtues.conscience ?? 1);
    virtues.self_control = Number(virtues.self_control ?? 1);
    virtues.courage = Number(virtues.courage ?? 1);
    d.virtues = virtues as any;

    // Phase 01 derived stats (baseline): Willpower = Courage; Road/Humanity = Conscience + Self-Control.
    // Aqui ignoramos quaisquer valores default de createEmptyCharacterDraft para estas
    // trilhas derivadas e forçamos o baseline pelas Virtues.
    d.willpower = virtues.courage;
    d.road = virtues.conscience + virtues.self_control;
    // Road rating (used for the "Road" track) follows Road in Phase 01 baseline.
    (d as any).roadRating = d.road;

    return d;
  });
  const [nameError, setNameError] = useState<string | null>(null);
  const [isDarkAges, setIsDarkAges] = useState(false);

  const [templateKey, setTemplateKey] = useState<TemplateKey>("neophyte");
  const rules = TEMPLATE_RULES[templateKey];

  // ===== Creation phases =====
  const [phase, setPhase] = useState<CreationPhase>(1);
  const [spendError, setSpendError] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<any>(null);

  const [phase1DraftSnapshot, setPhase1DraftSnapshot] =
    useState<CharacterDraft | null>(null);
  const [phase1DisciplineRowsSnapshot, setPhase1DisciplineRowsSnapshot] =
    useState<TraitRow[] | null>(null);
  const [phase1BackgroundRowsSnapshot, setPhase1BackgroundRowsSnapshot] =
    useState<TraitRow[] | null>(null);

  // rows de edição
  const [backgroundRows, setBackgroundRows] = useState<TraitRow[]>(() =>
    createRowsFromRecord(createEmptyCharacterDraft().backgrounds),
  );
  const [disciplineRows, setDisciplineRows] = useState<TraitRow[]>(() =>
    createRowsFromRecord(createEmptyCharacterDraft().disciplines),
  );

  // opções de autocomplete
  const conceptOptions = concepts as NamedItem[];
  const clanOptions = clans as NamedItem[];
  const natureOptions = natures as NamedItem[];
  const disciplineOptions = disciplinesJson as NamedItem[];
  const backgroundOptions = backgroundsJson as NamedItem[];

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
    toastTimerRef.current = setTimeout(() => setToast(null), 3200);
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

  /**
   * Aplica backgrounds -> generation + stats de generation,
   * levando em conta o modo (Dark Ages ou Máscara).
   */
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
  const virtues = (
    Object.keys((c.virtues ?? {}) as Record<string, number>).length
      ? (c.virtues as Record<string, number>)
      : ((draft.virtues as Record<string, number> | undefined) ?? {})
  ) as Record<string, number>;

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

    // Freebie spending is only computed in Phase 2, and always as a delta
    // above the Phase 01 snapshot (or, as a safety net, above the current
    // draft if the snapshot ainda não foi inicializada).
    let freebieSpent = 0;

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

      // Virtues (delta acima do snapshot da Phase 01, olhando direto o draft)
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

      // Humanity / Road (usa road/humanity diretamente do draft)
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

      // Willpower (direto do draft)
      {
        const floorWillpower = Number((floorDraft as any).willpower ?? 0);
        const nowWillpower = Number((draft as any).willpower ?? 0);
        if (nowWillpower > floorWillpower) {
          freebieSpent +=
            (nowWillpower - floorWillpower) * WILLPOWER_FREEBIE_COST;
        }
      }
    } else {
      // Phase 01: freebie tracking explicitamente desligado.
      freebieSpent = 0;
    }

    const freebieRemaining = Math.max(0, freebieTotal - freebieSpent);

    console.log("[SPEND] recompute", {
      phase,
      templateKey,
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
      freebieTotal,
      freebieSpent,
      freebieRemaining,
    });

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

      freebieTotal,
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
  ]);

  function maybeAdvanceToPhase2() {
    console.log("[PHASE] maybeAdvanceToPhase2 called", {
      phase,
      spendSnapshot,
      rules,
    });
    if (phase !== 1) return;

    // Must have spent all starting points AND still be within the envelope caps.
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
      // Snapshot phase 1 floors
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateName(draft.name);
    if (err) {
      setNameError(err);
      return;
    }
    const character = draftToCharacter(draft);
    console.log("[CREATE] submit character", character);
  }

  function enforcePhase2FreebiesOrReject(
    nextDraft: CharacterDraft,
    nextDiscRows: TraitRow[],
    nextBgRows: TraitRow[],
  ) {
    console.log("[FREEBIE] enforcePhase2FreebiesOrReject", {
      phase,
      hasPhase1Snapshot: !!phase1DraftSnapshot,
      nextDraft,
    });

    if (phase !== 2 || !phase1DraftSnapshot) return { ok: true } as const;

    // Enforce floors
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
      const floorWillpower = Number(
        (phase1DraftSnapshot as any).willpower ?? 0,
      );
      const nowWillpower = Number((nextDraft as any).willpower ?? 0);
      if (nowWillpower < floorWillpower) {
        return {
          ok: false,
          reason:
            "Phase 02: você não pode reduzir dots abaixo do final da Phase 01.",
        } as const;
      }
    }

    // Willpower floors
    {
      const floorWillpower = Number(floorChar?.willpower ?? 0);
      const nextChar: any = draftToCharacter(nextDraft);
      const nowWillpower = Number(nextChar?.willpower ?? 0);
      if (nowWillpower < floorWillpower) {
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
    // Recompute using the memo formula approach is expensive; do a localized recompute.
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
    for (const [id, nowDots] of Object.entries(nowDiscRecord)) {
      const floorDots = Number(floorDiscRecord[id] ?? 0);
      freebieSpent +=
        Math.max(0, Number(nowDots) - floorDots) *
        freebieCost.getCost(TraitType.Discipline);
    }

    // Backgrounds deltas
    for (const [id, nowDots] of Object.entries(nowBgRecord)) {
      const floorDots = Number(floorBgRecord[id] ?? 0);
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

      // Enforce Phase 2 floors via compute later.
      const candidate: CharacterDraft = {
        ...prev,
        attributes: {
          ...(prev.attributes ?? {}),
          [attrId]: max,
        },
      };

      // Phase 1: enforce envelope caps
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

      // Phase 2: enforce floor + freebies (only for attributes change)
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
    console.log("[Virtues] click", {
      virtueId,
      next,
      phase,
      prevVirtues: draft.virtues ?? {},
      rulesVirtues: rules.virtues,
      freebieTotalCurrent: spendSnapshot.freebieTotal,
      freebieRemainingCurrent: spendSnapshot.freebieRemaining,
    });
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
        console.log("[Virtues] phase 1 compute", {
          nextVirtues,
          rulesVirtues: rules.virtues,
        });
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

        // Phase 01 only: derived stats follow virtues.
        const cCourage = Number(nextVirtues["courage"] ?? base);
        const cConscience = Number(nextVirtues["conscience"] ?? base);
        const cSelf = Number(nextVirtues["self_control"] ?? base);

        candidate.willpower = cCourage;
        candidate.road = cConscience + cSelf;
        // Keep Road in sync with Road / Virtues during Phase 01.
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

      // In Phase 1, enforce disciplines pool
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
      // Accept either ids or objects like { id, name }
      return candidates
        .map((d: any) => (typeof d === "string" ? d : d?.id))
        .filter((d: any) => typeof d === "string" && d.length > 0);
    }

    return [];
  }

  function applyClanDisciplines(clanId: string | null) {
    const discIds = getClanDisciplineIds(clanId);

    // Build rows pre-selected, but with 0 dots (per requirement).
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

    // When selecting a clan, auto-select its in-clan disciplines (no dots marked).
    // If user clears clan, clear the auto-selected disciplines.
    applyClanDisciplines(clanId);
  }

  function addDisciplineRow() {
    if (phase === 2) {
      // Allowed: new discipline in Phase 2 spends freebies.
    }
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
    // Phase 2: cannot remove below floor; easiest is to block if the row exists in snapshot.
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

      // Starting pool enforcement
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

      // Starting pool enforcement
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
    if (
      !phase1DraftSnapshot ||
      !phase1DisciplineRowsSnapshot ||
      !phase1BackgroundRowsSnapshot
    )
      return;

    setDraft(phase1DraftSnapshot);
    setDisciplineRows(phase1DisciplineRowsSnapshot);
    setBackgroundRows(phase1BackgroundRowsSnapshot);
    setPhase(1);
    setSpendError(null);
    showToast("Returned to Phase 01: Starting Points unlocked.");
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

  // Whenever template changes in Phase 1, reset snapshots and errors.
  useEffect(() => {
    if (phase === 1) {
      setPhase1DraftSnapshot(null);
      setPhase1DisciplineRowsSnapshot(null);
      setPhase1BackgroundRowsSnapshot(null);
      setSpendError(null);
    }
  }, [templateKey]);

  // If in Phase 2 and Age changes, enforce freebies again (handled by validation on changes).

  return (
    <div className="sheetPage">
      {toast && <div className="toast">{toast}</div>}

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

              {/* ===== Persona ===== */}
              <div className="sheetSection">
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

                  {/* Experience */}
                  <p className="personaRowFull personaNoBorder personaFullWidth">
                    <strong>Experience:</strong> 0 / 0
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
                  <p>
                    <strong>Clan Weakness:</strong> {clanWeakness}
                  </p>
                </div>
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
                  {/* Coluna 1: em branco */}
                  <div></div>

                  {/* Coluna 2: Willpower, Road, Blood Pool */}
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

                  {/* Coluna 3: em branco (ou pode adicionar Health futuramente) */}
                  <div></div>
                </div>
              </div>

              {/* Debug */}
              <div className="sheetSection">
                <h3 className="h3">Estado atual do draft (debug)</h3>
                <div className="debugBlock">
                  <pre className="debugPre">
                    {JSON.stringify(draft, null, 2)}
                  </pre>
                </div>

                <h3 className="h3">Character convertido (debug)</h3>
                <div className="debugBlock">
                  <pre className="debugPre">
                    {JSON.stringify(characterForPreview, null, 2)}
                  </pre>
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

              <p className="muted sidebarSpendingInfo">
                Starting remaining (all): {spendSnapshot.startingRemainingAll}
              </p>
              <p className="muted sidebarSpendingInfo">
                Freebies: {spendSnapshot.freebieRemaining} /{" "}
                {spendSnapshot.freebieTotal}
              </p>

              <button type="submit" className="btn" disabled={!isNameValid}>
                Salvar Ficha
              </button>

              {!isNameValid && (
                <p className="muted actionsHint">
                  Informe um Name válido (mín. 2 caracteres) para salvar.
                </p>
              )}
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}

export default CreateCharacterPage;

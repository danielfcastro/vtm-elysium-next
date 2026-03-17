"use client";

import React, { useEffect, useState, useMemo } from "react";
import type { CharacterSheetModel } from "@/types/sheet";
import Squares from "@/components/Squares";
import clans from "@/core/data/raw/clans.json";
import disciplinesJson from "@/core/data/raw/disciplines.json";
import {
  SheetAttributes,
  SheetAbilities,
  SheetHealthLevels,
  DEFAULT_HEALTH_LEVELS,
} from "./shared";
import {
  disciplineService,
  ComboDiscipline,
  DisciplinePower,
} from "@/core/services/DisciplineService";

const LOREM_IPSUM = "Lorem ipsum dolor sit amet...";

function DisciplinePowerCard({
  power,
  level,
}: {
  power: DisciplinePower;
  level: number;
}) {
  const rolls =
    power.rolls && power.rolls.length > 0 ? power.rolls.join(", ") : "N/A";
  const effects =
    power.effects && power.effects.length > 0
      ? power.effects.join(", ")
      : LOREM_IPSUM;

  return (
    <div
      style={{
        background: "#252535",
        padding: "10px 14px",
        borderRadius: 6,
        border: "1px solid #3a3a4a",
        maxWidth: 340,
        minWidth: 280,
        flex: "0 0 auto",
      }}
    >
      <div
        style={{
          fontWeight: 700,
          color: "#fff",
          fontSize: 14,
          marginBottom: 6,
        }}
      >
        {power.name}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#90ee90",
          marginBottom: 6,
          fontWeight: 600,
        }}
      >
        Level {level}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#aaa",
          marginBottom: 4,
        }}
      >
        <span style={{ color: "#888" }}>Roll: </span>
        {rolls}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#aaa",
        }}
      >
        <span style={{ color: "#888" }}>Effect: </span>
        {effects}
      </div>
      {power.description && (
        <div
          style={{
            fontSize: 10,
            color: "#777",
            marginTop: 6,
            fontStyle: "italic",
          }}
        >
          {power.description.substring(0, 120)}
          {power.description.length > 120 ? "..." : ""}
        </div>
      )}
    </div>
  );
}

function ComboCard({ combo }: { combo: ComboDiscipline }) {
  const rolls =
    (combo as any).rolls && (combo as any).rolls.length > 0
      ? (combo as any).rolls.join(", ")
      : "N/A";
  const effects =
    (combo as any).effects && (combo as any).effects.length > 0
      ? (combo as any).effects.join(", ")
      : LOREM_IPSUM;

  return (
    <div
      style={{
        background: "#2a2a1a",
        padding: "10px 14px",
        borderRadius: 6,
        border: "1px solid #4a4a2a",
        maxWidth: 340,
        minWidth: 280,
        flex: "0 0 auto",
      }}
    >
      <div
        style={{
          fontWeight: 700,
          color: "#f0d040",
          fontSize: 14,
          marginBottom: 6,
        }}
      >
        {combo.name}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#aaa",
          marginBottom: 4,
        }}
      >
        <span style={{ color: "#888" }}>Roll: </span>
        {rolls}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#aaa",
          marginBottom: 6,
        }}
      >
        <span style={{ color: "#888" }}>Effect: </span>
        {effects}
      </div>
      <div
        style={{
          fontSize: 10,
          color: "#888",
          marginBottom: 4,
        }}
      >
        <span style={{ color: "#666" }}>Prerequisites: </span>
        {combo.prerequisites
          .map((p) => `${p.discipline} ${p.level}`)
          .join(", ")}
      </div>
      <div
        style={{
          fontSize: 10,
          color: "#777",
          fontStyle: "italic",
        }}
      >
        {combo.description.substring(0, 100)}
        {combo.description.length > 100 ? "..." : ""}
      </div>
    </div>
  );
}

export type CharacterSheetMode = "edit" | "readonly";

export interface CharacterSheetProps {
  mode: CharacterSheetMode;
  sheet: CharacterSheetModel | null;
  onSubmit?: (sheet: CharacterSheetModel) => Promise<void> | void;
  characterStatus?: string | null;
  pendingSpends?: Array<{
    id?: string;
    xpCost?: number;
    payload?: {
      spends?: Array<{
        type: string;
        key: string;
        from: number;
        to: number;
        cost?: number;
      }>;
      totalCost?: number;
    };
    createdAt?: string;
  }>;
}

// Helpers de tipos internos (não interferem em nada fora deste arquivo)
type AttributeId =
  | "strength"
  | "dexterity"
  | "stamina"
  | "charisma"
  | "manipulation"
  | "appearance"
  | "perception"
  | "intelligence"
  | "wits";

type AbilityId =
  | "alertness"
  | "athletics"
  | "awareness"
  | "brawl"
  | "empathy"
  | "expression"
  | "intimidation"
  | "leadership"
  | "streetwise"
  | "subterfuge"
  | "animal_ken"
  | "crafts"
  | "drive"
  | "etiquette"
  | "firearms"
  | "larceny"
  | "melee"
  | "performance"
  | "stealth"
  | "survival"
  | "academics"
  | "computer"
  | "finance"
  | "investigation"
  | "law"
  | "medicine"
  | "occult"
  | "politics"
  | "science"
  | "technology";

interface TraitDef<TId extends string> {
  id: TId;
  label: string;
}

interface TraitGroup<TId extends string> {
  id: string;
  label: string;
  traits: TraitDef<TId>[];
}

// === Definição de layout / grupos ===

const ATTRIBUTE_GROUPS: TraitGroup<AttributeId>[] = [
  {
    id: "physical",
    label: "Physical",
    traits: [
      { id: "strength", label: "Strength" },
      { id: "dexterity", label: "Dexterity" },
      { id: "stamina", label: "Stamina" },
    ],
  },
  {
    id: "social",
    label: "Social",
    traits: [
      { id: "charisma", label: "Charisma" },
      { id: "manipulation", label: "Manipulation" },
      { id: "appearance", label: "Appearance" },
    ],
  },
  {
    id: "mental",
    label: "Mental",
    traits: [
      { id: "perception", label: "Perception" },
      { id: "intelligence", label: "Intelligence" },
      { id: "wits", label: "Wits" },
    ],
  },
];

const TALENTS: TraitDef<AbilityId>[] = [
  { id: "alertness", label: "Alertness" },
  { id: "athletics", label: "Athletics" },
  { id: "awareness", label: "Awareness" },
  { id: "brawl", label: "Brawl" },
  { id: "empathy", label: "Empathy" },
  { id: "expression", label: "Expression" },
  { id: "intimidation", label: "Intimidation" },
  { id: "leadership", label: "Leadership" },
  { id: "streetwise", label: "Streetwise" },
  { id: "subterfuge", label: "Subterfuge" },
];

const SKILLS: TraitDef<AbilityId>[] = [
  { id: "animal_ken", label: "Animal Ken" },
  { id: "crafts", label: "Crafts" },
  { id: "drive", label: "Drive" },
  { id: "etiquette", label: "Etiquette" },
  { id: "firearms", label: "Firearms" },
  { id: "larceny", label: "Larceny" },
  { id: "melee", label: "Melee" },
  { id: "performance", label: "Performance" },
  { id: "stealth", label: "Stealth" },
  { id: "survival", label: "Survival" },
];

const KNOWLEDGES: TraitDef<AbilityId>[] = [
  { id: "academics", label: "Academics" },
  { id: "computer", label: "Computer" },
  { id: "finance", label: "Finance" },
  { id: "investigation", label: "Investigation" },
  { id: "law", label: "Law" },
  { id: "medicine", label: "Medicine" },
  { id: "occult", label: "Occult" },
  { id: "politics", label: "Politics" },
  { id: "science", label: "Science" },
  { id: "technology", label: "Technology" },
];

const ABILITY_GROUPS: TraitGroup<AbilityId>[] = [
  { id: "talents", label: "Talents", traits: TALENTS },
  { id: "skills", label: "Skills", traits: SKILLS },
  { id: "knowledges", label: "Knowledges", traits: KNOWLEDGES },
];

// === Helpers de renderização ===

function renderDots(value: number, max: number, pendingValue?: number) {
  const result = [];
  const v = Number.isFinite(value) ? value : 0;
  const pendingV =
    pendingValue !== undefined && Number.isFinite(pendingValue)
      ? pendingValue
      : v;

  for (let i = 1; i <= max; i += 1) {
    const filled = i <= v;
    const isPending = i > v && i <= pendingV;
    const isFilledOrPending = filled || isPending;
    result.push(
      <span
        key={i}
        className={`dot ${isFilledOrPending ? "dotFilled" : "dotEmpty"}`}
        style={
          isPending
            ? { backgroundColor: "#ff8c00", borderColor: "#ff8c00" }
            : undefined
        }
      />,
    );
  }

  return <div className="dots">{result}</div>;
}

function renderSquares(value: number, max: number) {
  const result = [];
  const v = Number.isFinite(value) ? value : 0;

  for (let i = 1; i <= max; i += 1) {
    const filled = i <= v;
    result.push(<span key={i} className={`sq ${filled ? "sqFilled" : ""}`} />);
  }

  return <div className="dots">{result}</div>;
}

// Base visual dos atributos (mínimo 1, exceto Appearance de Nosferatu)
function getAttributeBase(
  attrId: AttributeId,
  clanId: string | null | undefined,
): number {
  const isNosferatu = clanId === "nosferatu";
  const isAppearance = attrId === "appearance";
  if (isNosferatu && isAppearance) return 0;
  return 1;
}

// Formata IDs (natureId, demeanorId, conceptId, clanId) para labels legíveis
function formatIdLabel(value: string | null | undefined): string {
  if (!value) return "-";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const VampireCharacterSheet: React.FC<CharacterSheetProps> = ({
  mode,
  sheet,
  onSubmit,
  characterStatus,
  pendingSpends = [],
}) => {
  const [local, setLocal] = useState<CharacterSheetModel | null>(sheet);
  const [activeTab, setActiveTab] = useState<"main" | "disciplines" | "combat">(
    "main",
  );

  useEffect(() => {
    setLocal(sheet);
  }, [sheet]);

  const readOnly = mode !== "edit";

  const getPendingValue = (
    type: string,
    key: string,
    currentValue: number,
  ): number => {
    for (const pending of pendingSpends) {
      const payload = pending.payload;
      if (payload?.spends) {
        for (const spend of payload.spends) {
          if (spend.type === type && spend.key === key) {
            return spend.to;
          }
        }
      }
    }
    return currentValue;
  };

  if (!local) {
    return <div>Loading sheet…</div>;
  }

  // Estrutura do JSON vindo da API:
  // {
  //   sheet: { ...draft final... },
  //   phase: number,
  //   isDarkAges: boolean,
  //   ...
  // }
  const root: any = local as any;
  // API returns: { sheet: { phase, sheet: {...draft}, isDarkAges, backgroundRows, disciplineRows }, status, totalExperience, spentExperience, ... }
  // Or just the sheet directly: { phase, sheet: {...draft}, ... }
  // Or sheet with draft: { draft: {...} }
  // Or approved XP sheet: { sheet: { abilities: {...approved XP...} } }
  const sheetWrapper: any = root.sheet ?? root;
  const draft: any = sheetWrapper.sheet ?? sheetWrapper.draft ?? sheetWrapper; // actual character data

  // Merge draft abilities with approved XP spends (stored at sheetWrapper level)
  const mergedAbilities = {
    ...(draft.abilities ?? {}),
    ...(sheetWrapper.abilities ?? {}),
  };
  const mergedAttributes = {
    ...(draft.attributes ?? {}),
    ...(sheetWrapper.attributes ?? {}),
  };
  const isGhoul =
    (sheetWrapper.isGhoul ?? draft.isGhoul ?? sheetWrapper.ghoulType)
      ? true
      : false;
  const mergedDisciplines = {
    ...(draft.disciplines ?? {}),
    ...(sheetWrapper.disciplines ?? {}),
  };
  const mergedBackgrounds = {
    ...(draft.backgrounds ?? {}),
    ...(sheetWrapper.backgrounds ?? {}),
  };
  const mergedVirtues = {
    ...(draft.virtues ?? {}),
    ...(sheetWrapper.virtues ?? {}),
  };
  const mergedWillpower = sheetWrapper.willpower ?? draft.willpower ?? 0;
  const mergedRoadRating =
    sheetWrapper.roadRating ?? draft.roadRating ?? draft.road ?? 0;

  // XP values can be at root level (from API) or inside sheet
  const totalXp: number =
    root.totalExperience ??
    sheetWrapper.totalExperience ??
    draft.totalExperience ??
    0;
  const spentXp: number =
    root.spentExperience ??
    sheetWrapper.spentExperience ??
    draft.spentExperience ??
    0;
  const availableXp = Math.max(0, totalXp - spentXp);

  const maxTraitRating: number = draft.maxTraitRating ?? 5;

  const attributes: any = mergedAttributes;
  const abilities: any = mergedAbilities;
  const backgrounds: any = mergedBackgrounds;
  const disciplines: any = mergedDisciplines;
  const disciplineRows: any[] = sheetWrapper.disciplineRows ?? [];
  const disciplinePowers: Record<string, { level: number; name: string }[]> =
    {};
  const powersSources = [
    root.phase1DraftSnapshot?.disciplines,
    draft.disciplines,
    sheetWrapper.disciplines,
  ];

  for (const source of powersSources) {
    if (source && typeof source === "object") {
      for (const [discId, discData] of Object.entries(source)) {
        if (
          discData &&
          typeof discData === "object" &&
          "powers" in discData &&
          Array.isArray((discData as any).powers)
        ) {
          if (!disciplinePowers[discId]) {
            disciplinePowers[discId] = (discData as any).powers;
          }
        }
      }
    }
  }
  const specialties: any = draft.specialties ?? {};

  const virtues: any = mergedVirtues;
  const roadRating: number = mergedRoadRating;
  const willpower: number = mergedWillpower;
  const maximumBloodPool: number | undefined = draft.maximumBloodPool;
  const bloodPerTurn: number | undefined = draft.bloodPointsPerTurn;
  const merits: any[] = draft.merits ?? sheetWrapper.merits ?? [];
  const flaws: any[] = draft.flaws ?? sheetWrapper.flaws ?? [];

  // Check for Huge Body merit
  const hasHugeSize = merits.some((m) => m.name === "Huge Size");

  const name: string = draft.name ?? "(Unnamed)";
  const clanId: string = draft.clanId ?? "-";
  const generation: number | undefined = draft.generation;
  const playerName: string = draft.player ?? "";
  const chronicle: string = draft.chronicle ?? "";
  const sire: string = draft.sire ?? "";
  const natureId: string = draft.natureId ?? "";
  const demeanorId: string = draft.demeanorId ?? "";
  const conceptId: string = draft.conceptId ?? "";

  // Family (revenant ghouls)
  const familyName: string = draft.familyName ?? sheetWrapper.familyName ?? "";
  const familyWeakness: string =
    draft.familyWeakness ?? sheetWrapper.familyWeakness ?? "";
  const familyDisciplines: Record<string, number> =
    draft.familyDisciplines ?? sheetWrapper.familyDisciplines ?? {};

  const weakness: string =
    // Family weakness takes priority for ghouls
    (familyWeakness ||
      // tenta achar no JSON de clãs por id (mesma lógica do /create)
      ((clans as any[]).find((clan) => clan.id === clanId) as any)?.weakness) ??
    // fallback: se algum dia o sheet passar a trazer c.clan.weakness
    (draft as any)?.clan?.weakness ??
    "—";

  // valor seguro numérico para o Squares
  const maxBloodPoolDisplay: number =
    typeof maximumBloodPool === "number" ? maximumBloodPool : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSubmit || !local) return;
    await onSubmit(local);
  };

  // Disciplines: se existir disciplineRows, usa a ordem dali; senão, usa as chaves do objeto
  const disciplineEntries: {
    id: string;
    label: string;
    dots: number;
    pendingDots?: number;
    isBloodMagic?: boolean;
    paths?: Record<string, number>;
  }[] =
    disciplineRows.length > 0
      ? disciplineRows.map((row: any) => {
          const discData = row.dots ?? disciplines?.[row.id];
          const currentDots =
            typeof discData === "object" && discData !== null
              ? (discData.level ?? 0)
              : Number(discData ?? 0);
          const isBm = disciplineService.isBloodMagic(row.id);
          return {
            id: row.id,
            label: String(row.id),
            dots: currentDots,
            pendingDots: getPendingValue("discipline", row.id, currentDots),
            isBloodMagic: isBm,
          };
        })
      : Object.keys(disciplines).map((id) => {
          const discData = disciplines[id];
          const currentDots =
            typeof discData === "object" && discData !== null
              ? (discData.level ?? 0)
              : Number(discData ?? 0);
          const isBm = disciplineService.isBloodMagic(id);
          return {
            id,
            label: id,
            dots: currentDots,
            pendingDots: getPendingValue("discipline", id, currentDots),
            isBloodMagic: isBm,
          };
        });

  // Separate blood magic disciplines from regular ones
  const bloodMagicDisciplines = disciplineEntries.filter((d) => d.isBloodMagic);
  const regularDisciplines = disciplineEntries.filter((d) => !d.isBloodMagic);

  // Get discipline powers for display
  const getDisciplinePowers = (discId: string, level: number) => {
    return disciplineService.getPowersForLevel(discId, level);
  };

  // Get blood magic paths for display
  const getBloodMagicPaths = (discId: string) => {
    return disciplineService.getBloodMagicPaths(discId);
  };

  // Get powers for a specific blood magic path
  const getBloodMagicPathPowers = (
    discId: string,
    pathId: string,
    level: number,
  ) => {
    return disciplineService.getPowersForBloodMagicPath(discId, pathId, level);
  };

  // Get eligible combo disciplines based on current disciplines
  const comboInfo = useMemo(() => {
    return disciplineService.getEligibleCombos(disciplines);
  }, [disciplines]);

  // Backgrounds: ordena alfabeticamente por id
  // For ghouls, filter out Domitor background (it's shown separately)
  const backgroundEntries: {
    id: string;
    label: string;
    dots: number;
    pendingDots?: number;
  }[] = Object.keys(backgrounds)
    .filter((id) => !(isGhoul && id.toLowerCase() === "domitor"))
    .sort()
    .map((id) => {
      const currentDots = Number(backgrounds[id] ?? 0);
      return {
        id,
        label: id,
        dots: currentDots,
        pendingDots: getPendingValue("background", id, currentDots),
      };
    });

  const virtuesList = [
    {
      id: "conscience",
      label: "Conscience",
      value: virtues.conscience ?? 0,
      pendingValue: getPendingValue(
        "virtue",
        "conscience",
        virtues.conscience ?? 0,
      ),
    },
    {
      id: "self_control",
      label: "Self-Control",
      value: virtues.self_control ?? 0,
      pendingValue: getPendingValue(
        "virtue",
        "self_control",
        virtues.self_control ?? 0,
      ),
    },
    {
      id: "courage",
      label: "Courage",
      value: virtues.courage ?? 0,
      pendingValue: getPendingValue("virtue", "courage", virtues.courage ?? 0),
    },
  ];

  // Willpower temporário: por enquanto, usamos o mesmo valor do permanente
  const willpowerTemporary: number = willpower;
  const pendingWillpower = getPendingValue("willpower", "willpower", willpower);
  const pendingRoad = getPendingValue("road", "roadRating", roadRating);

  const hasPendingXp = pendingSpends && pendingSpends.length > 0;

  const ribbonConfig = React.useMemo(() => {
    if (!characterStatus) return null;

    const status = String(characterStatus).toUpperCase().trim();

    // If there are pending XP spends, show PENDING XP instead of status
    if (hasPendingXp) {
      return { className: "pending-xp", text: "PENDING XP" };
    }

    if (status === "DRAFT_PHASE1" || status === "DRAFT_PHASE2") {
      return { className: "silver", text: "DRAFT" };
    }
    if (status === "SUBMITTED") {
      return { className: "green-glass", text: "SUBMITTED" };
    }
    if (status === "XP") {
      return { className: "gold", text: "SPENDING XP" };
    }
    if (status === "APPROVED") {
      return { className: "gold", text: "APPROVED" };
    }
    if (status === "REJECTED") {
      return { className: "brass", text: "REJECTED" };
    }
    if (status === "ARCHIVED") {
      return { className: "black", text: "ARCHIVED or DEAD" };
    }
    return null;
  }, [characterStatus, hasPendingXp]);

  return (
    <form className="sheetPage" onSubmit={handleSubmit}>
      {/* Header simples com meta (título + linha fina) */}
      <header
        className="sheetHeader"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <h1 className="sheetTitle">Character Sheet</h1>
        </div>
        {ribbonConfig && (
          <div
            className={`ribbon ${ribbonConfig.className}`}
            style={{
              width: 160,
              height: 36,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 6,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-50%",
                left: "-80%",
                width: "40%",
                height: "200%",
                background:
                  "linear-gradient(120deg, transparent 40%, rgba(255,255,255,0.5) 50%, transparent 60%)",
                transform: "skewX(-25deg)",
                animation: "ribbonShine 5s infinite",
                pointerEvents: "none",
              }}
            />
            <span
              style={{
                position: "relative",
                zIndex: 2,
                fontSize: "0.9rem",
                fontWeight: 900,
                letterSpacing: 1,
                textTransform: "uppercase",
                textAlign: "center",
                whiteSpace: "nowrap",
                display: "flex",
                justifyContent: "center",
                width: "100%",
              }}
            >
              {ribbonConfig.text}
            </span>
          </div>
        )}
      </header>

      {/* Tab Navigation */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          borderBottom: "1px solid #333",
          paddingBottom: 8,
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("main")}
          style={{
            background: activeTab === "main" ? "#2a4a2a" : "#1a1a1a",
            color: activeTab === "main" ? "#90ee90" : "#888",
            border: "none",
            padding: "8px 16px",
            borderRadius: 4,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Main
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("disciplines")}
          style={{
            background: activeTab === "disciplines" ? "#2a4a2a" : "#1a1a1a",
            color: activeTab === "disciplines" ? "#90ee90" : "#888",
            border: "none",
            padding: "8px 16px",
            borderRadius: 4,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Disciplines & Combos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("combat")}
          style={{
            background: activeTab === "combat" ? "#2a4a2a" : "#1a1a1a",
            color: activeTab === "combat" ? "#90ee90" : "#888",
            border: "none",
            padding: "8px 16px",
            borderRadius: 4,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Combat
        </button>
      </div>

      {activeTab === "disciplines" ? (
        <section className="sheetSection">
          <h2 className="h2">Disciplines & Powers</h2>

          {/* Family Disciplines (inherited) */}
          {Object.keys(familyDisciplines).length > 0 && (
            <div
              style={{
                marginBottom: 20,
                padding: 12,
                background: "#1a2a1a",
                borderRadius: 8,
                border: "1px solid #3a5a3a",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <span
                  style={{ fontSize: 14, fontWeight: 700, color: "#90ee90" }}
                >
                  Family Inherited Disciplines
                </span>
                <span
                  title={`Inherited from ${familyName || "family"}`}
                  style={{ cursor: "help", color: "#888" }}
                >
                  🔒
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.entries(familyDisciplines).map(([discId, _level]) => {
                  const discData = (disciplinesJson as any[]).find(
                    (d: any) => d.id === discId,
                  );
                  return (
                    <div
                      key={discId}
                      style={{
                        padding: "6px 12px",
                        background: "#2a3a2a",
                        borderRadius: 4,
                        border: "1px solid #4a6a4a",
                      }}
                    >
                      <span style={{ color: "#90ee90" }}>
                        {discData?.name || discId}
                      </span>
                      <span style={{ color: "#888", marginLeft: 4 }}>
                        Level 0
                      </span>
                      <span
                        style={{ color: "#666", fontSize: 10, marginLeft: 4 }}
                      >
                        (inherited)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Regular Discipline Powers */}
          {regularDisciplines
            .filter((d) => d.dots > 0)
            .map((disc) => (
              <div
                key={disc.id}
                style={{
                  marginBottom: 24,
                  padding: 12,
                  background: "#1a1a2e",
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{ fontSize: 16, fontWeight: 700, color: "#90ee90" }}
                  >
                    {disc.label}
                  </span>
                  <span style={{ color: "#888" }}>Level {disc.dots}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {Array.from({ length: disc.dots }, (_, i) => i + 1).map(
                    (level) => {
                      const selectedPower = disciplinePowers[disc.id]?.find(
                        (p) => p.level === level,
                      );

                      if (selectedPower) {
                        const allPowers = getDisciplinePowers(disc.id, level);
                        const power = allPowers.find(
                          (p) => p.name === selectedPower.name,
                        );
                        if (power) {
                          return (
                            <DisciplinePowerCard
                              key={`${disc.id}-${level}-selected`}
                              power={power}
                              level={level}
                            />
                          );
                        }
                      }

                      const powers = getDisciplinePowers(disc.id, level);
                      return powers.map((power, idx) => (
                        <DisciplinePowerCard
                          key={`${disc.id}-${level}-${idx}`}
                          power={power}
                          level={level}
                        />
                      ));
                    },
                  )}
                </div>
              </div>
            ))}

          {/* Blood Magic Disciplines */}
          {bloodMagicDisciplines.filter((d) => d.dots > 0).length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h3
                className="h3"
                style={{
                  color: "#ff6b6b",
                  marginBottom: 16,
                  borderBottom: "1px solid #4a2a2a",
                  paddingBottom: 8,
                }}
              >
                Blood Magic
              </h3>
              {bloodMagicDisciplines
                .filter((d) => d.dots > 0)
                .map((disc) => {
                  const paths = getBloodMagicPaths(disc.id);
                  return (
                    <div
                      key={disc.id}
                      style={{
                        marginBottom: 20,
                        padding: 12,
                        background: "#1a1a1a",
                        borderRadius: 8,
                        border: "1px solid #4a2a2a",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          marginBottom: 12,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: "#ff6b6b",
                          }}
                        >
                          {disc.label}
                        </span>
                        <span style={{ color: "#888" }}>Level {disc.dots}</span>
                      </div>

                      {/* Main Path (Path of Blood for Thaumaturgy) */}
                      <div style={{ marginBottom: 12, paddingLeft: 8 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            color: "#ff8c00",
                            marginBottom: 6,
                          }}
                        >
                          Path of Blood
                        </div>
                        <div
                          style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
                        >
                          {Array.from(
                            { length: disc.dots },
                            (_, i) => i + 1,
                          ).map((level) => {
                            const powers = getBloodMagicPathPowers(
                              disc.id,
                              "path-of-blood",
                              level,
                            );
                            return powers.map((power, idx) => (
                              <DisciplinePowerCard
                                key={`${disc.id}-path-of-blood-${level}-${idx}`}
                                power={power}
                                level={level}
                              />
                            ));
                          })}
                        </div>
                      </div>

                      {/* Secondary Paths */}
                      {paths
                        .filter((p) => p.id !== "path-of-blood")
                        .map((path) => {
                          return (
                            <div
                              key={path.id}
                              style={{ marginTop: 12, paddingLeft: 16 }}
                            >
                              <div
                                style={{
                                  fontWeight: 600,
                                  color: "#aaa",
                                  marginBottom: 6,
                                  fontStyle: "italic",
                                }}
                              >
                                {path.name}
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 8,
                                }}
                              >
                                {Array.from({ length: 5 }, (_, i) => i + 1).map(
                                  (level) => {
                                    const powers = getBloodMagicPathPowers(
                                      disc.id,
                                      path.id,
                                      level,
                                    );
                                    if (powers.length === 0) return null;
                                    return powers.map((power, idx) => (
                                      <DisciplinePowerCard
                                        key={`${disc.id}-${path.id}-${level}-${idx}`}
                                        power={power}
                                        level={level}
                                      />
                                    ));
                                  },
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  );
                })}
            </div>
          )}

          {/* Combo Disciplines - only show purchased combos */}
          {(() => {
            // Filter to only show combos that have been purchased (exist in disciplines with value > 0)
            const purchasedCombos = comboInfo.eligible.filter(
              (combo) => (mergedDisciplines[combo.id] ?? 0) > 0,
            );
            return purchasedCombos.length > 0 ? (
              <div style={{ marginTop: 24 }}>
                <h3
                  className="h3"
                  style={{ color: "#f0d040", marginBottom: 12 }}
                >
                  Combination Disciplines
                </h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {purchasedCombos.map((combo) => (
                    <ComboCard key={combo.id} combo={combo} />
                  ))}
                </div>
              </div>
            ) : null;
          })()}

          {regularDisciplines.filter((d) => d.dots > 0).length === 0 &&
            bloodMagicDisciplines.filter((d) => d.dots > 0).length === 0 && (
              <div className="muted">No disciplines learned yet.</div>
            )}
        </section>
      ) : activeTab === "combat" ? (
        <section className="sheetSection">
          <h2 className="h2">Combat</h2>

          {sheetWrapper.combat ? (
            <div>
              {/* Health Levels */}
              {sheetWrapper.combat.healthLevels && (
                <div style={{ marginBottom: 20 }}>
                  <h3 className="h3">Health Levels</h3>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {(Array.isArray(sheetWrapper.combat.healthLevels)
                      ? sheetWrapper.combat.healthLevels
                      : [sheetWrapper.combat.healthLevels]
                    ).map((hl: string, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          padding: "8px 12px",
                          background: idx === 0 ? "#2a4a2a" : "#2a2a2a",
                          borderRadius: 4,
                          border:
                            idx === 0 ? "1px solid #4a8a4a" : "1px solid #444",
                        }}
                      >
                        {hl}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Armor */}
              {sheetWrapper.combat.armor && (
                <div style={{ marginBottom: 20 }}>
                  <h3 className="h3">Armor</h3>
                  <p>Rating: {sheetWrapper.combat.armor.rating || 0}</p>
                  <p>
                    Soak Dice: {sheetWrapper.combat.armor.soakDiceTotal || 0}
                  </p>
                </div>
              )}

              {/* Attacks */}
              {sheetWrapper.combat.attacks &&
                sheetWrapper.combat.attacks.length > 0 && (
                  <div>
                    <h3 className="h3">Attacks</h3>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      {sheetWrapper.combat.attacks.map(
                        (attack: any, idx: number) => (
                          <div
                            key={idx}
                            style={{
                              padding: 12,
                              background: "#1a1a2e",
                              borderRadius: 4,
                              border: "1px solid #333",
                            }}
                          >
                            <p>
                              <strong>{attack.name}</strong>
                            </p>
                            <p className="muted">
                              Dice Pool: {attack.dicePool}
                            </p>
                            <p className="muted">
                              Damage Type: {attack.damageType}
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <p className="muted">No combat data available.</p>
          )}
        </section>
      ) : (
        <>
          <section className="sheetSection">
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
          </section>

          {/* ===== Persona ===== */}
          <section className="sheetSection">
            <h2 className="h2 sectionTitle">Persona</h2>

            <div className="personaGrid personaGridCreate">
              {/* Linha 1: Name, Nature, Clan */}
              <p className="personaRow">
                <strong>Name:</strong>
                <span className="personaValue">{name}</span>
              </p>

              <p className="personaRow">
                <strong>Nature:</strong>
                <span className="personaValue">{formatIdLabel(natureId)}</span>
              </p>

              <p className="personaRow">
                <strong>Clan:</strong>
                <span className="personaValue">{formatIdLabel(clanId)}</span>
              </p>

              {/* Linha 2: Player, Demeanor, Generation */}
              <p className="personaRow">
                <strong>Player:</strong>
                <span className="personaValue">
                  {playerName && playerName.length > 0 ? playerName : "-"}
                </span>
              </p>

              <p className="personaRow">
                <strong>Demeanor:</strong>
                <span className="personaValue">
                  {formatIdLabel(demeanorId)}
                </span>
              </p>

              <p className="personaRow">
                <strong>Generation:</strong>
                <span className="personaValue">{generation ?? "-"}</span>
              </p>

              {/* Linha 3: Chronicle, Concept, Sire */}
              <p className="personaRow">
                <strong>Chronicle:</strong>
                <span className="personaValue">
                  {chronicle && chronicle.length > 0 ? chronicle : "-"}
                </span>
              </p>

              <p className="personaRow">
                <strong>Concept:</strong>
                <span className="personaValue">{formatIdLabel(conceptId)}</span>
              </p>

              <p className="personaRow">
                <strong>Sire:</strong>
                <span className="personaValue">
                  {sire && sire.length > 0 ? sire : "-"}
                </span>
              </p>

              {/* Family - for revenant ghouls */}
              {familyName && (
                <p className="personaRow">
                  <strong>Family:</strong>
                  <span className="personaValue" style={{ color: "#f0d040" }}>
                    {familyName}
                  </span>
                </p>
              )}
            </div>
          </section>

          {/* ===== Weakness ===== */}
          <section className="sheetSection">
            <h2 className="h2 sectionTitle">Weakness</h2>
            {familyWeakness || weakness !== "—" ? (
              <div>
                {familyWeakness && (
                  <p
                    style={{
                      color: "#f0d040",
                      fontWeight: "bold",
                      marginBottom: 8,
                    }}
                  >
                    {familyWeakness}
                  </p>
                )}
                {weakness !== "—" && weakness !== familyWeakness && (
                  <p className="muted">{weakness}</p>
                )}
              </div>
            ) : (
              <p className="muted">{weakness}</p>
            )}

            {/* Revenant rules bottom line */}
            {isGhoul && (
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  background: "#1a2a1a",
                  borderRadius: 4,
                  border: "1px solid #3a5a3a",
                }}
              >
                <p
                  style={{
                    fontSize: 12,
                    color: "#90ee90",
                    fontStyle: "italic",
                  }}
                >
                  Revenants can have one level 1 Discipline at start, up to 5 of
                  such at level 1. They may learn Rituals or Ceremonies, but not
                  Alchemy. If dhampirs do exist, then they may access thin-blood
                  alchemy. Revenants can fall into Frenzy as they have an echo
                  of the Beast and may be affected by a few Compulsions. Their
                  Compulsion emerges when their Willpower or Health drops
                  dangerously low.
                </p>
              </div>
            )}
          </section>

          {/* ===== Attributes ===== */}
          <section className="sheetSection">
            <h2 className="h2 sectionTitle">Attributes</h2>
            <SheetAttributes
              attributes={attributes}
              specialties={specialties}
              clanId={clanId}
              maxTraitRating={maxTraitRating}
              getPendingValue={getPendingValue}
            />
          </section>

          {/* ===== Abilities ===== */}
          <section className="sheetSection">
            <h2 className="h2 sectionTitle">Abilities</h2>
            <SheetAbilities
              abilities={abilities}
              specialties={specialties}
              maxTraitRating={maxTraitRating}
              getPendingValue={getPendingValue}
            />
          </section>

          {/* ===== Advantages ===== */}
          <section className="sheetSection">
            <h2 className="h2 sectionTitle">Advantages</h2>
            <div className="grid3">
              {/* Disciplines (coluna esquerda) */}
              <div>
                <h3 className="h3">Disciplines</h3>
                {disciplineEntries.length === 0 ? (
                  <div className="itemRow">
                    <div className="itemLabel muted">
                      No disciplines in sheet.
                    </div>
                  </div>
                ) : (
                  disciplineEntries.map((disc) => (
                    <div key={disc.id} className="itemRow">
                      <div className="itemLabel">{disc.label}</div>
                      {renderDots(disc.dots, maxTraitRating, disc.pendingDots)}
                    </div>
                  ))
                )}
              </div>

              {/* Backgrounds (coluna do meio) */}
              <div>
                <h3 className="h3">Backgrounds</h3>
                {backgroundEntries.length === 0 ? (
                  <div className="itemRow">
                    <div className="itemLabel muted">
                      No backgrounds in sheet.
                    </div>
                  </div>
                ) : (
                  backgroundEntries.map((bg) => (
                    <div key={bg.id} className="itemRow">
                      <div className="itemLabel">{bg.label}</div>
                      {renderDots(bg.dots, maxTraitRating, bg.pendingDots)}
                    </div>
                  ))
                )}
              </div>

              {/* Virtues (coluna direita) */}
              <div>
                <h3 className="h3">Virtues</h3>
                {virtuesList.map((v) => (
                  <div key={v.id} className="itemRow">
                    <div className="itemLabel">{v.label}</div>
                    {renderDots(Number(v.value ?? 0), maxTraitRating)}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ===== Road / Willpower / Blood Pool / Health ===== */}
          <section className="sheetSection">
            <div className="grid3">
              {/* Coluna esquerda: Merits & Flaws */}
              <div>
                {/* Merits */}
                {merits.length > 0 && (
                  <>
                    <h3 className="h3">Merits</h3>
                    {merits.map((merit, idx) => (
                      <div
                        key={`merit-${idx}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          marginBottom: 4,
                          background: "#1a3a1a",
                          padding: "4px 8px",
                          borderRadius: 4,
                        }}
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
                  </>
                )}

                {/* Flaws */}
                {flaws.length > 0 && (
                  <>
                    <h3 className="h3" style={{ marginTop: 16 }}>
                      Flaws
                    </h3>
                    {flaws.map((flaw, idx) => (
                      <div
                        key={`flaw-${idx}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          marginBottom: 4,
                          background: "#3a1a1a",
                          padding: "4px 8px",
                          borderRadius: 4,
                        }}
                      >
                        <span style={{ flex: 1, color: "#ff6b6b" }}>
                          {flaw.name}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Coluna central: Road, Willpower, Blood Pool */}
              <div>
                {/* Road / Humanity */}
                <h3 className="h3">Road / Humanity</h3>
                {renderDots(roadRating, 10, pendingRoad)}

                {/* Willpower permanente + temporário */}
                <h3 className="h3" style={{ marginTop: 16 }}>
                  Willpower
                </h3>
                {renderDots(willpower, 10, pendingWillpower)}
                <div className="willpowerTemporarySpacing">
                  {renderSquares(willpowerTemporary, 10)}
                </div>

                {/* Blood Pool */}
                <h3
                  className="h3 othersBloodPoolSpacing"
                  style={{ marginTop: 16 }}
                >
                  Blood Pool
                </h3>
                <Squares
                  count={maxBloodPoolDisplay}
                  maxScale={maxBloodPoolDisplay}
                  perRow={10}
                />
                {maxBloodPoolDisplay > 0 && (
                  <p className="muted othersBloodPoolInfo">
                    Max: {maxBloodPoolDisplay}
                    {typeof bloodPerTurn === "number" && bloodPerTurn > 0
                      ? ` | Per turn: ${bloodPerTurn}`
                      : ""}
                  </p>
                )}
              </div>

              {/* Coluna direita – Health levels */}
              <div>
                <h3 className="h3 sectionSubtitle">Health</h3>
                <SheetHealthLevels
                  healthLevels={DEFAULT_HEALTH_LEVELS}
                  hasHugeSize={hasHugeSize}
                />
              </div>
            </div>
          </section>
        </>
      )}

      {/* Botão Save – ainda só chama onSubmit se existir */}
      {!readOnly && (
        <div className="sheetSection">
          <button type="submit" className="primaryButton">
            Save
          </button>
        </div>
      )}
    </form>
  );
};

export default VampireCharacterSheet;

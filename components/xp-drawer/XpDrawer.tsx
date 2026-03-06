"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { XpPointCostStrategy } from "@/core/strategies/XpPointCostStrategy";
import { TraitType } from "@/core/enums/TraitType";
import {
  disciplineService,
  DisciplineLevel,
} from "@/core/services/DisciplineService";

const xpCostStrategy = new XpPointCostStrategy();

type SpendType =
  | "attribute"
  | "ability"
  | "discipline"
  | "background"
  | "virtue"
  | "willpower"
  | "road"
  | "combo";

interface SpendChange {
  type: SpendType;
  key: string;
  from: number;
  to: number;
}

const TRAIT_TYPE_MAP: Record<SpendType, TraitType> = {
  attribute: TraitType.Attribute,
  ability: TraitType.Ability,
  discipline: TraitType.Discipline,
  background: TraitType.Background,
  virtue: TraitType.Virtue,
  willpower: TraitType.Willpower,
  road: TraitType.Humanity,
  combo: TraitType.Discipline,
};

const getXpCost = (
  type: SpendType,
  currentRating: number,
  options?: {
    isBackgroundAllowed?: boolean;
    isMeritFlawAllowed?: boolean;
  },
): number => {
  return xpCostStrategy.getCost(
    TRAIT_TYPE_MAP[type],
    currentRating,
    false,
    false,
    options?.isBackgroundAllowed,
    options?.isMeritFlawAllowed,
  );
};

const ATTRIBUTES = [
  { key: "strength", label: "Strength", category: "Physical" },
  { key: "dexterity", label: "Dexterity", category: "Physical" },
  { key: "stamina", label: "Stamina", category: "Physical" },
  { key: "charisma", label: "Charisma", category: "Social" },
  { key: "manipulation", label: "Manipulation", category: "Social" },
  { key: "appearance", label: "Appearance", category: "Social" },
  { key: "perception", label: "Perception", category: "Mental" },
  { key: "intelligence", label: "Intelligence", category: "Mental" },
  { key: "wits", label: "Wits", category: "Mental" },
];

const TALENTS = [
  { key: "alertness", label: "Alertness" },
  { key: "athletics", label: "Athletics" },
  { key: "awareness", label: "Awareness" },
  { key: "brawl", label: "Brawl" },
  { key: "empathy", label: "Empathy" },
  { key: "expression", label: "Expression" },
  { key: "intimidation", label: "Intimidation" },
  { key: "leadership", label: "Leadership" },
  { key: "streetwise", label: "Streetwise" },
  { key: "subterfuge", label: "Subterfuge" },
];

const SKILLS = [
  { key: "animal_ken", label: "Animal Ken" },
  { key: "crafts", label: "Crafts" },
  { key: "drive", label: "Drive" },
  { key: "etiquette", label: "Etiquette" },
  { key: "firearms", label: "Firearms" },
  { key: "larceny", label: "Larceny" },
  { key: "melee", label: "Melee" },
  { key: "performance", label: "Performance" },
  { key: "stealth", label: "Stealth" },
  { key: "survival", label: "Survival" },
];

const KNOWLEDGES = [
  { key: "academics", label: "Academics" },
  { key: "computer", label: "Computer" },
  { key: "finance", label: "Finance" },
  { key: "investigation", label: "Investigation" },
  { key: "law", label: "Law" },
  { key: "medicine", label: "Medicine" },
  { key: "occult", label: "Occult" },
  { key: "politics", label: "Politics" },
  { key: "science", label: "Science" },
  { key: "technology", label: "Technology" },
];

const DISCIPLINES = [
  { key: "animalism", label: "Animalism" },
  { key: "auspex", label: "Auspex" },
  { key: "blood_sorcery", label: "Blood Sorcery" },
  { key: "celerity", label: "Celerity" },
  { key: "chimerstry", label: "Chimerstry" },
  { key: "dementation", label: "Dementation" },
  { key: "dominate", label: "Dominate" },
  { key: "fortitude", label: "Fortitude" },
  { key: "necromancy", label: "Necromancy" },
  { key: "obfuscate", label: "Obfuscate" },
  { key: "obtenebration", label: "Obtenebration" },
  { key: "ogham", label: "Ogham" },
  { key: "potence", label: "Potence" },
  { key: "presence", label: "Presence" },
  { key: "protean", label: "Protean" },
  { key: "quietus", label: "Quietus" },
  { key: "serpentis", label: "Serpentis" },
  { key: "thaumaturgy", label: "Thaumaturgy" },
  { key: "thanatosis", label: "Thanatosis" },
  { key: "vicissitude", label: "Vicissitude" },
  { key: "visceratika", label: "Visceratika" },
];

const BACKGROUNDS = [
  { key: "allies", label: "Allies" },
  { key: "alternate_identity", label: "Alternate Identity" },
  { key: "ancestors", label: "Ancestors" },
  { key: "appearance", label: "Appearance" },
  { key: "arcane", label: "Arcane" },
  { key: "armory", label: "Armory" },
  { key: "backup", label: "Backup" },
  { key: "contacts", label: "Contacts" },
  { key: "domain", label: "Domain" },
  { key: "equipment", label: "Equipment" },
  { key: "fame", label: "Fame" },
  { key: "generation", label: "Generation" },
  { key: "herd", label: "Herd" },
  { key: "influence", label: "Influence" },
  { key: "kitain", label: "Kinfolk" },
  { key: "mentor", label: "Mentor" },
  { key: "resources", label: "Resources" },
  { key: "retainers", label: "Retainers" },
  { key: "rite", label: "Rite" },
  { key: "rituals", label: "Rituals" },
  { key: "sanctuary", label: "Sanctuary" },
  { key: "status", label: "Status" },
];

const VIRTUES = [
  { key: "conscience", label: "Conscience" },
  { key: "self_control", label: "Self-Control" },
  { key: "courage", label: "Courage" },
];

interface XpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: any;
  baseAvailableXp: number;
  pendingSpends?: any[];
  onSave: (spends: SpendChange[]) => Promise<void>;
  onCancelPending?: () => Promise<void>;
  allowBackgroundXpPurchase?: boolean;
  allowMeritFlawXpPurchase?: boolean;
}

function getNestedValue(obj: any, path: string[]): number {
  let cur = obj;
  for (const p of path) {
    if (!cur || typeof cur !== "object") return 0;
    cur = cur[p];
  }
  return typeof cur === "number" ? cur : 0;
}

function TraitRow({
  label,
  current,
  newValue,
  maxValue,
  cost,
  onIncrease,
  onDecrease,
  availableXp,
  totalCost,
  type,
  baseAvailableXp,
}: {
  label: string;
  current: number;
  newValue: number;
  maxValue?: number;
  cost: number;
  onIncrease: () => void;
  onDecrease: () => void;
  availableXp: number;
  totalCost: number;
  type: SpendType;
  baseAvailableXp: number;
}) {
  const isIncreased = newValue > current;
  const effectiveMax = maxValue ?? 5;
  const canIncrease = newValue < effectiveMax;
  const isLocked = maxValue != null && current >= maxValue;
  const canEverIncrease = !isLocked && current < effectiveMax;
  const nextCost = isIncreased
    ? getXpCost(type, newValue)
    : getXpCost(type, current);
  const remainingXp = availableXp - totalCost;
  const canAffordNext = remainingXp >= nextCost;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 8px",
        borderBottom: "1px solid #2a2a2a",
        backgroundColor: canEverIncrease ? "transparent" : "rgba(30,30,30,0.5)",
        opacity: canEverIncrease ? 1 : 0.6,
      }}
    >
      <div
        style={{
          flex: 1,
          fontSize: 13,
          color: canEverIncrease ? "#ddd" : "#777",
        }}
      >
        {label}
        <span style={{ marginLeft: 8, fontSize: 11, color: "#888" }}>
          ({current})
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 3 }}>
          {Array.from({ length: effectiveMax }).map((_, i) => {
            const isFilled = i < newValue;
            const isNew = isIncreased && i >= current && i < newValue;
            return (
              <div
                key={i}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: isFilled
                    ? isNew
                      ? "#ff8c00"
                      : "#c0c0c0"
                    : "#2a2a2a",
                  border: isFilled ? "1px solid #555" : "1px solid #3a3a3a",
                  boxShadow: isFilled
                    ? "inset 0 0 3px rgba(0,0,0,0.5)"
                    : "none",
                }}
              />
            );
          })}
        </div>
        <button
          type="button"
          onClick={onDecrease}
          disabled={newValue <= current}
          style={{
            width: 22,
            height: 22,
            fontSize: 12,
            fontWeight: 700,
            background: newValue > current ? "#3a2020" : "#1a1a1a",
            color: newValue > current ? "#ff6b6b" : "#444",
            border: "1px solid #333",
            borderRadius: 3,
            cursor: newValue > current ? "pointer" : "not-allowed",
          }}
        >
          −
        </button>
        <button
          type="button"
          onClick={onIncrease}
          disabled={!canIncrease || !!isLocked || !canAffordNext}
          style={{
            width: 22,
            height: 22,
            fontSize: 12,
            fontWeight: 700,
            background:
              canIncrease && !isLocked && canAffordNext ? "#1a3a1a" : "#1a1a1a",
            color:
              canIncrease && !isLocked && canAffordNext ? "#4ade80" : "#444",
            border: "1px solid #333",
            borderRadius: 3,
            cursor:
              canIncrease && !isLocked && canAffordNext
                ? "pointer"
                : "not-allowed",
          }}
        >
          +
        </button>
        <div
          style={{
            width: 36,
            textAlign: "right",
            fontSize: 11,
            fontWeight: 600,
            color: isIncreased ? "#ff8c00" : "#555",
          }}
        >
          {isIncreased ? `+${cost}` : "—"}
        </div>
      </div>
    </div>
  );
}

function DisciplineRow({
  label,
  disciplineKey,
  currentLevel,
  newLevel,
  onIncrease,
  onDecrease,
  disciplineService: ds,
  availableXp,
  totalCost,
  onPowerPicker,
}: {
  label: string;
  disciplineKey: string;
  currentLevel: number;
  newLevel: number;
  onIncrease: () => void;
  onDecrease: () => void;
  disciplineService: typeof disciplineService;
  availableXp: number;
  totalCost: number;
  onPowerPicker: (level: number) => void;
}) {
  const isIncreased = newLevel > currentLevel;
  const maxLevel = 10;
  const canIncrease = newLevel < maxLevel;
  const isLocked = maxLevel != null && currentLevel >= maxLevel;
  const canEverIncrease = !isLocked && currentLevel < maxLevel;

  let cost = 0;
  for (let lvl = currentLevel; lvl < newLevel; lvl++) {
    cost += ds.calculateDisciplineCost(disciplineKey, lvl, false);
  }

  const nextCost = ds.calculateDisciplineCost(disciplineKey, newLevel, false);
  const remainingXp = availableXp - totalCost;
  const canAffordNext = remainingXp >= nextCost;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 8px",
        borderBottom: "1px solid #2a2a2a",
        backgroundColor: canEverIncrease ? "transparent" : "rgba(30,30,30,0.5)",
        opacity: canEverIncrease ? 1 : 0.6,
      }}
    >
      <div
        style={{
          flex: 1,
          fontSize: 13,
          color: canEverIncrease ? "#ddd" : "#777",
        }}
      >
        {label}
        <span style={{ marginLeft: 8, fontSize: 11, color: "#888" }}>
          ({currentLevel})
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 3 }}>
          {Array.from({ length: maxLevel }).map((_, i) => {
            const isFilled = i < newLevel;
            const isNew = isIncreased && i >= currentLevel && i < newLevel;
            return (
              <div
                key={i}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: isFilled
                    ? isNew
                      ? "#ff8c00"
                      : "#c0c0c0"
                    : "#2a2a2a",
                  border: isFilled ? "1px solid #555" : "1px solid #3a3a3a",
                  boxShadow: isFilled
                    ? "inset 0 0 3px rgba(0,0,0,0.5)"
                    : "none",
                }}
              />
            );
          })}
        </div>
        <button
          type="button"
          onClick={onDecrease}
          disabled={newLevel <= currentLevel}
          style={{
            width: 22,
            height: 22,
            fontSize: 12,
            fontWeight: 700,
            background: newLevel > currentLevel ? "#3a2020" : "#1a1a1a",
            color: newLevel > currentLevel ? "#ff6b6b" : "#444",
            border: "1px solid #333",
            borderRadius: 3,
            cursor: newLevel > currentLevel ? "pointer" : "not-allowed",
          }}
        >
          −
        </button>
        <button
          type="button"
          onClick={() => {
            const nextLvl = newLevel + 1;
            onPowerPicker(nextLvl);
          }}
          disabled={!canIncrease || !!isLocked || !canAffordNext}
          style={{
            width: 22,
            height: 22,
            fontSize: 12,
            fontWeight: 700,
            background:
              canIncrease && !isLocked && canAffordNext ? "#1a3a1a" : "#1a1a1a",
            color:
              canIncrease && !isLocked && canAffordNext ? "#4ade80" : "#444",
            border: "1px solid #333",
            borderRadius: 3,
            cursor:
              canIncrease && !isLocked && canAffordNext
                ? "pointer"
                : "not-allowed",
          }}
        >
          +
        </button>
        <div
          style={{
            width: 36,
            textAlign: "right",
            fontSize: 11,
            fontWeight: 600,
            color: isIncreased ? "#ff8c00" : "#555",
          }}
        >
          {isIncreased ? `+${cost}` : "—"}
        </div>
      </div>
    </div>
  );
}

function CategorySection({
  title,
  traits,
  getCurrent,
  type,
  maxValue,
  changes,
  onChange,
  changePrefix,
  baseAvailableXp,
  totalCost,
  availableXp,
}: {
  title: string;
  traits: { key: string; label: string }[];
  getCurrent: (key: string) => number;
  type: SpendType;
  maxValue?: number;
  changes: Record<string, number>;
  onChange: (key: string, newValue: number) => void;
  changePrefix: string;
  baseAvailableXp: number;
  totalCost: number;
  availableXp: number;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#666",
          padding: "8px 8px 4px",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {title}
      </div>
      {traits.map((t) => {
        const current = getCurrent(t.key);
        const changeKey = `${changePrefix}_${t.key}`;
        const newValue =
          changes[changeKey] !== undefined ? changes[changeKey] : current;
        const cost = newValue > current ? getXpCost(type, current) : 0;
        return (
          <TraitRow
            key={t.key}
            label={t.label}
            current={current}
            newValue={newValue}
            maxValue={maxValue}
            cost={cost}
            onIncrease={() => onChange(t.key, newValue + 1)}
            onDecrease={() => onChange(t.key, Math.max(0, newValue - 1))}
            type={type}
            availableXp={availableXp}
            totalCost={totalCost}
            baseAvailableXp={baseAvailableXp}
          />
        );
      })}
    </div>
  );
}

export default function XpDrawer({
  isOpen,
  onClose,
  sheet,
  baseAvailableXp,
  pendingSpends = [],
  onSave,
  onCancelPending,
  allowBackgroundXpPurchase = true,
  allowMeritFlawXpPurchase = false,
}: XpDrawerProps) {
  const [changes, setChanges] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDiscipline, setSelectedDiscipline] = useState<string | null>(
    null,
  );
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [showCombos, setShowCombos] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "stats" | "backgrounds" | "disciplines" | "combos"
  >("stats");
  const [selectedDisciplinePower, setSelectedDisciplinePower] = useState<{
    disciplineId: string;
    level: number;
    powerName: string;
  } | null>(null);
  const [showPowerPicker, setShowPowerPicker] = useState(false);
  const [powerPickerLevel, setPowerPickerLevel] = useState<number | null>(null);
  const [selectedPowers, setSelectedPowers] = useState<string | null>(null);
  const [selectedCombos, setSelectedCombos] = useState<string[]>([]);

  const disciplinePowers = useMemo(() => {
    if (!selectedDiscipline || !selectedLevel) return [];
    return disciplineService.getPowersForLevel(
      selectedDiscipline,
      selectedLevel,
    );
  }, [selectedDiscipline, selectedLevel]);

  const disciplineComboInfo = useMemo(() => {
    if (!sheet) return { eligible: [], ineligible: [] };
    const draft = sheet.draft ?? {};
    const sheetWrapper = sheet.sheet ?? sheet;
    const discData = {
      ...(draft.disciplines ?? {}),
      ...(sheetWrapper.disciplines ?? {}),
    };
    const safeNumber = (val: unknown): number => {
      if (typeof val === "number" && !isNaN(val)) return val;
      if (typeof val === "string") {
        const parsed = Number(val);
        if (!isNaN(parsed)) return parsed;
      }
      if (val && typeof val === "object" && "level" in val) {
        return safeNumber((val as any).level);
      }
      return 0;
    };
    const mergedDiscData: Record<string, number> = {};
    for (const [key, value] of Object.entries(discData)) {
      mergedDiscData[key] = safeNumber(value);
    }
    console.log("Combo check - draft.disciplines:", draft.disciplines);
    console.log(
      "Combo check - sheetWrapper.disciplines:",
      sheetWrapper.disciplines,
    );
    console.log("Combo check - changes:", changes);
    for (const [changeKey, value] of Object.entries(changes)) {
      if (changeKey.startsWith("disc_")) {
        const discKey = changeKey.replace("disc_", "");
        mergedDiscData[discKey] = value;
      }
    }
    console.log("Combo check - mergedDiscData:", mergedDiscData);
    return disciplineService.getEligibleCombos(mergedDiscData);
  }, [sheet, changes]);

  const availableXp =
    baseAvailableXp -
    pendingSpends.reduce((sum, p) => sum + Number(p.xpCost), 0);

  const calculateXpCost = useMemo(() => {
    return (type: SpendType, currentRating: number): number => {
      return xpCostStrategy.getCost(
        TRAIT_TYPE_MAP[type],
        currentRating,
        false,
        false,
        allowBackgroundXpPurchase,
        allowMeritFlawXpPurchase,
      );
    };
  }, [allowBackgroundXpPurchase, allowMeritFlawXpPurchase]);

  useEffect(() => {
    if (isOpen) {
      const initialChanges: Record<string, number> = {};
      for (const pending of pendingSpends) {
        const payload = pending.payload;
        if (payload?.spends) {
          for (const spend of payload.spends) {
            const prefix =
              spend.type === "attribute"
                ? "attr"
                : spend.type === "ability"
                  ? "abl"
                  : spend.type === "discipline"
                    ? "disc"
                    : spend.type === "background"
                      ? "bg"
                      : spend.type === "virtue"
                        ? "virt"
                        : "";
            const key = `${prefix}_${spend.key}`;
            initialChanges[key] = spend.to;
          }
        }
      }
      setChanges(initialChanges);
      setError(null);
    }
  }, [isOpen, pendingSpends]);

  const { t } = useI18n();

  const sheetWrapper: any = sheet?.sheet ?? sheet ?? {};
  const draft: any = sheetWrapper.sheet ?? sheetWrapper.draft ?? sheetWrapper;

  const maxTraitRating: number =
    sheetWrapper.sheet?.maxTraitRating ??
    sheetWrapper.draft?.maxTraitRating ??
    sheetWrapper.maxTraitRating ??
    draft.maxTraitRating ??
    5;
  const getAttribute = (key: string): number => {
    const val = draft?.attributes?.[key];
    const isNosferatu = draft?.clanId === "nosferatu";
    const isAppearance = key === "appearance";
    if (isNosferatu && isAppearance) {
      return typeof val === "number" ? val : 0;
    }
    return typeof val === "number" ? Math.max(val, 1) : 1;
  };
  const getAbility = (key: string): number => {
    const val = draft?.abilities?.[key];
    return typeof val === "number" ? val : 0;
  };
  const getDiscipline = (key: string): number => {
    const val = draft?.disciplines?.[key];
    if (typeof val === "number") return val;
    if (
      typeof val === "object" &&
      val !== null &&
      typeof val.level === "number"
    )
      return val.level;
    return 0;
  };
  const getBackground = (key: string): number => {
    const val = draft?.backgrounds?.[key];
    if (typeof val === "number") return val;
    if (
      typeof val === "object" &&
      val !== null &&
      typeof val.level === "number"
    )
      return val.level;
    return 0;
  };
  const getVirtue = (key: string): number => {
    const val = draft?.virtues?.[key];
    if (typeof val === "number") return val;
    if (
      typeof val === "object" &&
      val !== null &&
      typeof val.level === "number"
    )
      return val.level;
    return 0;
  };
  const getWillpower = () => getNestedValue(draft, ["willpower"]) || 0;
  const getRoad = () => getNestedValue(draft, ["roadRating"]) || 0;

  const totalCost = useMemo(() => {
    let total = 0;

    for (const attr of ATTRIBUTES) {
      const current = getAttribute(attr.key);
      const newValue = changes[`attr_${attr.key}`] ?? current;
      if (newValue > current) {
        for (let lvl = current; lvl < newValue; lvl++) {
          total += calculateXpCost("attribute", lvl);
        }
      }
    }

    const allAbilities = [...TALENTS, ...SKILLS, ...KNOWLEDGES];
    for (const abl of allAbilities) {
      const current = getAbility(abl.key);
      const newValue = changes[`abl_${abl.key}`] ?? current;
      if (newValue > current) {
        for (let lvl = current; lvl < newValue; lvl++) {
          total += calculateXpCost("ability", lvl);
        }
      }
    }

    for (const disc of DISCIPLINES) {
      const current = getDiscipline(disc.key);
      const newValue = changes[`disc_${disc.key}`] ?? current;
      if (newValue > current) {
        let totalDiscCost = 0;
        for (let lvl = current + 1; lvl <= newValue; lvl++) {
          const prevLevel = lvl - 1;
          totalDiscCost += disciplineService.calculateDisciplineCost(
            disc.key,
            prevLevel,
            false,
          );
        }
        total += totalDiscCost;
      }
    }

    for (const bg of BACKGROUNDS) {
      const current = getBackground(bg.key);
      const newValue = changes[`bg_${bg.key}`] ?? current;
      if (newValue > current) {
        total += calculateXpCost("background", current);
      }
    }

    for (const virt of VIRTUES) {
      const current = getVirtue(virt.key);
      const newValue = changes[`virt_${virt.key}`] ?? current;
      if (newValue > current) {
        total += calculateXpCost("virtue", current);
      }
    }

    const currentWp = getWillpower();
    const newWp = changes["willpower"] ?? currentWp;
    if (newWp > currentWp) {
      total += calculateXpCost("willpower", currentWp);
    }

    const currentRoad = getRoad();
    const newRoad = changes["road"] ?? currentRoad;
    if (newRoad > currentRoad) {
      total += calculateXpCost("road", currentRoad);
    }

    for (const comboId of selectedCombos) {
      const combo = disciplineComboInfo.eligible.find((c) => c.id === comboId);
      if (combo) {
        total += combo.cost;
      }
    }

    return total;
  }, [changes, selectedCombos, disciplineComboInfo]);

  const canAfford = totalCost <= baseAvailableXp;

  const pendingChangesSummary = useMemo(() => {
    const items: { label: string; from: number; to: number; cost: number }[] =
      [];

    for (const attr of ATTRIBUTES) {
      const current = getAttribute(attr.key);
      const newValue = changes[`attr_${attr.key}`] ?? current;
      if (newValue > current) {
        let totalAttrCost = 0;
        for (let lvl = current; lvl < newValue; lvl++) {
          totalAttrCost += calculateXpCost("attribute", lvl);
        }
        items.push({
          label: attr.label,
          from: current,
          to: newValue,
          cost: totalAttrCost,
        });
      }
    }

    const allAbilities = [...TALENTS, ...SKILLS, ...KNOWLEDGES];
    for (const abl of allAbilities) {
      const current = getAbility(abl.key);
      const newValue = changes[`abl_${abl.key}`] ?? current;
      if (newValue > current) {
        let totalAblCost = 0;
        for (let lvl = current; lvl < newValue; lvl++) {
          totalAblCost += calculateXpCost("ability", lvl);
        }
        items.push({
          label: abl.label,
          from: current,
          to: newValue,
          cost: totalAblCost,
        });
      }
    }

    for (const disc of DISCIPLINES) {
      const current = getDiscipline(disc.key);
      const newValue = changes[`disc_${disc.key}`] ?? current;
      if (newValue > current) {
        let totalDiscCost = 0;
        for (let lvl = current + 1; lvl <= newValue; lvl++) {
          const prevLevel = lvl - 1;
          totalDiscCost += disciplineService.calculateDisciplineCost(
            disc.key,
            prevLevel,
            false,
          );
        }
        items.push({
          label: disc.label,
          from: current,
          to: newValue,
          cost: totalDiscCost,
        });
      }
    }

    for (const bg of BACKGROUNDS) {
      const current = getBackground(bg.key);
      const newValue = changes[`bg_${bg.key}`] ?? current;
      if (newValue > current) {
        let totalBgCost = 0;
        for (let lvl = current; lvl < newValue; lvl++) {
          totalBgCost += calculateXpCost("background", lvl);
        }
        items.push({
          label: bg.label,
          from: current,
          to: newValue,
          cost: totalBgCost,
        });
      }
    }

    for (const virt of VIRTUES) {
      const current = getVirtue(virt.key);
      const newValue = changes[`virt_${virt.key}`] ?? current;
      if (newValue > current) {
        let totalVirtCost = 0;
        for (let lvl = current; lvl < newValue; lvl++) {
          totalVirtCost += calculateXpCost("virtue", lvl);
        }
        items.push({
          label: virt.label,
          from: current,
          to: newValue,
          cost: totalVirtCost,
        });
      }
    }

    const currentWp = getWillpower();
    const newWp = changes["willpower"] ?? currentWp;
    if (newWp > currentWp) {
      let totalWpCost = 0;
      for (let lvl = currentWp; lvl < newWp; lvl++) {
        totalWpCost += calculateXpCost("willpower", lvl);
      }
      items.push({
        label: "Willpower",
        from: currentWp,
        to: newWp,
        cost: totalWpCost,
      });
    }

    const currentRoad = getRoad();
    const newRoad = changes["road"] ?? currentRoad;
    if (newRoad > currentRoad) {
      items.push({
        label: "Road Rating",
        from: currentRoad,
        to: newRoad,
        cost: calculateXpCost("road", currentRoad),
      });
    }

    for (const comboId of selectedCombos) {
      const combo = disciplineComboInfo.eligible.find((c) => c.id === comboId);
      if (combo) {
        items.push({
          label: `[Combo] ${combo.name}`,
          from: 0,
          to: combo.cost,
          cost: combo.cost,
        });
      }
    }

    return items;
  }, [changes, draft, selectedCombos, disciplineComboInfo]);

  const handleChange = (prefix: string, key: string, newValue: number) => {
    const changeKey = `${prefix}_${key}`;
    setChanges((prev) => ({
      ...prev,
      [changeKey]: newValue,
    }));
  };

  const buildSpends = (): SpendChange[] => {
    const spends: SpendChange[] = [];

    for (const attr of ATTRIBUTES) {
      const current = getAttribute(attr.key);
      const newValue = changes[`attr_${attr.key}`] ?? current;
      if (newValue > current) {
        spends.push({
          type: "attribute",
          key: attr.key,
          from: current,
          to: newValue,
        });
      }
    }

    const allAbilities = [...TALENTS, ...SKILLS, ...KNOWLEDGES];
    for (const abl of allAbilities) {
      const current = getAbility(abl.key);
      const newValue = changes[`abl_${abl.key}`] ?? current;
      if (newValue > current) {
        spends.push({
          type: "ability",
          key: abl.key,
          from: current,
          to: newValue,
        });
      }
    }

    for (const disc of DISCIPLINES) {
      const current = getDiscipline(disc.key);
      const newValue = changes[`disc_${disc.key}`] ?? current;
      if (newValue > current) {
        spends.push({
          type: "discipline",
          key: disc.key,
          from: current,
          to: newValue,
        });
      }
    }

    for (const bg of BACKGROUNDS) {
      const current = getBackground(bg.key);
      const newValue = changes[`bg_${bg.key}`] ?? current;
      if (newValue > current) {
        spends.push({
          type: "background",
          key: bg.key,
          from: current,
          to: newValue,
        });
      }
    }

    for (const virt of VIRTUES) {
      const current = getVirtue(virt.key);
      const newValue = changes[`virt_${virt.key}`] ?? current;
      if (newValue > current) {
        spends.push({
          type: "virtue",
          key: virt.key,
          from: current,
          to: newValue,
        });
      }
    }

    const currentWp = getWillpower();
    const newWp = changes["willpower"] ?? currentWp;
    if (newWp > currentWp) {
      spends.push({
        type: "willpower",
        key: "willpower",
        from: currentWp,
        to: newWp,
      });
    }

    const currentRoad = getRoad();
    const newRoad = changes["road"] ?? currentRoad;
    if (newRoad > currentRoad) {
      spends.push({
        type: "road",
        key: "roadRating",
        from: currentRoad,
        to: newRoad,
      });
    }

    for (const comboId of selectedCombos) {
      const combo = disciplineComboInfo.eligible.find((c) => c.id === comboId);
      if (combo) {
        spends.push({
          type: "combo",
          key: comboId,
          from: 0,
          to: combo.cost,
        });
      }
    }

    return spends;
  };

  const handleSave = async () => {
    const spends = buildSpends();

    if (spends.length === 0 && pendingSpends.length > 0 && onCancelPending) {
      await handleCancelPending();
      return;
    }

    if (spends.length === 0) {
      setError("No XP spent");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(spends);
      setChanges({});
      setSelectedCombos([]);
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Failed to save XP spends");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelPending = async () => {
    if (!onCancelPending) return;
    if (!confirm("Are you sure you want to cancel your pending XP spend?"))
      return;

    setSaving(true);
    setError(null);

    try {
      await onCancelPending();
      setChanges({});
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Failed to cancel pending XP spends");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const renderDisciplineLevelModal = () => {
    if (disciplinePowers.length === 0 || !selectedDiscipline) return null;

    const discInfo = disciplineService.getDisciplineById(selectedDiscipline);
    const currentLevel = getDiscipline(selectedDiscipline);
    const nextLevel = currentLevel + 1;
    const isClan = discInfo?.type === "clan-specific";
    const cost = disciplineService.calculateDisciplineCost(
      selectedDiscipline,
      currentLevel,
      isClan,
    );

    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          zIndex: 1001,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <div
          style={{
            backgroundColor: "#1a1a1a",
            border: "1px solid #444",
            borderRadius: 8,
            maxWidth: 700,
            width: "100%",
            maxHeight: "80vh",
            overflow: "auto",
            padding: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 16,
            }}
          >
            <div>
              <h3 style={{ margin: 0, color: "#fff", fontSize: 20 }}>
                {discInfo?.name} - Level {selectedLevel} Powers
              </h3>
              <div style={{ color: "#888", fontSize: 12, marginTop: 4 }}>
                Select a power to unlock
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedDiscipline(null);
                setSelectedLevel(null);
              }}
              style={{
                background: "none",
                border: "none",
                color: "#888",
                fontSize: 24,
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ color: "#666", fontSize: 11, marginBottom: 4 }}>
              Click on a power to select it and unlock this level
            </div>
          </div>

          {disciplinePowers.map((power, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: 12,
                padding: 16,
                background: "#252525",
                borderRadius: 8,
                cursor: "pointer",
                border: "1px solid #444",
              }}
              onClick={() => {
                if (availableXp >= cost && currentLevel < maxTraitRating) {
                  handleChange("disc", selectedDiscipline, nextLevel);
                  setSelectedDiscipline(null);
                  setSelectedLevel(null);
                }
              }}
            >
              <div
                style={{ fontWeight: 600, color: "#90ee90", marginBottom: 8 }}
              >
                {power.name || `Power ${idx + 1}`}
              </div>
              {power.description && (
                <div style={{ color: "#ccc", fontSize: 13, marginBottom: 8 }}>
                  {power.description}
                </div>
              )}
              {power.references && power.references.length > 0 && (
                <div style={{ color: "#888", fontSize: 11 }}>
                  Ref: {power.references.join(", ")}
                </div>
              )}
            </div>
          ))}

          <div
            style={{
              marginTop: 20,
              padding: 16,
              backgroundColor: "#252525",
              borderRadius: 8,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ color: "#888", fontSize: 12 }}>
                Cost to unlock Level {nextLevel}
              </div>
              <div style={{ color: "#90ee90", fontSize: 24, fontWeight: 700 }}>
                {cost} XP
              </div>
              <div style={{ color: "#666", fontSize: 11 }}>
                {isClan ? "Clan discipline" : "Out-of-clan"} -{" "}
                {currentLevel === 0
                  ? "First dot"
                  : `From ${currentLevel} → ${nextLevel}`}
              </div>
            </div>
            <button
              onClick={() => {
                if (availableXp >= cost && currentLevel < maxTraitRating) {
                  handleChange("disc", selectedDiscipline, nextLevel);
                  setSelectedDiscipline(null);
                  setSelectedLevel(null);
                }
              }}
              disabled={availableXp < cost || currentLevel >= maxTraitRating}
              style={{
                padding: "12px 24px",
                background: availableXp >= cost ? "#2a4a2a" : "#333",
                color: availableXp >= cost ? "#90ee90" : "#666",
                border: "none",
                borderRadius: 4,
                cursor: availableXp >= cost ? "pointer" : "not-allowed",
                fontWeight: 600,
              }}
            >
              Unlock Level {nextLevel} ({cost} XP)
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderComboSection = () => (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        zIndex: 1001,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          backgroundColor: "#1a1a1a",
          border: "1px solid #444",
          borderRadius: 8,
          maxWidth: 700,
          width: "100%",
          maxHeight: "80vh",
          overflow: "auto",
          padding: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
          }}
        >
          <div>
            <h3 style={{ margin: 0, color: "#fff", fontSize: 20 }}>
              Combination Disciplines
            </h3>
            <div style={{ color: "#888", fontSize: 12, marginTop: 4 }}>
              Special powers requiring prerequisites in multiple disciplines
            </div>
          </div>
          <button
            onClick={() => setShowCombos(false)}
            style={{
              background: "none",
              border: "none",
              color: "#888",
              fontSize: 24,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        {disciplineComboInfo.eligible.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ color: "#90ee90", marginBottom: 12 }}>
              Available ({disciplineComboInfo.eligible.length})
            </h4>
            {disciplineComboInfo.eligible.map((combo, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: "#252525",
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        color: "#fff",
                        fontWeight: 700,
                        marginBottom: 4,
                      }}
                    >
                      {combo.name}
                    </div>
                    <div
                      style={{ color: "#ccc", fontSize: 13, marginBottom: 8 }}
                    >
                      {combo.description}
                    </div>
                    <div style={{ color: "#888", fontSize: 11 }}>
                      Prerequisites:{" "}
                      {combo.prerequisites
                        .map((p) => `${p.discipline} ${p.level}`)
                        .join(", ")}
                    </div>
                    {combo.system && (
                      <div
                        style={{ color: "#666", fontSize: 12, marginTop: 4 }}
                      >
                        System: {combo.system}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", marginLeft: 16 }}>
                    <div
                      style={{
                        color: "#90ee90",
                        fontSize: 20,
                        fontWeight: 700,
                      }}
                    >
                      {combo.cost || "?"} XP
                    </div>
                    {selectedCombos.includes(combo.id) ? (
                      <button
                        className="btn"
                        onClick={() => {
                          setSelectedCombos(
                            selectedCombos.filter((c) => c !== combo.id),
                          );
                        }}
                        style={{
                          backgroundColor: "#3a1a1a",
                          color: "#ff6b6b",
                          marginTop: 8,
                          padding: "6px 12px",
                          fontSize: 12,
                        }}
                      >
                        Cancel
                      </button>
                    ) : (
                      <button
                        className="btn"
                        disabled={availableXp < (combo.cost || 0)}
                        onClick={() => {
                          setSelectedCombos([...selectedCombos, combo.id]);
                        }}
                        style={{
                          backgroundColor:
                            availableXp >= (combo.cost || 0)
                              ? "#2a4a2a"
                              : "#222",
                          color:
                            availableXp >= (combo.cost || 0)
                              ? "#90ee90"
                              : "#555",
                          marginTop: 8,
                          padding: "6px 12px",
                          fontSize: 12,
                        }}
                      >
                        Purchase
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {disciplineComboInfo.ineligible.length > 0 && (
          <div>
            <h4 style={{ color: "#666", marginBottom: 12 }}>
              Not Yet Available
            </h4>
            {disciplineComboInfo.ineligible.map((item, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 8,
                  opacity: 0.6,
                }}
              >
                <div
                  style={{ color: "#888", fontWeight: 600, marginBottom: 4 }}
                >
                  {item.combo.name}
                </div>
                <div style={{ color: "#ff6b6b", fontSize: 12 }}>
                  Missing: {item.missing.join(", ")}
                </div>
              </div>
            ))}
          </div>
        )}

        {disciplineComboInfo.eligible.length === 0 &&
          disciplineComboInfo.ineligible.length === 0 && (
            <div style={{ color: "#666", textAlign: "center", padding: 40 }}>
              No combo disciplines available
            </div>
          )}
      </div>
    </div>
  );

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          zIndex: 999,
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "55%",
          minWidth: 700,
          maxWidth: 1200,
          backgroundColor: "#1a1a1a",
          borderLeft: "1px solid #333",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-4px 0 20px rgba(0, 0, 0, 0.5)",
        }}
      >
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid #333",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: "#fff" }}>
              {t("xp.spendExperience")}
            </h2>
            <div style={{ fontSize: 10, color: "#666", marginTop: 4 }}>
              {t("xp.maxTraitRating", { rating: maxTraitRating })}
            </div>
            <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>
              <span style={{ color: "#c0c0c0" }}>●</span>{" "}
              {t("xp.legend.current")} &nbsp;
              <span style={{ color: "#ff8c00" }}>●</span>{" "}
              {t("xp.legend.pending")}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#888",
              fontSize: 20,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "#252525",
            borderBottom: "1px solid #333",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 14,
            }}
          >
            <span className="muted">{t("xp.availableXp")}:</span>
            <span style={{ color: "#90ee90", fontWeight: 700 }}>
              {baseAvailableXp - totalCost}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 14,
              marginTop: 4,
            }}
          >
            <span className="muted">{t("xp.totalCost")}:</span>
            <span
              style={{
                color: canAfford ? "#ff8c00" : "#ff5555",
                fontWeight: 700,
              }}
            >
              {totalCost}
            </span>
          </div>
          {!canAfford && (
            <div style={{ color: "#ff5555", fontSize: 12, marginTop: 8 }}>
              {t("xp.insufficientXp", { needed: totalCost - availableXp })}
            </div>
          )}

          {pendingChangesSummary.length > 0 && (
            <div
              style={{
                marginTop: 12,
                paddingTop: 8,
                borderTop: "1px solid #333",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "#666",
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                {t("xp.pendingChanges")}
              </div>
              {pendingChangesSummary.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    padding: "2px 0",
                    color: "#ddd",
                  }}
                >
                  <span>
                    {item.label}:{" "}
                    <span style={{ color: "#888" }}>{item.from}</span> →{" "}
                    <span style={{ color: "#ff8c00" }}>{item.to}</span>
                  </span>
                  <span style={{ color: "#ff8c00" }}>+{item.cost} XP</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          <div
            style={{
              display: "flex",
              gap: 4,
              padding: "0 8px",
              marginBottom: 12,
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("stats")}
              style={{
                flex: 1,
                padding: "8px 4px",
                background: activeTab === "stats" ? "#2a4a2a" : "#1a1a1a",
                color: activeTab === "stats" ? "#90ee90" : "#888",
                border: "1px solid #333",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              Atributos/Habilidades
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("backgrounds")}
              style={{
                flex: 1,
                padding: "8px 4px",
                background: activeTab === "backgrounds" ? "#2a4a2a" : "#1a1a1a",
                color: activeTab === "backgrounds" ? "#90ee90" : "#888",
                border: "1px solid #333",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              Backgrounds
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("disciplines")}
              style={{
                flex: 1,
                padding: "8px 4px",
                background: activeTab === "disciplines" ? "#2a4a2a" : "#1a1a1a",
                color: activeTab === "disciplines" ? "#90ee90" : "#888",
                border: "1px solid #333",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              Disciplinas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("combos")}
              style={{
                flex: 1,
                padding: "8px 4px",
                background: activeTab === "combos" ? "#2a4a2a" : "#1a1a1a",
                color: activeTab === "combos" ? "#90ee90" : "#888",
                border: "1px solid #333",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              Combo
            </button>
          </div>

          {activeTab === "stats" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "12px",
                padding: "0 8px",
              }}
            >
              <div>
                <CategorySection
                  title="Physical"
                  traits={ATTRIBUTES.filter((a) =>
                    ["strength", "dexterity", "stamina"].includes(a.key),
                  )}
                  getCurrent={(key) => getAttribute(key)}
                  type="attribute"
                  maxValue={maxTraitRating}
                  changes={changes}
                  onChange={(key, val) => handleChange("attr", key, val)}
                  changePrefix="attr"
                  availableXp={availableXp}
                  totalCost={totalCost}
                  baseAvailableXp={baseAvailableXp}
                />
                <CategorySection
                  title={t("categories.talents")}
                  traits={TALENTS}
                  getCurrent={(key) => getAbility(key)}
                  type="ability"
                  maxValue={maxTraitRating}
                  changes={changes}
                  onChange={(key, val) => handleChange("abl", key, val)}
                  changePrefix="abl"
                  availableXp={availableXp}
                  totalCost={totalCost}
                  baseAvailableXp={baseAvailableXp}
                />
              </div>

              <div>
                <CategorySection
                  title="Social"
                  traits={ATTRIBUTES.filter((a) =>
                    ["charisma", "manipulation", "appearance"].includes(a.key),
                  )}
                  getCurrent={(key) => getAttribute(key)}
                  type="attribute"
                  maxValue={maxTraitRating}
                  changes={changes}
                  onChange={(key, val) => handleChange("attr", key, val)}
                  changePrefix="attr"
                  availableXp={availableXp}
                  totalCost={totalCost}
                  baseAvailableXp={baseAvailableXp}
                />
                <CategorySection
                  title={t("categories.skills")}
                  traits={SKILLS}
                  getCurrent={(key) => getAbility(key)}
                  type="ability"
                  maxValue={maxTraitRating}
                  changes={changes}
                  onChange={(key, val) => handleChange("abl", key, val)}
                  changePrefix="abl"
                  availableXp={availableXp}
                  totalCost={totalCost}
                  baseAvailableXp={baseAvailableXp}
                />
              </div>

              <div>
                <CategorySection
                  title="Mental"
                  traits={ATTRIBUTES.filter((a) =>
                    ["perception", "intelligence", "wits"].includes(a.key),
                  )}
                  getCurrent={(key) => getAttribute(key)}
                  type="attribute"
                  maxValue={maxTraitRating}
                  changes={changes}
                  onChange={(key, val) => handleChange("attr", key, val)}
                  changePrefix="attr"
                  availableXp={availableXp}
                  totalCost={totalCost}
                  baseAvailableXp={baseAvailableXp}
                />
                <CategorySection
                  title={t("categories.knowledges")}
                  traits={KNOWLEDGES}
                  getCurrent={(key) => getAbility(key)}
                  type="ability"
                  maxValue={maxTraitRating}
                  changes={changes}
                  onChange={(key, val) => handleChange("abl", key, val)}
                  changePrefix="abl"
                  availableXp={availableXp}
                  totalCost={totalCost}
                  baseAvailableXp={baseAvailableXp}
                />
              </div>
            </div>
          )}

          {activeTab === "backgrounds" && (
            <div style={{ padding: "0 8px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "12px",
                }}
              >
                <CategorySection
                  title="Column 1"
                  traits={BACKGROUNDS.slice(0, 8)}
                  getCurrent={(key) => getBackground(key)}
                  type="background"
                  maxValue={5}
                  changes={changes}
                  onChange={(key, val) => handleChange("bg", key, val)}
                  changePrefix="bg"
                  availableXp={availableXp}
                  totalCost={totalCost}
                  baseAvailableXp={baseAvailableXp}
                />
                <CategorySection
                  title="Column 2"
                  traits={BACKGROUNDS.slice(8, 16)}
                  getCurrent={(key) => getBackground(key)}
                  type="background"
                  maxValue={5}
                  changes={changes}
                  onChange={(key, val) => handleChange("bg", key, val)}
                  changePrefix="bg"
                  availableXp={availableXp}
                  totalCost={totalCost}
                  baseAvailableXp={baseAvailableXp}
                />
                <CategorySection
                  title="Column 3"
                  traits={BACKGROUNDS.slice(16)}
                  getCurrent={(key) => getBackground(key)}
                  type="background"
                  maxValue={5}
                  changes={changes}
                  onChange={(key, val) => handleChange("bg", key, val)}
                  changePrefix="bg"
                  availableXp={availableXp}
                  totalCost={totalCost}
                  baseAvailableXp={baseAvailableXp}
                />
              </div>
            </div>
          )}

          {activeTab === "disciplines" && (
            <div style={{ padding: "0 8px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 8,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#666",
                      padding: "8px 8px 4px",
                      textTransform: "uppercase",
                    }}
                  >
                    Column 1
                  </div>
                  {DISCIPLINES.slice(0, 7).map((disc) => {
                    const currentLevel = getDiscipline(disc.key);
                    const newLevel =
                      changes[`disc_${disc.key}`] !== undefined
                        ? changes[`disc_${disc.key}`]
                        : currentLevel;
                    return (
                      <DisciplineRow
                        key={disc.key}
                        label={disc.label}
                        disciplineKey={disc.key}
                        currentLevel={currentLevel}
                        newLevel={newLevel}
                        onIncrease={() =>
                          handleChange("disc", disc.key, newLevel + 1)
                        }
                        onDecrease={() =>
                          handleChange(
                            "disc",
                            disc.key,
                            Math.max(0, newLevel - 1),
                          )
                        }
                        disciplineService={disciplineService}
                        availableXp={availableXp}
                        totalCost={totalCost}
                        onPowerPicker={(level) => {
                          setSelectedPowers(null);
                          setSelectedDiscipline(disc.key);
                          setPowerPickerLevel(level);
                          setShowPowerPicker(true);
                        }}
                      />
                    );
                  })}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#666",
                      padding: "8px 8px 4px",
                      textTransform: "uppercase",
                    }}
                  >
                    Column 2
                  </div>
                  {DISCIPLINES.slice(7, 14).map((disc) => {
                    const currentLevel = getDiscipline(disc.key);
                    const newLevel =
                      changes[`disc_${disc.key}`] !== undefined
                        ? changes[`disc_${disc.key}`]
                        : currentLevel;
                    return (
                      <DisciplineRow
                        key={disc.key}
                        label={disc.label}
                        disciplineKey={disc.key}
                        currentLevel={currentLevel}
                        newLevel={newLevel}
                        onIncrease={() =>
                          handleChange("disc", disc.key, newLevel + 1)
                        }
                        onDecrease={() =>
                          handleChange(
                            "disc",
                            disc.key,
                            Math.max(0, newLevel - 1),
                          )
                        }
                        disciplineService={disciplineService}
                        availableXp={availableXp}
                        totalCost={totalCost}
                        onPowerPicker={(level) => {
                          setSelectedPowers(null);
                          setSelectedDiscipline(disc.key);
                          setPowerPickerLevel(level);
                          setShowPowerPicker(true);
                        }}
                      />
                    );
                  })}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#666",
                      padding: "8px 8px 4px",
                      textTransform: "uppercase",
                    }}
                  >
                    Column 3
                  </div>
                  {DISCIPLINES.slice(14).map((disc) => {
                    const currentLevel = getDiscipline(disc.key);
                    const newLevel =
                      changes[`disc_${disc.key}`] !== undefined
                        ? changes[`disc_${disc.key}`]
                        : currentLevel;
                    return (
                      <DisciplineRow
                        key={disc.key}
                        label={disc.label}
                        disciplineKey={disc.key}
                        currentLevel={currentLevel}
                        newLevel={newLevel}
                        onIncrease={() =>
                          handleChange("disc", disc.key, newLevel + 1)
                        }
                        onDecrease={() =>
                          handleChange(
                            "disc",
                            disc.key,
                            Math.max(0, newLevel - 1),
                          )
                        }
                        disciplineService={disciplineService}
                        availableXp={availableXp}
                        totalCost={totalCost}
                        onPowerPicker={(level) => {
                          setSelectedPowers(null);
                          setSelectedDiscipline(disc.key);
                          setPowerPickerLevel(level);
                          setShowPowerPicker(true);
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === "combos" && (
            <div style={{ padding: "0 8px" }}>
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0, color: "#fff", fontSize: 18 }}>
                      Combination Disciplines
                    </h3>
                    <div style={{ color: "#888", fontSize: 12, marginTop: 4 }}>
                      Special powers requiring prerequisites in multiple
                      disciplines
                    </div>
                  </div>
                </div>

                {disciplineComboInfo.eligible.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <h4 style={{ color: "#90ee90", marginBottom: 12 }}>
                      Available ({disciplineComboInfo.eligible.length})
                    </h4>
                    {disciplineComboInfo.eligible.map((combo, idx) => (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: "#252525",
                          borderRadius: 8,
                          padding: 16,
                          marginBottom: 12,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                color: "#fff",
                                fontWeight: 700,
                                marginBottom: 4,
                              }}
                            >
                              {combo.name}
                            </div>
                            <div
                              style={{
                                color: "#ccc",
                                fontSize: 13,
                                marginBottom: 8,
                              }}
                            >
                              {combo.description}
                            </div>
                            <div style={{ color: "#888", fontSize: 11 }}>
                              Prerequisites:{" "}
                              {combo.prerequisites
                                .map((p) => `${p.discipline} ${p.level}`)
                                .join(", ")}
                            </div>
                          </div>
                          <div style={{ textAlign: "right", marginLeft: 16 }}>
                            <div
                              style={{
                                color: "#90ee90",
                                fontSize: 18,
                                fontWeight: 700,
                              }}
                            >
                              {combo.cost} XP
                            </div>
                            {selectedCombos.includes(combo.id) ? (
                              <button
                                className="btn"
                                onClick={() => {
                                  setSelectedCombos(
                                    selectedCombos.filter(
                                      (c) => c !== combo.id,
                                    ),
                                  );
                                }}
                                style={{
                                  backgroundColor: "#3a1a1a",
                                  color: "#ff6b6b",
                                  marginTop: 8,
                                  padding: "6px 12px",
                                  fontSize: 12,
                                }}
                              >
                                Cancel
                              </button>
                            ) : (
                              <button
                                className="btn"
                                disabled={availableXp < combo.cost}
                                onClick={() => {
                                  setSelectedCombos([
                                    ...selectedCombos,
                                    combo.id,
                                  ]);
                                }}
                                style={{
                                  backgroundColor:
                                    availableXp >= combo.cost
                                      ? "#2a4a2a"
                                      : "#222",
                                  color:
                                    availableXp >= combo.cost
                                      ? "#90ee90"
                                      : "#555",
                                  marginTop: 8,
                                  padding: "6px 12px",
                                  fontSize: 12,
                                }}
                              >
                                Purchase
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {disciplineComboInfo.ineligible.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <h4 style={{ color: "#ff6b6b", marginBottom: 12 }}>
                      Not Available ({disciplineComboInfo.ineligible.length})
                    </h4>
                    {disciplineComboInfo.ineligible.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: "#252525",
                          borderRadius: 8,
                          padding: 16,
                          marginBottom: 12,
                          opacity: 0.7,
                        }}
                      >
                        <div
                          style={{
                            color: "#fff",
                            fontWeight: 700,
                            marginBottom: 4,
                          }}
                        >
                          {item.combo.name}
                        </div>
                        <div
                          style={{
                            color: "#ccc",
                            fontSize: 13,
                            marginBottom: 8,
                          }}
                        >
                          {item.combo.description}
                        </div>
                        <div style={{ color: "#888", fontSize: 11 }}>
                          Missing: {item.missing.join(", ")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {disciplineComboInfo.eligible.length === 0 &&
                  disciplineComboInfo.ineligible.length === 0 && (
                    <div
                      className="muted"
                      style={{ padding: 20, textAlign: "center" }}
                    >
                      No combo disciplines available
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "#3a2020",
              color: "#ff6b6b",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            padding: "16px",
            borderTop: "1px solid #333",
            display: "flex",
            gap: 12,
          }}
        >
          {pendingSpends.length > 0 && onCancelPending && (
            <button
              type="button"
              className="btn"
              onClick={handleCancelPending}
              disabled={saving}
              style={{ flex: 1, backgroundColor: "#4a2a2a", color: "#ff6b6b" }}
            >
              Cancel Pending
            </button>
          )}
          <button
            type="button"
            className="btn"
            onClick={onClose}
            style={{ flex: 1, backgroundColor: "#333" }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleSave}
            disabled={!canAfford || saving}
            style={{
              flex: 1,
              backgroundColor: canAfford ? "#2a4a2a" : "#222",
              color: canAfford ? "#90ee90" : "#555",
            }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {disciplinePowers.length > 0 && renderDisciplineLevelModal()}
      {showCombos && renderComboSection()}
      {showPowerPicker && selectedDiscipline && powerPickerLevel && (
        <div
          className="drawer-overlay"
          onClick={() => setShowPowerPicker(false)}
        >
          <div
            className="drawer"
            onClick={(e) => e.stopPropagation()}
            style={{ width: 600 }}
          >
            <div className="drawer-header">
              <h3 className="h3">
                Selecionar Poder - Nível {powerPickerLevel}
              </h3>
              <button
                type="button"
                className="drawer-close"
                onClick={() => setShowPowerPicker(false)}
              >
                ×
              </button>
            </div>
            <div
              className="drawer-body"
              style={{ maxHeight: "80vh", overflowY: "auto" }}
            >
              {(() => {
                const discInfo =
                  disciplineService.getDisciplineById(selectedDiscipline);
                const currentLevel = getDiscipline(selectedDiscipline);
                const levels =
                  discInfo?.levels.filter(
                    (l) => l.level === powerPickerLevel,
                  ) || [];
                return (
                  <div>
                    {discInfo && (
                      <div
                        style={{
                          marginBottom: 16,
                          padding: 12,
                          background: "#1a1a2e",
                          borderRadius: 4,
                          border: "1px solid #333",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 16,
                            color: "#90ee90",
                            marginBottom: 8,
                          }}
                        >
                          {discInfo.name}
                        </div>
                        {discInfo.clans && discInfo.clans.length > 0 && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "#aaa",
                              marginBottom: 4,
                            }}
                          >
                            Clans: {discInfo.clans.join(", ")}
                          </div>
                        )}
                      </div>
                    )}
                    {levels.length === 0 ? (
                      <div className="muted">
                        Nenhum poder disponível para este nível.
                      </div>
                    ) : (
                      <div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#888",
                            marginBottom: 12,
                          }}
                        >
                          {powerPickerLevel > currentLevel
                            ? `Selecione o poder que deseja aprender ao desbloquear o nível ${powerPickerLevel}`
                            : `Selecione um poder adicional para comprar neste nível`}
                        </div>
                        {levels.map((level) =>
                          level.powers.map((power, idx) => {
                            const powerKey = `${powerPickerLevel}-${power.name}`;
                            const isSelected = selectedPowers === powerKey;
                            const isCurrentPower =
                              powerPickerLevel <= currentLevel;

                            return (
                              <div
                                key={`${level.level}-${idx}`}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedPowers(null);
                                  } else {
                                    setSelectedPowers(powerKey);
                                  }
                                }}
                                style={{
                                  marginBottom: 12,
                                  padding: 12,
                                  background: isSelected
                                    ? "#1a3a1a"
                                    : "#1a1a2e",
                                  borderRadius: 4,
                                  border: isSelected
                                    ? "1px solid #4ade80"
                                    : "1px solid #333",
                                  cursor: "pointer",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: 12,
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 20,
                                      height: 20,
                                      borderRadius: 4,
                                      border: isSelected
                                        ? "2px solid #4ade80"
                                        : "2px solid #555",
                                      background: isSelected
                                        ? "#4ade80"
                                        : "transparent",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      flexShrink: 0,
                                      marginTop: 2,
                                    }}
                                  >
                                    {isSelected && (
                                      <span
                                        style={{
                                          color: "#000",
                                          fontWeight: "bold",
                                          fontSize: 14,
                                        }}
                                      >
                                        ✓
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div
                                      style={{
                                        fontWeight: 600,
                                        marginBottom: 4,
                                        color: isSelected
                                          ? "#4ade80"
                                          : "#90ee90",
                                      }}
                                    >
                                      {power.name}
                                      {isCurrentPower && (
                                        <span
                                          style={{
                                            marginLeft: 8,
                                            fontSize: 10,
                                            color: "#666",
                                            background: "#333",
                                            padding: "2px 6px",
                                            borderRadius: 3,
                                          }}
                                        >
                                          Owned
                                        </span>
                                      )}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: 12,
                                        color: "#aaa",
                                        marginBottom: 8,
                                      }}
                                    >
                                      {power.description}
                                    </div>
                                    {power.effects &&
                                      power.effects.length > 0 && (
                                        <div
                                          style={{
                                            fontSize: 11,
                                            marginBottom: 4,
                                          }}
                                        >
                                          <span className="muted">
                                            Effects:{" "}
                                          </span>
                                          <span>
                                            {power.effects.join(", ")}
                                          </span>
                                        </div>
                                      )}
                                    {power.rolls && power.rolls.length > 0 && (
                                      <div
                                        style={{
                                          fontSize: 11,
                                          marginBottom: 4,
                                        }}
                                      >
                                        <span className="muted">Rolls: </span>
                                        <span>{power.rolls.join(", ")}</span>
                                      </div>
                                    )}
                                    {power.alias && power.alias.length > 0 && (
                                      <div style={{ fontSize: 11 }}>
                                        <span className="muted">Alias: </span>
                                        <span>{power.alias.join(", ")}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          }),
                        )}
                      </div>
                    )}
                    {levels.length > 0 &&
                      (selectedPowers !== null ||
                        powerPickerLevel > currentLevel) && (
                        <div
                          style={{
                            marginTop: 16,
                            padding: 16,
                            background: "#252525",
                            borderRadius: 4,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 14,
                              color: "#fff",
                              marginBottom: 12,
                            }}
                          >
                            Resumo da seleção:
                          </div>
                          {powerPickerLevel > currentLevel && (
                            <div
                              style={{
                                fontSize: 12,
                                color: "#888",
                                marginBottom: 8,
                              }}
                            >
                              • Desbloquear nível {powerPickerLevel}:{" "}
                              {disciplineService.calculateDisciplineCost(
                                selectedDiscipline,
                                powerPickerLevel - 1,
                                false,
                              )}{" "}
                              XP
                            </div>
                          )}
                          {selectedPowers !== null && (
                            <div
                              style={{
                                fontSize: 12,
                                color: "#888",
                                marginBottom: 8,
                              }}
                            >
                              • Poder selecionado:{" "}
                              {selectedPowers.split("-").slice(1).join("-")}
                            </div>
                          )}
                          <div
                            style={{
                              fontSize: 16,
                              color: "#90ee90",
                              fontWeight: 700,
                              marginBottom: 16,
                            }}
                          >
                            Custo total:{" "}
                            {(() => {
                              let total = 0;
                              if (powerPickerLevel > currentLevel) {
                                total +=
                                  disciplineService.calculateDisciplineCost(
                                    selectedDiscipline,
                                    powerPickerLevel - 1,
                                    false,
                                  );
                              } else if (selectedPowers !== null) {
                                total +=
                                  disciplineService.calculateDisciplineCost(
                                    selectedDiscipline,
                                    powerPickerLevel,
                                    false,
                                  );
                              }
                              return total;
                            })()}{" "}
                            XP
                          </div>
                          <div style={{ display: "flex", gap: 12 }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (powerPickerLevel > currentLevel) {
                                  handleChange(
                                    "disc",
                                    selectedDiscipline,
                                    powerPickerLevel,
                                  );
                                }
                                setSelectedPowers(null);
                                setShowPowerPicker(false);
                              }}
                              disabled={
                                selectedPowers === null &&
                                powerPickerLevel <= currentLevel
                              }
                              style={{
                                flex: 1,
                                padding: "12px 20px",
                                background:
                                  selectedPowers !== null ||
                                  powerPickerLevel > currentLevel
                                    ? "#2a4a2a"
                                    : "#333",
                                color:
                                  selectedPowers !== null ||
                                  powerPickerLevel > currentLevel
                                    ? "#90ee90"
                                    : "#666",
                                border: "none",
                                borderRadius: 4,
                                cursor:
                                  selectedPowers !== null ||
                                  powerPickerLevel > currentLevel
                                    ? "pointer"
                                    : "not-allowed",
                                fontWeight: 600,
                              }}
                            >
                              {powerPickerLevel > currentLevel
                                ? "Confirmar & Desbloquear"
                                : "Confirmar Compra"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPowers(null);
                                setShowPowerPicker(false);
                              }}
                              style={{
                                padding: "12px 20px",
                                background: "#333",
                                color: "#888",
                                border: "none",
                                borderRadius: 4,
                                cursor: "pointer",
                                fontWeight: 600,
                              }}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

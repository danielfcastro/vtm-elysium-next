"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */

import React, { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { disciplineService } from "@/core/services/DisciplineService";
import { TraitRow } from "./shared/TraitRow";
import {
  getTemplateAvailableDisciplines,
  getXpCost,
  ATTRIBUTES,
  TALENTS,
  SKILLS,
  KNOWLEDGES,
  DISCIPLINES,
  BACKGROUNDS,
  VIRTUES,
  SpendChange,
} from "./xpDrawerConstants";
import PowerSelectionDrawer from "@/components/power-selection-drawer/PowerSelectionDrawer";
import { isLegendaryRating } from "@/core/data/specialties";
import { AutocompleteInput } from "@/components/AutocompleteInput";

interface XpAnimalGhoulDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: any;
  baseAvailableXp: number;
  pendingSpends?: any[];
  onSave: (spends: SpendChange[]) => Promise<void>;
  onCancelPending?: () => Promise<void>;
  characterStatus?: string | null;
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

function DisciplineRow({
  label,
  disciplineKey,
  currentLevel,
  newLevel,
  maxLevel = 10,
  onIncrease,
  onDecrease,
  availableXp,
  totalCost,
  isDisciplineAvailable,
  canAddMoreDisciplines,
}: {
  label: string;
  disciplineKey: string;
  currentLevel: number;
  newLevel: number;
  maxLevel?: number;
  onIncrease: () => void;
  onDecrease: () => void;
  availableXp: number;
  totalCost: number;
  isDisciplineAvailable: boolean;
  canAddMoreDisciplines: boolean;
}) {
  const isIncreased = newLevel > currentLevel;
  let effectiveMaxLevel = maxLevel;
  let isFullyDisabled = false;

  if (!isDisciplineAvailable) {
    isFullyDisabled = true;
    effectiveMaxLevel = 0;
  } else if (currentLevel > 0) {
    effectiveMaxLevel = currentLevel;
  } else if (!canAddMoreDisciplines) {
    isFullyDisabled = true;
    effectiveMaxLevel = 0;
  } else {
    effectiveMaxLevel = 1;
  }

  const canIncrease = !isFullyDisabled && newLevel < effectiveMaxLevel;
  const isLocked =
    effectiveMaxLevel != null && currentLevel >= effectiveMaxLevel;
  const canEverIncrease =
    !isFullyDisabled && !isLocked && currentLevel < effectiveMaxLevel;

  let cost = 0;
  for (let lvl = currentLevel; lvl < newLevel; lvl++) {
    cost += disciplineService.calculateDisciplineCost(
      disciplineKey,
      lvl,
      false,
    );
  }

  const nextCost = disciplineService.calculateDisciplineCost(
    disciplineKey,
    newLevel,
    false,
  );
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
        {!isDisciplineAvailable && (
          <span style={{ marginLeft: 8, fontSize: 10, color: "#666" }}>
            (unavailable)
          </span>
        )}
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
        <div
          style={{
            width: 40,
            textAlign: "right",
            fontSize: 11,
            color: "#ffcc00",
          }}
        >
          {newLevel > currentLevel ? `+${cost}` : ""}
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          <button
            onClick={onDecrease}
            disabled={newLevel <= currentLevel}
            style={{
              width: 20,
              height: 20,
              fontSize: 14,
              lineHeight: 1,
              backgroundColor: newLevel > currentLevel ? "#333" : "#222",
              color: newLevel > currentLevel ? "#fff" : "#555",
              border: "1px solid #444",
              borderRadius: 3,
              cursor: newLevel > currentLevel ? "pointer" : "not-allowed",
            }}
          >
            −
          </button>
          <button
            onClick={onIncrease}
            disabled={!canIncrease || !canAffordNext}
            style={{
              width: 20,
              height: 20,
              fontSize: 14,
              lineHeight: 1,
              backgroundColor:
                canIncrease && canAffordNext ? "#1a5c1a" : "#222",
              color: canIncrease && canAffordNext ? "#8f8" : "#555",
              border: "1px solid #444",
              borderRadius: 3,
              cursor: canIncrease && canAffordNext ? "pointer" : "not-allowed",
            }}
          >
            +
          </button>
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
  getMaxValueForTrait,
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
  type: string;
  maxValue?: number;
  getMaxValueForTrait?: (key: string) => number | undefined;
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
        let totalCostForTrait = 0;
        for (let lvl = current; lvl < newValue; lvl++) {
          totalCostForTrait += getXpCost(type as any, lvl);
        }
        const effectiveMaxValue = getMaxValueForTrait
          ? (getMaxValueForTrait(t.key) ?? maxValue ?? 5)
          : (maxValue ?? 5);
        return (
          <TraitRow
            key={t.key}
            label={t.label}
            current={current}
            newValue={newValue}
            maxValue={effectiveMaxValue}
            cost={totalCostForTrait}
            onIncrease={() => onChange(changeKey, newValue + 1)}
            onDecrease={() => onChange(changeKey, Math.max(0, newValue - 1))}
            type={type}
            availableXp={availableXp}
            totalCost={totalCost}
          />
        );
      })}
    </div>
  );
}

export default function XpAnimalGhoulDrawer({
  isOpen,
  onClose,
  sheet,
  baseAvailableXp,
  pendingSpends = [],
  onSave,
  onCancelPending,
  characterStatus,
}: XpAnimalGhoulDrawerProps) {
  const [changes, setChanges] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "stats" | "backgrounds" | "disciplines" | "virtues"
  >("stats");

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

  const [powerDrawerOpen, setPowerDrawerOpen] = useState(false);
  const [powerDrawerDiscipline, setPowerDrawerDiscipline] = useState<{
    id: string;
    level: number;
  } | null>(null);

  const [disciplinePowers, setDisciplinePowers] = useState<
    Record<string, { level: number; name: string }[]>
  >({});

  const [changes_specialties, setChangesSpecialties] = useState<
    Record<string, { name: string; description?: string }>
  >({});

  const [specialtyQuery, setSpecialtyQuery] = useState("");
  const [specialtyOptions, setSpecialtyOptions] = useState<any[]>([]);

  useEffect(() => {
    if (!specialtyDrawer.open) {
      setSpecialtyQuery("");
      setSpecialtyOptions([]);
      return;
    }

    const traitId = specialtyDrawer.traitId;
    const traitType = specialtyDrawer.traitType;
    const traitCategory = specialtyDrawer.traitCategory;
    const currentValue = specialtyDrawer.currentValue;

    if (!traitId || !traitType || !traitCategory) return;

    const fetchSpecialties = async () => {
      try {
        const typeParam = traitType === "attribute" ? "attribute" : "ability";
        const isLegendary = isLegendaryRating(currentValue);
        const res = await fetch(
          `/api/specialties?type=${typeParam}&traitCategory=${traitCategory}&traitId=${traitId}&isLegendary=${isLegendary}`,
        );
        if (res.ok) {
          const data = await res.json();
          setSpecialtyOptions(data);
        }
      } catch (err) {
        console.error("Failed to fetch specialties:", err);
      }
    };

    fetchSpecialties();
  }, [
    specialtyDrawer.open,
    specialtyDrawer.traitId,
    specialtyDrawer.traitType,
    specialtyDrawer.traitCategory,
    specialtyDrawer.currentValue,
  ]);

  const { t } = useI18n();

  const sheetWrapper: any = sheet?.sheet ?? sheet ?? {};
  const draft: any = sheetWrapper.sheet ?? sheetWrapper.draft ?? sheetWrapper;

  const maxTraitRating: number =
    sheetWrapper.sheet?.maxTraitRating ??
    sheetWrapper.draft?.maxTraitRating ??
    sheetWrapper.maxTraitRating ??
    draft.maxTraitRating ??
    5;

  const lockedTraits = draft?.lockedTraits ?? null;

  const maxLockedAttributeValue = (() => {
    if (!lockedTraits?.attributes) return 5;
    const attrValues = Object.values(lockedTraits.attributes).filter(
      (v): v is number => typeof v === "number",
    );
    const maxLocked = Math.max(...attrValues, 0);
    return maxLocked > 5 ? maxLocked : 5;
  })();

  const maxLockedAbilityValue = maxLockedAttributeValue;

  const isXpPhase = characterStatus === "XP" || characterStatus === "APPROVED";

  const animalTemplateDisciplines: string[] =
    draft?.animalAvailableDisciplines ??
    sheetWrapper?.animalAvailableDisciplines ??
    sheetWrapper?.sheet?.animalAvailableDisciplines ??
    [];

  const savedAnimalTemplateName = sheetWrapper?.animalTemplateName;
  const templateDisciplines = getTemplateAvailableDisciplines(
    savedAnimalTemplateName || "",
  );

  const savedAnimalDiscipline = sheetWrapper?.animalDiscipline;

  const animalAvailableDisciplines =
    animalTemplateDisciplines.length > 0
      ? animalTemplateDisciplines
      : templateDisciplines.length > 0
        ? templateDisciplines
        : savedAnimalDiscipline
          ? [savedAnimalDiscipline]
          : [];

  const availableDisciplinesLower = (animalAvailableDisciplines || []).map(
    (d: string) => d.toLowerCase(),
  );

  const isDiscAvailable = (discKey: string): boolean => {
    if (availableDisciplinesLower.length === 0) return false;
    const keyLower = discKey.toLowerCase();
    return availableDisciplinesLower.includes(keyLower);
  };

  const disciplineData = draft?.disciplines ?? sheetWrapper?.disciplines ?? {};

  const getDisciplineKey = (key: string): string => {
    if (disciplineData[key] !== undefined) {
      return key;
    }
    const keyLower = key.toLowerCase();
    if (disciplineData[keyLower] !== undefined) {
      return keyLower;
    }
    for (const dataKey of Object.keys(disciplineData)) {
      if (dataKey.toLowerCase() === keyLower) {
        return dataKey;
      }
    }
    return key;
  };

  const animalGhoulDisciplineCount = Object.entries(disciplineData).filter(
    ([key, val]) => {
      const level = typeof val === "number" ? val : ((val as any)?.level ?? 0);
      return level > 0 && isDiscAvailable(key);
    },
  ).length;

  const canAddMoreDisciplines = animalGhoulDisciplineCount < 5;

  const getAttribute = (key: string): number => {
    const val = draft?.attributes?.[key];
    return typeof val === "number" ? Math.max(val, 1) : 1;
  };

  const getAbility = (key: string): number => {
    const val = draft?.abilities?.[key];
    return typeof val === "number" ? val : 0;
  };

  const getDiscipline = (key: string): number => {
    const actualKey = getDisciplineKey(key);
    const val = disciplineData[actualKey];
    return typeof val === "number" ? val : ((val as any)?.level ?? 0);
  };

  const getBackground = (key: string): number => {
    const val = draft?.backgrounds?.[key];
    return typeof val === "number" ? val : 0;
  };

  const getVirtue = (key: string): number => {
    const val = draft?.virtues?.[key];
    return typeof val === "number" ? val : 0;
  };

  const getWillpower = () => {
    const val = draft?.willpower ?? sheetWrapper?.willpower ?? 0;
    return typeof val === "number" ? val : 0;
  };

  const getRoad = () => {
    const road =
      draft?.road ?? sheetWrapper?.road ?? sheetWrapper?.sheet?.road ?? {};
    let val = 0;
    if (typeof road === "number") {
      val = road;
    } else if (typeof road === "object" && road !== null) {
      val = road.rating ?? 0;
    }
    return typeof val === "number" ? val : 0;
  };

  const availableXp = baseAvailableXp;

  const calculateXpCost = useMemo(() => {
    return (type: string, currentRating: number) => {
      return getXpCost(type as any, currentRating);
    };
  }, []);

  const openSpecialtyDrawer = (
    type: "attribute" | "ability",
    category: string,
    id: string,
    value: number,
  ) => {
    setSpecialtyDrawer({
      open: true,
      traitType: type,
      traitCategory: category,
      traitId: id,
      currentValue: value,
    });
  };

  const openPowerPicker = (discId: string, level: number) => {
    setPowerDrawerDiscipline({ id: discId, level });
    setPowerDrawerOpen(true);
  };

  const handleChange = (key: string, newValue: number) => {
    let prevValue = changes[key] ?? 0;
    if (changes[key] === undefined) {
      if (key.startsWith("attr_")) {
        const k = key.replace("attr_", "");
        prevValue =
          draft?.attributes?.physical?.[k] ??
          draft?.attributes?.social?.[k] ??
          draft?.attributes?.mental?.[k] ??
          0;
      } else if (key.startsWith("abl_")) {
        const k = key.replace("abl_", "");
        prevValue =
          draft?.abilities?.talents?.[k] ??
          draft?.abilities?.skills?.[k] ??
          draft?.abilities?.knowledges?.[k] ??
          0;
      } else if (key.startsWith("disc_")) {
        const k = key.replace("disc_", "");
        prevValue = getDiscipline(k);
      }
    }

    setChanges((prev) => ({ ...prev, [key]: newValue }));

    if (newValue === 4 && newValue > prevValue) {
      if (key.startsWith("attr_")) {
        const attrKey = key.replace("attr_", "");
        const attr = ATTRIBUTES.find((a) => a.key === attrKey);
        if (attr)
          openSpecialtyDrawer("attribute", attr.category, attrKey, newValue);
      } else if (key.startsWith("abl_")) {
        const ablKey = key.replace("abl_", "");
        const allAbl = [...TALENTS, ...SKILLS, ...KNOWLEDGES];
        const abl = allAbl.find((a) => a.key === ablKey);
        if (abl) openSpecialtyDrawer("ability", abl.category, ablKey, newValue);
      }
    }

    if (key.startsWith("disc_") && newValue > prevValue) {
      const discId = key.replace("disc_", "");
      openPowerPicker(discId, newValue);
    }
  };

  const closeSpecialtyDrawer = () => {
    setSpecialtyDrawer((prev) => ({ ...prev, open: false }));
  };

  const selectSpecialty = (name: string) => {
    if (!specialtyDrawer.traitId) return;
    setChangesSpecialties((prev) => ({
      ...prev,
      [specialtyDrawer.traitId!]: {
        name,
        description: prev[specialtyDrawer.traitId!]?.description || "",
      },
    }));
    closeSpecialtyDrawer();
  };

  const handlePowerSelect = (power: { level: number; name: string }) => {
    if (!powerDrawerDiscipline) return;
    const discId = powerDrawerDiscipline.id;
    setDisciplinePowers((prev) => {
      const current = prev[discId] || [];
      const filtered = current.filter((p) => p.level !== power.level);
      return {
        ...prev,
        [discId]: [...filtered, power],
      };
    });
    setPowerDrawerOpen(false);
    setPowerDrawerDiscipline(null);
  };

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

    return total;
  }, [changes, calculateXpCost]);

  const canAfford = totalCost <= baseAvailableXp;

  const handleSave = async () => {
    if (!canAfford) return;

    setSaving(true);
    setError(null);

    try {
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
          key: "road",
          from: currentRoad,
          to: newRoad,
        });
      }

      const specialtySpends: SpendChange[] = Object.entries(
        changes_specialties,
      ).map(([key, spec]: [string, any]) => ({
        type: "specialty",
        key,
        from: 0,
        to: 0,
        specialtyName: spec.name,
        specialtyDescription: spec.description,
      }));

      await onSave([...spends, ...specialtySpends]);
      setChanges({});
      setChangesSpecialties({});
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setChanges({});
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
              Animal Ghoul XP
            </h2>
            <div style={{ fontSize: 10, color: "#666", marginTop: 4 }}>
              {baseAvailableXp} XP available • Cost: {totalCost} XP
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
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            padding: "8px 20px",
            borderBottom: "1px solid #333",
            display: "flex",
            gap: 8,
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
            onClick={() => setActiveTab("virtues")}
            style={{
              flex: 1,
              padding: "8px 4px",
              background: activeTab === "virtues" ? "#2a4a2a" : "#1a1a1a",
              color: activeTab === "virtues" ? "#90ee90" : "#888",
              border: "1px solid #333",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            Vontade/Road
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: 20,
          }}
        >
          {error && (
            <div
              style={{
                padding: "10px 15px",
                backgroundColor: "#422",
                color: "#f88",
                borderRadius: 4,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

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
                  maxValue={maxLockedAttributeValue}
                  changes={changes}
                  onChange={handleChange}
                  changePrefix="attr"
                  baseAvailableXp={baseAvailableXp}
                  totalCost={totalCost}
                  availableXp={availableXp}
                />
                <CategorySection
                  title="Talents"
                  traits={TALENTS}
                  getCurrent={(key) => getAbility(key)}
                  type="ability"
                  maxValue={maxLockedAbilityValue}
                  changes={changes}
                  onChange={handleChange}
                  changePrefix="abl"
                  baseAvailableXp={baseAvailableXp}
                  totalCost={totalCost}
                  availableXp={availableXp}
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
                  maxValue={maxLockedAttributeValue}
                  changes={changes}
                  onChange={handleChange}
                  changePrefix="attr"
                  baseAvailableXp={baseAvailableXp}
                  totalCost={totalCost}
                  availableXp={availableXp}
                />
                <CategorySection
                  title="Skills"
                  traits={SKILLS}
                  getCurrent={(key) => getAbility(key)}
                  type="ability"
                  maxValue={maxLockedAbilityValue}
                  changes={changes}
                  onChange={handleChange}
                  changePrefix="abl"
                  baseAvailableXp={baseAvailableXp}
                  totalCost={totalCost}
                  availableXp={availableXp}
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
                  maxValue={maxLockedAttributeValue}
                  changes={changes}
                  onChange={handleChange}
                  changePrefix="attr"
                  baseAvailableXp={baseAvailableXp}
                  totalCost={totalCost}
                  availableXp={availableXp}
                />
                <CategorySection
                  title="Knowledges"
                  traits={KNOWLEDGES}
                  getCurrent={(key) => getAbility(key)}
                  type="ability"
                  maxValue={maxLockedAbilityValue}
                  changes={changes}
                  onChange={handleChange}
                  changePrefix="abl"
                  baseAvailableXp={baseAvailableXp}
                  totalCost={totalCost}
                  availableXp={availableXp}
                />
              </div>
            </div>
          )}

          {activeTab === "disciplines" && (
            <div style={{ padding: "0 8px" }}>
              <div
                style={{ fontSize: 10, color: "#666", padding: "0 8px 8px" }}
              >
                {animalGhoulDisciplineCount}/5 disciplines selected • Only
                template disciplines available
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "12px",
                }}
              >
                <div>
                  {DISCIPLINES.slice(0, 7).map((disc) => {
                    const current = getDiscipline(disc.key);
                    const changeKey = `disc_${disc.key}`;
                    const newValue =
                      changes[changeKey] !== undefined
                        ? changes[changeKey]
                        : current;
                    return (
                      <DisciplineRow
                        key={disc.key}
                        label={disc.label}
                        disciplineKey={disc.key}
                        currentLevel={current}
                        newLevel={newValue}
                        maxLevel={1}
                        onIncrease={() => handleChange(changeKey, newValue + 1)}
                        onDecrease={() =>
                          handleChange(changeKey, Math.max(0, newValue - 1))
                        }
                        availableXp={availableXp}
                        totalCost={totalCost}
                        isDisciplineAvailable={isDiscAvailable(disc.key)}
                        canAddMoreDisciplines={canAddMoreDisciplines}
                      />
                    );
                  })}
                </div>
                <div>
                  {DISCIPLINES.slice(7, 14).map((disc) => {
                    const current = getDiscipline(disc.key);
                    const changeKey = `disc_${disc.key}`;
                    const newValue =
                      changes[changeKey] !== undefined
                        ? changes[changeKey]
                        : current;
                    return (
                      <DisciplineRow
                        key={disc.key}
                        label={disc.label}
                        disciplineKey={disc.key}
                        currentLevel={current}
                        newLevel={newValue}
                        maxLevel={1}
                        onIncrease={() => handleChange(changeKey, newValue + 1)}
                        onDecrease={() =>
                          handleChange(changeKey, Math.max(0, newValue - 1))
                        }
                        availableXp={availableXp}
                        totalCost={totalCost}
                        isDisciplineAvailable={isDiscAvailable(disc.key)}
                        canAddMoreDisciplines={canAddMoreDisciplines}
                      />
                    );
                  })}
                </div>
                <div>
                  {DISCIPLINES.slice(14).map((disc) => {
                    const current = getDiscipline(disc.key);
                    const changeKey = `disc_${disc.key}`;
                    const newValue =
                      changes[changeKey] !== undefined
                        ? changes[changeKey]
                        : current;
                    return (
                      <DisciplineRow
                        key={disc.key}
                        label={disc.label}
                        disciplineKey={disc.key}
                        currentLevel={current}
                        newLevel={newValue}
                        maxLevel={1}
                        onIncrease={() => handleChange(changeKey, newValue + 1)}
                        onDecrease={() =>
                          handleChange(changeKey, Math.max(0, newValue - 1))
                        }
                        availableXp={availableXp}
                        totalCost={totalCost}
                        isDisciplineAvailable={isDiscAvailable(disc.key)}
                        canAddMoreDisciplines={canAddMoreDisciplines}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === "virtues" && (
            <div style={{ padding: "0 8px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "12px",
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
                    Virtues
                  </div>
                  {VIRTUES.map((virt) => {
                    const current = getVirtue(virt.key);
                    const changeKey = `virt_${virt.key}`;
                    const newValue =
                      changes[changeKey] !== undefined
                        ? changes[changeKey]
                        : current;
                    const cost =
                      newValue > current ? getXpCost("virtue", current) : 0;
                    return (
                      <TraitRow
                        key={virt.key}
                        label={virt.label}
                        current={current}
                        newValue={newValue}
                        maxValue={5}
                        cost={cost}
                        onIncrease={() => handleChange(changeKey, newValue + 1)}
                        onDecrease={() =>
                          handleChange(changeKey, Math.max(0, newValue - 1))
                        }
                        type="virtue"
                        availableXp={availableXp}
                        totalCost={totalCost}
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
                    Willpower
                  </div>
                  <TraitRow
                    label="Willpower"
                    current={getWillpower()}
                    newValue={changes["willpower"] ?? getWillpower()}
                    maxValue={10}
                    cost={getXpCost("willpower", getWillpower())}
                    onIncrease={() =>
                      handleChange("willpower", getWillpower() + 1)
                    }
                    onDecrease={() =>
                      handleChange("willpower", Math.max(0, getWillpower() - 1))
                    }
                    type="willpower"
                    availableXp={availableXp}
                    totalCost={totalCost}
                    baseAvailableXp={baseAvailableXp}
                  />
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
                    Road/Humanity
                  </div>
                  <TraitRow
                    label="Road"
                    current={getRoad()}
                    newValue={changes["road"] ?? getRoad()}
                    maxValue={10}
                    cost={getXpCost("road", getRoad())}
                    onIncrease={() => handleChange("road", getRoad() + 1)}
                    onDecrease={() =>
                      handleChange("road", Math.max(0, getRoad() - 1))
                    }
                    type="road"
                    availableXp={availableXp}
                    totalCost={totalCost}
                    baseAvailableXp={baseAvailableXp}
                  />
                </div>
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
                  onChange={handleChange}
                  changePrefix="bg"
                  baseAvailableXp={baseAvailableXp}
                  totalCost={totalCost}
                  availableXp={availableXp}
                />
                <CategorySection
                  title="Column 2"
                  traits={BACKGROUNDS.slice(8, 16)}
                  getCurrent={(key) => getBackground(key)}
                  type="background"
                  maxValue={5}
                  changes={changes}
                  onChange={handleChange}
                  changePrefix="bg"
                  baseAvailableXp={baseAvailableXp}
                  totalCost={totalCost}
                  availableXp={availableXp}
                />
                <CategorySection
                  title="Column 3"
                  traits={BACKGROUNDS.slice(16)}
                  getCurrent={(key) => getBackground(key)}
                  type="background"
                  maxValue={5}
                  changes={changes}
                  onChange={handleChange}
                  changePrefix="bg"
                  baseAvailableXp={baseAvailableXp}
                  totalCost={totalCost}
                  availableXp={availableXp}
                />
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid #333",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            onClick={onCancelPending}
            disabled={!onCancelPending || saving}
            style={{
              padding: "10px 20px",
              backgroundColor: "#422",
              color: "#f88",
              border: "none",
              borderRadius: 4,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            Cancel Pending
          </button>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={onClose}
              disabled={saving}
              style={{
                padding: "10px 20px",
                backgroundColor: "#333",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1,
              }}
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={!canAfford || saving}
              style={{
                padding: "10px 20px",
                backgroundColor: canAfford && !saving ? "#1a5c1a" : "#333",
                color: canAfford && !saving ? "#8f8" : "#555",
                border: "none",
                borderRadius: 4,
                cursor: canAfford && !saving ? "pointer" : "not-allowed",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

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
                <p style={{ color: "var(--text-medium)" }}>
                  Rating: {specialtyDrawer.currentValue}
                  {isLegendaryRating(specialtyDrawer.currentValue) &&
                    " (Legendary)"}
                </p>
                <p style={{ color: "var(--text-medium)", marginBottom: 12 }}>
                  Choose a specialty for{" "}
                  {titleCaseAndClean(specialtyDrawer.traitId || "")} (level 4+)
                </p>

                {(() => {
                  const currentSpecialty =
                    changes_specialties[specialtyDrawer.traitId || ""];
                  const selectedId = currentSpecialty?.name || null;

                  const options = specialtyOptions;

                  return (
                    <>
                      <div style={{ marginBottom: 16 }}>
                        <AutocompleteInput
                          label="Specialty Search"
                          valueId={selectedId}
                          onChangeId={(id) => {
                            if (!id) return;
                            // Set but DON'T close drawer immediately to allow description edit
                            setChangesSpecialties((prev) => ({
                              ...prev,
                              [specialtyDrawer.traitId!]: {
                                name: id,
                                description:
                                  prev[specialtyDrawer.traitId!]?.description ||
                                  "",
                              },
                            }));
                          }}
                          options={options.map((s: any) => ({
                            id: s.name,
                            name: s.name,
                          }))}
                          placeholder="Search or type a specialty..."
                          query={specialtyQuery}
                          onQueryChange={setSpecialtyQuery}
                        />
                      </div>

                      <div style={{ marginTop: 16 }}>
                        <label
                          style={{
                            color: "var(--text-medium)",
                            display: "block",
                            marginBottom: 4,
                          }}
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
                            setChangesSpecialties((prev) => ({
                              ...prev,
                              [traitId]: {
                                name: currentSpecialty?.name ?? "",
                                description: e.target.value,
                              },
                            }));
                          }}
                          placeholder="Add a description for this specialty..."
                        />
                      </div>

                      <div style={{ marginTop: 24 }}>
                        <button
                          type="button"
                          className="btn"
                          style={{ width: "100%" }}
                          onClick={closeSpecialtyDrawer}
                        >
                          Confirm Specialty
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Power Selection Drawer */}
        {powerDrawerDiscipline && (
          <PowerSelectionDrawer
            isOpen={powerDrawerOpen}
            onClose={() => {
              setPowerDrawerOpen(false);
              setPowerDrawerDiscipline(null);
            }}
            disciplineId={powerDrawerDiscipline.id}
            level={powerDrawerDiscipline.level}
            currentPowers={disciplinePowers[powerDrawerDiscipline.id] || []}
            onSelectPower={handlePowerSelect}
          />
        )}
      </div>
    </>
  );
}

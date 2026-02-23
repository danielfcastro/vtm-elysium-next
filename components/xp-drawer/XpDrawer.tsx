"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { XpPointCostStrategy } from "@/core/strategies/XpPointCostStrategy";
import { TraitType } from "@/core/enums/TraitType";

const xpCostStrategy = new XpPointCostStrategy();

type SpendType =
  | "attribute"
  | "ability"
  | "discipline"
  | "background"
  | "virtue"
  | "willpower"
  | "road";

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
};

const xpCostFor = (type: SpendType, currentRating: number): number => {
  return xpCostStrategy.getCost(TRAIT_TYPE_MAP[type], currentRating);
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
  { key: "dominate", label: "Dominate" },
  { key: "fortitude", label: "Fortitude" },
  { key: "obfuscate", label: "Obfuscate" },
  { key: "obtenebration", label: "Obtenebration" },
  { key: "potence", label: "Potence" },
  { key: "presence", label: "Presence" },
  { key: "protean", label: "Protean" },
  { key: "quietus", label: "Quietus" },
  { key: "serpentis", label: "Serpentis" },
  { key: "thaumaturgy", label: "Thaumaturgy" },
  { key: "vicissitude", label: "Vicissitude" },
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
}) {
  const isIncreased = newValue > current;
  const effectiveMax = maxValue ?? 5;
  const canIncrease = newValue < effectiveMax;
  const isLocked = maxValue && current >= maxValue;
  const canEverIncrease = !isLocked && current < effectiveMax;
  const nextCost = isIncreased
    ? xpCostFor(type, newValue)
    : xpCostFor(type, current);
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
        const cost = newValue > current ? xpCostFor(type, current) : 0;
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
}: XpDrawerProps) {
  const [changes, setChanges] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableXp =
    baseAvailableXp -
    pendingSpends.reduce((sum, p) => sum + Number(p.xpCost), 0);

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
    return typeof val === "number" ? val : 0;
  };
  const getBackground = (key: string): number => {
    const val = draft?.backgrounds?.[key];
    return typeof val === "number" ? val : 0;
  };
  const getVirtue = (key: string): number => {
    const val = draft?.virtues?.[key];
    return typeof val === "number" ? val : 0;
  };
  const getWillpower = () => getNestedValue(draft, ["willpower"]) || 0;
  const getRoad = () => getNestedValue(draft, ["roadRating"]) || 0;

  const totalCost = useMemo(() => {
    let total = 0;

    for (const attr of ATTRIBUTES) {
      const current = getAttribute(attr.key);
      const newValue = changes[`attr_${attr.key}`] ?? current;
      if (newValue > current) {
        total += xpCostFor("attribute", current);
      }
    }

    const allAbilities = [...TALENTS, ...SKILLS, ...KNOWLEDGES];
    for (const abl of allAbilities) {
      const current = getAbility(abl.key);
      const newValue = changes[`abl_${abl.key}`] ?? current;
      if (newValue > current) {
        total += xpCostFor("ability", current);
      }
    }

    for (const disc of DISCIPLINES) {
      const current = getDiscipline(disc.key);
      const newValue = changes[`disc_${disc.key}`] ?? current;
      if (newValue > current) {
        total += xpCostFor("discipline", current);
      }
    }

    for (const bg of BACKGROUNDS) {
      const current = getBackground(bg.key);
      const newValue = changes[`bg_${bg.key}`] ?? current;
      if (newValue > current) {
        total += xpCostFor("background", current);
      }
    }

    for (const virt of VIRTUES) {
      const current = getVirtue(virt.key);
      const newValue = changes[`virt_${virt.key}`] ?? current;
      if (newValue > current) {
        total += xpCostFor("virtue", current);
      }
    }

    const currentWp = getWillpower();
    const newWp = changes["willpower"] ?? currentWp;
    if (newWp > currentWp) {
      total += xpCostFor("willpower", currentWp);
    }

    const currentRoad = getRoad();
    const newRoad = changes["road"] ?? currentRoad;
    if (newRoad > currentRoad) {
      total += xpCostFor("road", currentRoad);
    }

    return total;
  }, [changes]);

  const canAfford = totalCost <= baseAvailableXp;

  const pendingChangesSummary = useMemo(() => {
    const items: { label: string; from: number; to: number; cost: number }[] =
      [];

    for (const attr of ATTRIBUTES) {
      const current = getAttribute(attr.key);
      const newValue = changes[`attr_${attr.key}`] ?? current;
      if (newValue > current) {
        items.push({
          label: attr.label,
          from: current,
          to: newValue,
          cost: xpCostFor("attribute", current),
        });
      }
    }

    const allAbilities = [...TALENTS, ...SKILLS, ...KNOWLEDGES];
    for (const abl of allAbilities) {
      const current = getAbility(abl.key);
      const newValue = changes[`abl_${abl.key}`] ?? current;
      if (newValue > current) {
        items.push({
          label: abl.label,
          from: current,
          to: newValue,
          cost: xpCostFor("ability", current),
        });
      }
    }

    for (const disc of DISCIPLINES) {
      const current = getDiscipline(disc.key);
      const newValue = changes[`disc_${disc.key}`] ?? current;
      if (newValue > current) {
        items.push({
          label: disc.label,
          from: current,
          to: newValue,
          cost: xpCostFor("discipline", current),
        });
      }
    }

    for (const bg of BACKGROUNDS) {
      const current = getBackground(bg.key);
      const newValue = changes[`bg_${bg.key}`] ?? current;
      if (newValue > current) {
        items.push({
          label: bg.label,
          from: current,
          to: newValue,
          cost: xpCostFor("background", current),
        });
      }
    }

    for (const virt of VIRTUES) {
      const current = getVirtue(virt.key);
      const newValue = changes[`virt_${virt.key}`] ?? current;
      if (newValue > current) {
        items.push({
          label: virt.label,
          from: current,
          to: newValue,
          cost: xpCostFor("virtue", current),
        });
      }
    }

    const currentWp = getWillpower();
    const newWp = changes["willpower"] ?? currentWp;
    if (newWp > currentWp) {
      items.push({
        label: "Willpower",
        from: currentWp,
        to: newWp,
        cost: xpCostFor("willpower", currentWp),
      });
    }

    const currentRoad = getRoad();
    const newRoad = changes["road"] ?? currentRoad;
    if (newRoad > currentRoad) {
      items.push({
        label: "Road Rating",
        from: currentRoad,
        to: newRoad,
        cost: xpCostFor("road", currentRoad),
      });
    }

    return items;
  }, [changes, draft]);

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
              />
              <CategorySection
                title={t("categories.disciplines")}
                traits={DISCIPLINES}
                getCurrent={(key) => getDiscipline(key)}
                type="discipline"
                maxValue={maxTraitRating}
                changes={changes}
                onChange={(key, val) => handleChange("disc", key, val)}
                changePrefix="disc"
                availableXp={availableXp}
                totalCost={totalCost}
              />
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#666",
                    padding: "8px 0 4px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {t("categories.willpower")}
                </div>
                <TraitRow
                  label={t("categories.willpower")}
                  current={getWillpower()}
                  newValue={changes["_willpower"] ?? getWillpower()}
                  maxValue={10}
                  cost={1}
                  onIncrease={() =>
                    handleChange(
                      "",
                      "willpower",
                      (changes["_willpower"] ?? getWillpower()) + 1,
                    )
                  }
                  onDecrease={() =>
                    handleChange(
                      "",
                      "willpower",
                      Math.max(
                        0,
                        (changes["_willpower"] ?? getWillpower()) - 1,
                      ),
                    )
                  }
                  type="willpower"
                  availableXp={availableXp}
                  totalCost={totalCost}
                />
              </div>
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
              />
              <CategorySection
                title={t("categories.backgrounds")}
                traits={BACKGROUNDS}
                getCurrent={(key) => getBackground(key)}
                type="background"
                maxValue={maxTraitRating}
                changes={changes}
                onChange={(key, val) => handleChange("bg", key, val)}
                changePrefix="bg"
                availableXp={availableXp}
                totalCost={totalCost}
              />
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#666",
                    padding: "8px 0 4px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {t("categories.roadRating")}
                </div>
                <TraitRow
                  label={t("categories.roadRating")}
                  current={getRoad()}
                  newValue={changes["_road"] ?? getRoad()}
                  maxValue={10}
                  cost={1}
                  onIncrease={() =>
                    handleChange(
                      "",
                      "road",
                      (changes["_road"] ?? getRoad()) + 1,
                    )
                  }
                  onDecrease={() =>
                    handleChange(
                      "",
                      "road",
                      Math.max(0, (changes["_road"] ?? getRoad()) - 1),
                    )
                  }
                  type="road"
                  availableXp={availableXp}
                  totalCost={totalCost}
                />
              </div>
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
              />
              <CategorySection
                title={t("categories.virtues")}
                traits={VIRTUES}
                getCurrent={(key) => getVirtue(key)}
                type="virtue"
                maxValue={maxTraitRating}
                changes={changes}
                onChange={(key, val) => handleChange("virt", key, val)}
                changePrefix="virt"
                availableXp={availableXp}
                totalCost={totalCost}
              />
            </div>
          </div>
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
    </>
  );
}

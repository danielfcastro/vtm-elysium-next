"use client";

import { useEffect, useMemo, useState } from "react";
import type { CharacterSheetModel } from "@/types/sheet";

export type CharacterSheetProps = {
  mode: "readonly" | "edit";
  sheet: unknown | null;

  // opcional, só para telas editáveis
  onSubmit?: (next: any) => Promise<void> | void;
};

type AnyObj = Record<string, any>;
function isObj(v: unknown): v is AnyObj {
  return typeof v === "object" && v !== null;
}

/**
 * Extrai o sheet model real (o objeto que contém attributes/abilities/etc)
 * Suporta:
 * - model puro
 * - bundle: { sheet: model, ... }
 * - row db: { sheet: { sheet: model, ... }, ... }
 * - { character: ... } variantes
 */
function extractSheetModel(input: unknown | null): CharacterSheetModel | null {
  if (!input) return null;

  const isModel = (x: unknown) =>
    isObj(x) &&
    ("attributes" in x ||
      "abilities" in x ||
      "backgrounds" in x ||
      "disciplines" in x ||
      "virtues" in x ||
      "maxTraitRating" in x);

  if (isModel(input)) return input as CharacterSheetModel;

  if (isObj(input) && isModel(input.sheet))
    return input.sheet as CharacterSheetModel;

  if (isObj(input) && isObj(input.sheet) && isModel(input.sheet.sheet)) {
    return input.sheet.sheet as CharacterSheetModel;
  }

  if (isObj(input) && isObj(input.character)) {
    const ch = input.character;
    if (isModel(ch)) return ch as CharacterSheetModel;
    if (isModel(ch.sheet)) return ch.sheet as CharacterSheetModel;
    if (isObj(ch.sheet) && isModel(ch.sheet.sheet))
      return ch.sheet.sheet as CharacterSheetModel;
  }

  return null;
}

/* === Dots selector (usa seu CSS existente .dot/.dotFilled etc) === */
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
      {Array.from({ length: safeMax }).map((_, idx) => {
        const dotValue = idx + 1;
        const filled = dotValue <= current;

        return (
          <span
            key={dotValue}
            className={`dot${filled ? " dotFilled" : ""} dotInteractive`}
            onClick={() => {
              if (disabled) return;
              if (dotValue > current) onChange(dotValue);
              else if (dotValue === current) onChange(current - 1);
            }}
          />
        );
      })}
    </span>
  );
}

const ATTRIBUTE_ORDER = [
  ["Physical", ["strength", "dexterity", "stamina"]],
  ["Social", ["charisma", "manipulation", "appearance"]],
  ["Mental", ["perception", "intelligence", "wits"]],
] as const;

const VIRTUE_ORDER = [
  ["conscience", "Conscience"],
  ["self_control", "Self-Control"],
  ["courage", "Courage"],
] as const;

function prettyKey(k: string) {
  return k.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function CharacterSheet({ mode, sheet }: CharacterSheetProps) {
  // IMPORTANTE: esta assinatura com props é o que elimina o erro IntrinsicAttributes.
  const [raw, setRaw] = useState<unknown | null>(sheet);

  useEffect(() => {
    setRaw(sheet);
  }, [sheet]);

  const model = useMemo(() => extractSheetModel(raw), [raw]);
  const readOnly = mode === "readonly";

  if (!model) {
    return (
      <div className="sheetActive p-4">
        <div className="muted">Loading sheet…</div>
      </div>
    );
  }

  const maxTraitRating = (model as any)?.maxTraitRating ?? 5;

  const name = (model as any)?.name ?? "(Unnamed)";
  const clanId = (model as any)?.clanId ?? "-";
  const generation = (model as any)?.generation ?? "-";

  const attributes = ((model as any)?.attributes ?? {}) as Record<
    string,
    number
  >;
  const abilities = ((model as any)?.abilities ?? {}) as Record<string, number>;
  const backgrounds = ((model as any)?.backgrounds ?? {}) as Record<
    string,
    number
  >;
  const disciplines = ((model as any)?.disciplines ?? {}) as Record<
    string,
    number
  >;
  const virtues = ((model as any)?.virtues ?? {}) as Record<string, number>;

  const willpower = Number((model as any)?.willpower ?? 0) || 0;
  const roadRating =
    Number((model as any)?.roadRating ?? (model as any)?.road ?? 0) || 0;

  // Nesta fase, readonly não edita; edit a gente liga depois com onSubmit e setters.
  const disabled = readOnly;

  return (
    <div className="sheetActive p-4">
      <div className="header" style={{ textAlign: "left", marginBottom: 14 }}>
        <div className="h2">Character Sheet</div>
        <div className="muted" style={{ marginTop: 6 }}>
          Name: <strong>{name}</strong> &nbsp;|&nbsp; Clan:{" "}
          <strong>{clanId}</strong> &nbsp;|&nbsp; Generation:{" "}
          <strong>{generation}</strong>
        </div>
      </div>

      <div className="grid3">
        {/* COL 1 */}
        <section>
          <div className="h2">Attributes</div>
          {ATTRIBUTE_ORDER.map(([cat, keys]) => (
            <div key={cat} style={{ marginBottom: 18 }}>
              <div className="h3">{cat}</div>
              {keys.map((k) => (
                <div key={k} className="itemRow">
                  <span>{prettyKey(k)}</span>
                  <DotsSelector
                    value={Number(attributes[k] ?? 0)}
                    max={maxTraitRating}
                    disabled={disabled}
                    onChange={() => {}}
                  />
                </div>
              ))}
            </div>
          ))}
        </section>

        {/* COL 2 */}
        <section>
          <div className="h2">Abilities</div>
          {Object.keys(abilities).length ? (
            Object.entries(abilities)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, v]) => (
                <div key={k} className="itemRow">
                  <span>{prettyKey(k)}</span>
                  <DotsSelector
                    value={Number(v ?? 0)}
                    max={maxTraitRating}
                    disabled={disabled}
                    onChange={() => {}}
                  />
                </div>
              ))
          ) : (
            <div className="muted">No abilities in sheet.</div>
          )}
        </section>

        {/* COL 3 */}
        <section>
          <div className="h2">Advantages</div>

          <div style={{ marginBottom: 18 }}>
            <div className="h3">Backgrounds</div>
            {Object.keys(backgrounds).length ? (
              Object.entries(backgrounds)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, v]) => (
                  <div key={k} className="itemRow">
                    <span>{prettyKey(k)}</span>
                    <DotsSelector
                      value={Number(v ?? 0)}
                      max={maxTraitRating}
                      disabled={disabled}
                      onChange={() => {}}
                    />
                  </div>
                ))
            ) : (
              <div className="muted">No backgrounds in sheet.</div>
            )}
          </div>

          <div style={{ marginBottom: 18 }}>
            <div className="h3">Disciplines</div>
            {Object.keys(disciplines).length ? (
              Object.entries(disciplines)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, v]) => (
                  <div key={k} className="itemRow">
                    <span>{prettyKey(k)}</span>
                    <DotsSelector
                      value={Number(v ?? 0)}
                      max={maxTraitRating}
                      disabled={disabled}
                      onChange={() => {}}
                    />
                  </div>
                ))
            ) : (
              <div className="muted">No disciplines in sheet.</div>
            )}
          </div>

          <div className="h3">Virtues</div>
          {VIRTUE_ORDER.map(([k, label]) => (
            <div key={k} className="itemRow">
              <span>{label}</span>
              <DotsSelector
                value={Number(virtues[k] ?? 0)}
                max={maxTraitRating}
                disabled={disabled}
                onChange={() => {}}
              />
            </div>
          ))}

          <div className="hrTop">
            <div className="itemRow">
              <span>Willpower</span>
              <DotsSelector
                value={willpower}
                max={maxTraitRating}
                disabled={disabled}
                onChange={() => {}}
              />
            </div>
            <div className="itemRow">
              <span>Road</span>
              <DotsSelector
                value={roadRating}
                max={maxTraitRating}
                disabled={disabled}
                onChange={() => {}}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import type { CharacterSheetModel } from "@/types/sheet";

export type CharacterSheetMode = "edit" | "readonly";

export interface CharacterSheetProps {
  mode: CharacterSheetMode;
  sheet: CharacterSheetModel | null;
  onSubmit?: (sheet: CharacterSheetModel) => Promise<void> | void;
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

function renderDots(value: number, max: number) {
  const result = [];
  const v = Number.isFinite(value) ? value : 0;

  for (let i = 1; i <= max; i += 1) {
    const filled = i <= v;
    result.push(
      <span key={i} className={`dot ${filled ? "dotFilled" : "dotEmpty"}`} />,
    );
  }

  return <div className="dots">{result}</div>;
}

function renderSquares(value: number, max: number) {
  const result = [];
  const v = Number.isFinite(value) ? value : 0;

  for (let i = 1; i <= max; i += 1) {
    const filled = i <= v;
    result.push(
      <span
        key={i}
        className={`square ${filled ? "squareFilled" : "squareEmpty"}`}
      />,
    );
  }

  return <div className="dots">{result}</div>;
}

// Blood pool: linhas de 10
function renderBloodPool(maximumBloodPool: number | undefined) {
  const total = maximumBloodPool && maximumBloodPool > 0 ? maximumBloodPool : 0;
  if (!total) return null;

  const rows: JSX.Element[] = [];
  let remaining = total;
  let rowIndex = 0;

  while (remaining > 0) {
    const rowSize = Math.min(10, remaining);
    rows.push(
      <div key={rowIndex} className="dots">
        {renderSquares(rowSize, rowSize)}
      </div>,
    );
    remaining -= rowSize;
    rowIndex += 1;
  }

  return <div className="bloodPoolRows">{rows}</div>;
}

const CharacterSheet: React.FC<CharacterSheetProps> = ({
  mode,
  sheet,
  onSubmit,
}) => {
  const [local, setLocal] = useState<CharacterSheetModel | null>(sheet);

  useEffect(() => {
    setLocal(sheet);
  }, [sheet]);

  const readOnly = mode !== "edit";

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
  const draft: any = root.sheet ?? root; // fallback: se vier só o draft

  const maxTraitRating: number = draft.maxTraitRating ?? 5;

  const attributes: any = draft.attributes ?? {};
  const abilities: any = draft.abilities ?? {};
  const backgrounds: any = draft.backgrounds ?? {};
  const disciplines: any = draft.disciplines ?? {};
  const disciplineRows: any[] = root.disciplineRows ?? [];

  const virtues: any = draft.virtues ?? {};
  const roadRating: number = draft.roadRating ?? 0;
  const willpower: number = draft.willpower ?? 0;
  const maximumBloodPool: number | undefined = draft.maximumBloodPool;

  const name: string = draft.name ?? "(Unnamed)";
  const clanId: string = draft.clanId ?? "-";
  const generation: number | undefined = draft.generation;
  const playerName: string = draft.player ?? "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSubmit || !local) return;
    await onSubmit(local);
  };

  // Disciplines: se existir disciplineRows, usa a ordem dali; senão, usa as chaves do objeto
  const disciplineEntries: { id: string; label: string; dots: number }[] =
    disciplineRows.length > 0
      ? disciplineRows.map((row: any) => ({
          id: row.id,
          label: String(row.id),
          dots: Number(row.dots ?? disciplines?.[row.id] ?? 0),
        }))
      : Object.keys(disciplines).map((id) => ({
          id,
          label: id,
          dots: Number(disciplines[id] ?? 0),
        }));

  // Backgrounds: ordena alfabeticamente por id
  const backgroundEntries: { id: string; label: string; dots: number }[] =
    Object.keys(backgrounds)
      .sort()
      .map((id) => ({
        id,
        label: id,
        dots: Number(backgrounds[id] ?? 0),
      }));

  const virtuesList = [
    { id: "conscience", label: "Conscience", value: virtues.conscience ?? 0 },
    {
      id: "self_control",
      label: "Self-Control",
      value: virtues.self_control ?? 0,
    },
    { id: "courage", label: "Courage", value: virtues.courage ?? 0 },
  ];

  // Willpower temporário: por enquanto, usamos o mesmo valor do permanente
  // (quando você tiver um campo específico no sheet, é só trocar aqui).
  const willpowerTemporary: number = willpower;

  // Blood per turn: info extra do blood pool (se existir no sheet)
  const bloodPerTurn: number = Number(draft.bloodPointsPerTurn ?? 0);

  // Níveis de Health (ordem e penalties padrão da ficha V20)
  const healthLevels: { id: string; label: string; penalty: string }[] = [
    { id: "bruised", label: "Bruised", penalty: "" },
    { id: "hurt", label: "Hurt", penalty: "-1" },
    { id: "injured", label: "Injured", penalty: "-1" },
    { id: "wounded", label: "Wounded", penalty: "-2" },
    { id: "mauled", label: "Mauled", penalty: "-2" },
    { id: "crippled", label: "Crippled", penalty: "-5" },
    { id: "incapacitated", label: "Incapacitated", penalty: "" },
  ];

  return (
    <form className="sheetPage" onSubmit={handleSubmit}>
      {/* Header simples com meta */}
      <header className="sheetHeader">
        <div className="sheetTitle">Character Sheet</div>
        <div className="sheetMeta">
          <span>
            Name: <strong>{name}</strong>
          </span>
          {playerName && (
            <span>
              {" "}
              | Player: <strong>{playerName}</strong>
            </span>
          )}
          <span>
            {" "}
            | Clan: <strong>{clanId}</strong>
          </span>
          {generation && (
            <span>
              {" "}
              | Generation: <strong>{generation}</strong>
            </span>
          )}
        </div>
      </header>

      {/* ===== Attributes ===== */}
      <section className="sheetSection">
        <h2 className="sectionTitle">Attributes</h2>
        <div className="grid3 attributesGrid">
          {ATTRIBUTE_GROUPS.map((group) => (
            <div key={group.id}>
              <div className="sectionSubtitle">{group.label}</div>
              {group.traits.map((trait) => (
                <div key={trait.id} className="itemRow">
                  <div className="itemLabel">{trait.label}</div>
                  {renderDots(
                    Number(attributes[trait.id] ?? 0),
                    maxTraitRating,
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ===== Abilities ===== */}
      <section className="sheetSection">
        <h2 className="sectionTitle">Abilities</h2>
        <div className="grid3">
          {ABILITY_GROUPS.map((group) => (
            <div key={group.id}>
              <div className="sectionSubtitle">{group.label}</div>
              {group.traits.map((trait) => (
                <div key={trait.id} className="itemRow">
                  <div className="itemLabel">{trait.label}</div>
                  {renderDots(Number(abilities[trait.id] ?? 0), maxTraitRating)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ===== Advantages ===== */}
      <section className="sheetSection">
        <h2 className="sectionTitle">Advantages</h2>
        <div className="grid3">
          {/* Disciplines (coluna esquerda) */}
          <div>
            <div className="sectionSubtitle">Disciplines</div>
            {disciplineEntries.length === 0 ? (
              <div className="itemRow">
                <div className="itemLabel muted">No disciplines in sheet.</div>
              </div>
            ) : (
              disciplineEntries.map((disc) => (
                <div key={disc.id} className="itemRow">
                  <div className="itemLabel">{disc.label}</div>
                  {renderDots(disc.dots, maxTraitRating)}
                </div>
              ))
            )}
          </div>

          {/* Backgrounds (coluna do meio) */}
          <div>
            <div className="sectionSubtitle">Backgrounds</div>
            {backgroundEntries.length === 0 ? (
              <div className="itemRow">
                <div className="itemLabel muted">No backgrounds in sheet.</div>
              </div>
            ) : (
              backgroundEntries.map((bg) => (
                <div key={bg.id} className="itemRow">
                  <div className="itemLabel">{bg.label}</div>
                  {renderDots(bg.dots, maxTraitRating)}
                </div>
              ))
            )}
          </div>

          {/* Virtues (coluna direita) */}
          <div>
            <div className="sectionSubtitle">Virtues</div>
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
          {/* Coluna esquerda vazia (como na ficha original) */}
          <div />

          {/* Coluna central: Road, Willpower, Blood Pool */}
          <div>
            {/* Road / Humanity */}
            <div className="sectionSubtitle">Road / Humanity</div>
            {renderDots(roadRating, 10)}

            {/* Willpower permanente + temporário */}
            <div className="sectionSubtitle" style={{ marginTop: 16 }}>
              Willpower
            </div>
            {renderDots(willpower, 10)}
            <div className="willpowerTemporarySpacing">
              {renderSquares(willpowerTemporary, 10)}
            </div>

            {/* Blood Pool */}
            <div
              className="sectionSubtitle othersBloodPoolSpacing"
              // se quiser, pode tirar o style inline
              style={{ marginTop: 16 }}
            >
              Blood Pool
            </div>
            {renderBloodPool(maximumBloodPool)}
            {bloodPerTurn > 0 && (
              <p className="muted othersBloodPoolInfo">
                Per turn: {bloodPerTurn}
              </p>
            )}
          </div>

          {/* Coluna direita – Health levels */}
          <div>
            <div className="sectionSubtitle">Health</div>
            {healthLevels.map((hl) => (
              <div key={hl.id} className="itemRow">
                <div className="itemLabel">
                  {hl.label}
                  {hl.penalty && (
                    <span className="muted" style={{ marginLeft: 8 }}>
                      {hl.penalty}
                    </span>
                  )}
                </div>
                {/* Por enquanto, um checkbox desabilitado por nível.
                      Quando você tiver o estado de dano, ligamos isso ao sheet. */}
                <input type="checkbox" disabled />
              </div>
            ))}
          </div>
        </div>
      </section>

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

export default CharacterSheet;

"use client";

import React, { useEffect, useState } from "react";
import type { CharacterSheetModel } from "@/types/sheet";
import Squares from "@/components/Squares";
import clans from "@/core/data/raw/clans.json"; // ⬅️ ADICIONE ESTA LINHA

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
  // API returns: { sheet: { phase, sheet: {...draft}, isDarkAges, backgroundRows, disciplineRows }, status, ... }
  // Or just the sheet directly: { phase, sheet: {...draft}, ... }
  const sheetWrapper: any = root.sheet ?? root;
  const draft: any = sheetWrapper.sheet ?? sheetWrapper; // actual character data

  const maxTraitRating: number = draft.maxTraitRating ?? 5;

  const attributes: any = draft.attributes ?? {};
  const abilities: any = draft.abilities ?? {};
  const backgrounds: any = draft.backgrounds ?? {};
  const disciplines: any = draft.disciplines ?? {};
  const disciplineRows: any[] = sheetWrapper.disciplineRows ?? [];
  const specialties: any = draft.specialties ?? {};

  const virtues: any = draft.virtues ?? {};
  const roadRating: number = draft.roadRating ?? 0;
  const willpower: number = draft.willpower ?? 0;
  const maximumBloodPool: number | undefined = draft.maximumBloodPool;
  const bloodPerTurn: number | undefined = draft.bloodPointsPerTurn;

  const name: string = draft.name ?? "(Unnamed)";
  const clanId: string = draft.clanId ?? "-";
  const generation: number | undefined = draft.generation;
  const playerName: string = draft.player ?? "";
  const chronicle: string = draft.chronicle ?? "";
  const sire: string = draft.sire ?? "";
  const natureId: string = draft.natureId ?? "";
  const demeanorId: string = draft.demeanorId ?? "";
  const conceptId: string = draft.conceptId ?? "";

  const totalXp: number = draft.totalExperience ?? 0;
  const spentXp: number = draft.spentExperience ?? 0;
  const availableXp = Math.max(0, totalXp - spentXp);
  const weakness: string =
    // tenta achar no JSON de clãs por id (mesma lógica do /create)
    ((clans as any[]).find((clan) => clan.id === clanId) as any)?.weakness ??
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
  const willpowerTemporary: number = willpower;

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
      {/* Header simples com meta (título + linha fina) */}
      <header className="sheetHeader">
        <h1 className="sheetTitle">Character Sheet</h1>
      </header>

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
            <span className="personaValue">{formatIdLabel(demeanorId)}</span>
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
        </div>
      </section>

      {/* ===== Weakness ===== */}
      <section className="sheetSection">
        <h2 className="h2 sectionTitle">Weakness</h2>
        <p className="muted">{weakness}</p>
      </section>

      {/* ===== Attributes ===== */}
      <section className="sheetSection">
        <h2 className="h2 sectionTitle">Attributes</h2>
        <div className="grid3 attributesGrid">
          {ATTRIBUTE_GROUPS.map((group) => (
            <div key={group.id}>
              <h3 className="h3">{group.label}</h3>
              {group.traits.map((trait) => {
                const rawValue = Number(attributes[trait.id] ?? 0);
                const base = getAttributeBase(trait.id, clanId);
                const display = rawValue > 0 ? rawValue : base;
                const traitSpecialty = specialties[trait.id];

                return (
                  <div key={trait.id} className="itemRow">
                    <div className="itemLabel">
                      {trait.label}
                      {traitSpecialty && (
                        <span className="specialty-badge-display">
                          {" "}
                          (
                          {typeof traitSpecialty === "string"
                            ? traitSpecialty
                            : traitSpecialty.name}
                          )
                        </span>
                      )}
                    </div>
                    {renderDots(display, maxTraitRating)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      {/* ===== Abilities ===== */}
      <section className="sheetSection">
        <h2 className="h2 sectionTitle">Abilities</h2>
        <div className="grid3">
          {ABILITY_GROUPS.map((group) => (
            <div key={group.id}>
              <h3 className="h3">{group.label}</h3>
              {group.traits.map((trait) => {
                const traitSpecialty = specialties[trait.id];
                return (
                  <div key={trait.id} className="itemRow">
                    <div className="itemLabel">
                      {trait.label}
                      {traitSpecialty && (
                        <span className="specialty-badge-display">
                          {" "}
                          (
                          {typeof traitSpecialty === "string"
                            ? traitSpecialty
                            : traitSpecialty.name}
                          )
                        </span>
                      )}
                    </div>
                    {renderDots(
                      Number(abilities[trait.id] ?? 0),
                      maxTraitRating,
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
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
            <h3 className="h3">Backgrounds</h3>
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
          {/* Coluna esquerda vazia (como na ficha original) */}
          <div />

          {/* Coluna central: Road, Willpower, Blood Pool */}
          <div>
            {/* Road / Humanity */}
            <h3 className="h3">Road / Humanity</h3>
            {renderDots(roadRating, 10)}

            {/* Willpower permanente + temporário */}
            <h3 className="h3" style={{ marginTop: 16 }}>
              Willpower
            </h3>
            {renderDots(willpower, 10)}
            <div className="willpowerTemporarySpacing">
              {renderSquares(willpowerTemporary, 10)}
            </div>

            {/* Blood Pool */}
            <h3 className="h3 othersBloodPoolSpacing" style={{ marginTop: 16 }}>
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

"use client";

import React, { useMemo, useState } from "react";
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
 * Helpers de UI (Label + titleCase)
 * ====================================================================*/

function Label({
                 text,
                 className = "",
               }: {
  text: string;
  className?: string;
}) {
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

function getGenerationRuleWithFallback(gen: number): GenerationRule | undefined {
  // se não achar a geração, cai pra 13ª
  return findGenerationRule(gen) ?? findGenerationRule(13);
}

/**
 * Máscara / V20:
 * 0 dots -> 13ª
 * 1 dot  -> 12ª
 * 2 dots -> 11ª
 * 3 dots -> 10ª
 * 4 dots -> 9ª
 * 5 dots -> 8ª
 * 6 dots -> 7ª (se existir no JSON)
 * ...
 */
function calculateGenerationMasquerade(dots: number): number {
  if (!Number.isFinite(dots) || dots <= 0) {
    return 13; // geração padrão V20
  }

  const d = Math.floor(dots);
  const minGen = Math.min(...GENERATION_RULES.map((r) => r.generation)); // menor geração disponível no JSON

  const gen = 13 - d; // 0=>13, 1=>12, 2=>11, ...
  return Math.max(minGen, gen);
}

/**
 * Dark Ages:
 * 0 dots -> 12ª
 * 1 dot  -> 11ª
 * 2 dots -> 10ª
 * 3 dots -> 9ª
 * 4 dots -> 8ª
 * 5 dots -> 7ª
 * 6 dots -> 6ª (se existir no JSON)
 * ...
 */
function calculateGenerationDarkAges(dots: number): number {
  if (!Number.isFinite(dots) || dots <= 0) {
    return 12; // geração padrão Dark Ages
  }

  const d = Math.floor(dots);
  const minGen = Math.min(...GENERATION_RULES.map((r) => r.generation));

  const gen = 12 - d; // 0=>12, 1=>11, 2=>10, ...
  return Math.max(minGen, gen);
}

/**
 * Cálculo central de geração a partir das linhas de Background,
 * olhando especificamente o background "generation".
 */
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
                      }: {
  value: number;
  max: number;
  onChange: (next: number) => void;
}) {
  const safeMax = Math.max(1, max || 5);
  const current = Math.max(0, Math.min(safeMax, value || 0));

  return (
      <span className="dots dotsSelector">
      {Array.from({ length: safeMax }).map((_, index) => {
        const dotValue = index + 1;
        const filled = dotValue <= current;

        const handleClick = () => {
          if (dotValue > current) {
            // Sobe para esse valor (p.ex.: 3 -> 5)
            onChange(dotValue);
          } else if (dotValue === current) {
            // Clicar no maior dot marcado reduz 1 ponto (5 -> 4, 1 -> 0)
            onChange(current - 1);
          } else {
            // Clicar em dots marcados que não são o maior não faz nada
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
 * Página principal
 * ====================================================================*/

function CreateCharacterPage() {
  const [draft, setDraft] = useState<CharacterDraft>(() =>
      createEmptyCharacterDraft(),
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [isDarkAges, setIsDarkAges] = useState(false);

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

  function updateDraft(patch: Partial<CharacterDraft>) {
    setDraft((prev) => ({
      ...prev,
      ...patch,
    }));
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
    // TODO: salvar/enviar para API
  }

  /* ===========================
   * Disciplines
   * ========================= */

  function handleDisciplineIdChange(rowKey: string, id: string | null) {
    setDisciplineRows((prev) => {
      const next = prev.map((row) => {
        if (row.key !== rowKey) return row;

        // se já tinha id, não deixa editar de novo (mantém travado)
        if (row.id) return row;

        const normalized = id && id.trim().length > 0 ? id : null;

        return {
          ...row,
          id: normalized,
          locked: Boolean(normalized),
          dots: normalized ? Math.max(1, row.dots) : row.dots,
        };
      });

      updateDraft({ disciplines: rowsToRecord(next) });
      return next;
    });
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
    setDisciplineRows((prev) => {
      let next = prev.filter((row) => row.key !== rowKey);
      if (!next.length) {
        next = [{ key: "disc-0", id: null, dots: 0, locked: false }];
      }
      updateDraft({ disciplines: rowsToRecord(next) });
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

        if (row.id) return row; // já travou, ignora

        const normalized = id && id.trim().length > 0 ? id : null;

        return {
          ...row,
          id: normalized,
          locked: Boolean(normalized),
          dots: normalized ? Math.max(1, row.dots) : row.dots,
        };
      });

      applyBackgroundsToDraft(next);
      return next;
    });
  }

  function addBackgroundRow() {
    setBackgroundRows((prev) => {
      const next = [
        ...prev,
        {
          key: `bg-${Date.now()}-${prev.length}`,
          id: null,
          dots: 0,
          locked: false,
        },
      ];
      applyBackgroundsToDraft(next);
      return next;
    });
  }

  function removeBackgroundRow(rowKey: string) {
    setBackgroundRows((prev) => {
      let next = prev.filter((row) => row.key !== rowKey);
      if (!next.length) {
        next = [{ key: "bg-0", id: null, dots: 0, locked: false }];
      }
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
    // Recalcula já com o modo novo (sem depender do state antigo)
    applyBackgroundsToDraft(backgroundRows, nextMode);
  }

  /* ===========================
   * Preview Character
   * ========================= */

  const isNameValid = validateName(draft.name) === null;
  const characterForPreview = useMemo(() => draftToCharacter(draft), [draft]);

  const c: any = characterForPreview ?? {};
  const attrs = (c.attributes ?? {}) as Record<string, number>;
  const abilities = (c.abilities ?? {}) as Record<string, number>;
  const traitCap = Math.max(5, Number(c.maxTraitRating ?? 5));

  const effectiveGeneration =
      typeof c.generation === "number" && !Number.isNaN(c.generation)
          ? c.generation
          : draft.generation ?? (isDarkAges ? 12 : 13);

  const roadName = c.road?.name ?? c.roadName ?? "Humanity";
  const roadRating = Number(c.roadRating ?? c.humanity ?? 0);

  const willpowerPermanent = Number(c.willpower ?? 0);

  const healthLevels = [
    { label: "Bruised", penalty: "" },
    { label: "Hurt", penalty: "-1" },
    { label: "Injured", penalty: "-1" },
    { label: "Wounded", penalty: "-2" },
    { label: "Mauled", penalty: "-2" },
    { label: "Crippled", penalty: "-5" },
    { label: "Incapacitated", penalty: "" },
  ];
  const willpowerTemporary = Number(
      c.willpowerTemporary ?? c.willpowerTemp ?? willpowerPermanent,
  );

  const bloodPoolMax = Math.max(0, Number(c.maximumBloodPool ?? 0));
  const bloodPerTurn = Number(c.bloodPointsPerTurn ?? 0);
  const maxTraitRating = Number(c.maxTraitRating ?? 5);

  return (
      <div className="sheetPage">
        <div className="header">
          <h1 className="h1">ELYSIUM</h1>
          <p style={{ color: "var(--text-medium)", fontSize: "0.9rem" }}>
            V20 Character Generator
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="pageContainer">
            <div className="mainContent">
              <div className="sheetActive">
                {/* ===== Intro ===== */}
                <div className="sheetSection">
                  <h2 className="h2">Criar Ficha</h2>
                  <p className="muted">
                    Use esta página para criar uma ficha manualmente. Nas
                    próximas etapas, adicionaremos os campos de Persona,
                    Backgrounds, Disciplinas e demais seções.
                  </p>
                </div>

                {/* ===== Persona ===== */}
                <div className="sheetSection">
                  <h2 className="h2">Persona</h2>
                  {/* Linha 1: Name, Nature, Clan */}
                  <div className="personaGrid personaGridCreate">
                    <p>
                      <strong>Name:</strong>{" "}
                      <input
                          id="name"
                          type="text"
                          className="textInput"
                          value={draft.name}
                          onChange={handleNameChange}
                          onBlur={handleNameBlur}
                          placeholder="Nome do personagem"
                      />
                    </p>
                    <p>
                      <strong>Nature:</strong>{" "}
                      <AutocompleteInput
                          label=""
                          valueId={draft.natureId}
                          onChangeId={(id) => updateDraft({ natureId: id })}
                          options={natureOptions}
                          placeholder="Selecione uma Nature"
                      />
                    </p>
                    <p>
                      <strong>Clan:</strong>{" "}
                      <AutocompleteInput
                          label=""
                          valueId={draft.clanId}
                          onChangeId={(id) => updateDraft({ clanId: id })}
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
                    <p>
                      <strong>Demeanor:</strong>{" "}
                      <AutocompleteInput
                          label=""
                          valueId={draft.demeanorId}
                          onChangeId={(id) => updateDraft({ demeanorId: id })}
                          options={natureOptions}
                          placeholder="Selecione um Demeanor"
                      />
                    </p>
                    <p>
                      <strong>Generation:</strong>{" "}
                      <span>{effectiveGeneration}th</span>
                      <label
                          className="inlineCheckbox"
                          title="Victorian Age usa as mesmas regras de Dark Ages para Geração (12ª–7ª). Desmarcado: Máscara/V20 (13ª–8ª)."
                          style={{
                            marginLeft: 8,
                            fontWeight: "normal",
                            fontSize: "0.8rem",
                          }}
                      >
                        <input
                            type="checkbox"
                            checked={isDarkAges}
                            onChange={handleToggleDarkAges}
                        />{" "}
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
                    <p>
                      <strong>Concept:</strong>{" "}
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
                        <p className="personaRowFull fieldError">{nameError}</p>
                    )}
                  </div>
                </div>

                {/* ===== Attributes ===== */}
                <div className="sheetSection">
                  <h2 className="h2">Attributes</h2>
                  <div className="grid3">
                    {Object.keys(ATTRIBUTE_CATEGORIES).map((cat) => (
                        <div key={cat}>
                          <h3 className="h3">{cat}</h3>
                          {ATTRIBUTE_CATEGORIES[cat].map((id) => {
                            let v = Number(attrs[id] ?? 0);

                            const isAppearance = id === "appearance";
                            const isNosferatu = draft.clanId === "nosferatu";

                            if (!isAppearance || !isNosferatu) {
                              v = Math.max(v, 1);
                            }

                            return (
                                <div className="itemRow" key={id}>
                                  <Label text={titleCaseAndClean(id)} />
                                  <Dots
                                      count={v}
                                      maxScale={traitCap}
                                      useElderLogic={false}
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
                  <div className="grid3">
                    {Object.keys(ABILITY_CATEGORIES).map((cat) => (
                        <div key={cat}>
                          <h3 className="h3">{cat}</h3>
                          {ABILITY_CATEGORIES[cat].map((id) => {
                            const v = Number(abilities[id] ?? 0);
                            return (
                                <div className="itemRow" key={id}>
                                  <Label
                                      text={titleCaseAndClean(id)}
                                      className={v === 0 ? "muted" : ""}
                                  />
                                  <Dots
                                      count={v}
                                      maxScale={traitCap}
                                      useElderLogic={false}
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
                                  ? disciplineNameById[row.id] ?? row.id
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
                                onChange={(dots) => {
                                  setDisciplineRows((prev) => {
                                    const next = prev.map((r) =>
                                        r.key === row.key
                                            ? {
                                              ...r,
                                              dots,
                                              locked: r.locked || Boolean(r.id),
                                            }
                                            : r,
                                    );
                                    updateDraft({ disciplines: rowsToRecord(next) });
                                    return next;
                                  });
                                }}
                            />
                          </div>
                      ))}
                    </div>

                    {/* Backgrounds */}
                    <div>
                      <h3 className="h3">Backgrounds</h3>
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
                                  ? backgroundNameById[row.id] ?? row.id
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
                                onChange={(dots) => {
                                  setBackgroundRows((prev) => {
                                    const next = prev.map((r) =>
                                        r.key === row.key
                                            ? {
                                              ...r,
                                              dots,
                                              locked: r.locked || Boolean(r.id),
                                            }
                                            : r,
                                    );
                                    applyBackgroundsToDraft(next);
                                    return next;
                                  });
                                }}
                            />
                          </div>
                      ))}
                    </div>

                    {/* Virtues */}
                    <div>
                      <h3 className="h3">Virtues</h3>
                      {["conscience", "self_control", "courage"].map((id) => {
                        const v = Number(
                            (draft.virtues as Record<string, number> | undefined)?.[
                                id
                                ] ?? 0,
                        );
                        return (
                            <div className="itemRow" key={id}>
                              <Label text={titleCaseAndClean(id)} />
                              <DotsSelector
                                  value={v}
                                  max={5}
                                  onChange={(dots) =>
                                      updateDraft({
                                        virtues: {
                                          ...(draft.virtues ?? {}),
                                          [id]: dots,
                                        },
                                      })
                                  }
                              />
                            </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* ===== Others / Willpower / Blood Pool ===== */}
                <div className="sheetSection">
                  <div className="grid3">
                    <div>
                      <h3 className="h3">Others</h3>
                    </div>
                    <div className="roadGrid">
                      <div className="roadRow">
                        {/* Road */}
                        <div className="roadLabel">Road: {roadName}</div>
                        <div className="roadValue">
                          <Dots
                              count={roadRating}
                              maxScale={10}
                              useElderLogic={false}
                              isRoadWillpower={true}
                          />
                        </div>

                        {/* Willpower */}
                        <div className="roadLabel">Willpower</div>
                        <div className="roadValue roadValueStack">
                          <Dots
                              count={willpowerPermanent}
                              maxScale={10}
                              useElderLogic={false}
                              isRoadWillpower={true}
                          />
                          <Squares
                              count={willpowerTemporary}
                              maxScale={10}
                              perRow={10}
                          />
                        </div>

                        {/* Blood Pool */}
                        <div className="roadLabel">Blood Pool</div>
                        <div className="roadValue">
                          <Squares
                              count={bloodPoolMax}
                              maxScale={bloodPoolMax || 0}
                              perRow={10}
                          />
                        </div>
                      </div>
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
                            <span className="healthPenalty" style={{ minWidth: 24, textAlign: "right" }}>
                              {penalty}
                            </span>
                            <div className="healthBox" style={{ marginLeft: 8 }}>
                              <Squares count={1} maxScale={1} perRow={1} />
                            </div>
                          </div>
                        ))}
                      </div>

                      <h3 className="h3" style={{ marginTop: 16 }}>Weakness</h3>
                      <p className="muted">
                        {c.clan?.weakness ?? "—"}
                      </p>

                      <h3 className="h3" style={{ marginTop: 16 }}>Experience</h3>
                      <p className="muted">0 / 0</p>
                    </div>
                  </div>

                  {/* Metadados de Geração */}
                  <div className="personaGrid hrTop">
                    <p>
                      <strong>Max Blood Pool:</strong>{" "}
                      {c.maximumBloodPool ?? "—"}
                    </p>
                    <p>
                      <strong>Blood Per Turn:</strong> {bloodPerTurn || "—"}
                    </p>
                    <p>
                      <strong>Max Trait Rating:</strong> {maxTraitRating}
                    </p>
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

                <button type="button" className="btn" onClick={addDisciplineRow}>
                  + Discipline
                </button>

                <button
                    type="button"
                    className="btn"
                    onClick={addBackgroundRow}
                    style={{ marginTop: 8 }}
                >
                  + Background
                </button>

                <hr style={{ margin: "16px 0", borderColor: "#333" }} />

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

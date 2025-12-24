"use client";

import React, { useState } from "react";
import { Dots } from "@/components/Dots";
import {
  CharacterDraft,
  createEmptyCharacterDraft,
  draftToCharacter,
} from "@/core/models/CharacterDraft";
import { AutocompleteInput } from "@/components/AutocompleteInput";
import conceptsData from "../../src/core/data/raw/concepts.json";
import clansData from "../../src/core/data/raw/clans.json";
import naturesData from "../../src/core/data/raw/natures.json";
import backgroundsData from "../../src/core/data/raw/backgrounds.json";
import disciplinesData from "../../src/core/data/raw/disciplines.json";

interface NamedItem {
  id: string;
  name: string;
}

const ATTRIBUTE_CATEGORIES: Record<string, string[]> = {
  Physical: ["strength", "dexterity", "stamina"],
  Social: ["charisma", "manipulation", "appearance"],
  Mental: ["perception", "intelligence", "wits"],
};

const ABILITY_CATEGORIES: Record<string, string[]> = {
  Talents: [
    "alertness",
    "athletics",
    "awareness",
    "brawl",
    "empathy",
    "expression",
    "intimidation",
    "leadership",
    "streetwise",
    "subterfuge",
  ],
  Skills: [
    "animal_ken",
    "crafts",
    "drive",
    "etiquette",
    "firearms",
    "larceny",
    "melee",
    "performance",
    "stealth",
    "survival",
  ],
  Knowledges: [
    "academics",
    "computer",
    "finance",
    "investigation",
    "law",
    "medicine",
    "occult",
    "politics",
    "science",
    "technology",
  ],
};

function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return "Name é obrigatório.";
  }
  if (trimmed.length < 2) {
    return "Name deve ter pelo menos 2 caracteres.";
  }
  return null;
}

function titleCaseAndClean(str?: string) {
  if (!str) return "";
  return str
    .replace(/_/g, " ")
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface TraitRow {
  key: string;
  id: string | null;
  dots: number;
  locked?: boolean;
}

function createRowsFromRecord(
  record: Record<string, number> | undefined,
): TraitRow[] {
  const entries = Object.entries(record ?? {});
  if (!entries.length) {
    return [{ key: "row-0", id: null, dots: 0, locked: false }];
  }
  return entries.map(([id, value], idx) => ({
    key: `row-${idx}`,
    id,
    dots: Number(value ?? 0),
    locked: true,
  }));
}

function computeGenerationFromBackgroundRows(
  rows: TraitRow[],
  backgroundNameById?: Record<string, string>,
): number {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z]/g, "");

  const genRow = rows.find((r) => {
    const id = (r.id ?? "").trim();
    const idNorm = normalize(id);

    if (idNorm === "generation") return true;

    const displayName = backgroundNameById?.[id] ?? "";
    const nameNorm = normalize(displayName);

    return nameNorm.startsWith("generation");
  });

  const dots = Number(genRow?.dots ?? 0);
  if (!Number.isFinite(dots) || dots <= 0) {
    return 13;
  }

  return Math.max(3, 13 - dots);
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

type DotsSelectorProps = {
  value: number;
  max: number;
  onChange: (value: number) => void;
};

function DotsSelector({ value, max, onChange }: DotsSelectorProps) {
  const safeMax = Math.max(1, max || 5);
  const dots = [];

  for (let i = 1; i <= safeMax; i += 1) {
    const filled = i <= value;
    dots.push(
      <span
        key={i}
        className={`dot${filled ? " dotFilled" : ""} dotInteractive`}
        onClick={() => onChange(i === value ? 0 : i)}
      />,
    );
  }

  return <div className="dots dotsSelector">{dots}</div>;
}

function CreateCharacterPage() {
  const [draft, setDraft] = useState<CharacterDraft>(() =>
    createEmptyCharacterDraft(),
  );
  const [nameError, setNameError] = useState<string | null>(null);

  const conceptOptions = (conceptsData as NamedItem[])
    .map((c) => ({ id: c.id, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const clanOptions = (clansData as NamedItem[])
    .map((c) => ({ id: c.id, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const natureOptions = (naturesData as NamedItem[])
    .map((n) => ({ id: n.id, name: n.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const disciplineOptions = (disciplinesData as NamedItem[])
    .map((d) => ({ id: d.id, name: d.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const backgroundOptions = (backgroundsData as NamedItem[])
    .map((b) => ({ id: b.id, name: b.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const disciplineNameById = React.useMemo(() => {
    const map: Record<string, string> = {};
    disciplineOptions.forEach((o) => {
      map[o.id] = o.name;
    });
    return map;
  }, [disciplineOptions]);

  const backgroundNameById = React.useMemo(() => {
    const map: Record<string, string> = {};
    backgroundOptions.forEach((o) => {
      map[o.id] = o.name;
    });
    return map;
  }, [backgroundOptions]);

  const [backgroundRows, setBackgroundRows] = useState<TraitRow[]>(() =>
    createRowsFromRecord(createEmptyCharacterDraft().backgrounds),
  );
  const [disciplineRows, setDisciplineRows] = useState<TraitRow[]>(() =>
    createRowsFromRecord(createEmptyCharacterDraft().disciplines),
  );

  function updateDraft(patch: Partial<CharacterDraft>) {
    setDraft((prev) => ({
      ...prev,
      ...patch,
    }));
  }

  function handleNameChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    updateDraft({ name: value });
  }

  function handleNameBlur() {
    setNameError(validateName(draft.name));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const error = validateName(draft.name);
    setNameError(error);

    if (error) {
      return;
    }

    const character = draftToCharacter(draft);
    console.log("Character pronto para salvar:", character);
  }

  /**
   * Background: após definir um id uma vez, não permite mais editar o nome
   * (apenas remover pela lixeira).
   */
  function handleBackgroundIdChange(rowKey: string, id: string | null) {
    setBackgroundRows((prev) => {
      const next = prev.map((row) => {
        if (row.key !== rowKey) return row;

        // Se já tinha id (linha confirmada), ignora qualquer nova tentativa de mudança/limpeza
        if (row.id) {
          return row;
        }

        const normalized = id && id.trim().length > 0 ? id : null;

        return {
          ...row,
          id: normalized,
          locked: Boolean(normalized),
          dots: normalized ? Math.max(1, row.dots) : row.dots,
        };
      });

      const backgrounds = rowsToRecord(next);
      const generation = computeGenerationFromBackgroundRows(
        next,
        backgroundNameById,
      );

      updateDraft({ backgrounds, generation });

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
    setBackgroundRows((prev) => {
      let next = prev.filter((row) => row.key !== rowKey);
      if (!next.length) {
        next = [{ key: "bg-0", id: null, dots: 0, locked: false }];
      }
      const backgrounds = rowsToRecord(next);
      const generation = computeGenerationFromBackgroundRows(
        next,
        backgroundNameById,
      );
      updateDraft({ backgrounds, generation });
      return next;
    });
  }

  /**
   * Discipline: após definir um id uma vez, não permite mais editar o nome
   * (apenas remover pela lixeira).
   */
  function handleDisciplineIdChange(rowKey: string, id: string | null) {
    setDisciplineRows((prev) => {
      const next = prev.map((row) => {
        if (row.key !== rowKey) return row;

        // Se já tinha id (linha confirmada), ignora qualquer nova tentativa de mudança/limpeza
        if (row.id) {
          return row;
        }

        const normalized = id && id.trim().length > 0 ? id : null;

        return {
          ...row,
          id: normalized,
          locked: Boolean(normalized),
          dots: normalized ? Math.max(1, row.dots) : row.dots,
        };
      });

      const disciplines = rowsToRecord(next);
      updateDraft({ disciplines });

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

  const isNameValid = validateName(draft.name) === null;
  const characterForPreview = draftToCharacter(draft);

  const c = characterForPreview ?? {};
  const attrs = (c.attributes ?? {}) as Record<string, number>;
  const abilities = (c.abilities ?? {}) as Record<string, number>;
  const traitCap = Math.max(5, Number(c.maxTraitRating ?? 5));

  return (
    <div className="sheetPage">
      <div className="header">
        <h1 className="h1">ELYSIUM</h1>
        <p className="headerSubtitle">V20 Character Generator</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="pageContainer">
          <div className="mainContent">
            <div className="sheetActive">
              {/* ===== Criar Ficha / intro ===== */}
              <div className="sheetSection">
                <h2 className="h2">Criar Ficha</h2>
                <p className="muted">
                  Use esta página para criar uma ficha manualmente. Nas próximas
                  etapas, adicionaremos os campos de Persona, Backgrounds,
                  Disciplinas e demais seções.
                </p>
              </div>

              {/* ===== Persona – 3 colunas ===== */}
              <div className="sheetSection">
                <h2 className="h2">Persona</h2>

                <div className="personaGrid personaGridCreate">
                  <p>
                    <strong>Name:</strong>{" "}
                    <input
                      id="name"
                      type="text"
                      className="fieldInput"
                      value={draft.name}
                      onChange={handleNameChange}
                      onBlur={handleNameBlur}
                      placeholder="Nome do personagem"
                    />
                  </p>
                  <p>
                    <strong>Generation:</strong>{" "}
                    <span>{draft.generation ?? 13}th</span>
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
                    <strong>Demeanor:</strong>{" "}
                    <AutocompleteInput
                      label=""
                      valueId={draft.demeanorId}
                      onChangeId={(id) => updateDraft({ demeanorId: id })}
                      options={natureOptions}
                      placeholder="Selecione um Demeanor"
                    />
                  </p>
                  <p className="personaRowFull personaNoBorder">
                    <strong>Experience:</strong> 0 / 0
                  </p>
                  {nameError && (
                    <p className="personaRowFull fieldError">{nameError}</p>
                  )}
                </div>
              </div>

              {/* ===== Attributes – 3 colunas ===== */}
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

                        // Todos atributos têm, no mínimo, 1 ponto,
                        // exceto Aparência se o clã for Nosferatu.
                        if (!isAppearance || !isNosferatu) {
                          v = Math.max(v, 1);
                        }

                        return (
                          <div className="itemRow" key={id}>
                            <span>{titleCaseAndClean(id)}</span>
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

              {/* ===== Abilities – 3 colunas ===== */}
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
                            <span className={v === 0 ? "muted" : ""}>
                              {titleCaseAndClean(id)}
                            </span>
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

              {/* ===== Advantages (Disciplines / Backgrounds / Virtues) ===== */}
              <div className="sheetSection">
                <h2 className="h2">Advantages</h2>

                <div className="grid3">
                  {/* === Disciplines (coluna 1) === */}
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

                              const disciplines = rowsToRecord(next);
                              updateDraft({ disciplines });

                              return next;
                            });
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* === Backgrounds (coluna 2) === */}
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

                              const backgrounds = rowsToRecord(next);
                              const generation =
                                computeGenerationFromBackgroundRows(
                                  next,
                                  backgroundNameById,
                                );

                              updateDraft({ backgrounds, generation });

                              return next;
                            });
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* === Virtues (coluna 3) === */}
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
                          <span>{titleCaseAndClean(id)}</span>
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

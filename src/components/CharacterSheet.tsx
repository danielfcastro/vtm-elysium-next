"use client";

import React, { useState } from "react";
import { Dots } from "./Dots";
import { Squares } from "./Squares";

function Label({ text, className }: { text: string; className?: string }) {
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
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getSpendEvents(character: any, type: string, traitId: string) {
  const events = Array.isArray(character?.spendEvents)
    ? character.spendEvents
    : [];
  return events.filter((e: any) => e?.type === type && e?.traitId === traitId);
}

function buildSpendTooltip(
  character: any,
  type: string,
  traitId: string,
): string | undefined {
  const events = getSpendEvents(character, type, traitId);
  if (!events.length) return undefined;

  // Tooltip nativo: melhor com separador simples.
  return events
    .map(
      (e: any) =>
        `+${e.delta ?? 1} via ${String(e.source ?? "unknown").toUpperCase()} (custo: ${e.cost ?? 0})`,
    )
    .join(" | ");
}

function getMarkedCount(character: any, type: string, traitId: string): number {
  const events = getSpendEvents(character, type, traitId);
  return events.reduce((sum: number, e: any) => sum + Number(e?.delta ?? 1), 0);
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

export function CharacterSheet({
  seed,
  character,
}: {
  seed?: string | null;
  character: any;
}) {
  const [showLog, setShowLog] = useState(false);
  const c = character ?? {};
  const attrs = c.attributes ?? {};
  const abilities = c.abilities ?? {};
  const disciplines = c.disciplines ?? {};
  const backgrounds = c.backgrounds ?? {};
  const virtues = c.virtues ?? {};
  const merits = Array.isArray(c.merits) ? c.merits : [];
  const flaws = Array.isArray(c.flaws) ? c.flaws : [];
  const debugLog = Array.isArray(c.debugLog) ? c.debugLog : [];

  const xpDisplay = `${c.spentExperience ?? 0} / ${c.totalExperience ?? 0}`;

  // CAP por geração (já vem do CoreStatsService)
  const traitCap = Math.max(5, Number(c.maxTraitRating ?? 5));

  // Road (no teu caso: Humanity)
  const roadName = c.road?.name ?? c.roadName ?? "Humanity";
  const roadRating = Number(c.roadRating ?? c.humanity ?? 0);

  // Willpower
  const willpowerPermanent = Number(c.willpower ?? 0);
  const willpowerTemporary = Number(
    c.willpowerTemporary ?? c.willpowerTemp ?? willpowerPermanent,
  );

  // Blood Pool
  const bloodPoolMax = Math.max(0, Number(c.maximumBloodPool ?? 0));

  const disciplineEntries = Object.keys(disciplines)
    .filter((id) => (disciplines[id] ?? 0) > 0)
    .map((id) => {
      let sortName = titleCaseAndClean(id);
      let sortOrder = 100;
      let displayName = sortName;

      const match = id.match(/(.*)\s*\((\d+)\)/);
      if (match) {
        const base = titleCaseAndClean(match[1]);
        const pathNum = parseInt(match[2], 10);
        sortName = base;
        sortOrder = pathNum;
        displayName =
          pathNum === 1 ? `${base} (Primary Path)` : `${base} (Secondary Path)`;
      }

      return { id, displayName, sortName, sortOrder, score: disciplines[id] };
    })
    .sort((a, b) =>
      a.sortName < b.sortName
        ? -1
        : a.sortName > b.sortName
          ? 1
          : a.sortOrder - b.sortOrder,
    );

  return (
    <div className="sheetPage">
      <div className="header">
        <h1 className="h1">ELYSIUM</h1>
        <p style={{ color: "var(--text-medium)", fontSize: "0.9rem" }}>
          V20 Character Generator
        </p>
      </div>

      <div className="pageContainer">
        <div className="mainContent">
          <div className="sheetActive">
            {/* Persona */}
            <div className="sheetSection">
              <h2 className="h2">Persona</h2>
              <div className="personaGrid">
                <p>
                  <strong>Name:</strong> {c.name ?? "Unknown Kindred"}
                </p>
                <p>
                  <strong>Concept:</strong> {c.concept?.name ?? "—"}
                </p>
                <p>
                  <strong>Clan:</strong> {c.clan?.name ?? "—"}
                </p>
                <p>
                  <strong>Generation:</strong> {c.generation ?? "—"}th
                </p>
                <p>
                  <strong>Nature:</strong> {c.nature?.name ?? "—"}
                </p>
                <p>
                  <strong>Age Category:</strong> {c.ageCategory ?? "—"}
                </p>
                <p>
                  <strong>Demeanor:</strong> {c.demeanor?.name ?? "—"}
                </p>
                <p>
                  <strong>Age:</strong> {c.age ?? 0} years
                </p>
                <p
                  style={{
                    gridColumn: "span 2",
                    borderBottom: "none",
                    marginTop: 5,
                  }}
                >
                  <strong>Experience:</strong> {xpDisplay}
                  {seed ? (
                    <>
                      &nbsp; | &nbsp; <strong>Seed:</strong> {seed}
                    </>
                  ) : null}
                </p>
              </div>
            </div>

            {/* Attributes */}
            <div className="sheetSection">
              <h2 className="h2">Attributes</h2>
              <div className="grid3">
                {Object.keys(ATTRIBUTE_CATEGORIES).map((cat) => (
                  <div key={cat}>
                    <h3 className="h3">{cat}</h3>
                    {ATTRIBUTE_CATEGORIES[cat].map((id) => {
                      const v = Number(attrs[id] ?? 0);
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

            {/* Abilities */}
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

            {/* Advantages */}
            <div className="sheetSection">
              <h2 className="h2">Advantages</h2>

              <div className="grid3">
                {/* Disciplines */}
                <div>
                  <h3 className="h3">Disciplines</h3>
                  {disciplineEntries.length === 0 ? (
                    <p className="muted">None</p>
                  ) : (
                    disciplineEntries.map((d) => (
                      <div className="itemRow" key={d.id}>
                        <Label text={d.displayName} />
                        <Dots
                          count={Number(d.score ?? 0)}
                          maxScale={traitCap}
                          useElderLogic={false}
                          tooltip={buildSpendTooltip(c, "Discipline", d.id)}
                          markedCount={getMarkedCount(c, "Discipline", d.id)}
                        />
                      </div>
                    ))
                  )}
                </div>

                {/* Backgrounds */}
                <div>
                  <h3 className="h3">Backgrounds</h3>
                  {Object.keys(backgrounds)
                    .filter((k) => (backgrounds[k] ?? 0) > 0)
                    .sort()
                    .map((id) => (
                      <div className="itemRow" key={id}>
                        <Label text={titleCaseAndClean(id)} />
                        <Dots
                          count={Number(backgrounds[id] ?? 0)}
                          maxScale={traitCap}
                          useElderLogic={false}
                          tooltip={buildSpendTooltip(c, "Background", id)}
                          markedCount={getMarkedCount(c, "Background", id)}
                        />
                      </div>
                    ))}
                </div>

                {/* Virtues */}
                <div>
                  <h3 className="h3">Virtues</h3>
                  {["conscience", "self_control", "courage"].map((id) => (
                    <div className="itemRow" key={id}>
                      <Label text={titleCaseAndClean(id)} />
                      <Dots
                        count={Number(virtues[id] ?? 0)}
                        maxScale={5}
                        useElderLogic={false}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Road / Willpower / Blood Pool */}
            <div className="sheetSection">
              <div className="grid3">
                <div>
                  <h3 className="h3">Others</h3>
                </div>
                <div className="roadGrid">
                  {/* Road */}
                  <div className="roadRow">
                    <div className="roadLabel">Road: {roadName}</div>
                    <div className="roadValue">
                      <Dots
                        count={roadRating}
                        maxScale={10}
                        useElderLogic={false}
                        isRoadWillpower={true}
                      />
                    </div>
                    <div className="roadLabel">Willpower</div>
                    <div className="roadValue roadValueStack">
                      <Dots
                        count={willpowerPermanent}
                        maxScale={10}
                        useElderLogic={false}
                        isRoadWillpower={true}
                        tooltip={buildSpendTooltip(c, "Willpower", "willpower")}
                        markedCount={getMarkedCount(
                          c,
                          "Willpower",
                          "willpower",
                        )}
                      />
                      <Squares
                        count={willpowerTemporary}
                        maxScale={10}
                        perRow={10}
                      />
                    </div>
                    <div className="roadLabel">Blood Pool</div>
                    <div className="roadValue">
                      <Squares
                        count={bloodPoolMax}
                        maxScale={bloodPoolMax}
                        perRow={10}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="h3">Health</h3>
                </div>
              </div>
              {/* Metadados abaixo */}
              <div className={`personaGrid ${"hrTop"}`}>
                <p>
                  <strong>Max Blood Pool:</strong> {c.maximumBloodPool ?? "—"}
                </p>
                <p>
                  <strong>Blood Per Turn:</strong> {c.bloodPointsPerTurn ?? "—"}
                </p>
                <p>
                  <strong>Max Trait Rating:</strong> {c.maxTraitRating ?? 5}
                </p>
                <p>
                  <strong>Clan Weakness:</strong> {c.clan?.weakness ?? "—"}
                </p>
              </div>
            </div>

            {/* Merits & Flaws */}
            {(merits.length > 0 || flaws.length > 0) && (
              <div className="sheetSection">
                <h2 className="h2">Merits & Flaws</h2>
                <div className="personaGrid">
                  <div>
                    <h3 className="h3">Merits</h3>
                    {merits.length ? (
                      merits.map((m: any) => (
                        <div className="itemRow" key={m.id}>
                          <span>{m.name}</span>
                          <span style={{ color: "#888" }}>({m.cost} pts)</span>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: "#555" }}>None</p>
                    )}
                  </div>

                  <div>
                    <h3 className="h3">Flaws</h3>
                    {flaws.length ? (
                      flaws.map((f: any) => (
                        <div className="itemRow" key={f.id}>
                          <span>{f.name}</span>
                          <span style={{ color: "#a82222" }}>
                            (+{f.cost} pts)
                          </span>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: "#555" }}>None</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Spending Log (below sheet) */}
      <div className="spendingToggle">
        <label>
          <input
            type="checkbox"
            checked={showLog}
            onChange={(e) => setShowLog(e.target.checked)}
          />
          Show Spending Log
        </label>
      </div>

      {showLog && (
        <div className="sheetSection">
          <h2 className="h2">Spending Log</h2>
          <ul className="logList">
            {debugLog.length ? (
              debugLog.map((line: string, idx: number) => {
                let cls = "";
                if (line.includes("[Flaw]")) cls = "logFlaw";
                else if (line.includes("[Merit]")) cls = "logMerit";
                else if (line.includes("[XP]")) cls = "logXp";
                else if (line.includes("[Decay]")) cls = "logDecay";
                return (
                  <li key={idx} className={cls}>
                    {line}
                  </li>
                );
              })
            ) : (
              <li>Waiting for generation...</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

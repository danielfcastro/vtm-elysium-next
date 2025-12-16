import React from "react";

type DotsProps = {
  count: number;
  maxScale?: number;

  /**
   * Se true, mantém o comportamento “sempre 5 dots visuais”.
   * Use isso APENAS onde você quer fixar a escala visual (ex: Road/Willpower se aplicável).
   * Para Backgrounds/Disciplines por geração, useElderLogic deve ser false.
   */
  useElderLogic?: boolean;

  isRoadWillpower?: boolean;

  /** Texto do tooltip (title). */
  tooltip?: string;

  /**
   * Quantos dots (dos preenchidos) devem ser “marcados” (substitui os antigos vermelhos).
   * Ex: se count=4 e markedCount=2, os 2 últimos dots preenchidos recebem a classe `dotMarked`.
   */
  markedCount?: number;
};

export function Dots({
  count,
  maxScale = 5,
  useElderLogic = true,
  isRoadWillpower = false,
  tooltip,
  markedCount = 0,
}: DotsProps) {
  const safe = Number.isFinite(count) ? count : 0;

  // Regra visual:
  // - Road/Willpower: respeita maxScale e usa classes específicas
  // - Elder logic: fixa em 5 visuais
  // - Caso geral: respeita maxScale (importante para geração em Backgrounds/Disciplines)
  const visualMax = !useElderLogic ? maxScale : 5;

  // Quantos dots ficam preenchidos visualmente
  const filledUpTo = Math.min(safe, visualMax);

  // Marcação (substitui os “vermelhos”)
  // Marca os ÚLTIMOS `markedCount` dots preenchidos.
  const marked = Math.max(0, Math.min(markedCount, filledUpTo));
  const markFromIndex = filledUpTo - marked; // a partir deste índice (0-based) marca

  if (!useElderLogic) {
    if (isRoadWillpower) {
      return (
        <span className="dotsRow">
          {Array.from({ length: visualMax }).map((_, i) => {
            const filled = i + 1 <= filledUpTo;
            const isMarked = filled && i >= markFromIndex;

            return (
              <span
                key={i}
                // title no DOT (não no container) para não depender de pointer-events do CSS
                title={tooltip}
                style={{ pointerEvents: "auto" }}
                className={`dotRoadWillPower ${
                  filled ? "dotRoadWillPowerFilled" : ""
                } ${isMarked ? "dotMarked" : ""}`}
              />
            );
          })}
        </span>
      );
    }

    return (
      <span className="dots">
        {Array.from({ length: visualMax }).map((_, i) => {
          const filled = i + 1 <= filledUpTo;
          const isMarked = filled && i >= markFromIndex;

          return (
            <span
              key={i}
              title={tooltip}
              style={{ pointerEvents: "auto" }}
              className={`dot ${filled ? "dotFilled" : ""} ${
                isMarked ? "dotMarked" : ""
              }`}
            />
          );
        })}
      </span>
    );
  }

  // Elder logic (fixo em 5) — SEM vermelho, mas com marcação/tooltip se você quiser.
  return (
    <span className="dots">
      {Array.from({ length: visualMax }).map((_, i) => {
        const filled = i + 1 <= filledUpTo;
        const isMarked = filled && i >= markFromIndex;

        return (
          <span
            key={i}
            title={tooltip}
            style={{ pointerEvents: "auto" }}
            className={`dot ${filled ? "dotFilled" : ""} ${
              isMarked ? "dotMarked" : ""
            }`}
          />
        );
      })}
    </span>
  );
}

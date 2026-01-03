"use client";

import type { ReactNode } from "react";
import type { GameOption } from "@/types/app";

type Props = {
  title: string;
  subtitle?: string;

  games?: GameOption[];
  selectedGameId?: string;
  onGameChange?: (gameId: string) => void;

  right?: ReactNode;
};

export default function TopBar({
  title,
  subtitle,
  games,
  selectedGameId,
  onGameChange,
  right,
}: Props) {
  const safeGames = Array.isArray(games) ? games : [];
  const safeSelected = selectedGameId ?? "";

  const showDropdown =
    typeof onGameChange === "function" && safeGames.length > 0;

  return (
    <header className="topbar">
      <div className="topbarLeft">
        <div className="topbarTitle">{title}</div>
        {subtitle ? <div className="topbarSubtitle">{subtitle}</div> : null}

        {showDropdown ? (
          <select
            className="topbarSelect"
            value={safeSelected}
            onChange={(e) => onGameChange(e.target.value)}
          >
            {safeGames.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="topbarRight">{right ?? null}</div>
    </header>
  );
}

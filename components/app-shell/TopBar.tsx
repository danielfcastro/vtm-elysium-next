import React from "react";
import LanguageSwitcher from "./LanguageSwitcher";

export interface GameOption {
  id: string;
  name: string;
}

export interface Props {
  titleLeft: string;
  games: GameOption[];
  selectedGameId: string;
  onGameChange: (id: string) => void;
  actions?: React.ReactNode;
}

export default function TopBar({
  titleLeft,
  games,
  selectedGameId,
  onGameChange,
  actions,
}: Props): React.ReactElement {
  return (
    <div className="topBar">
      <div className="topBarLeft">
        <h1 className="h1">{titleLeft}</h1>
      </div>

      <div className="topBarCenter">
        <select
          className="selectInput"
          value={selectedGameId}
          onChange={(e) => onGameChange(e.target.value)}
        >
          {games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      <div className="topBarRight">
        <LanguageSwitcher />
        {actions}
      </div>
    </div>
  );
}

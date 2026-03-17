"use client";

import React from "react";

export interface HealthLevel {
  id: string;
  label: string;
  penalty: number;
}

interface SheetHealthLevelsProps {
  healthLevels: HealthLevel[];
  hasHugeSize?: boolean;
}

export function SheetHealthLevels({
  healthLevels,
  hasHugeSize = false,
}: SheetHealthLevelsProps) {
  // If Huge Size merit, add extra Bruised level at the top
  const levels = hasHugeSize
    ? [{ id: "bruised-extra", label: "Bruised", penalty: 0 }, ...healthLevels]
    : healthLevels;

  return (
    <div>
      {levels.map((hl) => (
        <div key={hl.id} className="itemRow">
          <div className="itemLabel">
            {hl.label}
            {hl.penalty !== 0 && (
              <span className="muted" style={{ marginLeft: 8 }}>
                {hl.penalty > 0 ? `+${hl.penalty}` : hl.penalty}
              </span>
            )}
          </div>
          <input type="checkbox" disabled />
        </div>
      ))}
    </div>
  );
}

// Default health levels for humans, vampires, human ghouls, revenants
export const DEFAULT_HEALTH_LEVELS: HealthLevel[] = [
  { id: "bruised", label: "Bruised", penalty: 0 },
  { id: "hurt", label: "Hurt", penalty: -1 },
  { id: "injured", label: "Injured", penalty: -1 },
  { id: "wounded", label: "Wounded", penalty: -2 },
  { id: "mauled", label: "Mauled", penalty: -2 },
  { id: "crippled", label: "Crippled", penalty: -5 },
  { id: "incapacitated", label: "Incapacitated", penalty: 0 },
];

export default SheetHealthLevels;

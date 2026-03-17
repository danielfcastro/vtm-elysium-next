"use client";

import React from "react";
import { ABILITY_GROUPS } from "./groups";
import { SheetDots } from "./SheetDots";

interface SheetAbilitiesProps {
  abilities: Record<string, number>;
  specialties: Record<string, any>;
  maxTraitRating: number;
  lockedTraits?: {
    attributes?: Record<string, number>;
    abilities?: Record<string, number>;
  } | null;
  getPendingValue: (type: string, key: string, currentValue: number) => number;
}

export function SheetAbilities({
  abilities,
  specialties,
  maxTraitRating,
  lockedTraits,
  getPendingValue,
}: SheetAbilitiesProps) {
  return (
    <div className="grid3">
      {ABILITY_GROUPS.map((group) => (
        <div key={group.id}>
          <h3 className="h3">{group.label}</h3>
          {group.traits.map((trait) => {
            const currentValue = Number(abilities[trait.id] ?? 0);
            const pendingValue = getPendingValue(
              "ability",
              trait.id,
              currentValue,
            );
            const traitSpecialty = specialties[trait.id];
            // For animal ghouls: if any attribute > 5, use highest as cap for ALL traits (including abilities)
            let traitMax = maxTraitRating;
            if (lockedTraits?.attributes) {
              const attrValues = Object.values(lockedTraits.attributes);
              const maxLockedAttr = Math.max(
                ...attrValues.filter((v): v is number => typeof v === "number"),
              );
              if (maxLockedAttr > 5) {
                traitMax = maxLockedAttr;
              }
            }

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
                <SheetDots
                  value={currentValue}
                  max={traitMax}
                  pendingValue={pendingValue}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default SheetAbilities;

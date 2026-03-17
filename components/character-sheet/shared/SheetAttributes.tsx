"use client";

import React from "react";
import { ATTRIBUTE_GROUPS, getAttributeBase } from "./groups";
import { SheetDots } from "./SheetDots";

interface SheetAttributesProps {
  attributes: Record<string, number>;
  specialties: Record<string, any>;
  clanId: string;
  maxTraitRating: number;
  lockedTraits?: {
    attributes?: Record<string, number>;
    abilities?: Record<string, number>;
  } | null;
  getPendingValue: (type: string, key: string, currentValue: number) => number;
}

export function SheetAttributes({
  attributes,
  specialties,
  clanId,
  maxTraitRating,
  lockedTraits,
  getPendingValue,
}: SheetAttributesProps) {
  return (
    <div className="grid3 attributesGrid">
      {ATTRIBUTE_GROUPS.map((group) => (
        <div key={group.id}>
          <h3 className="h3">{group.label}</h3>
          {group.traits.map((trait) => {
            const rawValue = Number(attributes[trait.id] ?? 0);
            const base = getAttributeBase(trait.id, clanId);
            const display = rawValue > 0 ? rawValue : base;
            const pendingValue = getPendingValue(
              "attribute",
              trait.id,
              display,
            );
            const traitSpecialty = specialties[trait.id];
            // For animal ghouls: if any attribute > 5, use highest as cap for ALL traits
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
                  value={display}
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

export default SheetAttributes;

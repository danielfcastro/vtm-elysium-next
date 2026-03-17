"use client";

import React from "react";
import type { CharacterSheetModel } from "@/types/sheet";
import VampireCharacterSheet from "./VampireCharacterSheet";
import HumanGhoulCharacterSheet from "./HumanGhoulCharacterSheet";
import AnimalGhoulCharacterSheet from "./AnimalGhoulCharacterSheet";

type CharacterSheetMode = "edit" | "readonly";

export interface CharacterSheetProps {
  mode: CharacterSheetMode;
  sheet: CharacterSheetModel | any;
  onSubmit?: (sheet: any) => Promise<void>;
  characterStatus?: string | null;
  pendingSpends?: any[];
}

const CharacterSheet: React.FC<CharacterSheetProps> = ({
  mode,
  sheet,
  onSubmit,
  characterStatus,
  pendingSpends = [],
}) => {
  // Determine character type from sheet
  const root: any = sheet;
  const sheetWrapper: any = root?.sheet ?? root;
  // Handle both { sheet: { sheet: {...} } } and { draft: {...} } structures
  const draft: any =
    sheetWrapper?.sheet ?? sheetWrapper?.draft ?? sheetWrapper ?? root;

  // Check isGhoul in multiple possible locations
  const isGhoul =
    sheetWrapper?.isGhoul ??
    sheetWrapper?.draft?.isGhoul ??
    draft?.isGhoul ??
    false;
  const ghoulType =
    sheetWrapper?.ghoulType ??
    sheetWrapper?.draft?.ghoulType ??
    draft?.ghoulType ??
    "human";

  // Render appropriate sheet based on character type
  if (isGhoul) {
    if (ghoulType === "animal") {
      return (
        <AnimalGhoulCharacterSheet
          mode={mode}
          sheet={sheet}
          onSubmit={onSubmit}
          characterStatus={characterStatus}
          pendingSpends={pendingSpends}
        />
      );
    }
    // Human ghoul (default for ghouls)
    return (
      <HumanGhoulCharacterSheet
        mode={mode}
        sheet={sheet}
        onSubmit={onSubmit}
        characterStatus={characterStatus}
        pendingSpends={pendingSpends}
      />
    );
  }

  // Default: Vampire
  return (
    <VampireCharacterSheet
      mode={mode}
      sheet={sheet}
      onSubmit={onSubmit}
      characterStatus={characterStatus}
      pendingSpends={pendingSpends}
    />
  );
};

export default CharacterSheet;

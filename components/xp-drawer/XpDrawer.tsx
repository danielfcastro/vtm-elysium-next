import React from "react";
import XpVampireDrawer from "./XpVampireDrawer";
import XpHumanGhoulDrawer from "./XpHumanGhoulDrawer";
import XpRevenantGhoulDrawer from "./XpRevenantGhoulDrawer";
import XpAnimalGhoulDrawer from "./XpAnimalGhoulDrawer";
import { SpendChange } from "./xpDrawerConstants";

interface XpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: any;
  baseAvailableXp: number;
  pendingSpends?: any[];
  onSave: (spends: SpendChange[]) => Promise<void>;
  onCancelPending?: () => Promise<void>;
  allowBackgroundXpPurchase?: boolean;
  allowMeritFlawXpPurchase?: boolean;
  isGhoul?: boolean;
  characterStatus?: string | null;
}

export default function XpDrawer({
  isOpen,
  onClose,
  sheet,
  baseAvailableXp,
  pendingSpends = [],
  onSave,
  onCancelPending,
  allowBackgroundXpPurchase = true,
  allowMeritFlawXpPurchase = false,
  isGhoul,
  characterStatus,
}: XpDrawerProps) {
  const sheetWrapper: any = sheet?.sheet ?? sheet ?? {};

  const root: any = sheet;
  const sheetData: any = root?.sheet ?? root;
  const draft: any = sheetData?.sheet ?? sheetData?.draft ?? sheetData ?? root;

  const isGhoulFromSheet =
    sheetWrapper?.isGhoul ??
    sheetWrapper?.draft?.isGhoul ??
    draft?.isGhoul ??
    false;

  const ghoulTypeFromSheet =
    sheetWrapper?.ghoulType ??
    sheetWrapper?.draft?.ghoulType ??
    draft?.ghoulType ??
    "human";

  const lockedTraits = draft?.lockedTraits ?? null;
  const isAnimalGhoul = !!lockedTraits;

  const familyDisciplines =
    draft?.familyDisciplines ??
    sheetWrapper?.familyDisciplines ??
    sheetWrapper?.sheet?.familyDisciplines ??
    {};
  const isRevenant = Object.keys(familyDisciplines).length > 0;

  const effectiveIsGhoul = isGhoul ?? isGhoulFromSheet;

  if (!effectiveIsGhoul) {
    return (
      <XpVampireDrawer
        isOpen={isOpen}
        onClose={onClose}
        sheet={sheet}
        baseAvailableXp={baseAvailableXp}
        pendingSpends={pendingSpends}
        onSave={onSave}
        onCancelPending={onCancelPending}
        allowBackgroundXpPurchase={allowBackgroundXpPurchase}
        allowMeritFlawXpPurchase={allowMeritFlawXpPurchase}
        characterStatus={characterStatus}
      />
    );
  }

  if (isAnimalGhoul || ghoulTypeFromSheet === "animal") {
    return (
      <XpAnimalGhoulDrawer
        isOpen={isOpen}
        onClose={onClose}
        sheet={sheet}
        baseAvailableXp={baseAvailableXp}
        pendingSpends={pendingSpends}
        onSave={onSave}
        onCancelPending={onCancelPending}
        characterStatus={characterStatus}
      />
    );
  }

  if (isRevenant) {
    return (
      <XpRevenantGhoulDrawer
        isOpen={isOpen}
        onClose={onClose}
        sheet={sheet}
        baseAvailableXp={baseAvailableXp}
        pendingSpends={pendingSpends}
        onSave={onSave}
        onCancelPending={onCancelPending}
        characterStatus={characterStatus}
      />
    );
  }

  return (
    <XpHumanGhoulDrawer
      isOpen={isOpen}
      onClose={onClose}
      sheet={sheet}
      baseAvailableXp={baseAvailableXp}
      pendingSpends={pendingSpends}
      onSave={onSave}
      onCancelPending={onCancelPending}
      characterStatus={characterStatus}
    />
  );
}

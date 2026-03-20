"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CreateVampire } from "./CreateVampire";
import { CreateGhoul } from "./CreateGhoul";
import { CreateRevenant } from "./CreateRevenant";
import { CreateAnimal } from "./CreateAnimal";

export interface CreationWizardProps {
  characterId?: string | null;
  ghoulOptions?: {
    isGhoul: boolean;
    ghoulType: "human" | "animal";
    isRevenant?: boolean;
    domitorId?: string;
    domitorName?: string;
    domitorClan?: string;
    domitorGeneration?: number;
    maxDiscipline?: number;
  } | null;
  gameId?: string | null;
  gameName?: string;
}

export function CreationWizard({
  characterId,
  ghoulOptions,
  gameId,
  gameName,
}: CreationWizardProps) {
  const searchParams = useSearchParams();
  const characterIdFromUrl = searchParams?.get("characterId");
  const initialCharacterId = characterId ?? characterIdFromUrl;

  const [loading, setLoading] = useState(false);
  const [dbType, setDbType] = useState<
    "vampire" | "ghoul" | "revenant" | "animal" | null
  >(null);

  useEffect(() => {
    if (initialCharacterId && initialCharacterId !== "__new_ghoul__") {
      setLoading(true);
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("vtm_token")
          : null;
      fetch(`/api/characters/${initialCharacterId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          const sheet =
            data?.sheet?.sheet ??
            data?.character?.sheet?.sheet ??
            data?.character?.sheet ??
            data?.sheet ??
            {};
          if (sheet.isGhoul) {
            if (sheet.ghoulType === "animal") setDbType("animal");
            else if (sheet.familyName) setDbType("revenant");
            else setDbType("ghoul");
          } else {
            setDbType("vampire");
          }
          setLoading(false);
        })
        .catch((e) => {
          console.error(e);
          setDbType("vampire");
          setLoading(false);
        });
    }
  }, [initialCharacterId]);

  // If loading the character from DB to determine type
  if (initialCharacterId && initialCharacterId !== "__new_ghoul__" && loading) {
    return <div className="muted p-4">Determining character type...</div>;
  }

  let activeType = "vampire";

  if (initialCharacterId && initialCharacterId !== "__new_ghoul__") {
    if (dbType) activeType = dbType;
  } else if (ghoulOptions?.isGhoul) {
    if (ghoulOptions.isRevenant) activeType = "revenant";
    else if (ghoulOptions.ghoulType === "animal") activeType = "animal";
    else activeType = "ghoul";
  }

  const props = {
    characterId:
      initialCharacterId === "__new_ghoul__" || initialCharacterId === "__new__"
        ? null
        : initialCharacterId,
    ghoulOptions,
    gameId,
    gameName,
  };

  return (
    <Suspense fallback={<div className="muted p-4">Loading wizard...</div>}>
      {activeType === "animal" && <CreateAnimal {...props} />}
      {activeType === "revenant" && <CreateRevenant {...props} />}
      {activeType === "ghoul" && <CreateGhoul {...props} />}
      {activeType === "vampire" && <CreateVampire {...props} />}
    </Suspense>
  );
}

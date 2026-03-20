// app/api/specialties/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSpecialtiesForTrait } from "@/core/data/specialties";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // "attribute" | "ability"
  const traitCategory = searchParams.get("traitCategory");
  const traitId = searchParams.get("traitId");
  const isLegendary = searchParams.get("isLegendary") === "true";

  if (!type || !traitCategory || !traitId) {
    return NextResponse.json(
      { error: "Missing required parameters: type, traitCategory, traitId" },
      { status: 400 },
    );
  }

  try {
    const options = getSpecialtiesForTrait(
      type === "attribute" ? "attributes" : "abilities",
      traitCategory,
      traitId,
      isLegendary,
    );

    return NextResponse.json(options, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch specialties" },
      { status: 500 },
    );
  }
}

// src/lib/db.ts
export type SheetValidationResult = { ok: true } | { ok: false; error: string };

function isPlainObject(v: any) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export function validateSheetForReplace(sheet: any): SheetValidationResult {
  if (!isPlainObject(sheet))
    return { ok: false, error: "sheet must be an object" };

  // campos raiz esperados pelo front
  if (typeof sheet.templateKey !== "string")
    return { ok: false, error: "sheet.templateKey must be a string" };
  if (typeof sheet.isDarkAges !== "boolean")
    return { ok: false, error: "sheet.isDarkAges must be a boolean" };
  if (typeof sheet.phase !== "number")
    return { ok: false, error: "sheet.phase must be a number" };

  if (!isPlainObject(sheet.draft))
    return { ok: false, error: "sheet.draft must be an object" };
  if (typeof sheet.draft.name !== "string")
    return { ok: false, error: "sheet.draft.name must be a string" };

  // arrays que o front usa no rendering
  if (!Array.isArray(sheet.backgroundRows))
    return { ok: false, error: "sheet.backgroundRows must be an array" };
  if (!Array.isArray(sheet.disciplineRows))
    return { ok: false, error: "sheet.disciplineRows must be an array" };

  // snapshots podem ser null/obj/array conforme seu front
  // (não exigimos, só aceitamos)
  const okOrNull = (v: any) =>
    v === null || v === undefined || isPlainObject(v) || Array.isArray(v);
  if (!okOrNull(sheet.phase1DraftSnapshot))
    return {
      ok: false,
      error: "sheet.phase1DraftSnapshot must be object/array/null",
    };
  if (!okOrNull(sheet.phase1BackgroundRowsSnapshot))
    return {
      ok: false,
      error: "sheet.phase1BackgroundRowsSnapshot must be object/array/null",
    };
  if (!okOrNull(sheet.phase1DisciplineRowsSnapshot))
    return {
      ok: false,
      error: "sheet.phase1DisciplineRowsSnapshot must be object/array/null",
    };

  return { ok: true };
}

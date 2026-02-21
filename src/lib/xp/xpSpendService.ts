// src/lib/xp/xpSpendService.ts

import type { PoolClient } from "pg";
import { getXpTotalsForCharacter, insertApprovedXpSpendLog } from "./xpLedger";

export type SpendType =
  | "attribute"
  | "ability"
  | "discipline"
  | "background"
  | "virtue"
  | "willpower"
  | "road";

export type SpendItem = {
  type: SpendType;
  key: string;
  from: number;
  to: number;
};

function ensurePlainObject(v: any) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function pluralFor(type: SpendType) {
  switch (type) {
    case "attribute":
      return "attributes";
    case "ability":
      return "abilities";
    case "discipline":
      return "disciplines";
    case "background":
      return "backgrounds";
    case "virtue":
      return "virtues";
    case "willpower":
      return "willpower";
    case "road":
      return "roadRating";
  }
}

export function xpCostFor(type: SpendType, newLevel: number) {
  switch (type) {
    case "attribute":
      return newLevel * 4;
    case "ability":
      return newLevel * 2;
    case "discipline":
      return newLevel * 7;
    case "background":
      return newLevel * 3;
    case "virtue":
      return newLevel * 2;
    case "willpower":
      return newLevel * 1;
    case "road":
      return newLevel * 1;
  }
}

function safeGetNestedNumber(obj: any, path: string[], fallback: number) {
  let cur = obj;
  for (const p of path) {
    if (!cur || typeof cur !== "object") return fallback;
    cur = cur[p];
  }
  return typeof cur === "number" ? cur : fallback;
}

export function getCurrentLevel(sheet: any, spend: SpendItem): number {
  if (!ensurePlainObject(sheet) || !ensurePlainObject(sheet.draft)) return 0;
  const draft = sheet.draft;

  if (spend.type === "willpower") {
    return typeof draft.willpower === "number" ? draft.willpower : 0;
  }
  if (spend.type === "road") {
    return typeof draft.roadRating === "number" ? draft.roadRating : 0;
  }

  const bucketName = pluralFor(spend.type) as
    | "attributes"
    | "abilities"
    | "disciplines"
    | "backgrounds"
    | "virtues";

  const bucket = draft[bucketName];
  if (!ensurePlainObject(bucket)) return 0;
  const v = bucket[spend.key];
  return typeof v === "number" ? v : 0;
}

export function applySpendToSheet(sheet: any, spend: SpendItem) {
  if (!ensurePlainObject(sheet) || !ensurePlainObject(sheet.draft)) {
    throw new Error("Invalid sheet structure (missing draft)");
  }
  const draft = sheet.draft;

  if (spend.type === "willpower") {
    draft.willpower = spend.to;
    return;
  }
  if (spend.type === "road") {
    draft.roadRating = spend.to;
    return;
  }

  const bucketName = pluralFor(spend.type) as
    | "attributes"
    | "abilities"
    | "disciplines"
    | "backgrounds"
    | "virtues";

  if (!ensurePlainObject(draft[bucketName])) draft[bucketName] = {};
  draft[bucketName][spend.key] = spend.to;
}

export function enforceMaxTraitRating(sheet: any, spends: SpendItem[]) {
  const maxTraitRating = safeGetNestedNumber(
    sheet,
    ["draft", "maxTraitRating"],
    5,
  );

  // maxTraitRating applies only to these types
  const capped: SpendType[] = [
    "attribute",
    "ability",
    "discipline",
    "background",
    "virtue",
  ];
  for (const s of spends) {
    if (!capped.includes(s.type)) continue;
    if (s.to > maxTraitRating) {
      throw new Error(
        `Trait '${s.type}:${s.key}' cannot exceed ${maxTraitRating} dots`,
      );
    }
  }
}

export type SpendXpResult = {
  sheet: any;
  totalsBefore: { granted: number; spent: number; remaining: number };
  totalsAfter: { granted: number; spent: number; remaining: number };
  lastSpendCost: number;
  spendLogId: string;
};

/**
 * Option A: spend XP immediately.
 * - Uses ledger as source of truth.
 * - Writes xp_spend_logs as APPROVED.
 * - Updates characters.total_experience/spent_experience as cache.
 */
export async function spendXpImmediate(
  client: PoolClient,
  args: {
    characterId: string;
    userId: string;
    sheet: any; // mutable JSON object
    spends: SpendItem[];
  },
): Promise<SpendXpResult> {
  const { characterId, userId, sheet, spends } = args;

  // Compute cost
  const itemsWithCost = spends.map((s) => ({
    ...s,
    cost: xpCostFor(s.type, s.to),
  }));
  const totalCost = itemsWithCost.reduce((acc, it) => acc + it.cost, 0);
  if (totalCost <= 0) {
    throw Object.assign(new Error("Total cost must be > 0"), {
      code: "INVALID_SPEND",
      httpStatus: 422,
    });
  }

  // Ledger totals BEFORE
  const totalsBefore = await getXpTotalsForCharacter(client, characterId);
  if (totalsBefore.remaining < totalCost) {
    throw Object.assign(
      new Error(
        `Insufficient XP (remaining ${totalsBefore.remaining}, need ${totalCost})`,
      ),
      { code: "INSUFFICIENT_XP", httpStatus: 422 },
    );
  }

  // Apply spends to sheet
  for (const s of spends) applySpendToSheet(sheet, s);
  enforceMaxTraitRating(sheet, spends);

  // Write spend log as APPROVED
  const spendPayload = {
    spends: itemsWithCost,
    totalCost,
    totalsBefore,
  };

  const { id: spendLogId } = await insertApprovedXpSpendLog(client, {
    characterId,
    requestedById: userId,
    xpCost: totalCost,
    payload: spendPayload,
  });

  // Ledger totals AFTER: spent increased by totalCost (grants unchanged)
  const totalsAfter = {
    granted: totalsBefore.granted,
    spent: totalsBefore.spent + totalCost,
    remaining: totalsBefore.remaining - totalCost,
  };

  // Update character cache + sheet
  await client.query(
    `
      UPDATE public.characters
      SET
        sheet = $1::jsonb,
        total_experience = $2,
        spent_experience = $3
      WHERE id = $4
    `,
    [
      JSON.stringify(sheet),
      totalsAfter.granted,
      totalsAfter.spent,
      characterId,
    ],
  );

  // Audit log for XP spend (action_type_id = 3)
  const spendDetails = itemsWithCost
    .map((s) => `${s.type}:${s.key} (${s.from} → ${s.to})`)
    .join(", ");
  const auditMessage = `XP | Spent | Cost: ${totalCost} XP | Remaining: ${totalsAfter.remaining} XP | ${spendDetails}`;
  await client.query(
    `INSERT INTO public.audit_logs (character_id, user_id, action_type_id, payload) VALUES ($1, $2, 3, $3)`,
    [characterId, userId, JSON.stringify({ message: auditMessage })],
  );

  return {
    sheet,
    totalsBefore,
    totalsAfter,
    lastSpendCost: totalCost,
    spendLogId,
  };
}

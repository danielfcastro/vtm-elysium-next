//app/api/storyteller/characters/[id]/xp/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

type SpendType =
  | "attribute"
  | "ability"
  | "discipline"
  | "background"
  | "virtue"
  | "willpower"
  | "road"
  | "combo";

interface SpendItem {
  type: SpendType;
  key: string;
  from: number;
  to: number;
  cost: number;
}

function pluralFor(type: SpendType): string {
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
    case "combo":
      return "combos";
  }
}

function applySpendToSheet(sheet: any, spend: SpendItem) {
  if (!sheet || typeof sheet !== "object") return;

  // XP phase sheet structure:
  // sheet = { phase: 2, sheet: { ...character data... }, disciplines: {...}, abilities: {...} }
  // The inner "sheet.sheet" contains the approved character
  // Top-level "sheet.disciplines", "sheet.abilities" etc contain draft changes

  const innerSheet = sheet.sheet ?? sheet;

  const bucketName = pluralFor(spend.type);

  // Helper to apply to a target object
  const applyToTarget = (target: any) => {
    if (!target || typeof target !== "object") return;
    if (spend.type === "willpower") {
      target.willpower = spend.to;
      return;
    }
    if (spend.type === "road") {
      target.roadRating = spend.to;
      return;
    }
    if (!target[bucketName]) target[bucketName] = {};
    target[bucketName][spend.key] = spend.to;
  };

  // Apply to all possible locations:
  // 1. Top-level (sheet.disciplines, sheet.abilities etc)
  // 2. sheet.sheet (XP phase inner)
  // 3. sheet.sheet.sheet (legacy structure)
  applyToTarget(sheet);
  applyToTarget(innerSheet);
  if (innerSheet.sheet) {
    applyToTarget(innerSheet.sheet);
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth(req);
  const params = await ctx.params;
  const characterId = params.id;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const ch = await client.query(
      `SELECT id, game_id, owner_user_id, status_id, sheet, total_experience, spent_experience FROM public.characters WHERE id = $1 FOR UPDATE`,
      [characterId],
    );

    if (ch.rowCount !== 1) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Character not found" },
        { status: 404 },
      );
    }

    const character = ch.rows[0];
    const currentTotalXp = Number(character.total_experience ?? 0);
    const currentSpentXp = Number(character.spent_experience ?? 0);

    // Check if user is storyteller for this game
    const gameCheck = await client.query(
      `SELECT storyteller_id FROM public.games WHERE id = $1`,
      [character.game_id],
    );

    if (
      gameCheck.rowCount === 0 ||
      gameCheck.rows[0].storyteller_id !== user.sub
    ) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const pending = await client.query(
      `SELECT id, xp_cost, payload FROM public.xp_spend_logs WHERE character_id = $1 AND status_id = 3`,
      [characterId],
    );

    if (pending.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "No pending XP spends to approve" },
        { status: 400 },
      );
    }

    // Calculate total cost of pending spends
    let totalPendingCost = 0;
    const sheet = character.sheet;
    console.log("Sheet structure:", JSON.stringify(sheet).substring(0, 500));
    console.log("Pending spends:", pending.rows);

    const allSpends: SpendItem[] = [];

    for (const spendLog of pending.rows) {
      const payload = spendLog.payload;
      console.log("Processing spend:", spendLog.id, payload);
      if (payload?.spends) {
        for (const s of payload.spends) {
          console.log("Applying spend:", s);
          applySpendToSheet(sheet, s);
          allSpends.push(s);
          totalPendingCost += s.cost || 0;
        }
      }

      await client.query(
        `UPDATE public.xp_spend_logs SET status_id = 1, resolved_at = NOW(), resolved_by_id = $1 WHERE id = $2`,
        [user.sub, spendLog.id],
      );
    }

    // Use character XP values directly
    const granted = currentTotalXp;
    const spent = currentSpentXp + totalPendingCost;
    const remaining = granted - spent;

    console.log("Updating sheet with spends, totalCost:", totalPendingCost);
    console.log("Final sheet:", JSON.stringify(sheet).substring(0, 1000));

    await client.query(
      `UPDATE public.characters SET sheet = $1::jsonb, total_experience = $2, spent_experience = $3, status_id = 4 WHERE id = $4`,
      [JSON.stringify(sheet), granted, spent, characterId],
    );

    if (allSpends.length > 0) {
      for (const spend of allSpends) {
        const spendDetail = `${spend.type}:${spend.key} (${spend.from} → ${spend.to})`;
        const auditMessage = `XP | Spent (ST Approval) | Cost: ${spend.cost} XP | Remaining: ${remaining} XP | ${spendDetail}`;

        await client.query(
          `INSERT INTO public.audit_logs (character_id, user_id, action_type_id, payload) VALUES ($1, $2, 3, $3)`,
          [characterId, user.sub, JSON.stringify({ message: auditMessage })],
        );
      }
    }

    await client.query("COMMIT");

    return NextResponse.json({
      approved: pending.rowCount,
      granted,
      spent,
      remaining,
      sheet,
    });
  } catch (e: any) {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json(
      { error: e?.message ?? "Internal error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

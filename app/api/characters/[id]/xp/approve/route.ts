// app/api/characters/[id]/xp/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

type SpendType =
  | "attribute"
  | "ability"
  | "discipline"
  | "background"
  | "virtue"
  | "willpower"
  | "road"
  | "specialty";

interface SpendItem {
  type: SpendType;
  key: string;
  from: number;
  to: number;
  cost: number;
  specialtyName?: string;
  specialtyDescription?: string;
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
    default:
      return "";
  }
}

function applySpendToSheet(sheet: any, spend: SpendItem) {
  if (!sheet || typeof sheet !== "object") return;

  const innerSheet = sheet.sheet ?? sheet;

  const bucketName = pluralFor(spend.type);

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
    if (spend.type === "specialty") {
      if (!target.specialties) target.specialties = {};
      target.specialties[spend.key] = {
        name: spend.specialtyName,
        description: spend.specialtyDescription,
      };
      return;
    }
    if (!target[bucketName]) target[bucketName] = {};
    target[bucketName][spend.key] = spend.to;
  };

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

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const ch = await client.query(
      `SELECT id, game_id, owner_user_id, status_id, sheet FROM public.characters WHERE id = $1 FOR UPDATE`,
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

    if (character.owner_user_id !== user.sub) {
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

    const sheet = character.sheet;
    const allSpends: SpendItem[] = [];

    for (const spendLog of pending.rows) {
      const payload = spendLog.payload;
      if (payload?.spends) {
        for (const s of payload.spends) {
          applySpendToSheet(sheet, s);
          allSpends.push(s);
        }
      }

      await client.query(
        `UPDATE public.xp_spend_logs SET status_id = 1, resolved_at = NOW(), resolved_by_id = $1 WHERE id = $2`,
        [user.sub, spendLog.id],
      );
    }

    const totals = await client.query(
      `SELECT 
        COALESCE((SELECT SUM(amount) FROM public.xp_grants WHERE character_id = $1), 0) as granted,
        COALESCE((SELECT SUM(xp_cost) FROM public.xp_spend_logs WHERE character_id = $1 AND status_id = 1), 0) as spent`,
      [characterId],
    );

    const granted = Number(totals.rows[0].granted);
    const spent = Number(totals.rows[0].spent);
    const remaining = granted - spent;

    await client.query(
      `UPDATE public.characters SET sheet = $1::jsonb, total_experience = $2, spent_experience = $3 WHERE id = $4`,
      [JSON.stringify(sheet), granted, spent, characterId],
    );

    if (allSpends.length > 0) {
      // Create one audit log entry per trait
      for (const spend of allSpends) {
        const spendDetail = `${spend.type}:${spend.key} (${spend.from} → ${spend.to})`;
        const auditMessage = `XP | Spent | Cost: ${spend.cost} XP | Remaining: ${remaining} XP | ${spendDetail}`;

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

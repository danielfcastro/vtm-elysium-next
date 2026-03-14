//app/api/storyteller/characters/[id]/xp/grant/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { requireRoleInGame } from "@/lib/roles";
import { getXpTotalsForCharacter } from "@/lib/xp/xpLedger";

function todayIsoDate(): string {
  // YYYY-MM-DD
  return new Date().toISOString().slice(0, 10);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth(req);
  const params = await ctx.params;
  const characterId = params.id;

  const body = await req.json().catch(() => null);
  const amount = Number(body?.amount);
  const sessionDate =
    typeof body?.sessionDate === "string" ? body.sessionDate : todayIsoDate();
  const note = typeof body?.note === "string" ? body.note : null;

  if (!Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "amount must be a positive integer" },
      { status: 422 },
    );
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock character para consistência
    const ch = await client.query<{
      id: string;
      game_id: string;
      deleted_at: string | null;
    }>(
      `
      SELECT id, game_id, deleted_at
      FROM public.characters
      WHERE id = $1
      FOR UPDATE
      `,
      [characterId],
    );

    if (ch.rowCount !== 1 || ch.rows[0].deleted_at) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Character not found" },
        { status: 404 },
      );
    }

    const gameId = ch.rows[0].game_id;

    const ok = await requireRoleInGame(client, user.sub, gameId, [
      "STORYTELLER",
      "ADMIN",
    ]);
    if (!ok) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Ledger insert
    const ins = await client.query<{ id: string }>(
      `
      INSERT INTO public.xp_grants (character_id, granted_by_id, amount, session_date, note)
      VALUES ($1, $2, $3, $4::date, $5)
      RETURNING id
      `,
      [characterId, user.sub, amount, sessionDate, note],
    );

    // Audit log for XP grant (action_type_id = 6)
    const auditMessage = `XP | Awarded | Amount: +${amount} XP | Total: ${amount} XP | By: Storyteller`;
    await client.query(
      `INSERT INTO public.audit_logs (character_id, user_id, action_type_id, payload) VALUES ($1, $2, 6, $3)`,
      [characterId, user.sub, JSON.stringify({ message: auditMessage })],
    );

    // Recalcula via ledger e atualiza cache (derivado)
    const totals = await getXpTotalsForCharacter(client, characterId);

    await client.query(
      `
      UPDATE public.characters
      SET total_experience = $1, spent_experience = $2
      WHERE id = $3
      `,
      [totals.granted, totals.spent, characterId],
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        grantId: ins.rows[0].id,
        characterId,
        totals,
      },
      { status: 201 },
    );
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

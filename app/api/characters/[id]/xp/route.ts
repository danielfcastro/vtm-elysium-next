// app/api/characters/[id]/xp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { requireRoleInGame } from "@/lib/roles";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth(req);
  const params = await ctx.params;
  const characterId = params.id;

  const pool = getPool();
  const client = await pool.connect();

  try {
    // 1) Valida se o personagem existe e se o usuário pode vê-lo
    const ch = await client.query<{
      id: string;
      game_id: string;
      owner_user_id: string;
      deleted_at: string | null;
    }>(
      `
      SELECT id, game_id, owner_user_id, deleted_at
      FROM public.characters
      WHERE id = $1
      LIMIT 1
      `,
      [characterId],
    );

    if (ch.rowCount !== 1 || ch.rows[0].deleted_at) {
      return NextResponse.json(
        { error: "Character not found" },
        { status: 404 },
      );
    }

    const character = ch.rows[0];
    const isOwner = character.owner_user_id === user.sub;

    if (!isOwner) {
      const ok = await requireRoleInGame(client, user.sub, character.game_id, [
        "STORYTELLER",
        "ADMIN",
      ]);
      if (!ok) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // 2) Soma de XP concedido (xp_grants)
    const grantsResult = await client.query<{ totalGranted: number }>(
      `
      SELECT COALESCE(SUM(amount), 0)::int AS "totalGranted"
      FROM public.xp_grants
      WHERE character_id = $1
      `,
      [characterId],
    );

    const totalGranted = grantsResult.rows[0]?.totalGranted ?? 0;

    // 3) Soma de XP gasto (xp_spend_logs)
    //    Regra típica: considerar apenas status 'APPROVED'.
    const spendsResult = await client.query<{ totalSpent: number }>(
      `
      SELECT COALESCE(SUM(xp_cost), 0)::int AS "totalSpent"
      FROM public.xp_spend_logs
      WHERE character_id = $1
        AND status = 'APPROVED'
      `,
      [characterId],
    );

    const totalSpent = spendsResult.rows[0]?.totalSpent ?? 0;

    const remaining = totalGranted - totalSpent;

    // 4) Payload no formato esperado pelos testes
    return NextResponse.json(
      {
        characterId,
        totals: {
          granted: totalGranted,
          spent: totalSpent,
          remaining,
        },
      },
      { status: 200 },
    );
  } finally {
    client.release();
  }
}

//app/api/characters/[id]/xp/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { requireRoleInGame } from "@/lib/roles";
import { getXpTotalsForCharacter } from "@/lib/xp/xpLedger";

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const user = await requireAuth(req);
  const characterId = ctx.params.id;

  const pool = getPool();
  const client = await pool.connect();

  try {
    // Carrega character (para authz) e garante que existe
    const ch = await client.query<{
      id: string;
      game_id: string;
      owner_user_id: string;
      status: string;
      total_experience: number;
      spent_experience: number;
      deleted_at: string | null;
    }>(
      `
      SELECT id, game_id, owner_user_id, status, total_experience, spent_experience, deleted_at
      FROM public.characters
      WHERE id = $1
      LIMIT 1
      `,
      [characterId],
    );

    if (ch.rowCount !== 1) {
      return NextResponse.json(
        { error: "Character not found" },
        { status: 404 },
      );
    }

    const character = ch.rows[0];
    if (character.deleted_at) {
      return NextResponse.json(
        { error: "Character not found" },
        { status: 404 },
      );
    }

    // Authz: owner ou role no game
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

    // Fonte de verdade: ledger
    const totals = await getXpTotalsForCharacter(client, characterId);

    // Cache atual (characters.total_experience/spent_experience) pode divergir por bugs antigos;
    // aqui retornamos também para debug/telemetria.
    return NextResponse.json(
      {
        characterId,
        gameId: character.game_id,
        totals: {
          granted: totals.granted,
          spent: totals.spent,
          remaining: totals.remaining,
        },
        cache: {
          total_experience: Number(character.total_experience ?? 0),
          spent_experience: Number(character.spent_experience ?? 0),
        },
      },
      { status: 200 },
    );
  } finally {
    client.release();
  }
}

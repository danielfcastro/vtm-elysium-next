// app/api/characters/[id]/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { requireRoleInGame } from "@/lib/roles";

function clampInt(v: string | null, def: number, min: number, max: number) {
  const n = v ? Number.parseInt(v, 10) : def;
  if (!Number.isFinite(n)) return def;
  return Math.min(Math.max(n, min), max);
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth(req);
  const params = await ctx.params;
  const characterId = params.id;

  const url = new URL(req.url);
  const limit = clampInt(url.searchParams.get("limit"), 50, 1, 200);
  const offset = clampInt(url.searchParams.get("offset"), 0, 0, 1_000_000);

  const pool = getPool();
  const client = await pool.connect();

  try {
    // 1) valida existência e authz a partir do character atual
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
      if (!ok)
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2) histórico: tabela usa history_id (não "id")
    const r = await client.query(
      `
          SELECT
            ch.history_id::text                 AS id,
            ch.character_id::text               AS "characterId",
            ch.game_id::text                    AS "gameId",
            ch.owner_user_id::text              AS "ownerUserId",
            cs.type::text                       AS status,
            ch.submitted_at                     AS "submittedAt",
            ch.approved_at                      AS "approvedAt",
            ch.approved_by_user_id::text        AS "approvedByUserId",
            ch.rejected_at                      AS "rejectedAt",
            ch.rejected_by_user_id::text        AS "rejectedByUserId",
            ch.rejection_reason::text           AS "rejectionReason",
            ch.sheet                            AS sheet,
            ch.total_experience::int            AS "totalExperience",
            ch.spent_experience::int            AS "spentExperience",
            ch.version::int                     AS version,
            ch.created_at                       AS "createdAt",
            ch.updated_at                       AS "updatedAt",
            ch.deleted_at                       AS "deletedAt"
          FROM public.characters_history ch
          LEFT JOIN public.character_status cs ON cs.id = ch.status_id
          WHERE ch.character_id = $1
          ORDER BY ch.version DESC, ch.created_at DESC
            LIMIT $2 OFFSET $3
        `,
      [characterId, limit, offset],
    );

    return NextResponse.json(
      { characterId, limit, offset, items: r.rows },
      { status: 200 },
    );
  } finally {
    client.release();
  }
}

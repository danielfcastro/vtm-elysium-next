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

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const user = await requireAuth(req);
  const characterId = ctx.params.id;

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
            history_id::text                 AS id,
            character_id::text               AS "characterId",
            game_id::text                    AS "gameId",
            owner_user_id::text              AS "ownerUserId",
            status::text                     AS status,
            submitted_at                     AS "submittedAt",
            approved_at                      AS "approvedAt",
            approved_by_user_id::text        AS "approvedByUserId",
            rejected_at                      AS "rejectedAt",
            rejected_by_user_id::text        AS "rejectedByUserId",
            rejection_reason::text           AS "rejectionReason",
            sheet                            AS sheet,
            total_experience::int            AS "totalExperience",
            spent_experience::int            AS "spentExperience",
            version::int                     AS version,
            created_at                       AS "createdAt",
            updated_at                       AS "updatedAt",
            deleted_at                       AS "deletedAt"
          FROM public.characters_history
          WHERE character_id = $1
          ORDER BY version DESC, created_at DESC
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

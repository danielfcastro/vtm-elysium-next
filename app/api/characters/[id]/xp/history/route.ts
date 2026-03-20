//app/api/characters/[id]/xp/history/route.ts
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

    const r = await client.query(
      `
      (
        SELECT
          'GRANT'::text                         AS kind,
          g.id::text                            AS id,
          g.character_id::text                  AS character_id,
          g.amount::int                         AS amount,
          g.session_date::text                  AS session_date,
          g.note::text                          AS note,
          g.created_at::text                    AS created_at,
          g.granted_by_id::text                 AS by_user_id,
          NULL::int                             AS xp_cost,
          NULL::text                            AS status,
          NULL::jsonb                           AS payload,
          NULL::text                            AS reason_rejected,
          NULL::text                            AS resolved_at,
          NULL::text                            AS requested_by_id,
          NULL::text                            AS resolved_by_id
        FROM public.xp_grants g
        WHERE g.character_id = $1
      )
      UNION ALL
      (
        SELECT
          'SPEND'::text                         AS kind,
          s.id::text                            AS id,
          s.character_id::text                  AS character_id,
          NULL::int                             AS amount,
          NULL::text                            AS session_date,
          NULL::text                            AS note,
          s.created_at::text                    AS created_at,
          s.requested_by_id::text               AS by_user_id,
          s.xp_cost::int                        AS xp_cost,
          xs.type::text                         AS status,
          s.payload                             AS payload,
          s.reason_rejected::text               AS reason_rejected,
          s.resolved_at::text                   AS resolved_at,
          s.requested_by_id::text               AS requested_by_id,
          s.resolved_by_id::text                AS resolved_by_id
        FROM public.xp_spend_logs s
        JOIN public.xp_spent_status xs ON xs.id = s.status_id
        WHERE s.character_id = $1
      )
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [characterId, limit, offset],
    );

    return NextResponse.json(
      {
        characterId,
        limit,
        offset,
        items: r.rows,
      },
      { status: 200 },
    );
  } finally {
    client.release();
  }
}

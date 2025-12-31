import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { requireRoleInGame } from "@/lib/roles";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

type Ctx = { params: { gameId: string } | Promise<{ gameId: string }> };

async function resolveGameId(ctx: Ctx) {
  const p = ctx.params instanceof Promise ? await ctx.params : ctx.params;
  return String(p?.gameId ?? "").trim();
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const client = await pool.connect();
  try {
    const user = await requireAuth(req);
    const gameId = await resolveGameId(ctx);
    if (!gameId) return jsonError("Missing gameId", 400);

    const ok = await requireRoleInGame(client, user.sub, gameId, [
      "STORYTELLER",
    ]);
    if (!ok) return jsonError("Forbidden", 403);

    const url = new URL(req.url);
    const status = url.searchParams.get("status"); // optional

    const params: any[] = [gameId];
    let statusSql = "";
    if (status) {
      params.push(status);
      statusSql = `AND c.status = $2`;
    }

    const res = await client.query(
      `
      SELECT
        c.id,
        c.game_id AS "gameId",
        c.owner_user_id AS "ownerUserId",
        c.status,
        c.submitted_at AS "submittedAt",
        c.approved_at AS "approvedAt",
        c.approved_by_user_id AS "approvedByUserId",
        c.rejected_at AS "rejectedAt",
        c.rejected_by_user_id AS "rejectedByUserId",
        c.rejection_reason AS "rejectionReason",
        c.sheet,
        c.total_experience AS "totalExperience",
        c.spent_experience AS "spentExperience",
        c.version,
        c.created_at AS "createdAt",
        c.updated_at AS "updatedAt"
      FROM public.characters c
      WHERE c.game_id = $1
        AND c.deleted_at IS NULL
        ${statusSql}
      ORDER BY c.updated_at DESC
      `,
      params,
    );

    return NextResponse.json({ characters: res.rows }, { status: 200 });
  } finally {
    client.release();
  }
}

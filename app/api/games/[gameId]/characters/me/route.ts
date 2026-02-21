//app/api/games/[gameId]/characters/me/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

type RouteContext = {
  params: { gameId: string } | Promise<{ gameId: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(req);

    const resolvedParams =
      context.params instanceof Promise ? await context.params : context.params;

    const gameId = String(resolvedParams.gameId);

    const roleRes = await pool.query(
      `SELECT role FROM public.user_game_roles WHERE user_id = $1 AND game_id = $2`,
      [user.sub, gameId],
    );
    if ((roleRes.rowCount ?? 0) === 0) {
      return jsonError("You do not have access to this game", 403);
    }

    const res = await pool.query(
      `
      SELECT
        c.id,
        c.game_id AS "gameId",
        c.owner_user_id AS "ownerUserId",
        cs.type AS status,
        cs.description AS "statusDescription",
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
      LEFT JOIN public.character_status cs ON cs.id = c.status_id
      WHERE c.game_id = $1
        AND c.owner_user_id = $2
        AND c.deleted_at IS NULL
      ORDER BY c.created_at DESC
      `,
      [gameId, user.sub],
    );

    if ((res.rowCount ?? 0) === 0) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    // Map to include name from sheet
    const items = res.rows.map((row) => ({
      ...row,
      name: row.sheet?.sheet?.name ?? row.sheet?.name ?? "Unnamed",
    }));

    return NextResponse.json({ items }, { status: 200 });
  } catch (e: any) {
    return jsonError(e?.message ?? "Internal error", e?.status ?? 500);
  }
}

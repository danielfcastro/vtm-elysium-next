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
        id,
        game_id AS "gameId",
        owner_user_id AS "ownerUserId",
        status,
        submitted_at AS "submittedAt",
        approved_at AS "approvedAt",
        approved_by_user_id AS "approvedByUserId",
        rejected_at AS "rejectedAt",
        rejected_by_user_id AS "rejectedByUserId",
        rejection_reason AS "rejectionReason",
        sheet,
        total_experience AS "totalExperience",
        spent_experience AS "spentExperience",
        version,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM public.characters
      WHERE game_id = $1
        AND owner_user_id = $2
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [gameId, user.sub],
    );

    if ((res.rowCount ?? 0) === 0) {
      return NextResponse.json({ character: null }, { status: 200 });
    }

    return NextResponse.json({ character: res.rows[0] }, { status: 200 });
  } catch (e: any) {
    return jsonError(e?.message ?? "Internal error", e?.status ?? 500);
  }
}

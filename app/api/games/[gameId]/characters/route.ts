//app/api/games/[gameId]/characters/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { buildZeroSheet } from "@/lib/sheet";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

type RouteContext = {
  params: { gameId: string } | Promise<{ gameId: string }>;
};

async function resolveGameId(context: RouteContext): Promise<string> {
  const params =
    context.params instanceof Promise ? await context.params : context.params;
  return String(params.gameId);
}

/**
 * POST /api/games/:gameId/characters
 * Always creates a new character for the user in the specified game.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  console.log(
    "[POST /api/games/:gameId/characters] Starting character creation",
  );
  const client = await pool.connect();

  try {
    const user = await requireAuth(req);
    const userId = user.sub;
    const gameId = await resolveGameId(context);
    console.log(
      "[POST /api/games/:gameId/characters] userId:",
      userId,
      "gameId:",
      gameId,
    );

    // No need to check user_game_roles - relationship is via characters
    // Any authenticated user can create a character in any game

    // 1) Always create a new character (no check for existing)
    await client.query("BEGIN");

    const sheet = buildZeroSheet();

    // Get the default status ID for DRAFT_PHASE1
    const statusRes = await client.query(
      `SELECT id FROM public.character_status WHERE type = 'DRAFT_PHASE1' LIMIT 1`,
    );
    const statusId = statusRes.rows[0]?.id ?? 1;

    await client.query(
      `
      INSERT INTO public.characters (
        game_id, owner_user_id, status_id, sheet, total_experience, spent_experience
      )
      VALUES ($1, $2, $3, $4::jsonb, 0, 0)
      `,
      [gameId, userId, statusId, JSON.stringify(sheet)],
    );

    await client.query("COMMIT");

    // Fetch the newly created character
    const newCharRes = await pool.query(
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
      LIMIT 1
      `,
      [gameId, userId],
    );

    const character = newCharRes.rows[0];
    return NextResponse.json({ character }, { status: 201 });
  } catch (e: any) {
    await client.query("ROLLBACK");
    return jsonError(e?.message ?? "Internal error", e?.status ?? 500);
  } finally {
    client.release();
  }
}

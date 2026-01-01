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

async function fetchMyCharacter(gameId: string, userId: string) {
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
    [gameId, userId],
  );

  return (res.rowCount ?? 0) > 0 ? res.rows[0] : null;
}

/**
 * POST /api/games/:gameId/characters
 * Create-or-return: garante que exista um personagem do usuário naquele jogo.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const client = await pool.connect();

  try {
    const user = await requireAuth(req);
    const userId = user.sub;
    const gameId = await resolveGameId(context);

    // 1) valida acesso ao jogo
    const roleRes = await client.query(
      `SELECT role FROM public.user_game_roles WHERE user_id = $1 AND game_id = $2`,
      [userId, gameId],
    );
    if ((roleRes.rowCount ?? 0) === 0) {
      return jsonError("You do not have access to this game", 403);
    }

    // 2) transação: buscar e criar se não existir
    await client.query("BEGIN");

    const existing = await client.query(
      `
      SELECT id
      FROM public.characters
      WHERE game_id = $1
        AND owner_user_id = $2
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [gameId, userId],
    );

    if ((existing.rowCount ?? 0) > 0) {
      await client.query("COMMIT");
      const character = await fetchMyCharacter(gameId, userId);
      return NextResponse.json({ character }, { status: 200 });
    }

    const sheet = buildZeroSheet();

    await client.query(
      `
      INSERT INTO public.characters (
        game_id, owner_user_id, status, sheet, total_experience, spent_experience
      )
      VALUES ($1, $2, 'DRAFT_PHASE1', $3::jsonb, 0, 0)
      `,
      [gameId, userId, JSON.stringify(sheet)],
    );

    await client.query("COMMIT");

    const character = await fetchMyCharacter(gameId, userId);
    return NextResponse.json({ character }, { status: 201 });
  } catch (e: any) {
    await client.query("ROLLBACK");

    // corrida no unique index: simplesmente retorna o registro existente
    if (String(e?.code) === "23505") {
      try {
        const user = await requireAuth(req);
        const userId = user.sub;
        const gameId = await resolveGameId(context);
        const character = await fetchMyCharacter(gameId, userId);
        return NextResponse.json({ character }, { status: 200 });
      } catch {
        // cai no erro padrão abaixo
      }
    }

    return jsonError(e?.message ?? "Internal error", e?.status ?? 500);
  } finally {
    client.release();
  }
}

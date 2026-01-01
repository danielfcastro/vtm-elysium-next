//app/api/storyteller/characters/[id]/approve/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { requireRoleInGame } from "@/lib/roles";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

type RouteContext = { params: { id: string } | Promise<{ id: string }> };

async function resolveId(context: RouteContext) {
  const p =
    context.params instanceof Promise ? await context.params : context.params;
  return String(p?.id ?? "").trim();
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const client = await pool.connect();
  try {
    const user = await requireAuth(req);
    const characterId = await resolveId(context);
    if (!characterId) return jsonError("Missing character id", 400);

    await client.query("BEGIN");

    // carrega character + gameId + status
    const cur = await client.query(
      `
      SELECT id, game_id AS "gameId", status
      FROM public.characters
      WHERE id = $1 AND deleted_at IS NULL
      LIMIT 1
      `,
      [characterId],
    );
    if ((cur.rowCount ?? 0) === 0) {
      await client.query("ROLLBACK");
      return jsonError("Character not found", 404);
    }

    const { gameId, status } = cur.rows[0];

    // valida role ST no game
    const ok = await requireRoleInGame(client, user.sub, gameId, [
      "STORYTELLER",
    ]);
    if (!ok) {
      await client.query("ROLLBACK");
      return jsonError("Forbidden", 403);
    }

    if (status !== "SUBMITTED") {
      await client.query("ROLLBACK");
      return jsonError(`Cannot approve character in status ${status}`, 409);
    }

    const updated = await client.query(
      `
      UPDATE public.characters
      SET
        status = 'APPROVED',
        approved_at = now(),
        approved_by_user_id = $2,
        rejected_at = NULL,
        rejected_by_user_id = NULL,
        rejection_reason = NULL,
        version = version + 1,
        updated_at = now()
      WHERE id = $1
      RETURNING
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
      `,
      [characterId, user.sub],
    );

    await client.query("COMMIT");
    return NextResponse.json({ character: updated.rows[0] }, { status: 200 });
  } catch (e: any) {
    await client.query("ROLLBACK");
    return jsonError(e?.message ?? "Internal error", e?.status ?? 500);
  } finally {
    client.release();
  }
}

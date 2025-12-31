import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { requireRoleInGame } from "@/lib/roles";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

type RouteContext = { params: { id: string } | Promise<{ id: string }> };

async function resolveId(context: RouteContext): Promise<string> {
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

    const body = await req.json().catch(() => ({}));
    const reason = typeof body?.reason === "string" ? body.reason.trim() : null;

    await client.query("BEGIN");

    const cur = await client.query(
      `SELECT id, game_id AS "gameId", status FROM public.characters WHERE id=$1 AND deleted_at IS NULL LIMIT 1`,
      [characterId],
    );
    if ((cur.rowCount ?? 0) === 0) {
      await client.query("ROLLBACK");
      return jsonError("Character not found", 404);
    }

    const { gameId, status } = cur.rows[0];
    const ok = await requireRoleInGame(client, user.sub, gameId, [
      "STORYTELLER",
    ]);
    if (!ok) {
      await client.query("ROLLBACK");
      return jsonError("Forbidden", 403);
    }

    if (status !== "SUBMITTED") {
      await client.query("ROLLBACK");
      return jsonError(`Cannot reject character in status ${status}`, 409);
    }

    const updated = await client.query(
      `
      UPDATE public.characters
      SET
        status = 'REJECTED',
        rejected_at = now(),
        rejected_by_user_id = $2,
        rejection_reason = $3,
        approved_at = NULL,
        approved_by_user_id = NULL,
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
      [characterId, user.sub, reason],
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

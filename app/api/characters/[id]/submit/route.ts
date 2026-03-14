// app/api/characters/[id]/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

type RouteContext = {
  params: { id: string } | Promise<{ id: string }>;
};

async function resolveId(context: RouteContext): Promise<string> {
  const p =
    context.params instanceof Promise ? await context.params : context.params;
  const id = String(p?.id ?? "").trim();
  return id;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const client = await pool.connect();

  try {
    const user = await requireAuth(req);
    const characterId = await resolveId(context);

    if (!characterId) {
      return jsonError("Missing character id", 400);
    }

    await client.query("BEGIN");

    // Carrega e valida owner + status
    const cur = await client.query(
      `
      SELECT c.id, c.owner_user_id AS "ownerUserId", cs.type as status
      FROM public.characters c
      LEFT JOIN public.character_status cs ON cs.id = c.status_id
      WHERE c.id = $1
        AND c.deleted_at IS NULL
      LIMIT 1
      `,
      [characterId],
    );

    if ((cur.rowCount ?? 0) === 0) {
      await client.query("ROLLBACK");
      return jsonError("Character not found", 404);
    }

    const row = cur.rows[0];

    if (row.ownerUserId !== user.sub) {
      await client.query("ROLLBACK");
      return jsonError("Forbidden", 403);
    }

    // Permite submit a partir de DRAFT_PHASE2 e (opcional) REJECTED
    const canSubmit =
      row.status === "DRAFT_PHASE2" || row.status === "REJECTED";
    if (!canSubmit) {
      await client.query("ROLLBACK");
      return jsonError(`Cannot submit character in status ${row.status}`, 409);
    }

    const updated = await client.query(
      `
        UPDATE public.characters
        SET
            status_id = 3,
            submitted_at = now(),

            approved_at = NULL,
            approved_by_user_id = NULL,

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
        owner_user_id AS "ownerUserId",
        status_id,
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
      [characterId],
    );

    await client.query("COMMIT");

    // Get the status type from character_status table
    const statusResult = await client.query(
      `SELECT cs.type as status FROM public.character_status cs WHERE cs.id = $1`,
      [updated.rows[0].status_id],
    );

    const characterWithStatus = {
      ...updated.rows[0],
      status: statusResult.rows[0]?.status,
    };

    return NextResponse.json(
      { character: characterWithStatus },
      { status: 200 },
    );
  } catch (e: any) {
    await client.query("ROLLBACK");
    return jsonError(e?.message ?? "Internal error", e?.status ?? 500);
  } finally {
    client.release();
  }
}

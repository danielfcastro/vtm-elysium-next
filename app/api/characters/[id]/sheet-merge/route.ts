// app/api/characters/[id]/sheet-merge/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

type RouteContext = { params: { id: string } | Promise<{ id: string }> };

async function resolveId(context: RouteContext): Promise<string> {
  const p =
    context.params instanceof Promise ? await context.params : context.params;
  return String(p?.id ?? "").trim();
}

const EDITABLE_STATUSES = new Set(["DRAFT_PHASE1", "DRAFT_PHASE2", "REJECTED"]);

export async function PATCH(req: NextRequest, context: RouteContext) {
  const client = await pool.connect();
  try {
    const user = await requireAuth(req);
    const id = await resolveId(context);
    if (!id) return jsonError("Missing character id", 400);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object")
      return jsonError("Invalid JSON body", 400);

    const patch = (body as any).patch;
    if (!patch || typeof patch !== "object")
      return jsonError("patch is required and must be an object", 400);

    await client.query("BEGIN");

    const cur = await client.query(
      `SELECT c.id, c.owner_user_id AS "ownerUserId", cs.type as status FROM public.characters c LEFT JOIN public.character_status cs ON cs.id = c.status_id WHERE c.id=$1 AND c.deleted_at IS NULL LIMIT 1`,
      [id],
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
    if (!EDITABLE_STATUSES.has(String(row.status))) {
      await client.query("ROLLBACK");
      return jsonError(
        `Character is not editable in status ${row.status}`,
        409,
      );
    }

    // Merge root-level: sheet = sheet || patch
    const updated = await client.query(
      `
      UPDATE public.characters
      SET
        sheet = sheet || $2::jsonb,
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
      [id, JSON.stringify(patch)],
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

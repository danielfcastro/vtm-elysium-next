// app/api/characters/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// Next 16 (Turbopack) tipa params como Promise em alguns cenários
type RouteContext = {
  params: { id: string } | Promise<{ id: string }>;
};

async function resolveId(context: RouteContext): Promise<string> {
  const p =
    context.params instanceof Promise ? await context.params : context.params;
  return String(p.id);
}

// Apenas estes statuses podem ser editados pelo dono
const EDITABLE_STATUSES = new Set(["DRAFT_PHASE1", "DRAFT_PHASE2", "REJECTED"]);

function deriveDraftStatusFromSheet(
  sheet: any,
): "DRAFT_PHASE1" | "DRAFT_PHASE2" {
  const phaseRaw = sheet?.phase;

  // Aceita number ou string numérica
  const phase = typeof phaseRaw === "string" ? Number(phaseRaw) : phaseRaw;

  if (phase !== 1 && phase !== 2) {
    throw Object.assign(new Error("sheet.phase must be 1 or 2"), {
      status: 400,
    });
  }

  return phase === 1 ? "DRAFT_PHASE1" : "DRAFT_PHASE2";
}

export async function GET(req: NextRequest, context: RouteContext) {
  const client = await pool.connect();

  try {
    const user = await requireAuth(req);
    const userId = user.sub;
    const characterId = await resolveId(context);
    const r = await client.query(
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
      WHERE id = $1
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [characterId],
    );

    if ((r.rowCount ?? 0) === 0) {
      return jsonError("Character not found", 404);
    }

    const character = r.rows[0];

    if (character.ownerUserId !== userId) {
      return jsonError("Forbidden", 403);
    }

    return NextResponse.json({ character }, { status: 200 });
  } catch (e: any) {
    return jsonError(e?.message ?? "Internal error", e?.status ?? 500);
  } finally {
    client.release();
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const client = await pool.connect();

  try {
    const user = await requireAuth(req);
    const userId = user.sub;
    const characterId = await resolveId(context);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonError("Invalid JSON body", 400);
    }

    const sheet = (body as any).sheet;
    if (!sheet || typeof sheet !== "object") {
      return jsonError("sheet is required and must be an object", 400);
    }

    // Opção A: status sempre deriva do sheet.phase
    let nextStatus: "DRAFT_PHASE1" | "DRAFT_PHASE2";
    try {
      nextStatus = deriveDraftStatusFromSheet(sheet);
    } catch (e: any) {
      return jsonError(e?.message ?? "Invalid sheet.phase", e?.status ?? 400);
    }

    await client.query("BEGIN");

    // 1) carrega char para checar owner + status
    const cur = await client.query(
      `
      SELECT
        id,
        owner_user_id AS "ownerUserId",
        status
      FROM public.characters
      WHERE id = $1
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [characterId],
    );

    if ((cur.rowCount ?? 0) === 0) {
      await client.query("ROLLBACK");
      return jsonError("Character not found", 404);
    }

    const current = cur.rows[0];

    if (current.ownerUserId !== userId) {
      await client.query("ROLLBACK");
      return jsonError("Forbidden", 403);
    }

    if (!EDITABLE_STATUSES.has(String(current.status))) {
      await client.query("ROLLBACK");
      return jsonError(
        `Character is not editable in status ${current.status}`,
        409,
      );
    }

    // 2) update
    // - status = nextStatus (derivado do sheet.phase)
    // - limpa campos de workflow (SUBMITTED/APPROVED/REJECTED) porque voltou a ser DRAFT
    // - trigger de history roda BEFORE UPDATE (como você já tem)
    const updated = await client.query(
      `
      UPDATE public.characters
      SET
        status = $3,
        submitted_at = NULL,

        approved_at = NULL,
        approved_by_user_id = NULL,

        rejected_at = NULL,
        rejected_by_user_id = NULL,
        rejection_reason = NULL,

        sheet = $2::jsonb,
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
      [characterId, JSON.stringify(sheet), nextStatus],
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

export async function DELETE(req: NextRequest, context: RouteContext) {
  const client = await pool.connect();

  try {
    const user = await requireAuth(req);
    const userId = user.sub;
    const characterId = await resolveId(context);

    // 1) Busca o character (existe + não deletado)
    const r = await client.query(
        `
      SELECT id, owner_user_id AS "ownerUserId", status
      FROM public.characters
      WHERE id = $1
        AND deleted_at IS NULL
      LIMIT 1
      `,
        [characterId],
    );

    if ((r.rowCount ?? 0) === 0) {
      return jsonError("Character not found", 404);
    }

    const row = r.rows[0];

    // 2) Ownership
    if (row.ownerUserId !== userId) {
      return jsonError("Forbidden", 403);
    }

    // 3) Apenas status editáveis (draft)
    // EDITABLE_STATUSES já existe no arquivo (usado no PUT).
    if (!EDITABLE_STATUSES.has(row.status)) {
      return jsonError("Character is not deletable in its current status", 409);
    }

    // 4) Soft delete
    await client.query(
        `
      UPDATE public.characters
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1
        AND deleted_at IS NULL
      `,
        [characterId],
    );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return jsonError(e?.message ?? "Internal error", e?.status ?? 500);
  } finally {
    client.release();
  }
}

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
    const p = context.params instanceof Promise ? await context.params : context.params;
    return String(p.id);
}

const EDITABLE_STATUSES = new Set(["DRAFT_PHASE1", "DRAFT_PHASE2", "REJECTED"]);

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

        // exigimos "sheet" no body
        const sheet = (body as any).sheet;
        if (sheet == null || typeof sheet !== "object") {
            return jsonError("sheet is required and must be an object", 400);
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
            return jsonError(`Character is not editable in status ${current.status}`, 409);
        }

        // 2) opcional: coerência status vs sheet.phase
        // Se você quer que o backend “amarre” isso, habilite abaixo:
        //
        // const phase = (sheet as any)?.phase;
        // if (phase === 1 && current.status !== "DRAFT_PHASE1") { ... }
        // if (phase === 2 && current.status !== "DRAFT_PHASE2") { ... }

        // 3) update (trigger de history roda BEFORE UPDATE)
        const updated = await client.query(
            `
      UPDATE public.characters
      SET
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
            [characterId, JSON.stringify(sheet)],
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

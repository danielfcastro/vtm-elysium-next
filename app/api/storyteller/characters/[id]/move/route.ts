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

type MoveBody = {
  targetGameId?: string;
  // Opcional: se true, mantém status atual; se false/undefined, reseta para DRAFT_PHASE1.
  keepStatus?: boolean;
  // Opcional: nota/razão (se você quiser logar em audit depois; por ora só valida e retorna)
  reason?: string;
};

export async function PUT(req: NextRequest, context: RouteContext) {
  const client = await pool.connect();

  try {
    const user = await requireAuth(req);
    const characterId = await resolveId(context);
    if (!characterId) return jsonError("Missing character id", 400);

    const body = (await req.json().catch(() => ({}))) as MoveBody;
    const targetGameId = String(body?.targetGameId ?? "").trim();
    const keepStatus = Boolean(body?.keepStatus);
    const reason = typeof body?.reason === "string" ? body.reason.trim() : null;

    if (!targetGameId) {
      return jsonError("targetGameId is required", 422);
    }

    await client.query("BEGIN");

    // 1) Lock character atual
    const cur = await client.query<{
      id: string;
      game_id: string;
      status: string;
      deleted_at: string | null;
    }>(
      `
      SELECT id, game_id, status, deleted_at
      FROM public.characters
      WHERE id = $1
      FOR UPDATE
      `,
      [characterId],
    );

    if (cur.rowCount !== 1 || cur.rows[0].deleted_at) {
      await client.query("ROLLBACK");
      return jsonError("Character not found", 404);
    }

    const sourceGameId = cur.rows[0].game_id;
    const currentStatus = String(cur.rows[0].status);

    if (String(sourceGameId) === String(targetGameId)) {
      await client.query("ROLLBACK");
      return jsonError("Character is already in the target game", 409);
    }

    // 2) Authz: precisa ser storyteller/admin no game de origem
    const okSource = await requireRoleInGame(client, user.sub, sourceGameId, [
      "STORYTELLER",
      "ADMIN",
    ]);
    if (!okSource) {
      await client.query("ROLLBACK");
      return jsonError("Forbidden (source game)", 403);
    }

    // 3) Validar que o game destino existe
    const g2 = await client.query<{ id: string }>(
      `SELECT id FROM public.games WHERE id = $1 LIMIT 1`,
      [targetGameId],
    );
    if (g2.rowCount !== 1) {
      await client.query("ROLLBACK");
      return jsonError("Target game not found", 404);
    }

    // 4) Authz: também precisa ser storyteller/admin no game destino
    const okTarget = await requireRoleInGame(client, user.sub, targetGameId, [
      "STORYTELLER",
      "ADMIN",
    ]);
    if (!okTarget) {
      await client.query("ROLLBACK");
      return jsonError("Forbidden (target game)", 403);
    }

    // 5) Regra de segurança: impedir mover se já existe character do mesmo owner no game destino?
    // (Seu schema tem unique (game_id, owner_user_id) geralmente. Vamos checar e bloquear com 409.)
    const exists = await client.query<{ id: string }>(
      `
      SELECT id
      FROM public.characters
      WHERE game_id = $1
        AND owner_user_id = (SELECT owner_user_id FROM public.characters WHERE id = $2)
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [targetGameId, characterId],
    );
    if (exists.rowCount && String(exists.rows[0].id) !== String(characterId)) {
      await client.query("ROLLBACK");
      return jsonError(
        "Target game already has a character for this owner",
        409,
      );
    }

    // 6) Decide novo status
    // Padrão seguro: ao mover de game, resetar para DRAFT_PHASE1 (workflow recomeça naquele game).
    // keepStatus=true permite manter o status atual (útil para migrações administradas).
    const nextStatus = keepStatus ? currentStatus : "DRAFT_PHASE1";

    const updated = await client.query(
      `
      UPDATE public.characters
      SET
        game_id = $2,

        -- Se não mantiver status, resetamos timestamps e campos de aprovação/rejeição/submissão:
        status = $3,

        submitted_at = CASE WHEN $4 THEN submitted_at ELSE NULL END,
        approved_at = CASE WHEN $4 THEN approved_at ELSE NULL END,
        approved_by_user_id = CASE WHEN $4 THEN approved_by_user_id ELSE NULL END,
        rejected_at = CASE WHEN $4 THEN rejected_at ELSE NULL END,
        rejected_by_user_id = CASE WHEN $4 THEN rejected_by_user_id ELSE NULL END,
        rejection_reason = CASE WHEN $4 THEN rejection_reason ELSE NULL END,

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
      [characterId, targetGameId, nextStatus, keepStatus],
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        character: updated.rows[0],
        movedFrom: {
          gameId: sourceGameId,
          status: currentStatus,
        },
        movedTo: {
          gameId: targetGameId,
          status: nextStatus,
        },
        reason,
      },
      { status: 200 },
    );
  } catch (e: any) {
    await client.query("ROLLBACK").catch(() => {});
    return jsonError(e?.message ?? "Internal error", e?.status ?? 500);
  } finally {
    client.release();
  }
}

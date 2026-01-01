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

type RevertBody =
  | { historyId: string }
  | { version: number }
  | { historyId?: string; version?: number };

export async function POST(req: NextRequest, context: RouteContext) {
  const client = await pool.connect();

  try {
    const user = await requireAuth(req);
    const characterId = await resolveId(context);
    if (!characterId) return jsonError("Missing character id", 400);

    const body = (await req.json().catch(() => ({}))) as RevertBody;

    const historyId =
      typeof (body as any)?.historyId === "string"
        ? String((body as any).historyId).trim()
        : "";

    const versionRaw = (body as any)?.version;
    const version =
      Number.isInteger(versionRaw) && Number(versionRaw) >= 0
        ? Number(versionRaw)
        : null;

    if (!historyId && version == null) {
      return jsonError("Provide either historyId or version", 422);
    }

    await client.query("BEGIN");

    // 1) Lock character atual
    const cur = await client.query<{
      id: string;
      game_id: string;
      deleted_at: string | null;
    }>(
      `
      SELECT id, game_id, deleted_at
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

    const gameId = cur.rows[0].game_id;

    // 2) Authz: storyteller/admin do game atual
    const ok = await requireRoleInGame(client, user.sub, gameId, [
      "STORYTELLER",
      "ADMIN",
    ]);
    if (!ok) {
      await client.query("ROLLBACK");
      return jsonError("Forbidden", 403);
    }

    // 3) Carrega snapshot alvo do history
    let hist;
    if (historyId) {
      const r = await client.query(
        `
        SELECT
          id,
          character_id,
          game_id,
          owner_user_id,
          status,
          submitted_at,
          approved_at,
          approved_by_user_id,
          rejected_at,
          rejected_by_user_id,
          rejection_reason,
          sheet,
          total_experience,
          spent_experience,
          version,
          created_at,
          updated_at,
          deleted_at
        FROM public.characters_history
        WHERE id = $1
          AND character_id = $2
        LIMIT 1
        `,
        [historyId, characterId],
      );
      hist = r.rowCount === 1 ? r.rows[0] : null;
    } else {
      const r = await client.query(
        `
        SELECT
          id,
          character_id,
          game_id,
          owner_user_id,
          status,
          submitted_at,
          approved_at,
          approved_by_user_id,
          rejected_at,
          rejected_by_user_id,
          rejection_reason,
          sheet,
          total_experience,
          spent_experience,
          version,
          created_at,
          updated_at,
          deleted_at
        FROM public.characters_history
        WHERE character_id = $1
          AND version = $2
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [characterId, version],
      );
      hist = r.rowCount === 1 ? r.rows[0] : null;
    }

    if (!hist) {
      await client.query("ROLLBACK");
      return jsonError("History snapshot not found", 404);
    }

    // Segurança: revert NÃO deve “mover” personagem de game (isso é outra API).
    // Então exigimos que o snapshot seja do mesmo game atual.
    if (String(hist.game_id) !== String(gameId)) {
      await client.query("ROLLBACK");
      return jsonError(
        "History snapshot belongs to a different game; use move endpoint instead",
        409,
      );
    }

    // 4) Aplica revert (sheet + status + campos correlatos + XP cache)
    // Observação: triggers do banco (characters_history_before_update) vão registrar o OLD.
    const updated = await client.query(
      `
      UPDATE public.characters
      SET
        status = $2,

        submitted_at = $3,
        approved_at = $4,
        approved_by_user_id = $5,
        rejected_at = $6,
        rejected_by_user_id = $7,
        rejection_reason = $8,

        sheet = $9::jsonb,

        total_experience = $10,
        spent_experience = $11,

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
      [
        characterId,
        hist.status,
        hist.submitted_at,
        hist.approved_at,
        hist.approved_by_user_id,
        hist.rejected_at,
        hist.rejected_by_user_id,
        hist.rejection_reason,
        JSON.stringify(hist.sheet ?? {}),
        Number(hist.total_experience ?? 0),
        Number(hist.spent_experience ?? 0),
      ],
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        character: updated.rows[0],
        revertedFrom: {
          historyId: hist.id,
          version: hist.version,
          createdAt: hist.created_at,
        },
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

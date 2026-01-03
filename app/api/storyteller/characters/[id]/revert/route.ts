import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { requireRoleInGame } from "@/lib/roles";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

type Ctx = { params: { id: string } | Promise<{ id: string }> };

async function resolveId(ctx: Ctx) {
  const p = ctx.params instanceof Promise ? await ctx.params : ctx.params;
  return String(p?.id ?? "").trim();
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const user = await requireAuth(req);
  const characterId = await resolveId(ctx);
  if (!characterId) return jsonError("Missing character id", 400);

  const body = await req.json().catch(() => ({}));
  const historyIdRaw = body?.historyId ?? body?.history_id ?? null;
  const versionRaw =
    body?.version ?? body?.toVersion ?? body?.targetVersion ?? null;

  // Pelo menos um identificador precisa existir
  if (!historyIdRaw && (versionRaw === null || versionRaw === undefined)) {
    return jsonError("historyId (or version) is required", 422);
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock do character para consistência
    const ch = await client.query<{
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

    if (ch.rowCount !== 1 || ch.rows[0].deleted_at) {
      await client.query("ROLLBACK");
      return jsonError("Character not found", 404);
    }

    const gameId = ch.rows[0].game_id;

    const ok = await requireRoleInGame(client, user.sub, gameId, [
      "STORYTELLER",
      "ADMIN",
    ]);
    if (!ok) {
      await client.query("ROLLBACK");
      return jsonError("Forbidden", 403);
    }

    // Busca snapshot no histórico
    // IMPORTANTE: a coluna correta é history_id (não existe id)
    let hist;
    if (historyIdRaw) {
      const historyId = String(historyIdRaw).trim();
      hist = await client.query(
        `
        SELECT
          history_id,
          character_id,
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
          created_at
        FROM public.characters_history
        WHERE history_id = $1
          AND character_id = $2
        LIMIT 1
        `,
        [historyId, characterId],
      );
    } else {
      const version = Number(versionRaw);
      if (!Number.isInteger(version) || version < 0) {
        await client.query("ROLLBACK");
        return jsonError("version must be an integer", 422);
      }

      hist = await client.query(
        `
        SELECT
          history_id,
          character_id,
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
          created_at
        FROM public.characters_history
        WHERE character_id = $1
          AND version = $2
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [characterId, version],
      );
    }

    if ((hist.rowCount ?? 0) !== 1) {
      await client.query("ROLLBACK");
      return jsonError("History snapshot not found", 404);
    }

    const snap = hist.rows[0];

    // Reverte character para o snapshot
    await client.query(
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
      `,
      [
        characterId,
        snap.status,
        snap.submitted_at,
        snap.approved_at,
        snap.approved_by_user_id,
        snap.rejected_at,
        snap.rejected_by_user_id,
        snap.rejection_reason,
        JSON.stringify(snap.sheet ?? {}),
        Number(snap.total_experience ?? 0),
        Number(snap.spent_experience ?? 0),
      ],
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        characterId,
        revertedTo: {
          historyId: snap.history_id,
          version: snap.version,
          createdAt: snap.created_at,
        },
      },
      { status: 200 },
    );
  } catch (e: any) {
    await client.query("ROLLBACK").catch(() => {});
    return jsonError(e?.message ?? "Internal error", 500);
  } finally {
    client.release();
  }
}
